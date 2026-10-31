const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const P=require('../study/problems'),R=require('../study/reference'),C=require('../study/checker');

test('官方题单100/150，去重183；每题都有说明、参考程序及至少两组本地测试',()=>{
 assert.deepEqual(P.catalog.plans.map(p=>p.ids.length),[100,150]);assert.equal(P.catalog.problems.length,183);
 assert.equal(new Set(P.catalog.problems.map(p=>p.id)).size,183);
 for(const p of P.catalog.problems){const d=P.detail(p.id);assert.ok(d.statement&&d.parameters&&d.solutions[0].code);assert.ok(d.testCount>=2&&d.testCount<=48);assert.equal(d.cases,undefined);assert.ok(d.source.startsWith('https://leetcode.cn/problems/'));}
});

test('183份完整ACM参考程序逐题执行全部本地测试，输出可被判题器接受',()=>{
 // 这里只运行仓库内可信参考程序，不把 vm 用作用户提交的安全沙箱。
 let total=0;
 for(const p of P.catalog.problems){
  const args=P.get(p.id).cases,input=args.map(JSON.stringify).join('\n'),outputs=[];
  const sandbox={require:name=>{assert.equal(name,'node:fs');return{readFileSync:()=>input};},console:{log:x=>outputs.push(x)}};
  new vm.Script(R.program(p.id),{filename:'reference-'+p.id}).runInNewContext(sandbox,{timeout:1500});
  assert.equal(outputs.length,args.length,p.id+' line count');
  for(let i=0;i<args.length;i++){const actual=JSON.parse(outputs[i]),expected=R.solve(p.id,args[i]);assert.ok(C.check(p.id,args[i],actual,expected),`${p.id} case ${i+1}`);total++;}
 }
 assert.ok(total>=1000);
});

test('非唯一解、浮点、树结构、随机集合和拓扑顺序有专门校验，不锁死参考输出',()=>{
 assert.ok(C.check(1,[[4,2,7],9],[2,1],[1,2]));assert.ok(!C.check(1,[[4,2,7],9],[1,1],[1,2]));
 assert.ok(C.check(49,[['ab','ba','a']],[['a'],['ba','ab']],[['ab','ba'],['a']]));
 assert.ok(!C.check(46,[[1,2]],[[1,2],[1,2]],[[1,2],[2,1]]));
 assert.ok(C.check(5,['babad'],'aba','bab'));assert.ok(!C.check(5,['babad'],'bad','bab'));
 assert.ok(C.check(210,[3,[[2,0],[2,1]]],[1,0,2],[0,1,2]));assert.ok(!C.check(210,[3,[[2,0],[2,1]]],[2,0,1],[0,1,2]));
 assert.ok(C.check(108,[[1,2]],[1,null,2],[2,1]));assert.ok(!C.check(108,[[1,2,3,4]],[1,null,2,null,3,null,4],[3,2,4,1]));
 assert.ok(C.check(347,[[1,2,3],2],[3,2],[1,2]));assert.ok(!C.check(347,[[1,1,2],1],[2],[1]));
 assert.ok(C.check(373,[[1,2],[1,2],2],[[1,1],[2,1]],[[1,1],[1,2]]));assert.ok(!C.check(373,[[1],[1,2],2],[[1,1],[1,1]],[[1,1],[1,2]]));
 const ops=[['RandomizedSet','insert','insert','getRandom'],[[],[1],[2],[]]];
 assert.ok(C.check(380,ops,[null,true,true,2],[]));assert.ok(!C.check(380,ops,[null,true,true,3],[]));
 assert.ok(C.check(399,[],[2.00000001],[2]));assert.ok(!C.check(1,[[1,2],3],[0,0.99999999],[0,1]));
});

test('固定金标准与独立穷举核对常见算法，覆盖负数、重复值、窗口和环形边界',()=>{
 const golden=[[42,[[3,0,2,0,4]],7],[4,[[1,4],[2,3]],2.5],[224,['1-(2-3)+4'],6],[69,[2147483647],46340],[137,[[2,2,2,-7]],-7],[918,[[-4,-2,-7]],-2],[97,['aab','axy','aaxaby'],true],[909,[[[-1,-1,-1],[-1,-1,-1],[-1,9,-1]]],1],[149,[[[0,0],[0,1],[0,2]]],3]];
 for(const[id,args,expected]of golden)assert.deepEqual(R.solve(id,args),expected,String(id));
 for(const args of P.get(560).cases){const[a,k]=args;let total=0;for(let i=0;i<a.length;i++){let s=0;for(let j=i;j<a.length;j++){s+=a[j];if(s===k)total++;}}assert.equal(R.solve(560,args),total);}
 for(const args of P.get(53).cases){const[a]=args;let best=-Infinity;for(let i=0;i<a.length;i++){let s=0;for(let j=i;j<a.length;j++){s+=a[j];best=Math.max(best,s);}}assert.equal(R.solve(53,args),best);}
 for(const args of P.get(239).cases){const[a,k]=args;const expected=Array.from({length:a.length-k+1},(_,i)=>Math.max(...a.slice(i,i+k)));assert.deepEqual(R.solve(239,args),expected);}
 for(const args of P.get(300).cases){const[a]=args,dp=a.map(()=>1);for(let i=0;i<a.length;i++)for(let j=0;j<i;j++)if(a[j]<a[i])dp[i]=Math.max(dp[i],dp[j]+1);assert.equal(R.solve(300,args),Math.max(0,...dp));}
});
