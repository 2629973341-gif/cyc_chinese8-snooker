"use strict";
// 无守护进程/镜像依赖：bubblewrap 文件系统与内核命名空间 + prlimit + systemd cgroup。
// 本模块从不在裸宿主进程中启动提交的编译器或程序；环境检查失败即拒绝执行。
const fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path'),{spawn}=require('node:child_process');
const MAX_OUTPUT=65536;
function failure(message,status=503){return Object.assign(Error(message),{status});}
function limited(value,max){return /^\d+$/.test(value.trim())&&Number(value)>0&&Number(value)<=max;}
function resourceStatus(cgroup,files){
 const group=cgroup.split('\n').find(line=>line.startsWith('0::'))?.slice(3);
 if(!group||!group.startsWith('/')||group.split('/').includes('..'))return{ready:false,message:'需要 cgroup v2；请通过新版 study-runner.service 启动轻量判题服务'};
 const [quota,period]=(files.cpu||'').trim().split(/\s+/).map(Number);
 if(!limited(files.memory||'',536870912)||!limited(files.pids||'',64)||String(files.swap).trim()!=='0'||!Number.isFinite(quota)||quota<=0||!Number.isFinite(period)||period<=0||quota/period>1){
  return{ready:false,message:'资源限制未生效：需要内存≤512MB、任务≤64、禁用交换、CPU≤1核；请重新安装 study-runner.service'};
 }
 return{ready:true,group,memoryBytes:Number(files.memory),tasks:Number(files.pids),cpu:quota/period};
}
function sandboxArgs(job,{compile=false,probe=false}={}){
 const memory=compile?536870912:268435456,cpu=compile?15:3;
 const args=[`--as=${memory}:${memory}`,`--cpu=${cpu}:${cpu}`,'--nproc=32:32','--nofile=64:64','--core=0:0','--fsize=33554432:33554432','--','/usr/bin/bwrap',
  '--unshare-all','--unshare-user','--unshare-cgroup','--disable-userns','--die-with-parent','--new-session','--cap-drop','ALL','--clearenv',
  '--ro-bind','/usr','/usr','--ro-bind','/lib','/lib','--ro-bind-try','/lib64','/lib64','--symlink','usr/bin','/bin',
  '--size','1048576','--tmpfs','/usr/local','--dir','/etc','--proc','/proc','--dev','/dev',
  '--size','33554432','--perms','1777','--tmpfs','/tmp','--dir','/src','--dir','/artifact',
  '--setenv','PATH','/usr/bin:/bin','--setenv','HOME','/tmp','--setenv','TMPDIR','/tmp','--setenv','LANG','C.UTF-8','--chdir','/tmp'];
 if(!probe){
  args.push('--ro-bind',path.join(job,'main.cpp'),'/src/main.cpp');
  args.push(compile?'--bind':'--ro-bind',path.join(job,'artifact'),'/artifact');
 }
 args.push('--remount-ro','/','--');
 if(probe)args.push('/usr/bin/true');
 else if(compile)args.push('/usr/bin/g++','-std=c++17','-O1','-pipe','/src/main.cpp','-o','/artifact/main');
 else args.push('/artifact/main');
 return args;
}
function runCommand(binary,args,{stdin='',timeout=5000,maxOutput=MAX_OUTPUT}={}){
 return new Promise(resolve=>{
  const started=Date.now(),env={PATH:'/usr/bin:/bin',LANG:'C.UTF-8'};
  if(process.platform==='win32')env.SystemRoot=process.env.SystemRoot; // 仅供本机可信单元测试；原生判题在Windows不会启用。
  const child=spawn(binary,args,{stdio:['pipe','pipe','pipe'],env,detached:process.platform!=='win32',windowsHide:true});
  let stdout='',stderr='',size=0,status='OK',done=false;
  const kill=()=>{try{if(process.platform!=='win32'&&child.pid)process.kill(-child.pid,'SIGKILL');else child.kill('SIGKILL');}catch{try{child.kill('SIGKILL');}catch{}}};
  const timer=setTimeout(()=>{if(status==='OK')status='TLE';kill();},timeout);
  child.stdout.setEncoding('utf8');child.stderr.setEncoding('utf8');
  function collect(which,text){size+=Buffer.byteLength(text);if(size>maxOutput){status='OLE';kill();return;}if(which==='stdout')stdout+=text;else stderr+=text;}
  child.stdout.on('data',s=>collect('stdout',s));child.stderr.on('data',s=>collect('stderr',s));child.stdin.on('error',()=>{});
  function finish(code,signal){if(done)return;done=true;clearTimeout(timer);resolve({status,code,signal,stdout,stderr,timeMs:Date.now()-started});}
  child.once('error',e=>{status='SYSTEM_ERROR';stderr=e.message;finish(-1);});child.once('close',finish);child.stdin.end(stdin);
 });
}
function createNativeRunner(options={}){
 // 可注入依赖仅用于仓库单元测试；HTTP和环境变量不能替换隔离器或绕过检测。
 const platform=options.platform||process.platform,uid=options.uid??(process.getuid?process.getuid():0),io=options.fs||fs,run=options.run||runCommand;
 let cache=null,pendingHealth=null,busy=false;
 async function health(){
  if(cache&&cache.expires>Date.now())return cache.value;
  if(pendingHealth)return pendingHealth;
  pendingHealth=inspectHealth();
  try{return await pendingHealth;}finally{pendingHealth=null;}
 }
 async function inspectHealth(){
  const unavailable=message=>({ready:false,backend:'native',concurrency:1,message});
  let value;
  try{
   if(platform!=='linux')return unavailable('轻量判题仅支持 Linux；本机仍可阅读、保存草稿与查看解答');
   if(uid===0)return unavailable('判题服务禁止使用 root，请使用独立的 judge 用户');
   for(const file of ['/usr/bin/g++','/usr/bin/bwrap','/usr/bin/prlimit'])await io.access(file,1);
   await io.access('/usr/include/nlohmann/json.hpp',4);
   const cgroup=await io.readFile('/proc/self/cgroup','utf8'),group=cgroup.split('\n').find(line=>line.startsWith('0::'))?.slice(3);
   if(!group||!group.startsWith('/')||group.split('/').includes('..'))throw Error('cgroup v2不可用');
   const base=path.posix.join('/sys/fs/cgroup',group);
   const [memory,pids,cpu,swap]=await Promise.all(['memory.max','pids.max','cpu.max','memory.swap.max'].map(name=>io.readFile(base+'/'+name,'utf8')));
   const resources=resourceStatus(cgroup,{memory,pids,cpu,swap});
   if(!resources.ready)value=unavailable(resources.message);
   else{
    const probe=await run('/usr/bin/prlimit',sandboxArgs(null,{probe:true}),{timeout:3000,maxOutput:4096});
    value=probe.code===0&&probe.status==='OK'?{ready:true,backend:'native',concurrency:1,message:'轻量 C++ 判题就绪（无需 Docker）'}:unavailable('Bubblewrap 沙箱不可用，未执行任何提交。请检查用户命名空间/AppArmor配置及服务日志：'+(probe.stderr||probe.status).slice(0,400));
   }
  }catch(e){value=unavailable('轻量判题环境未就绪：需要 g++、nlohmann-json3-dev、bubblewrap、util-linux 和新版 systemd 服务限制（'+e.message+'）');}
  cache={value,expires:Date.now()+15000};return value;
 }
 function verifyResult(result){if(result.status==='SYSTEM_ERROR'||/^\s*(bwrap|prlimit):/m.test(result.stderr||''))throw failure('本机沙箱启动失败，未记入进度：'+(result.stderr||'系统错误').slice(0,800));}
 async function execute(payload){
  if(!payload||typeof payload!=='object'||Array.isArray(payload)||payload.language!=='cpp'||typeof payload.code!=='string'||!payload.code.trim()||Buffer.byteLength(payload.code)>131072||!Array.isArray(payload.inputs)||payload.inputs.length<1||payload.inputs.length>48||payload.inputs.some(s=>typeof s!=='string'||Buffer.byteLength(s)>65536))throw failure('判题参数无效',400);
  if(busy)throw failure('轻量判题一次处理一份代码，请稍后重试',429);
  busy=true;let job;
  try{
   const ready=await health();if(!ready.ready)throw failure(ready.message);
   const deadline=Date.now()+40000;
   job=await io.mkdtemp(path.join(os.tmpdir(),'blackgold-study-'));
   await io.writeFile(path.join(job,'main.cpp'),payload.code,{mode:0o400});await io.mkdir(path.join(job,'artifact'),{mode:0o700});
   const compilation=await run('/usr/bin/prlimit',sandboxArgs(job,{compile:true}),{timeout:20000});verifyResult(compilation);
   if(compilation.status!=='OK'||compilation.code!==0)return{status:'CE',backend:'native',compileError:(compilation.stderr||compilation.status).slice(0,8000),runs:[]};
   const runs=[];
   for(const stdin of payload.inputs){
    if(Date.now()>deadline-5000){runs.push({status:'TLE',stdout:'',stderr:'本次提交总执行时间已超限',timeMs:0});continue;}
    const result=await run('/usr/bin/prlimit',sandboxArgs(job),{stdin,timeout:4000});verifyResult(result);
    const status=result.status!=='OK'?result.status:result.code===0?'OK':['SIGXCPU','SIGKILL'].includes(result.signal)||[137,152].includes(result.code)?'TLE':'RE';
    runs.push({status,stdout:result.stdout,stderr:result.stderr.slice(0,8000),timeMs:result.timeMs});
   }
   return{status:'OK',backend:'native',runs};
  }finally{
   try{if(job)await io.rm(job,{recursive:true,force:true});}finally{busy=false;}
  }
 }
 return{health,execute};
}
module.exports={createNativeRunner,sandboxArgs,resourceStatus,runCommand};
