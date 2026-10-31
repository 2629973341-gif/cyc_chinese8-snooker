"use strict";
// 固定种子的补充测试：可复现、不依赖网络。它们仍是本地测试集，不声称等同官方测试。
function extraCases(){
 let seed=20261031;const random=n=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed%n;},out={};
 const add=(id,args)=>(out[id]||=[]).push(args),shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=random(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;};
 for(let test=0;test<8;test++){
   const a=Array.from({length:1+random(22)},()=>random(17)-8),positive=a.map(x=>Math.abs(x)),asc=a.slice().sort((a,b)=>a-b),prices=positive.map(x=>x*3+random(3));
   for(const id of[128,283,53,41,198,300,75,31,27,26,80,121,122,123,274,135,918,152]){
     let data=[a];if([198,274,135].includes(id))data=[positive];if([26,80].includes(id))data=[asc];if([121,122,123].includes(id))data=[prices];if(id===75)data=[positive.map(x=>x%3)];if(id===27)data=[a,random(17)-8];if(id===152)data=[a.slice(0,7)];add(id,data);
   }
   add(560,[a,random(13)-6]);add(215,[a,1+random(a.length)]);add(239,[a,1+random(a.length)]);add(219,[a,random(a.length+1)]);add(189,[a,random(100)]);add(347,[a,1+random(new Set(a).size)]);add(188,[random(5),prices]);
   const n=2+random(12),dup=1+random(n);add(287,[shuffle([...Array.from({length:n},(_,i)=>i+1),dup])]);
   const majority=random(10);add(169,[shuffle([...Array(8).fill(majority),...Array.from({length:7},()=>random(10))])]);
   const powers=shuffle(Array.from({length:8},(_,i)=>2**i));add(1,[powers,powers[0]+powers[5]]);
   const rows=1+random(5),cols=1+random(5),grid=Array.from({length:rows},()=>Array.from({length:cols},()=>random(6)));
   for(const id of[73,54,64])add(id,[grid]);
   add(994,[grid.map(row=>row.map(x=>x%3))]);add(289,[grid.map(row=>row.map(x=>x%2))]);
   add(221,[grid.map(row=>row.map(x=>String(x%2)))]);add(200,[grid.map(row=>row.map(x=>String(x%2)))]);add(130,[grid.map(row=>row.map(x=>x%2?'X':'O'))]);
   const square=Array.from({length:rows},()=>Array.from({length:rows},()=>random(20)));add(48,[square]);
   add(62,[1+random(9),1+random(9)]);
   const edges=[],courses=2+random(7);for(let i=1;i<courses;i++)if(random(2))edges.push([i,random(i)]);if(test%2)edges.push([0,1],[1,0]);add(207,[courses,edges]);add(210,[courses,edges]);
   add(56,[Array.from({length:1+random(7)},()=>{const l=random(15);return[l,l+random(6)];})]);
 }
 return out;
}
module.exports={extraCases};
