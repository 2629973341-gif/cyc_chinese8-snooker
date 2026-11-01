"use strict";
const catalog=require('./catalog.json');
const ZONE='Asia/Shanghai',DAY=86400000;
const formatter=new Intl.DateTimeFormat('en-CA',{timeZone:ZONE,year:'numeric',month:'2-digit',day:'2-digit'});
function dateKey(now=new Date()){return formatter.format(new Date(now));}
function shift(day,days){return new Date(Date.parse(day+'T00:00:00Z')+days*DAY).toISOString().slice(0,10);}
function bad(message){throw Object.assign(Error(message),{status:400});}
function configure(user,data,now=new Date()){
 if(!data||typeof data!=='object')bad('计划参数无效');
 const collection=catalog.plans.find(p=>p.id===data.collection);
 if(!collection)bad('请选择Hot100或面试经典150');
 if(!Number.isInteger(data.dailyGoal)||data.dailyGoal<1||data.dailyGoal>30)bad('每日目标应为1至30题');
 const startDate=data.startDate||dateKey(now);
 if(!/^\d{4}-\d{2}-\d{2}$/.test(startDate)||!Number.isFinite(Date.parse(startDate))||shift(startDate,0)!==startDate)bad('开始日期无效');
 if(startDate<shift(dateKey(now),-365)||startDate>shift(dateKey(now),365))bad('开始日期应在前后一年以内');
 user.study||={};user.study.schedule={collection:collection.id,dailyGoal:data.dailyGoal,startDate,updatedAt:new Date(now).toISOString()};return dashboard(user,now);
}
function recordAttempt(user,{problemId,verdict},now=new Date()){
 user.study||={};user.study.daily||={};const day=dateKey(now),entry=user.study.daily[day]||={attempted:[],solved:[]};
 if(!entry.attempted.includes(String(problemId)))entry.attempted.push(String(problemId));
 if(verdict==='AC'&&!entry.solved.includes(String(problemId)))entry.solved.push(String(problemId));
}
function dashboard(user,now=new Date()){
 const today=dateKey(now),study=user.study||{},schedule=study.schedule||null,daily={},checks=study.checkins||{},progress=study.progress||{};
 for(const [day,value]of Object.entries(study.daily||{}))daily[day]={attempted:[...value.attempted],solved:[...value.solved]};
 // Older accounts can count existing submissions today; never invent old check-ins.
 for(const s of study.submissions||[]){if(!Number.isFinite(Date.parse(s.createdAt)))continue;const day=dateKey(s.createdAt),id=String(s.problemId),entry=daily[day]||={attempted:[],solved:[]};if(!entry.attempted.includes(id))entry.attempted.push(id);if(s.verdict==='AC'&&!entry.solved.includes(id))entry.solved.push(id);}
 const collection=catalog.plans.find(p=>p.id===schedule?.collection),remaining=collection?collection.ids.filter(id=>!progress[id]?.acceptedAt):[];
 const activity=daily[today]||{attempted:[],solved:[]},completed=schedule?activity.solved.filter(id=>collection.ids.includes(id)):activity.solved;
 const active=!!schedule&&today>=schedule.startDate,goal=schedule?.dailyGoal||0;
 const todo=active?remaining.slice(0,Math.max(0,goal-completed.length)):[];
 let streak=0,day=checks[today]?today:shift(today,-1);while(checks[day]){streak++;day=shift(day,-1);}
 const calendar=Array.from({length:35},(_,i)=>{const date=shift(today,i-34);return{date,checked:!!checks[date],attempted:daily[date]?.attempted.length||0,solved:daily[date]?.solved.length||0};});
 return{today,timeZone:ZONE,schedule,active,todaySolved:completed.length,todayAttempted:activity.attempted.length,dailyGoal:goal,goalMet:active&&completed.length>=goal,eligible:activity.attempted.length>0,checked:!!checks[today],streak,totalCheckins:Object.keys(checks).length,calendar,suggested:todo.map(id=>{const p=catalog.problems.find(p=>p.id===id);return{id,title:p.title,difficulty:p.difficulty};}),remaining:remaining.length,estimatedFinish:schedule&&remaining.length?shift(active?today:schedule.startDate,active?Math.ceil(Math.max(0,remaining.length-Math.max(0,goal-completed.length))/goal):Math.max(0,Math.ceil(remaining.length/goal)-1)):null};
}
function checkin(user,now=new Date()){
 const state=dashboard(user,now);if(state.checked)return state;
 if(!state.eligible)bad('今天至少提交一道题（不限是否通过）后才能打卡，自测不计入');
 user.study||={};user.study.checkins||={};user.study.checkins[state.today]={at:new Date(now).toISOString()};return dashboard(user,now);
}
module.exports={dateKey,configure,recordAttempt,dashboard,checkin};
