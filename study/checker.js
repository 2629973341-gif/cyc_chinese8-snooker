"use strict";
const {helpers}=require('./reference');
const canonical=x=>JSON.stringify(x),sortJSON=a=>a.map(canonical).sort();
function equal(a,b,float=false){
  if(typeof a!==typeof b)return false;
  if(typeof b==='number')return Number.isFinite(a)&&(!float&&Number.isInteger(b)?a===b:Math.abs(a-b)<=1e-6*Math.max(1,Math.abs(b)));
  if(Array.isArray(b))return Array.isArray(a)&&a.length===b.length&&b.every((v,i)=>equal(a[i],v,float));
  return a===b;
}
function unordered(a,b,inner=false){if(!Array.isArray(a)||a.length!==b.length)return false;const normalize=x=>inner&&Array.isArray(x)?x.slice().sort((p,q)=>canonical(p).localeCompare(canonical(q))):x;return equal(sortJSON(a.map(normalize)),sortJSON(b.map(normalize)));}
function check(id,args,actual,expected){try{
  id=Number(id);
  if([4,50,637,399].includes(id))return equal(actual,expected,true);
  if([226,105,106].includes(id)){if(!Array.isArray(actual))return false;actual=actual.slice();while(actual.at(-1)===null)actual.pop();return equal(actual,expected);}
  if(id===1||id===167){const [a,t]=args,offset=id===167?1:0;if(!Array.isArray(actual)||actual.length!==2||!actual.every(Number.isInteger))return false;const[i,j]=actual.map(x=>x-offset);return i!==j&&i>=0&&j>=0&&i<a.length&&j<a.length&&a[i]+a[j]===t;}
  if([15,49,39,78,77].includes(id))return unordered(actual,expected,true);
  if([46,22,131,51,212,30].includes(id))return unordered(actual,expected);
  if(id===27)return unordered(actual,expected);
  if(id===5)return typeof actual==='string'&&actual.length===expected.length&&args[0].includes(actual)&&actual===[...actual].reverse().join('');
  if(id===162)return Number.isInteger(actual)&&actual>=0&&actual<args[0].length&&(actual===0||args[0][actual]>args[0][actual-1])&&(actual===args[0].length-1||args[0][actual]>args[0][actual+1]);
  if(id===347){const[a,k]=args;if(!Array.isArray(actual)||actual.length!==k||new Set(actual).size!==k)return false;const count=new Map();for(const x of a)count.set(x,(count.get(x)||0)+1);const threshold=Math.min(...expected.map(x=>count.get(x)));return actual.every(x=>count.has(x)&&count.get(x)>=threshold)&&[...count].every(([x,n])=>n<=threshold||actual.includes(x));}
  if(id===210){const[n,edges]=args;if(!expected.length)return equal(actual,[]);if(!Array.isArray(actual)||actual.length!==n||new Set(actual).size!==n||!actual.every(x=>Number.isInteger(x)&&x>=0&&x<n))return false;const pos=new Map(actual.map((v,i)=>[v,i]));return edges.every(([a,b])=>pos.get(b)<pos.get(a));}
  if(id===108){if(!Array.isArray(actual)||actual.length>args[0].length*3+1||actual.some(x=>x!==null&&!Number.isSafeInteger(x)))return false;actual=actual.slice();while(actual.at(-1)===null)actual.pop();const root=helpers.tree(actual),values=helpers.inorder(root);if(!equal(values,args[0]))return false;function height(n){if(!n)return 0;const l=height(n.left),r=height(n.right);return l<0||r<0||Math.abs(l-r)>1?-1:1+Math.max(l,r);}return height(root)>=0&&equal(helpers.serialize(root),actual);}
  if(id===380){const [ops,params]=args,set=new Set();if(!Array.isArray(actual)||actual.length!==ops.length)return false;return ops.every((op,i)=>{const x=params[i][0];if(op==='RandomizedSet')return actual[i]===null;if(op==='getRandom')return set.has(actual[i]);let result;if(op==='insert'){result=!set.has(x);set.add(x);}else result=set.delete(x);return actual[i]===result;});}
  if(id===133)return Array.isArray(actual)&&actual.length===expected.length&&actual.every((row,i)=>unordered(row,expected[i]));
  if(id===373){const[a,b,k]=args;if(!Array.isArray(actual)||actual.length!==Math.min(k,a.length*b.length))return false;const ca=new Map(),cb=new Map(),used=new Map();for(const x of a)ca.set(x,(ca.get(x)||0)+1);for(const x of b)cb.set(x,(cb.get(x)||0)+1);for(const p of actual){if(!Array.isArray(p)||p.length!==2||!ca.has(p[0])||!cb.has(p[1]))return false;const key=canonical(p),n=(used.get(key)||0)+1;used.set(key,n);if(n>ca.get(p[0])*cb.get(p[1]))return false;}return equal(actual.map(p=>p[0]+p[1]).sort((a,b)=>a-b),expected.map(p=>p[0]+p[1]).sort((a,b)=>a-b));}
  return equal(actual,expected);
}catch{return false;}}
module.exports={check,equal};
