"use strict";
const crypto=require('node:crypto');
const Problems=require('./study/problems'),Reference=require('./study/reference'),{check}=require('./study/checker');
const LANGUAGES=[{id:'javascript',name:'JavaScript (Node.js 22)'},{id:'python',name:'Python 3'},{id:'cpp',name:'C++17 (含 JSON 头文件)'}];
const busy=new Set();let active=0;const recent=new Map();
const templates={
 javascript:'const fs = require("node:fs");\nconst input = fs.readFileSync(0, "utf8").trim();\nfor (const line of input.split(/\\r?\\n/)) {\n  if (!line.trim()) continue;\n  const args = JSON.parse(line);\n  // args 为参数数组，按题目说明解包。输出一个 JSON 值。\n  const answer = null;\n  console.log(JSON.stringify(answer));\n}\n',
 python:'import sys, json\n\nfor line in sys.stdin:\n    if not line.strip():\n        continue\n    args = json.loads(line)\n    # args 为参数数组，按题目说明解包。\n    answer = None\n    print(json.dumps(answer, ensure_ascii=False))\n',
 cpp:'#include <bits/stdc++.h>\n#include <nlohmann/json.hpp>\nusing namespace std;\nusing json = nlohmann::json;\nint main() {\n    ios::sync_with_stdio(false); cin.tie(nullptr);\n    string line;\n    while (getline(cin, line)) {\n        if (line.empty()) continue;\n        json args = json::parse(line);\n        // 示例: vector<int> nums = args[0].get<vector<int>>();\n        json answer = nullptr;\n        cout << answer.dump() << "\\n";\n    }\n}\n'
};
function error(status,message){return Object.assign(Error(message),{status});}
function progress(user){return user.study?.progress||{};}
function summary(user){const p=progress(user);return Problems.catalog.plans.map(plan=>({...plan,total:plan.ids.length,solved:plan.ids.filter(id=>p[id]?.acceptedAt).length,attempted:plan.ids.filter(id=>(p[id]?.attempts||0)>0).length}));}
function runnerConfig(){const base=process.env.STUDY_RUNNER_URL||'http://127.0.0.1:3999',token=process.env.STUDY_RUNNER_TOKEN||'';if(!token)return null;return{base,token};}
async function runnerCall(route,payload,timeout=55000){const cfg=runnerConfig();if(!cfg)throw error(503,'尚未配置隔离判题服务，请按 deploy/STUDY.md 部署后再运行或提交。');let response;try{response=await fetch(cfg.base+route,{method:payload?'POST':'GET',headers:{authorization:'Bearer '+cfg.token,'content-type':'application/json'},body:payload?JSON.stringify(payload):undefined,signal:AbortSignal.timeout(timeout)});}catch{throw error(503,'隔离判题服务不可用，请联系管理员检查 study-runner。');}const data=await response.json().catch(()=>null);if(!response.ok||!data)throw error(response.status===429?429:503,data?.error||'判题环境异常，请稍后重试');return data;}
async function status(){try{const state=await runnerCall('/health',undefined,6000);return{ready:state.ready===true,message:state.ready?'隔离判题就绪':(state.message||'请准备判题镜像')};}catch(e){return{ready:false,message:e.message};}}
function normalizeStudy(user){user.study||={};user.study.progress||={};user.study.submissions||=[];user.study.drafts||={};return user.study;}
function safeSubmission(s,source=false){const {code,...entry}=s;return source?{...entry,code}:entry;}
async function handle(req,url,user,{body,json,save}){
 if(req.headers['x-study-account']&&req.headers['x-study-account']!==user.id)throw error(409,'账号已在其他页面切换，请刷新学习页面');
 const route=url.pathname;
 if(req.method==='GET'&&route==='/api/study/catalog')return{status:200,data:{me:{id:user.id,username:user.username},plans:summary(user),problems:Problems.catalog.problems.map(p=>({...p,progress:progress(user)[p.id]||null})),languages:LANGUAGES,templates,syncedAt:Problems.catalog.syncedAt}};
 if(req.method==='GET'&&route==='/api/study/status')return{status:200,data:await status()};
 if(req.method==='GET'&&route==='/api/study/submissions'){const id=url.searchParams.get('problemId'),entries=(user.study?.submissions||[]).filter(s=>!id||s.problemId===id);return{status:200,data:{total:entries.length,submissions:entries.slice(-100).reverse().map(s=>safeSubmission(s))}};}
 const submission=route.match(/^\/api\/study\/submissions\/([a-f0-9-]+)$/);
 if(submission&&req.method==='GET'){const s=user.study?.submissions?.find(s=>s.id===submission[1]);if(!s)throw error(404,'提交不存在');return{status:200,data:{submission:safeSubmission(s,true)}};}
 const problem=route.match(/^\/api\/study\/problems\/(\d+)(?:\/(draft|run|submit))?$/);
 if(!problem)throw error(404,'学习接口不存在');
 const p=Problems.get(problem[1]);if(!p)throw error(404,'题目不存在');const operation=problem[2];
 if(req.method==='GET'&&!operation)return{status:200,data:{problem:Problems.detail(p.id),progress:progress(user)[p.id]||null,drafts:user.study?.drafts?.[p.id]||{}}};
 if(req.method!=='POST'||!operation)throw error(405,'不支持的请求方式');
 const data=await body(req);if(!LANGUAGES.some(l=>l.id===data.language))throw error(400,'不支持的语言');
 if(typeof data.code!=='string'||!data.code.trim()||Buffer.byteLength(data.code)>32768)throw error(400,'代码不能为空且不能超过32KB');
 if(operation==='draft'){const study=normalizeStudy(user);study.drafts[p.id]||={};study.drafts[p.id][data.language]={code:data.code,updatedAt:new Date().toISOString()};save();return{status:200,data:{ok:true}};}
 if(busy.has(user.id))throw error(429,'你已有一个判题任务，请等待完成');
 const max=Math.max(1,Math.min(4,Number(process.env.STUDY_CONCURRENCY)||2));if(active>=max)throw error(429,'判题槽位已满，请稍后重试');
 const now=Date.now(),times=(recent.get(user.id)||[]).filter(t=>t>now-60000);if(times.length>=12)throw error(429,'运行过于频繁，请一分钟后重试');
 let inputs;
 if(operation==='run'){if(typeof data.stdin!=='string'||Buffer.byteLength(data.stdin)>16384)throw error(400,'标准输入不能超过16KB');const lines=data.stdin.trim().split(/\r?\n/).filter(s=>s.trim());if(lines.length>12||!lines.length)throw error(400,'运行输入应为1至12行JSON参数数组');for(const line of lines){let args;try{args=JSON.parse(line);}catch{throw error(400,'每行输入必须是有效JSON');}if(!Array.isArray(args))throw error(400,'每行输入必须是参数数组');}inputs=[data.stdin];}
 else inputs=p.cases.map(args=>JSON.stringify(args)+'\n');
 busy.add(user.id);active++;times.push(now);recent.set(user.id,times);
 try{
   const result=await runnerCall('/execute',{language:data.language,code:data.code,inputs});
   if(!['OK','CE'].includes(result.status)||!Array.isArray(result.runs))throw error(503,'判题服务返回异常，未计入进度');
   if(result.status==='OK'&&(result.runs.length!==inputs.length||result.runs.some(r=>!['OK','RE','TLE','OLE'].includes(r.status))))throw error(503,'判题结果不完整，未计入进度');
   if(operation==='run')return{status:200,data:{...result,recorded:false}};
   let verdict=result.status==='CE'?'CE':'AC',passed=0,failed=null;
   if(verdict==='AC')for(let i=0;i<p.cases.length;i++){
     const r=result.runs[i];let actual;let correct=false;
     if(r.status==='OK')try{actual=JSON.parse((r.stdout||'').trim());correct=check(p.id,p.cases[i],actual,Reference.solve(p.id,p.cases[i]));}catch{}
     if(correct){passed++;continue;}
     if(!failed){verdict=r.status==='OK'?'WA':r.status;failed={case:i+1,status:verdict,message:r.status==='OK'?'输出不符合本题JSON协议或答案错误':(r.stderr||r.status).slice(0,2000)};if(i===0){failed.input=JSON.stringify(p.cases[i]);failed.expected=Reference.solve(p.id,p.cases[i]);failed.actual=(r.stdout||'').slice(0,4000);}}
   }
   const study=normalizeStudy(user),entry={id:crypto.randomUUID(),problemId:p.id,title:p.title,language:data.language,verdict,passed,total:p.cases.length,createdAt:new Date().toISOString(),timeMs:Math.max(0,...result.runs.map(r=>Number(r.timeMs)||0)),code:data.code,failed,compileError:result.status==='CE'?(result.compileError||'编译失败').slice(0,8000):undefined};
   study.submissions.push(entry);if(study.submissions.length>500)study.submissions.splice(0,study.submissions.length-500);
   const state=study.progress[p.id]||={attempts:0};state.attempts++;state.lastVerdict=verdict;state.lastSubmittedAt=entry.createdAt;if(verdict==='AC')state.acceptedAt||=entry.createdAt;
   study.drafts[p.id]||={};study.drafts[p.id][data.language]={code:data.code,updatedAt:entry.createdAt};save();
   return{status:200,data:{submission:safeSubmission(entry),progress:state,plans:summary(user)}};
 }finally{busy.delete(user.id);active--;}
}
module.exports={handle,status,templates,summary};
