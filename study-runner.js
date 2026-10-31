"use strict";
// 独立的 loopback 判题进程。游戏服务不访问 Docker socket，也不执行用户代码。
const http=require('node:http'),crypto=require('node:crypto'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path'),{spawn}=require('node:child_process');
const TOKEN=process.env.STUDY_RUNNER_TOKEN||'',IMAGE=process.env.STUDY_RUNNER_IMAGE||'blackgold-study:1',PORT=Number(process.env.STUDY_RUNNER_PORT)||3999;
const LIMIT=2,MAX_OUTPUT=65536;let active=0,healthCache=null;
function command(args,{stdin='',timeout=5000,maxOutput=MAX_OUTPUT}={}){return new Promise(resolve=>{
  const child=spawn('docker',args,{stdio:['pipe','pipe','pipe'],windowsHide:true});let stdout='',stderr='',size=0,status='OK',done=false;
  child.stdout.setEncoding('utf8');child.stderr.setEncoding('utf8');
  const timer=setTimeout(()=>{status='TLE';child.kill('SIGKILL');},timeout);
  function data(which,b){size+=Buffer.byteLength(b);if(size>maxOutput){status='OLE';child.kill('SIGKILL');return;}if(which==='out')stdout+=b;else stderr+=b;}
  child.stdout.on('data',b=>data('out',b));child.stderr.on('data',b=>data('err',b));child.stdin.on('error',()=>{});
  child.on('error',e=>{stderr=e.message;finish(125);});child.on('close',code=>finish(code));
  function finish(code){if(done)return;done=true;clearTimeout(timer);resolve({status,code,stdout,stderr});}
  child.stdin.end(stdin);
});}
async function health(){
  if(healthCache&&healthCache.expires>Date.now())return healthCache.value;
  const info=await command(['info','--format','{{json .}}'],{timeout:2500});let config;try{config=JSON.parse(info.stdout);}catch{}
  let ready=info.code===0&&config?.SecurityOptions?.some(x=>x.includes('rootless')),message='需要可用的 rootless Docker；不要将游戏服务加入 docker 用户组';
  if(ready&&!(String(config.CgroupVersion)==='2'&&config.MemoryLimit&&config.SwapLimit&&config.CpuCfsQuota&&config.PidsLimit)){ready=false;message='rootless Docker 需要 cgroup v2 和可用的内存、交换、CPU、PID限制；未满足时拒绝运行用户代码';}
  if(ready){const image=await command(['image','inspect',IMAGE],{timeout:2000,maxOutput:65536});ready=image.code===0;message=ready?'隔离判题就绪':'判题镜像未构建，请参阅 deploy/STUDY.md';}
  const value={ready,message};healthCache={value,expires:Date.now()+15000};return value;
}
async function container(job,cmd,stdin='',compile=false){
  const name='bg-study-'+crypto.randomBytes(12).toString('hex'),started=Date.now();
  const args=['run','--rm','--name',name,'--pull=never','--network=none','--read-only','--cap-drop=ALL','--security-opt=no-new-privileges:true','--user=10001:10001','--pids-limit=64','--memory=384m','--memory-swap=384m','--cpus=1','--ulimit','nofile=64:64','--ulimit',compile?'cpu=15:15':'cpu=3:3','--ulimit','fsize=16777216:16777216','--log-driver=none','--ipc=none','--tmpfs','/tmp:rw,nosuid,nodev,size=32m','--tmpfs','/work:rw,nosuid,nodev,size=32m','--workdir=/work','--mount',`type=bind,source=${job},target=/src,readonly`];
  if(compile)args.push('--mount',`type=bind,source=${path.join(job,'artifact')},target=/artifact`);
  // 判题输入只经 stdin 传入；没有 host pid/网络、Docker socket、账号数据或预期答案挂载。
  args.push('-i',IMAGE,...cmd);
  let result;try{result=await command(args,{stdin,timeout:compile?20000:5500});}
  finally{await command(['rm','-f',name],{timeout:3000,maxOutput:4096});}
  if(result.code===125||result.code===126||result.code===127)throw Error('隔离容器无法启动，请检查镜像和 Docker 日志');
  return{...result,timeMs:Date.now()-started};
}
async function execute(payload){
  if(payload.language!=='cpp'||typeof payload.code!=='string'||!payload.code.trim()||Buffer.byteLength(payload.code)>131072||!Array.isArray(payload.inputs)||!payload.inputs.length||payload.inputs.length>48||payload.inputs.some(x=>typeof x!=='string'||Buffer.byteLength(x)>65536))throw Object.assign(Error('判题请求参数无效'),{status:400});
  if(!(await health()).ready)throw Object.assign(Error((await health()).message),{status:503});
  const deadline=Date.now()+40000;
  const job=await fs.mkdtemp(path.join(os.tmpdir(),'blackgold-study-'));await fs.chmod(job,0o755);
  try{
    const ext={javascript:'js',python:'py',cpp:'cpp'}[payload.language],source=path.join(job,'main.'+ext);
    await fs.writeFile(source,payload.code,{mode:0o444});await fs.chmod(source,0o444); // 显式覆盖 systemd UMask=0077，容器子UID必须可读。
    if(payload.language==='cpp'){
      await fs.mkdir(path.join(job,'artifact'));await fs.chmod(path.join(job,'artifact'),0o777);
      const compilation=await container(job,['g++','-std=c++17','-O2','-pipe','/src/main.cpp','-o','/artifact/main'],'',true);
      if(compilation.code!==0||compilation.status!=='OK')return{status:'CE',compileError:(compilation.stderr||compilation.status).slice(0,8000),runs:[]};
    }
    const cmd=payload.language==='javascript'?['node','--max-old-space-size=128','/src/main.js']:payload.language==='python'?['python3','-I','-B','/src/main.py']:['/src/artifact/main'];
    const runs=[];
    for(const input of payload.inputs){
      if(Date.now()>deadline-8000){runs.push({status:'TLE',stdout:'',stderr:'本次提交总执行时间已超限',timeMs:0});continue;}
      const r=await container(job,cmd,input);
      // 所有状态由宿主可信 worker 确定；用户stdout永远只是答案，不能伪造判题元数据。
      const status=r.status!=='OK'?r.status:r.code===0?'OK':r.code===137||r.code===152?'TLE':'RE';
      runs.push({status,stdout:r.stdout,stderr:r.stderr.slice(0,8000),timeMs:r.timeMs});
    }
    return{status:'OK',runs};
  }finally{
    // job 来自 mkdtemp 的本次专属目录，不接受任何用户指定清理路径。
    await fs.rm(job,{recursive:true,force:true});
  }
}
function reply(res,status,data){res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store'});res.end(JSON.stringify(data));}
function authorized(req){const received=Buffer.from(req.headers.authorization||''),expected=Buffer.from('Bearer '+TOKEN);return received.length===expected.length&&crypto.timingSafeEqual(received,expected);}
function createRunner(){return http.createServer(async(req,res)=>{
  if(!authorized(req))return reply(res,401,{error:'未授权'});
  try{
    if(req.method==='GET'&&req.url==='/health')return reply(res,200,await health());
    if(req.method!=='POST'||req.url!=='/execute')return reply(res,404,{error:'不存在'});
    if(active>=LIMIT)return reply(res,429,{error:'判题繁忙，请稍后重试'});
    active++;
    try{let raw='',size=0;for await(const chunk of req){size+=chunk.length;if(size>1048576)throw Object.assign(Error('请求过大'),{status:413});raw+=chunk;}let payload;try{payload=JSON.parse(raw);}catch{throw Object.assign(Error('JSON格式错误'),{status:400});}reply(res,200,await execute(payload));}finally{active--;}
  }catch(e){reply(res,e.status||503,{error:e.message});}
});}
if(require.main===module){if(TOKEN.length<32)throw Error('STUDY_RUNNER_TOKEN 至少需要32字符');const server=createRunner();server.requestTimeout=70000;server.listen(PORT,'127.0.0.1',()=>console.log(`Study runner listening on 127.0.0.1:${PORT}`));}
module.exports={execute,container,health,createRunner};
