const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),http=require('node:http');
const {createNativeRunner,sandboxArgs,resourceStatus,runCommand}=require('../study/native-runner');
const {createRunner}=require('../study-runner');
const good={memory:'536870912\n',pids:'64\n',cpu:'75000 100000\n',swap:'0\n'};
function fixture(options={}){
 const calls=[],jobs=[],removed=[];let compile=options.compile,mode=options.mode||'OK';
 const io={...fs,access:async()=>{if(options.missing)throw Error('missing sandbox dependency');},readFile:async file=>{if(file==='/proc/self/cgroup')return'0::/system.slice/study-runner.service\n';const values={'memory.max':good.memory,'pids.max':good.pids,'cpu.max':good.cpu,'memory.swap.max':good.swap};if(values[path.posix.basename(file)]!==undefined)return options.unlimited?'max':values[path.posix.basename(file)];throw Error('unexpected read '+file);},mkdtemp:async p=>{const job=await fs.mkdtemp(p);jobs.push(job);return job;},rm:async(p,args)=>{removed.push(p);await fs.rm(p,args);}};
 const run=async(binary,args,opts)=>{calls.push({binary,args,opts});const runtime=args.includes('/artifact/main')&&!args.includes('/usr/bin/g++');if(options.wait&&args.includes('/usr/bin/g++'))await options.wait;
  if(args.includes('/usr/bin/true')&&options.probeFail)return{code:1,status:'OK',stderr:'bwrap: namespace denied',stdout:'',timeMs:1};
  if(args.includes('/usr/bin/g++')&&compile==='CE')return{code:1,status:'OK',stderr:'syntax error',stdout:'',timeMs:1};
  if(options.crash&&runtime)throw Error('simulated worker failure');
  return{code:mode==='RE'&&runtime?7:0,status:runtime&&['TLE','OLE'].includes(mode)?mode:'OK',stdout:runtime?'[1,2]\n':'',stderr:'',timeMs:1};};
 return{engine:createNativeRunner({platform:'linux',uid:1234,fs:io,run}),calls,jobs,removed};
}
const payload={language:'cpp',code:'// fixture only, never executed',inputs:['[[4,8,2,11],10]\n']};

test('轻量判题强制资源限制，不能仅靠timeout或无限cgroup冒充隔离',()=>{
 assert.equal(resourceStatus('0::/system.slice/study-runner.service',good).ready,true);
 for(const overrides of[{memory:'max'},{memory:'1073741824'},{pids:'max'},{cpu:'max 100000'},{cpu:'200000 100000'},{swap:'max'}])assert.equal(resourceStatus('0::/x',{...good,...overrides}).ready,false);
 assert.equal(resourceStatus('0::/../../escape',good).ready,false);
});

test('编译/执行沙箱参数均禁网、强制命名空间、清环境、只读系统、固定命令且不用Docker或shell',()=>{
 for(const compile of[true,false]){
  const args=sandboxArgs('/tmp/task',{compile});for(const flag of['--unshare-all','--unshare-user','--unshare-cgroup','--disable-userns','--die-with-parent','--new-session','--clearenv','--remount-ro'])assert.ok(args.includes(flag));
  assert.ok(args.includes('--nproc=32:32'));assert.ok(args.includes('--nofile=64:64'));assert.ok(args.includes('--core=0:0'));
  assert.ok(!args.includes('--share-net'));assert.ok(!args.includes('docker'));assert.ok(!args.includes('/opt/billiards-club'));assert.ok(!args.includes('/etc/billiards-study.env'));
  const artifact=args.lastIndexOf('/artifact');assert.equal(args[artifact-2],compile?'--bind':'--ro-bind');
  assert.equal(args.includes('/usr/bin/g++'),compile);assert.equal(args.at(-1),'/artifact/main');
  if(compile){assert.ok(args.includes('-std=c++11'));assert.ok(args.includes('-pedantic-errors'));assert.ok(!args.includes('-std=c++17'));}
 }
});

test('缺依赖、root、非Linux、无限cgroup或沙箱不可用时，拒绝编译而不是裸跑',async()=>{
 for(const options of[{platform:'win32',uid:1},{platform:'linux',uid:0}]){const runner=createNativeRunner({...options,run:()=>{throw Error('must not run');}});assert.equal((await runner.health()).ready,false);await assert.rejects(runner.execute(payload),{status:503});}
 for(const options of[{missing:true},{unlimited:true},{probeFail:true}]){const f=fixture(options);assert.equal((await f.engine.health()).ready,false);await assert.rejects(f.engine.execute(payload),{status:503});assert.ok(!f.calls.some(c=>c.args.includes('/usr/bin/g++')));assert.equal(f.jobs.length,0);}
});

test('轻量编译一次后执行用例，结果/CE/TLE/OLE/RE和异常都清理自己的临时目录',async()=>{
 for(const options of[{}, {compile:'CE'},{mode:'TLE'},{mode:'OLE'},{mode:'RE'},{crash:true}]){
  const f=fixture(options);if(options.crash)await assert.rejects(f.engine.execute(payload),/simulated/);else{const result=await f.engine.execute(payload);assert.equal(result.backend,'native');if(options.compile==='CE')assert.equal(result.status,'CE');else assert.equal(result.runs[0].status,options.mode||'OK');}
  assert.deepEqual(f.removed,f.jobs);for(const job of f.jobs)await assert.rejects(fs.access(job));
  assert.equal(f.calls.filter(c=>c.args.includes('/usr/bin/g++')).length,1);
 }
});

test('轻量服务固定串行，恶意请求不能提高并发或选择宿主执行命令',async()=>{
 let resume;const wait=new Promise(r=>resume=r),f=fixture({wait});const first=f.engine.execute(payload);while(!f.calls.some(c=>c.args.includes('/usr/bin/g++')))await new Promise(r=>setTimeout(r,5));
 await assert.rejects(f.engine.execute(payload),{status:429});resume();await first;
 await assert.rejects(f.engine.execute({...payload,language:'bash'}),{status:400});
 await assert.rejects(f.engine.execute(null),{status:400});
 assert.ok(f.calls.every(c=>c.binary==='/usr/bin/prlimit'));
});

test('并发状态轮询合并为一次沙箱探测，减少空闲资源开销',async()=>{
 const f=fixture();const values=await Promise.all(Array.from({length:20},()=>f.engine.health()));
 assert.ok(values.every(v=>v.ready));assert.equal(f.calls.filter(c=>c.args.includes('/usr/bin/true')).length,1);
 await f.engine.health();assert.equal(f.calls.length,1);
});

test('输出/时间限制和环境清理使用真实可信子进程验证，绝不传递worker token',async()=>{
 const prior=process.env.STUDY_RUNNER_TOKEN;process.env.STUDY_RUNNER_TOKEN='test-secret-never-forwarded';
 try{const clean=await runCommand(process.execPath,['-e','process.stdout.write(String(Boolean(process.env.STUDY_RUNNER_TOKEN)))']);assert.equal(clean.stdout,'false');
  const excessive=await runCommand(process.execPath,['-e','for(;;)process.stdout.write("x".repeat(8192))'],{maxOutput:1024,timeout:3000});assert.equal(excessive.status,'OLE');
  const loop=await runCommand(process.execPath,['-e','for(;;){}'],{timeout:150});assert.equal(loop.status,'TLE');
 }finally{if(prior===undefined)delete process.env.STUDY_RUNNER_TOKEN;else process.env.STUDY_RUNNER_TOKEN=prior;}
});

test('worker只接受共享token，协议兼容现有账号进度且不暴露执行绕过入口',async t=>{
 const token='test-token-'.repeat(5);let count=0;const server=createRunner({token,engine:{health:async()=>({ready:true,backend:'native'}),execute:async()=>{count++;return{status:'OK',backend:'native',runs:[]};}}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));
 const url=`http://127.0.0.1:${server.address().port}`;
 assert.equal((await fetch(url+'/health')).status,401);
 const health=await fetch(url+'/health',{headers:{authorization:'Bearer '+token}});assert.equal((await health.json()).backend,'native');
 assert.equal((await fetch(url+'/execute?unsafe=1',{method:'POST',headers:{authorization:'Bearer '+token}})).status,404);assert.equal(count,0);
});
