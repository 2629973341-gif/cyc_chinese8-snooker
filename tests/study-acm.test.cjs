const test=require('node:test'),assert=require('node:assert/strict');
const P=require('../study/problems'),R=require('../study/reference'),A=require('../study/acm'),Cpp=require('../study/cpp'),Planner=require('../study/planner'),{check}=require('../study/checker');
test('183题普通ACM均有真实cin/main模板、普通格式说明和完整C++11解答，兼容JSON保留',()=>{
 for(const p of P.catalog.problems){const d=P.detail(p.id),t=Cpp.templates(p.id);assert.match(t.ACM_TEMPLATE,/int main\(\)/);assert.match(t.ACM_TEMPLATE,/core code template start/);assert.doesNotMatch(t.ACM_TEMPLATE,/nlohmann|json::/);assert.ok(d.acm.input.length);assert.ok(d.acm.description);for(const s of d.solutions){assert.doesNotMatch(s.acmCode,/nlohmann|json::/);assert.match(s.legacyAcmCode,/json::parse/);}for(const args of P.get(p.id).cases){const expected=R.solve(p.id,args);assert.ok(check(p.id,args,A.decode(p.id,A.output(p.id,expected)),expected));}}
 assert.equal(A.encode(1,[[4,8,2,11],10]),'4 10\n4 8 2 11\n');assert.deepEqual(A.decode(1,'0 2\n'),[0,2]);assert.match(Cpp.templates(1).ACM_TEMPLATE,/while \(cin >> n >> target\)/);assert.match(Cpp.templates(1).ACM_TEMPLATE,/#include <unordered_map>/);
 assert.equal(Cpp.templates(1).ACM_BLANK,'');assert.match(Cpp.legacyTemplates(1).ACM_TEMPLATE,/json::parse/);
 assert.throws(()=>A.decode(70,'3 9'));assert.throws(()=>A.decode(1,'0 abc'));assert.equal(A.decode(3,'2\n'),2);assert.equal(A.decode(5,' a b \n'),' a b ');
});
test('计划按账号隔离、跳过已通过题，校验每日目标和日期',()=>{
 const u={study:{progress:{1:{acceptedAt:'old'}}}},other={},now='2026-10-31T00:00:00Z';
 const state=Planner.configure(u,{collection:'HOT100',dailyGoal:3,startDate:'2026-10-31'},now);assert.equal(state.suggested.length,3);assert.ok(!state.suggested.some(x=>x.id==='1'));assert.equal(Planner.dashboard(other,now).schedule,null);
 for(const dailyGoal of[0,31,1.5,'3'])assert.throws(()=>Planner.configure(u,{collection:'HOT100',dailyGoal},now),{status:400});
 assert.throws(()=>Planner.configure(u,{collection:'ALL',dailyGoal:3},now),{status:400});assert.throws(()=>Planner.configure(u,{collection:'HOT100',dailyGoal:3,startDate:'2026-02-30'},now),{status:400});
 const future=Planner.configure(u,{collection:'HOT100',dailyGoal:3,startDate:'2026-11-01'},now);assert.equal(future.active,false);assert.equal(future.suggested.length,0);
});
test('北京时间跨日、提交去重、打卡幂等、断签重算；打卡不伪造通过进度',()=>{
 const u={},before='2026-10-31T15:59:59Z',after='2026-10-31T16:00:01Z';
 assert.equal(Planner.dateKey(before),'2026-10-31');assert.equal(Planner.dateKey(after),'2026-11-01');
 assert.throws(()=>Planner.checkin(u,before),{status:400});
 Planner.recordAttempt(u,{problemId:'1',verdict:'WA'},before);assert.equal(Planner.checkin(u,before).streak,1);assert.equal(Planner.checkin(u,before).totalCheckins,1);assert.equal(u.study.progress,undefined);
 Planner.recordAttempt(u,{problemId:'1',verdict:'AC'},before);Planner.recordAttempt(u,{problemId:'1',verdict:'AC'},before);assert.equal(Planner.dashboard(u,before).todaySolved,1);
 assert.equal(Planner.dashboard(u,after).checked,false);assert.equal(Planner.dashboard(u,after).todayAttempted,0);assert.equal(Planner.dashboard(u,after).streak,1);
 Planner.recordAttempt(u,{problemId:'2',verdict:'CE'},after);assert.equal(Planner.checkin(u,after).streak,2);const later='2026-11-03T00:00:00Z';Planner.recordAttempt(u,{problemId:'3',verdict:'AC'},later);assert.equal(Planner.checkin(u,later).streak,1);
});
test('上线前已有的当天提交计入练习，但不自动补签旧日期',()=>{
 const user={study:{submissions:[{problemId:'1',verdict:'AC',createdAt:'2026-10-31T02:00:00Z'},{problemId:'1',verdict:'AC',createdAt:'2026-10-31T03:00:00Z'}]}};
 const state=Planner.dashboard(user,'2026-10-31T12:00:00Z');assert.equal(state.todaySolved,1);assert.equal(state.todayAttempted,1);assert.equal(state.checked,false);assert.equal(Planner.checkin(user,'2026-10-31T12:00:00Z').checked,true);
 assert.equal(Planner.dashboard(user,'2026-11-02T00:00:00Z').eligible,false);
});
