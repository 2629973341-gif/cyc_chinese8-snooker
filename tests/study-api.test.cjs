const test=require('node:test'),assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto'),{spawn}=require('node:child_process');
const P=require('../study/problems'),R=require('../study/reference');
const delay=ms=>new Promise(r=>setTimeout(r,ms));

test('学习联网：账号隔离、真实状态分支、私有草稿/源码、持久化、服务故障不误记AC',async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'study-api-')),dbFile=path.join(dir,'db.json'),token=crypto.randomBytes(32).toString('hex');
 const root=path.join(__dirname,'..'),port=22000+crypto.randomInt(1000);let child,exited,runnerDelay=0,mode='OK',requests=0,lastPayload;
 // 模拟可信 worker 的协议。它不执行提交代码；真正的轻量沙箱需在 Linux 部署后另做冒烟测试。
 const runner=http.createServer(async(req,res)=>{
  if(req.headers.authorization!=='Bearer '+token){res.writeHead(401);res.end('{}');return;}
  if(req.url==='/health'){res.setHeader('content-type','application/json');res.end(JSON.stringify({ready:true}));return;}
  let raw='';for await(const chunk of req)raw+=chunk;const data=JSON.parse(raw);requests++;lastPayload=data;
  if(runnerDelay)await delay(runnerDelay);
  if(mode==='UNAVAILABLE'){res.writeHead(503,{'content-type':'application/json'});res.end(JSON.stringify({error:'测试中的worker故障'}));return;}
  const runs=data.inputs.map(input=>({status:mode==='RE'?'RE':'OK',stdout:mode==='WA'?'null\n':JSON.parse(input.trim()).length===2?JSON.stringify(R.solve(1,JSON.parse(input.trim())))+'\n':'null\n',stderr:mode==='RE'?'bad runtime':'',timeMs:9}));
  res.setHeader('content-type','application/json');res.end(JSON.stringify(mode==='CE'?{status:'CE',compileError:'compiler diagnostic',runs:[]}:{status:'OK',runs:mode==='INCOMPLETE'?[]:runs}));
 });
 await new Promise(r=>runner.listen(0,'127.0.0.1',r));
 async function start(){child=spawn(process.execPath,['server.js'],{cwd:root,env:{...process.env,PORT:String(port),DB_FILE:dbFile,STUDY_RUNNER_TOKEN:token,STUDY_RUNNER_URL:`http://127.0.0.1:${runner.address().port}`},stdio:['ignore','pipe','pipe']});exited=new Promise(r=>child.once('exit',r));await new Promise((resolve,reject)=>{let out='';const timer=setTimeout(()=>reject(Error('server startup '+out)),5000);child.stderr.on('data',x=>out+=x);child.stdout.on('data',x=>{if(String(x).includes('running')){clearTimeout(timer);resolve();}});child.once('exit',()=>{clearTimeout(timer);reject(Error(out));});});}
 async function stop(){child.kill();await exited;}
 t.after(async()=>{if(child?.exitCode===null){child.kill();await exited;}runner.closeAllConnections();await new Promise(r=>runner.close(r));fs.rmSync(dir,{recursive:true,force:true});});
 await start();const cookies=[];
 async function api(who,url,body,method=body?'POST':'GET',headers={}){const response=await fetch(`http://127.0.0.1:${port}${url}`,{method,headers:{'content-type':'application/json',cookie:cookies[who]||'',...headers},body:body?JSON.stringify(body):undefined});const cookie=response.headers.get('set-cookie');if(cookie)cookies[who]=cookie.split(';')[0];return{status:response.status,data:response.headers.get('content-type')?.includes('application/json')?await response.json():await response.text()};}
 assert.equal((await api(0,'/api/study/catalog')).status,401);
 for(let i=0;i<2;i++)assert.equal((await api(i,'/api/auth/register',{username:'learner'+i,password:'123456'})).status,201);
 const a=await api(0,'/api/study/catalog'),b=await api(1,'/api/study/catalog');assert.equal(a.data.problems.length,183);assert.equal(a.data.plans[0].total,100);assert.equal(b.data.plans[1].solved,0);
 assert.equal((await api(0,'/study.css')).status,200);assert.equal((await api(0,'/study/reference.js')).status,404);assert.equal((await api(0,'/study-runner.js')).status,404);assert.equal((await api(0,'/api/study/status')).data.ready,true);
 assert.deepEqual(a.data.languages.map(x=>x.id),['cpp']);assert.deepEqual(a.data.modes.map(x=>x.id),['LEETCODE','ACM_TEMPLATE','ACM_BLANK']);
 assert.equal(a.data.languages[0].name,'C++11');
 assert.equal((await api(0,'/api/study/problems/1/draft',{language:'cpp',code:'// mine'})).status,200);
 assert.equal((await api(1,'/api/study/problems/1')).data.drafts['cpp:ACM_TEMPLATE'],undefined);
 assert.equal((await api(0,'/api/study/problems/1')).data.drafts['cpp:ACM_TEMPLATE'].code,'// mine');
 assert.equal((await api(0,'/api/study/problems/1/draft',{language:'cpp',mode:'LEETCODE',code:'// function draft'})).status,200);
 assert.equal((await api(0,'/api/study/problems/1/draft',{language:'cpp',mode:'ACM_BLANK',code:''})).status,200);
 const drafts=(await api(0,'/api/study/problems/1')).data.drafts;
 assert.equal(drafts['cpp:LEETCODE'].code,'// function draft');assert.equal(drafts['cpp:ACM_TEMPLATE'].code,'// mine');assert.equal(drafts['cpp:ACM_BLANK'].code,'');
 assert.equal((await api(0,'/api/study/problems/1/draft',{language:'javascript',code:'// removed language'})).status,400);
 assert.equal((await api(0,'/api/study/problems/999999')).status,404);assert.equal((await api(0,'/api/study/problems/1/draft',{language:'bash',code:'hi'})).status,400);
 assert.equal((await api(0,'/api/study/problems/1/draft',{language:'cpp',code:'a'.repeat(32769)})).status,400);
 assert.equal((await api(0,'/api/study/problems/1/draft',{language:'cpp',code:'// old tab'},'POST',{'x-study-account':b.data.me.id})).status,409);
 const payload={language:'cpp',mode:'LEETCODE',code:'// protocol test, never executed',stdin:'[[4,8,2,11],10]\n'};
 const run=await api(0,'/api/study/problems/1/run',payload);assert.equal(run.data.recorded,false);assert.equal((await api(0,'/api/study/submissions')).data.total,0);
 assert.equal(lastPayload.language,'cpp');assert.ok(lastPayload.code.includes('object.twoSum(v0,v1)'),'力扣模式由服务端补齐调用包装');
 const acm=await api(1,'/api/study/problems/1/run',{...payload,mode:'ACM_TEMPLATE',code:'// full main supplied by user'});assert.equal(acm.status,200);assert.equal(lastPayload.code,'// full main supplied by user','ACM模式不加函数包装');
 assert.equal((await api(0,'/api/study/problems/1/run',{...payload,stdin:'not json'})).status,400);
 runnerDelay=200;const pending=api(0,'/api/study/problems/1/submit',payload);await delay(50);assert.equal((await api(0,'/api/study/problems/1/submit',payload)).status,429);
 await api(0,'/api/study/problems/1/draft',{language:'cpp',mode:'LEETCODE',code:'// newer draft while compiling'});
 const ac=await pending;runnerDelay=0;
 assert.equal((await api(0,'/api/study/problems/1')).data.drafts['cpp:LEETCODE'].code,'// newer draft while compiling','判题结果不能回滚较新草稿');
 assert.equal(ac.data.submission.verdict,'AC');assert.equal(ac.data.progress.attempts,1);assert.ok(ac.data.progress.acceptedAt);assert.equal(ac.data.plans[0].solved,1);assert.ok(!JSON.stringify(lastPayload).includes('expected'));
 assert.equal(ac.data.submission.mode,'LEETCODE');assert.ok(ac.data.progress.modes.LEETCODE.acceptedAt);
 assert.equal(ac.data.submission.standard,'c++11');
 const submissionId=ac.data.submission.id;assert.equal((await api(1,`/api/study/submissions/${submissionId}`)).status,404);assert.equal((await api(0,`/api/study/submissions/${submissionId}`)).data.submission.code,payload.code);
 assert.equal((await api(1,'/api/study/catalog')).data.problems.find(p=>p.id==='1').progress,null);
 for(const verdict of['WA','RE','CE']){mode=verdict;const result=await api(0,'/api/study/problems/1/submit',payload);assert.equal(result.data.submission.verdict,verdict);assert.ok(result.data.progress.acceptedAt,'后续失败不能清除已通过');}
 const attempts=(await api(0,'/api/study/problems/1')).data.progress.attempts;
 for(const failure of['UNAVAILABLE','INCOMPLETE']){mode=failure;assert.equal((await api(0,'/api/study/problems/1/submit',payload)).status,503);assert.equal((await api(0,'/api/study/problems/1')).data.progress.attempts,attempts);}
 await stop();await start();for(let i=0;i<2;i++)await api(i,'/api/auth/login',{username:'learner'+i,password:'123456'});
 assert.ok((await api(0,'/api/study/problems/1')).data.progress.acceptedAt);assert.equal((await api(1,'/api/study/catalog')).data.plans[0].solved,0);
 assert.equal((await api(0,'/api/bootstrap')).status,200,'旧游戏接口仍可用');assert.ok(requests>=7);
});
