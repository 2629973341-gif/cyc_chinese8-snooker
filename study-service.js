"use strict";
const crypto=require('node:crypto');
const Problems=require('./study/problems'),Reference=require('./study/reference'),{check}=require('./study/checker');
const Cpp=require('./study/cpp');
const Acm=require('./study/acm'),Planner=require('./study/planner');
const LANGUAGES=[{id:'cpp',name:'C++11'}];
const busy=new Set();let active=0;const recent=new Map();
function error(status,message){return Object.assign(Error(message),{status});}
function progress(user){return user.study?.progress||{};}
function summary(user){const p=progress(user);return Problems.catalog.plans.map(plan=>({...plan,total:plan.ids.length,solved:plan.ids.filter(id=>p[id]?.acceptedAt).length,attempted:plan.ids.filter(id=>(p[id]?.attempts||0)>0).length}));}
function runnerConfig(){const base=process.env.STUDY_RUNNER_URL||'http://127.0.0.1:3999',token=process.env.STUDY_RUNNER_TOKEN||'';if(!token)return null;return{base,token};}
async function runnerCall(route,payload,timeout=55000){const cfg=runnerConfig();if(!cfg)throw error(503,'尚未安装轻量判题服务。无需Docker，按 deploy/STUDY.md 安装本机C++编译器与小型沙箱即可。');let response;try{response=await fetch(cfg.base+route,{method:payload?'POST':'GET',headers:{authorization:'Bearer '+cfg.token,'content-type':'application/json'},body:payload?JSON.stringify(payload):undefined,signal:AbortSignal.timeout(timeout)});}catch{throw error(503,'轻量判题服务不可用，请检查 study-runner；题目、解答与草稿仍可使用。');}const data=await response.json().catch(()=>null);if(!response.ok||!data)throw error(response.status===429?429:503,data?.error||'判题环境异常，请稍后重试');return data;}
async function status(){try{const state=await runnerCall('/health',undefined,6000);return{ready:state.ready===true,backend:state.backend||'native',concurrency:1,message:state.message||(state.ready?'轻量C++判题就绪':'请安装本机C++编译器与Bubblewrap沙箱')};}catch(e){return{ready:false,backend:'native',concurrency:1,message:e.message};}}
function normalizeStudy(user){user.study||={};user.study.progress||={};user.study.submissions||=[];user.study.drafts||={};return user.study;}
function safeSubmission(s,source=false){const {code,...entry}=s;return source?{...entry,code}:entry;}
async function handle(req,url,user,{body,json,save}){
 if(req.headers['x-study-account']&&req.headers['x-study-account']!==user.id)throw error(409,'账号已在其他页面切换，请刷新学习页面');
 const route=url.pathname;
 if(req.method==='GET'&&route==='/api/study/dashboard')return{status:200,data:Planner.dashboard(user)};
 if(req.method==='POST'&&route==='/api/study/schedule'){const state=Planner.configure(user,await body(req));save();return{status:200,data:state};}
 if(req.method==='POST'&&route==='/api/study/checkin'){const state=Planner.checkin(user);save();return{status:200,data:state};}
 if(req.method==='GET'&&route==='/api/study/catalog')return{status:200,data:{me:{id:user.id,username:user.username},plans:summary(user),problems:Problems.catalog.problems.map(p=>({...p,progress:progress(user)[p.id]||null})),languages:LANGUAGES,modes:Cpp.MODES,syncedAt:Problems.catalog.syncedAt}};
 if(req.method==='GET'&&route==='/api/study/status')return{status:200,data:await status()};
 if(req.method==='GET'&&route==='/api/study/submissions'){const id=url.searchParams.get('problemId'),entries=(user.study?.submissions||[]).filter(s=>!id||s.problemId===id);return{status:200,data:{total:entries.length,submissions:entries.slice(-100).reverse().map(s=>safeSubmission(s))}};}
 const submission=route.match(/^\/api\/study\/submissions\/([a-f0-9-]+)$/);
 if(submission&&req.method==='GET'){const s=user.study?.submissions?.find(s=>s.id===submission[1]);if(!s)throw error(404,'提交不存在');return{status:200,data:{submission:safeSubmission(s,true)}};}
 const problem=route.match(/^\/api\/study\/problems\/(\d+)(?:\/(draft|run|submit))?$/);
 if(!problem)throw error(404,'学习接口不存在');
 const p=Problems.get(problem[1]);if(!p)throw error(404,'题目不存在');const operation=problem[2];
 if(req.method==='GET'&&!operation)return{status:200,data:{problem:Problems.detail(p.id),progress:progress(user)[p.id]||null,drafts:user.study?.drafts?.[p.id]||{},templates:Cpp.templates(p.id),legacyTemplates:Cpp.legacyTemplates(p.id)}};
 if(req.method!=='POST'||!operation)throw error(405,'不支持的请求方式');
 const data=await body(req);if(!LANGUAGES.some(l=>l.id===data.language))throw error(400,'不支持的语言');
 const mode=data.mode||'ACM_TEMPLATE';if(!Cpp.MODES.some(m=>m.id===mode))throw error(400,'不支持的练习模式');
 const ioFormat=mode==='LEETCODE'?'JSON':data.ioFormat||'JSON';if(!['JSON','TEXT'].includes(ioFormat))throw error(400,'不支持的输入格式');
 if(typeof data.code!=='string'||Buffer.byteLength(data.code)>32768||operation!=='draft'&&!data.code.trim())throw error(400,'代码不能为空且不能超过32KB');
 const draftKey='cpp:'+mode+(ioFormat==='TEXT'?':TEXT':'');
 if(operation==='draft'){const study=normalizeStudy(user);study.drafts[p.id]||={};study.drafts[p.id][draftKey]={code:data.code,updatedAt:new Date().toISOString(),mode};save();return{status:200,data:{ok:true}};}
 if(busy.has(user.id))throw error(429,'你已有一个判题任务，请等待完成');
 const max=1;if(active>=max)throw error(429,'轻量判题一次处理一份代码，请稍后重试');
 const now=Date.now(),times=(recent.get(user.id)||[]).filter(t=>t>now-60000);if(times.length>=12)throw error(429,'运行过于频繁，请一分钟后重试');
 let inputs;
 if(operation==='run'){if(typeof data.stdin!=='string'||Buffer.byteLength(data.stdin)>16384)throw error(400,'标准输入不能超过16KB');if(ioFormat==='JSON'){const lines=data.stdin.trim().split(/\r?\n/).filter(s=>s.trim());if(lines.length>12||!lines.length)throw error(400,'运行输入应为1至12行JSON参数数组');for(const line of lines){let args;try{args=JSON.parse(line);}catch{throw error(400,'每行输入必须是有效JSON');}if(!Array.isArray(args))throw error(400,'每行输入必须是参数数组');}}else if(!data.stdin.length)throw error(400,'请输入本题普通文本示例，可连续输入多组');inputs=[data.stdin];}
 else inputs=p.cases.map(args=>ioFormat==='TEXT'?Acm.encode(p.id,args):JSON.stringify(args)+'\n');
 const draftBeforeRun=user.study?.drafts?.[p.id]?.[draftKey];
 busy.add(user.id);active++;times.push(now);recent.set(user.id,times);
 try{
   const result=await runnerCall('/execute',{language:'cpp',code:Cpp.wrap(p.id,data.code,mode),inputs,ioFormat,problemId:p.id});
   if(!['OK','CE'].includes(result.status)||!Array.isArray(result.runs))throw error(503,'判题服务返回异常，未计入进度');
   if(result.status==='OK'&&(result.runs.length!==inputs.length||result.runs.some(r=>!['OK','RE','TLE','OLE'].includes(r.status))))throw error(503,'判题结果不完整，未计入进度');
   if(operation==='run')return{status:200,data:{...result,recorded:false}};
   let verdict=result.status==='CE'?'CE':'AC',passed=0,failed=null;
   if(verdict==='AC')for(let i=0;i<p.cases.length;i++){
     const r=result.runs[i];let actual;let correct=false;
     if(r.status==='OK')try{actual=ioFormat==='TEXT'?Acm.decode(p.id,r.stdout||''):JSON.parse((r.stdout||'').trim());correct=check(p.id,p.cases[i],actual,Reference.solve(p.id,p.cases[i]));}catch{}
     if(correct){passed++;continue;}
     if(!failed){verdict=r.status==='OK'?'WA':r.status;failed={case:i+1,status:verdict,message:r.status==='OK'?'输出不符合本题格式或答案错误':(r.stderr||r.status).slice(0,2000)};if(i===0){failed.input=ioFormat==='TEXT'?Acm.encode(p.id,p.cases[i]):JSON.stringify(p.cases[i]);failed.expected=ioFormat==='TEXT'?Acm.output(p.id,Reference.solve(p.id,p.cases[i])):Reference.solve(p.id,p.cases[i]);failed.actual=(r.stdout||'').slice(0,4000);}}
   }
   const study=normalizeStudy(user),entry={id:crypto.randomUUID(),problemId:p.id,title:p.title,language:'cpp',standard:'c++11',mode,verdict,passed,total:p.cases.length,createdAt:new Date().toISOString(),timeMs:Math.max(0,...result.runs.map(r=>Number(r.timeMs)||0)),code:data.code,failed,compileError:result.status==='CE'?(result.compileError||'编译失败').slice(0,8000):undefined};
   study.submissions.push(entry);if(study.submissions.length>500)study.submissions.splice(0,study.submissions.length-500);
   entry.ioFormat=ioFormat;Planner.recordAttempt(user,{problemId:p.id,verdict},entry.createdAt);
   const state=study.progress[p.id]||={attempts:0};state.attempts++;state.lastVerdict=verdict;state.lastSubmittedAt=entry.createdAt;if(verdict==='AC')state.acceptedAt||=entry.createdAt;
   state.modes||={};state.modes[mode]||={attempts:0};state.modes[mode].attempts++;if(verdict==='AC')state.modes[mode].acceptedAt||=entry.createdAt;
   study.drafts[p.id]||={};
   // 编译期间可能又自动保存了新代码；完成提交不能用旧快照覆盖较新的草稿。
   if(!study.drafts[p.id][draftKey]||study.drafts[p.id][draftKey]===draftBeforeRun)study.drafts[p.id][draftKey]={code:data.code,updatedAt:entry.createdAt,mode};
   save();
   return{status:200,data:{submission:safeSubmission(entry),progress:state,plans:summary(user)}};
 }finally{busy.delete(user.id);active--;}
}
module.exports={handle,status,summary};
