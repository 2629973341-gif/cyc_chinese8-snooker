"use strict";
// 本站原创参考实现。只在可信目录中作为判题 oracle；绝不 eval 用户提交。
const sum=a=>a.reduce((s,x)=>s+x,0),sorted=a=>a.slice().sort((a,b)=>a-b);
function toList(values){const dummy={next:null};let tail=dummy;for(const val of values){tail.next={val,next:null};tail=tail.next;}return dummy.next;}
function fromList(head){const out=[];while(head){out.push(head.val);head=head.next;}return out;}
function cycleList(values,pos){const nodes=values.map(val=>({val,next:null}));for(let i=0;i<nodes.length-1;i++)nodes[i].next=nodes[i+1];if(nodes.length&&pos>=0)nodes.at(-1).next=nodes[pos];return nodes[0]||null;}
function reverseList(head){let prev=null;while(head){const next=head.next;head.next=prev;prev=head;head=next;}return prev;}
function tree(values){if(!values.length||values[0]===null)return null;const root={val:values[0],left:null,right:null},q=[root];let i=1;for(let h=0;h<q.length&&i<values.length;h++)for(const key of ['left','right']){const v=values[i++];if(v!==null&&v!==undefined){q[h][key]={val:v,left:null,right:null};q.push(q[h][key]);}}return root;}
function serialize(root){if(!root)return [];const q=[root],out=[];for(let i=0;i<q.length;i++){const n=q[i];out.push(n?n.val:null);if(n)q.push(n.left,n.right);}while(out.at(-1)===null)out.pop();return out;}
function levels(values){const root=tree(values),out=[],q=root?[root]:[];for(let h=0;h<q.length;){const end=q.length,row=[];while(h<end){const n=q[h++];row.push(n.val);if(n.left)q.push(n.left);if(n.right)q.push(n.right);}out.push(row);}return out;}
function inorder(root){return root?[...inorder(root.left),root.val,...inorder(root.right)]:[];}
function combinations(a,k,start=0){if(k===0)return [[]];const out=[];for(let i=start;i<=a.length-k;i++)for(const tail of combinations(a,k-1,i+1))out.push([a[i],...tail]);return out;}
function queens(n){const out=[],cols=new Set(),d1=new Set(),d2=new Set(),path=[];function dfs(r){if(r===n){out.push(path.map(c=>'.'.repeat(c)+'Q'+'.'.repeat(n-c-1)));return;}for(let c=0;c<n;c++)if(!cols.has(c)&&!d1.has(r-c)&&!d2.has(r+c)){cols.add(c);d1.add(r-c);d2.add(r+c);path.push(c);dfs(r+1);path.pop();cols.delete(c);d1.delete(r-c);d2.delete(r+c);}}dfs(0);return out;}
function topo(n,edges){const g=Array.from({length:n},()=>[]),ind=Array(n).fill(0);for(const [a,b]of edges){g[b].push(a);ind[a]++;}const q=[];for(let i=0;i<n;i++)if(!ind[i])q.push(i);for(let h=0;h<q.length;h++)for(const v of g[q[h]])if(!--ind[v])q.push(v);return q.length===n?q:[];}
function wordExists(board,word){const seen=new Set();function dfs(r,c,i){if(i===word.length)return true;if(r<0||c<0||r>=board.length||c>=board[0].length||seen.has(r+','+c)||board[r][c]!==word[i])return false;const key=r+','+c;seen.add(key);const yes=[[1,0],[-1,0],[0,1],[0,-1]].some(([dr,dc])=>dfs(r+dr,c+dc,i+1));seen.delete(key);return yes;}return board.some((row,r)=>row.some((_,c)=>dfs(r,c,0)));}
function stock(k,prices){const buy=Array(k+1).fill(-Infinity),sell=Array(k+1).fill(0);for(const p of prices)for(let j=k;j>=1;j--){sell[j]=Math.max(sell[j],buy[j]+p);buy[j]=Math.max(buy[j],sell[j-1]-p);}return sell[k];}
const solutions={
  1:(a,t)=>{const m=new Map();for(let i=0;i<a.length;i++){if(m.has(t-a[i]))return[m.get(t-a[i]),i];m.set(a[i],i);}return[];},
  49:a=>{const m=new Map();for(const s of a){const k=[...s].sort().join('');if(!m.has(k))m.set(k,[]);m.get(k).push(s);}return[...m.values()];},
  128:a=>{const s=new Set(a);let best=0;for(const x of s)if(!s.has(x-1)){let y=x;while(s.has(y))y++;best=Math.max(best,y-x);}return best;},
  283:a=>[...a.filter(x=>x!==0),...a.filter(x=>x===0)],
  11:a=>{let l=0,r=a.length-1,best=0;while(l<r){best=Math.max(best,(r-l)*Math.min(a[l],a[r]));if(a[l]<a[r])l++;else r--;}return best;},
  15:a=>{a=sorted(a);const out=[];for(let i=0;i<a.length-2;i++){if(i&&a[i]===a[i-1])continue;let l=i+1,r=a.length-1;while(l<r){const s=a[i]+a[l]+a[r];if(s===0){out.push([a[i],a[l],a[r]]);const x=a[l],y=a[r];while(l<r&&a[l]===x)l++;while(l<r&&a[r]===y)r--;}else if(s<0)l++;else r--;}}return out;},
  42:a=>{let l=0,r=a.length-1,lm=0,rm=0,res=0;while(l<=r){if(lm<=rm){lm=Math.max(lm,a[l]);res+=lm-a[l++];}else{rm=Math.max(rm,a[r]);res+=rm-a[r--];}}return res;},
  3:s=>{const m=new Map();let l=0,best=0;for(let r=0;r<s.length;r++){l=Math.max(l,(m.get(s[r])??-1)+1);m.set(s[r],r);best=Math.max(best,r-l+1);}return best;},
  438:(s,p)=>{const need=Array(26).fill(0),win=Array(26).fill(0),out=[];for(const c of p)need[c.charCodeAt(0)-97]++;for(let r=0;r<s.length;r++){win[s.charCodeAt(r)-97]++;if(r>=p.length)win[s.charCodeAt(r-p.length)-97]--;if(r>=p.length-1&&win.every((v,i)=>v===need[i]))out.push(r-p.length+1);}return out;},
  560:(a,k)=>{const count=new Map([[0,1]]);let s=0,res=0;for(const x of a){s+=x;res+=count.get(s-k)||0;count.set(s,(count.get(s)||0)+1);}return res;},
  239:(a,k)=>{const q=[],out=[];let h=0;for(let i=0;i<a.length;i++){while(h<q.length&&q[h]<=i-k)h++;while(h<q.length&&a[q.at(-1)]<=a[i])q.pop();q.push(i);if(i>=k-1)out.push(a[q[h]]);}return out;},
  76:(s,t)=>{const need=new Map();for(const c of t)need.set(c,(need.get(c)||0)+1);let missing=t.length,l=0,start=0,len=Infinity;for(let r=0;r<s.length;r++){const c=s[r];if((need.get(c)||0)>0)missing--;need.set(c,(need.get(c)||0)-1);while(!missing){if(r-l+1<len){start=l;len=r-l+1;}const x=s[l++];need.set(x,(need.get(x)||0)+1);if(need.get(x)>0)missing++;}}return len===Infinity?'':s.slice(start,start+len);},
  53:a=>{let best=a[0],cur=0;for(const x of a){cur=Math.max(x,cur+x);best=Math.max(best,cur);}return best;},
  56:a=>{const out=[];for(const [l,r]of a.slice().sort((x,y)=>x[0]-y[0])){if(out.length&&out.at(-1)[1]>=l)out.at(-1)[1]=Math.max(out.at(-1)[1],r);else out.push([l,r]);}return out;},
  189:(a,k)=>{k%=a.length;return k?[...a.slice(-k),...a.slice(0,-k)]:a.slice();},
  238:a=>{const out=Array(a.length).fill(1);let p=1;for(let i=0;i<a.length;i++){out[i]=p;p*=a[i];}p=1;for(let i=a.length-1;i>=0;i--){out[i]*=p;p*=a[i];}return out;},
  41:a=>{a=a.slice();for(let i=0;i<a.length;i++)while(a[i]>0&&a[i]<=a.length&&a[a[i]-1]!==a[i]){const j=a[i]-1;[a[i],a[j]]=[a[j],a[i]];}return a.findIndex((x,i)=>x!==i+1)===-1?a.length+1:a.findIndex((x,i)=>x!==i+1)+1;},
  73:a=>{const rs=new Set(),cs=new Set();a.forEach((row,r)=>row.forEach((x,c)=>{if(x===0){rs.add(r);cs.add(c);}}));return a.map((row,r)=>row.map((x,c)=>rs.has(r)||cs.has(c)?0:x));},
  54:a=>{const out=[];let top=0,bottom=a.length-1,left=0,right=a[0].length-1;while(top<=bottom&&left<=right){for(let c=left;c<=right;c++)out.push(a[top][c]);top++;for(let r=top;r<=bottom;r++)out.push(a[r][right]);right--;if(top<=bottom){for(let c=right;c>=left;c--)out.push(a[bottom][c]);bottom--;}if(left<=right){for(let r=bottom;r>=top;r--)out.push(a[r][left]);left++;}}return out;},
  48:a=>a[0].map((_,c)=>a.map(row=>row[c]).reverse()),
  240:(a,t)=>{let r=0,c=a[0].length-1;while(r<a.length&&c>=0){if(a[r][c]===t)return true;if(a[r][c]>t)c--;else r++;}return false;},
  160:(a,b,skipA,skipB)=>{const shared=skipA<a.length?toList(a.slice(skipA)):null;function attach(prefix){const dummy={next:toList(prefix)};let tail=dummy;while(tail.next)tail=tail.next;tail.next=shared;return dummy.next;}const ha=attach(a.slice(0,skipA)),hb=attach(b.slice(0,skipB));let x=ha,y=hb;while(x!==y){x=x?x.next:hb;y=y?y.next:ha;}return x?x.val:null;},
  206:a=>fromList(reverseList(toList(a))),
  234:a=>{const head=toList(a);if(!head)return true;let slow=head,fast=head;while(fast.next&&fast.next.next){slow=slow.next;fast=fast.next.next;}const second=reverseList(slow.next);let x=head,y=second,ok=true;while(y){if(x.val!==y.val)ok=false;x=x.next;y=y.next;}slow.next=reverseList(second);return ok;},
  141:(a,pos)=>{let slow=cycleList(a,pos),fast=slow;while(fast&&fast.next){slow=slow.next;fast=fast.next.next;if(slow===fast)return true;}return false;},
  142:(a,pos)=>{const head=cycleList(a,pos);let slow=head,fast=head;while(fast&&fast.next){slow=slow.next;fast=fast.next.next;if(slow===fast){slow=head;let i=0;while(slow!==fast){slow=slow.next;fast=fast.next;i++;}return i;}}return -1;},
  21:(a,b)=>{const out=[];let i=0,j=0;while(i<a.length||j<b.length)out.push(j===b.length||i<a.length&&a[i]<=b[j]?a[i++]:b[j++]);return out;},
  2:(a,b)=>{const out=[];let carry=0;for(let i=0;i<Math.max(a.length,b.length)||carry;i++){const s=(a[i]||0)+(b[i]||0)+carry;out.push(s%10);carry=Math.floor(s/10);}return out;},
  19:(a,n)=>a.filter((_,i)=>i!==a.length-n),
  24:a=>{a=a.slice();for(let i=0;i+1<a.length;i+=2)[a[i],a[i+1]]=[a[i+1],a[i]];return a;},
  25:(a,k)=>{const out=[];for(let i=0;i<a.length;i+=k)out.push(...(i+k<=a.length?a.slice(i,i+k).reverse():a.slice(i)));return out;},
  138:a=>{const old=a.map(([val])=>({val,next:null,random:null}));for(let i=0;i<old.length;i++){old[i].next=old[i+1]||null;old[i].random=a[i][1]===null?null:old[a[i][1]];}const map=new Map(old.map(n=>[n,{val:n.val,next:null,random:null}]));for(const n of old){const copy=map.get(n);copy.next=map.get(n.next)||null;copy.random=map.get(n.random)||null;}const cloned=old.map(n=>map.get(n)),index=new Map(cloned.map((n,i)=>[n,i]));return cloned.map(n=>[n.val,n.random?index.get(n.random):null]);},
  148:a=>{function merge(left,right){const dummy={next:null};let tail=dummy;while(left&&right){if(left.val<=right.val){tail.next=left;left=left.next;}else{tail.next=right;right=right.next;}tail=tail.next;}tail.next=left||right;return dummy.next;}function sort(head){if(!head||!head.next)return head;let slow=head,fast=head.next;while(fast&&fast.next){slow=slow.next;fast=fast.next.next;}const right=slow.next;slow.next=null;return merge(sort(head),sort(right));}return fromList(sort(toList(a)));},23:a=>sorted(a.flat()),
  146:(ops,args)=>{let capacity=0;const m=new Map();return ops.map((op,i)=>{const a=args[i];if(op==='LRUCache'){capacity=a[0];m.clear();return null;}if(op==='get'){if(!m.has(a[0]))return -1;const v=m.get(a[0]);m.delete(a[0]);m.set(a[0],v);return v;}m.delete(a[0]);m.set(a[0],a[1]);if(m.size>capacity)m.delete(m.keys().next().value);return null;});},
  94:a=>inorder(tree(a)),
  104:a=>{function depth(n){return n?1+Math.max(depth(n.left),depth(n.right)):0;}return depth(tree(a));},
  226:a=>{function flip(n){if(!n)return null;return {val:n.val,left:flip(n.right),right:flip(n.left)};}return serialize(flip(tree(a)));},
  101:a=>{function eq(l,r){return !l||!r?l===r:l.val===r.val&&eq(l.left,r.right)&&eq(l.right,r.left);}const root=tree(a);return !root||eq(root.left,root.right);},
  543:a=>{let best=0;function dfs(n){if(!n)return 0;const l=dfs(n.left),r=dfs(n.right);best=Math.max(best,l+r);return 1+Math.max(l,r);}dfs(tree(a));return best;},
  102:a=>levels(a),
  108:a=>{function build(l,r){if(l>=r)return null;const m=(l+r)>>1;return{val:a[m],left:build(l,m),right:build(m+1,r)};}return serialize(build(0,a.length));},
  98:a=>{const values=inorder(tree(a));return values.every((v,i)=>!i||v>values[i-1]);},
  230:(a,k)=>inorder(tree(a))[k-1],199:a=>levels(a).map(row=>row.at(-1)),
  114:a=>{const out=[];function dfs(n){if(n){out.push(n.val);dfs(n.left);dfs(n.right);}}dfs(tree(a));return out;},
  105:(pre,ino)=>{const positions=new Map(ino.map((x,i)=>[x,i]));let i=0;function build(l,r){if(l>=r)return null;const val=pre[i++],m=positions.get(val);return{val,left:build(l,m),right:build(m+1,r)};}return serialize(build(0,ino.length));},
  437:(a,target)=>{let res=0;const count=new Map([[0,1]]);function dfs(n,s){if(!n)return;s+=n.val;res+=count.get(s-target)||0;count.set(s,(count.get(s)||0)+1);dfs(n.left,s);dfs(n.right,s);count.set(s,count.get(s)-1);}dfs(tree(a),0);return res;},
  236:(a,p,q)=>{function dfs(n){if(!n||n.val===p||n.val===q)return n;const l=dfs(n.left),r=dfs(n.right);return l&&r?n:l||r;}return dfs(tree(a))?.val??null;},
  124:a=>{let best=-Infinity;function dfs(n){if(!n)return 0;const l=Math.max(0,dfs(n.left)),r=Math.max(0,dfs(n.right));best=Math.max(best,n.val+l+r);return n.val+Math.max(l,r);}dfs(tree(a));return best;},
  200:a=>{const g=a.map(row=>row.slice());let count=0;for(let r=0;r<g.length;r++)for(let c=0;c<g[0].length;c++)if(String(g[r][c])==='1'){count++;const q=[[r,c]];g[r][c]='0';for(let h=0;h<q.length;h++){const [x,y]=q[h];for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const i=x+dx,j=y+dy;if(i>=0&&j>=0&&i<g.length&&j<g[0].length&&String(g[i][j])==='1'){g[i][j]='0';q.push([i,j]);}}}}return count;},
  994:a=>{a=a.map(row=>row.slice());const q=[];let fresh=0,minutes=0;for(let r=0;r<a.length;r++)for(let c=0;c<a[0].length;c++){if(a[r][c]===2)q.push([r,c,0]);if(a[r][c]===1)fresh++;}for(let h=0;h<q.length;h++){const[r,c,t]=q[h];minutes=t;for(const[dr,dc]of[[1,0],[-1,0],[0,1],[0,-1]]){const x=r+dr,y=c+dc;if(x>=0&&y>=0&&x<a.length&&y<a[0].length&&a[x][y]===1){a[x][y]=2;fresh--;q.push([x,y,t+1]);}}}return fresh?-1:minutes;},
  207:(n,edges)=>topo(n,edges).length===n,
  208:(ops,args)=>{const root={};return ops.map((op,i)=>{if(op==='Trie')return null;let n=root;const word=args[i][0];if(op==='insert'){for(const c of word)n=n[c]||=(Object.create(null));n.end=true;return null;}for(const c of word){if(!n[c])return false;n=n[c];}return op==='startsWith'||!!n.end;});},
  46:a=>{if(!a.length)return[[]];const out=[];for(let i=0;i<a.length;i++)for(const tail of solutions[46](a.filter((_,j)=>j!==i)))out.push([a[i],...tail]);return out;},
  78:a=>a.reduce((out,x)=>[...out,...out.map(s=>[...s,x])],[[]]),
  17:s=>{if(!s)return[];const letters=['','','abc','def','ghi','jkl','mno','pqrs','tuv','wxyz'];return [...s].reduce((out,c)=>out.flatMap(p=>[...letters[Number(c)]].map(x=>p+x)),['']);},
  39:(a,t)=>{a=sorted(a);const out=[];function dfs(i,remaining,path){if(!remaining){out.push(path.slice());return;}for(let j=i;j<a.length&&a[j]<=remaining;j++){path.push(a[j]);dfs(j,remaining-a[j],path);path.pop();}}dfs(0,t,[]);return out;},
  22:n=>{const out=[];function dfs(s,l,r){if(l===n&&r===n){out.push(s);return;}if(l<n)dfs(s+'(',l+1,r);if(r<l)dfs(s+')',l,r+1);}dfs('',0,0);return out;},
  79:(a,s)=>wordExists(a,s),
  131:s=>{const out=[];function dfs(i,path){if(i===s.length){out.push(path.slice());return;}for(let j=i+1;j<=s.length;j++){const t=s.slice(i,j);if(t===[...t].reverse().join('')){path.push(t);dfs(j,path);path.pop();}}}dfs(0,[]);return out;},
  51:n=>queens(n),35:(a,t)=>{let l=0,r=a.length;while(l<r){const m=(l+r)>>1;if(a[m]<t)l=m+1;else r=m;}return l;},
  74:(a,t)=>{let l=0,r=a.length*a[0].length-1;while(l<=r){const m=(l+r)>>1,v=a[Math.floor(m/a[0].length)][m%a[0].length];if(v===t)return true;if(v<t)l=m+1;else r=m-1;}return false;},
  34:(a,t)=>{function bound(strict){let l=0,r=a.length;while(l<r){const m=(l+r)>>1;if(a[m]<t||strict&&a[m]===t)l=m+1;else r=m;}return l;}const l=bound(false),r=bound(true)-1;return l<=r?[l,r]:[-1,-1];},
  33:(a,t)=>{let l=0,r=a.length-1;while(l<=r){const m=(l+r)>>1;if(a[m]===t)return m;if(a[l]<=a[m]){if(a[l]<=t&&t<a[m])r=m-1;else l=m+1;}else if(a[m]<t&&t<=a[r])l=m+1;else r=m-1;}return -1;},
  153:a=>{let l=0,r=a.length-1;while(l<r){const m=(l+r)>>1;if(a[m]>a[r])l=m+1;else r=m;}return a[l];},
  4:(a,b)=>{if(a.length>b.length)return solutions[4](b,a);let l=0,r=a.length;const half=Math.floor((a.length+b.length+1)/2);while(l<=r){const i=(l+r)>>1,j=half-i,al=i?a[i-1]:-Infinity,ar=i<a.length?a[i]:Infinity,bl=j?b[j-1]:-Infinity,br=j<b.length?b[j]:Infinity;if(al<=br&&bl<=ar)return(a.length+b.length)%2?Math.max(al,bl):(Math.max(al,bl)+Math.min(ar,br))/2;if(al>br)r=i-1;else l=i+1;}},
  20:s=>{const stack=[],pairs={')':'(',']':'[','}':'{'};for(const c of s){if('([{'.includes(c))stack.push(c);else if(stack.pop()!==pairs[c])return false;}return !stack.length;},
  155:(ops,args)=>{const stack=[],mins=[];return ops.map((op,i)=>{if(op==='MinStack')return null;if(op==='push'){stack.push(args[i][0]);mins.push(Math.min(args[i][0],mins.at(-1)??Infinity));return null;}if(op==='pop'){stack.pop();mins.pop();return null;}return op==='top'?stack.at(-1):mins.at(-1);});},
  394:s=>{let i=0;function parse(){let out='';while(i<s.length&&s[i]!==']'){if(/\d/.test(s[i])){let n=0;while(/\d/.test(s[i]||'x'))n=n*10+Number(s[i++]);i++;const inner=parse();i++;out+=inner.repeat(n);}else out+=s[i++];}return out;}return parse();},
  739:a=>{const out=Array(a.length).fill(0),st=[];for(let i=0;i<a.length;i++){while(st.length&&a[i]>a[st.at(-1)]){const j=st.pop();out[j]=i-j;}st.push(i);}return out;},
  84:a=>{const st=[-1];let best=0;for(let i=0;i<=a.length;i++){const h=i===a.length?0:a[i];while(st.length>1&&a[st.at(-1)]>h){const height=a[st.pop()];best=Math.max(best,height*(i-st.at(-1)-1));}st.push(i);}return best;},
  215:(a,k)=>sorted(a)[a.length-k],347:(a,k)=>{const m=new Map();for(const x of a)m.set(x,(m.get(x)||0)+1);return [...m.keys()].sort((x,y)=>m.get(y)-m.get(x)).slice(0,k);},
  295:(ops,args)=>{const a=[];return ops.map((op,i)=>{if(op==='MedianFinder')return null;if(op==='addNum'){const x=args[i][0];let l=0,r=a.length;while(l<r){const m=(l+r)>>1;if(a[m]<x)l=m+1;else r=m;}a.splice(l,0,x);return null;}const n=a.length;return n%2?a[n>>1]:(a[n/2-1]+a[n/2])/2;});},
  121:a=>{let low=Infinity,best=0;for(const x of a){low=Math.min(low,x);best=Math.max(best,x-low);}return best;},
  55:a=>{let reach=0;for(let i=0;i<a.length;i++){if(i>reach)return false;reach=Math.max(reach,i+a[i]);}return true;},
  45:a=>{let reach=0,end=0,steps=0;for(let i=0;i<a.length-1;i++){reach=Math.max(reach,i+a[i]);if(i===end){steps++;end=reach;}}return steps;},
  763:s=>{const last=new Map([...s].map((c,i)=>[c,i])),out=[];let start=0,end=0;for(let i=0;i<s.length;i++){end=Math.max(end,last.get(s[i]));if(i===end){out.push(end-start+1);start=i+1;}}return out;},
  70:n=>{let a=1,b=1;for(let i=0;i<n;i++)[a,b]=[b,a+b];return a;},
  118:n=>{const out=[];for(let i=0;i<n;i++)out.push(Array.from({length:i+1},(_,j)=>j===0||j===i?1:out[i-1][j-1]+out[i-1][j]));return out;},
  198:a=>{let take=0,skip=0;for(const x of a)[take,skip]=[skip+x,Math.max(take,skip)];return Math.max(take,skip);},
  279:n=>{const dp=Array(n+1).fill(Infinity);dp[0]=0;for(let i=1;i<=n;i++)for(let j=1;j*j<=i;j++)dp[i]=Math.min(dp[i],dp[i-j*j]+1);return dp[n];},
  322:(coins,n)=>{const dp=Array(n+1).fill(n+1);dp[0]=0;for(let i=1;i<=n;i++)for(const x of coins)if(x<=i)dp[i]=Math.min(dp[i],dp[i-x]+1);return dp[n]>n?-1:dp[n];},
  139:(s,dict)=>{const set=new Set(dict),dp=Array(s.length+1).fill(false);dp[0]=true;for(let i=1;i<=s.length;i++)for(let j=0;j<i;j++)if(dp[j]&&set.has(s.slice(j,i))){dp[i]=true;break;}return dp[s.length];},
  300:a=>{const tails=[];for(const x of a){let l=0,r=tails.length;while(l<r){const m=(l+r)>>1;if(tails[m]<x)l=m+1;else r=m;}tails[l]=x;}return tails.length;},
  152:a=>{let hi=a[0],lo=a[0],best=a[0];for(const x of a.slice(1)){[hi,lo]=[Math.max(x,hi*x,lo*x),Math.min(x,hi*x,lo*x)];best=Math.max(best,hi);}return best;},
  416:a=>{const target=sum(a)/2;if(!Number.isInteger(target))return false;const dp=Array(target+1).fill(false);dp[0]=true;for(const x of a)for(let j=target;j>=x;j--)dp[j]||=dp[j-x];return dp[target];},
  32:s=>{const stack=[-1];let best=0;for(let i=0;i<s.length;i++)if(s[i]==='(')stack.push(i);else{stack.pop();if(!stack.length)stack.push(i);else best=Math.max(best,i-stack.at(-1));}return best;},
  62:(m,n)=>{const dp=Array(n).fill(1);for(let i=1;i<m;i++)for(let j=1;j<n;j++)dp[j]+=dp[j-1];return dp[n-1];},
  64:a=>{const dp=Array(a[0].length).fill(Infinity);dp[0]=0;for(const row of a)for(let j=0;j<row.length;j++)dp[j]=row[j]+Math.min(dp[j],j?dp[j-1]:Infinity);return dp.at(-1);},
  5:s=>{let best='';for(let i=0;i<s.length;i++)for(const offset of[0,1]){let l=i,r=i+offset;while(l>=0&&r<s.length&&s[l]===s[r]){if(r-l+1>best.length)best=s.slice(l,r+1);l--;r++;}}return best;},
  1143:(a,b)=>{let dp=Array(b.length+1).fill(0);for(const x of a){const next=[0];for(let j=1;j<=b.length;j++)next[j]=x===b[j-1]?dp[j-1]+1:Math.max(dp[j],next[j-1]);dp=next;}return dp.at(-1);},
  72:(a,b)=>{let dp=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){const next=[i];for(let j=1;j<=b.length;j++)next[j]=a[i-1]===b[j-1]?dp[j-1]:1+Math.min(dp[j],next[j-1],dp[j-1]);dp=next;}return dp.at(-1);},
  136:a=>a.reduce((x,y)=>x^y,0),169:a=>{let candidate,count=0;for(const x of a){if(!count)candidate=x;count+=x===candidate?1:-1;}return candidate;},75:a=>{a=a.slice();let l=0,i=0,r=a.length-1;while(i<=r)if(a[i]===0){[a[l],a[i]]=[a[i],a[l]];l++;i++;}else if(a[i]===2){[a[i],a[r]]=[a[r],a[i]];r--;}else i++;return a;},
  31:a=>{a=a.slice();let i=a.length-2;while(i>=0&&a[i]>=a[i+1])i--;if(i>=0){let j=a.length-1;while(a[j]<=a[i])j--;[a[i],a[j]]=[a[j],a[i]];}let l=i+1,r=a.length-1;while(l<r){[a[l],a[r]]=[a[r],a[l]];l++;r--;}return a;},
  287:a=>{let slow=a[0],fast=a[a[0]];while(slow!==fast){slow=a[slow];fast=a[a[fast]];}slow=0;while(slow!==fast){slow=a[slow];fast=a[fast];}return slow;},
  88:(a,m,b,n)=>{a=a.slice();let i=m-1,j=n-1,k=m+n-1;while(j>=0)a[k--]=i>=0&&a[i]>b[j]?a[i--]:b[j--];return a;},
  27:(a,v)=>a.filter(x=>x!==v),26:a=>a.filter((x,i)=>!i||x!==a[i-1]),80:a=>a.filter((x,i)=>i<2||x!==a[i-2]),122:a=>sum(a.slice(1).map((x,i)=>Math.max(0,x-a[i]))),274:a=>{a=sorted(a).reverse();let h=0;while(h<a.length&&a[h]>=h+1)h++;return h;},
  380:(ops,args)=>{const values=[],index=new Map();return ops.map((op,i)=>{const x=args[i][0];if(op==='RandomizedSet'){values.length=0;index.clear();return null;}if(op==='insert'){if(index.has(x))return false;index.set(x,values.length);values.push(x);return true;}if(op==='remove'){if(!index.has(x))return false;const pos=index.get(x),last=values.at(-1);values[pos]=last;index.set(last,pos);values.pop();index.delete(x);return true;}return values[Math.floor(Math.random()*values.length)];});},
  134:(gas,cost)=>{let total=0,tank=0,start=0;for(let i=0;i<gas.length;i++){const d=gas[i]-cost[i];total+=d;tank+=d;if(tank<0){start=i+1;tank=0;}}return total<0?-1:start;},
  135:a=>{const candies=Array(a.length).fill(1);for(let i=1;i<a.length;i++)if(a[i]>a[i-1])candies[i]=candies[i-1]+1;for(let i=a.length-2;i>=0;i--)if(a[i]>a[i+1])candies[i]=Math.max(candies[i],candies[i+1]+1);return sum(candies);},
  13:s=>{const v={I:1,V:5,X:10,L:50,C:100,D:500,M:1000};let n=0;for(let i=0;i<s.length;i++)n+=v[s[i]]<(v[s[i+1]]||0)?-v[s[i]]:v[s[i]];return n;},
  12:n=>{let out='';for(const[v,s]of[[1000,'M'],[900,'CM'],[500,'D'],[400,'CD'],[100,'C'],[90,'XC'],[50,'L'],[40,'XL'],[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']])while(n>=v){out+=s;n-=v;}return out;},
  58:s=>s.trim().split(/\s+/).at(-1).length,14:a=>{let p=a[0];for(const s of a)while(!s.startsWith(p))p=p.slice(0,-1);return p;},151:s=>s.trim().split(/\s+/).reverse().join(' '),
  6:(s,n)=>{if(n===1)return s;const rows=Array(n).fill('');let r=0,d=1;for(const c of s){rows[r]+=c;if(r===0)d=1;if(r===n-1)d=-1;r+=d;}return rows.join('');},28:(a,b)=>a.indexOf(b),
  68:(words,width)=>{const out=[];let i=0;while(i<words.length){let j=i,chars=0;while(j<words.length&&chars+words[j].length+j-i<=width)chars+=words[j++].length;const count=j-i;if(j===words.length||count===1)out.push(words.slice(i,j).join(' ').padEnd(width,' '));else{const spaces=width-chars,base=Math.floor(spaces/(count-1)),extra=spaces%(count-1);let row='';for(let k=i;k<j;k++)row+=words[k]+(k===j-1?'':' '.repeat(base+(k-i<extra?1:0)));out.push(row);}i=j;}return out;},
  125:s=>{s=s.toLowerCase().replace(/[^a-z0-9]/g,'');return s===[...s].reverse().join('');},392:(s,t)=>{let i=0;for(const c of t)if(s[i]===c)i++;return i===s.length;},
  167:(a,t)=>{let l=0,r=a.length-1;while(l<r){const v=a[l]+a[r];if(v===t)return[l+1,r+1];if(v<t)l++;else r--;}return[];},
  209:(t,a)=>{let l=0,s=0,best=Infinity;for(let r=0;r<a.length;r++){s+=a[r];while(s>=t){best=Math.min(best,r-l+1);s-=a[l++];}}return best===Infinity?0:best;},
  30:(s,words)=>{const width=words[0].length,size=words.length,need=new Map(),out=[];for(const w of words)need.set(w,(need.get(w)||0)+1);for(let offset=0;offset<width;offset++){const win=new Map();let l=offset,count=0;for(let r=offset;r+width<=s.length;r+=width){const w=s.slice(r,r+width);if(!need.has(w)){win.clear();count=0;l=r+width;continue;}win.set(w,(win.get(w)||0)+1);count++;while(win.get(w)>need.get(w)){const x=s.slice(l,l+width);win.set(x,win.get(x)-1);l+=width;count--;}if(count===size)out.push(l);}}return out;},
  36:a=>{const seen=new Set();for(let r=0;r<9;r++)for(let c=0;c<9;c++){const v=a[r][c];if(v==='.')continue;for(const key of['r'+r+v,'c'+c+v,'b'+Math.floor(r/3)+Math.floor(c/3)+v]){if(seen.has(key))return false;seen.add(key);}}return true;},
  289:a=>a.map((row,r)=>row.map((v,c)=>{let n=0;for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++)if((dr||dc)&&a[r+dr]?.[c+dc]===1)n++;return n===3||v===1&&n===2?1:0;})),
  383:(a,b)=>{const m=new Map();for(const x of b)m.set(x,(m.get(x)||0)+1);for(const x of a){if(!m.get(x))return false;m.set(x,m.get(x)-1);}return true;},
  205:(a,b)=>{const ab=new Map(),ba=new Map();for(let i=0;i<a.length;i++){if(ab.has(a[i])&&ab.get(a[i])!==b[i]||ba.has(b[i])&&ba.get(b[i])!==a[i])return false;ab.set(a[i],b[i]);ba.set(b[i],a[i]);}return true;},
  290:(pattern,s)=>{const words=s.split(' ');if(words.length!==pattern.length)return false;const a=new Map(),b=new Map();for(let i=0;i<words.length;i++){const c=pattern[i],w=words[i];if(a.has(c)&&a.get(c)!==w||b.has(w)&&b.get(w)!==c)return false;a.set(c,w);b.set(w,c);}return true;},
  242:(a,b)=>a.length===b.length&&[...a].sort().join('')===[...b].sort().join(''),202:n=>{const seen=new Set();while(n!==1&&!seen.has(n)){seen.add(n);n=sum([...String(n)].map(x=>Number(x)**2));}return n===1;},219:(a,k)=>{const m=new Map();for(let i=0;i<a.length;i++){if(m.has(a[i])&&i-m.get(a[i])<=k)return true;m.set(a[i],i);}return false;},
  228:a=>{const out=[];for(let i=0;i<a.length;i++){let j=i;while(j+1<a.length&&a[j+1]===a[j]+1)j++;out.push(i===j?String(a[i]):a[i]+'->'+a[j]);i=j;}return out;},
  57:(a,b)=>solutions[56]([...a,b]),452:a=>{a=a.slice().sort((x,y)=>x[1]-y[1]);let end=-Infinity,count=0;for(const[l,r]of a)if(l>end){count++;end=r;}return count;},
  71:s=>{const st=[];for(const p of s.split('/'))if(p==='..')st.pop();else if(p&&p!=='.')st.push(p);return'/'+st.join('/');},
  150:tokens=>{const st=[];for(const t of tokens)if(['+','-','*','/'].includes(t)){const b=st.pop(),a=st.pop();st.push(t==='+'?a+b:t==='-'?a-b:t==='*'?a*b:Math.trunc(a/b));}else st.push(Number(t));return st[0];},
  224:s=>{let i=0;function expression(){let result=0,sign=1;while(i<s.length){const c=s[i++];if(c===' ')continue;if(c==='+')sign=1;else if(c==='-')sign=-1;else if(c==='('){result+=sign*expression();sign=1;}else if(c===')')return result;else{let n=Number(c);while(i<s.length&&/\d/.test(s[i]))n=n*10+Number(s[i++]);result+=sign*n;sign=1;}}return result;}return expression();},
  92:(a,l,r)=>[...a.slice(0,l-1),...a.slice(l-1,r).reverse(),...a.slice(r)],82:a=>a.filter((x,i)=>(!i||x!==a[i-1])&&(i===a.length-1||x!==a[i+1])),61:(a,k)=>a.length?solutions[189](a,k):[],86:(a,x)=>[...a.filter(v=>v<x),...a.filter(v=>v>=x)],100:(a,b)=>JSON.stringify(serialize(tree(a)))===JSON.stringify(serialize(tree(b))),
  106:(ino,post)=>{const positions=new Map(ino.map((x,i)=>[x,i]));let i=post.length-1;function build(l,r){if(l>=r)return null;const val=post[i--],m=positions.get(val),right=build(m+1,r),left=build(l,m);return{val,left,right};}return serialize(build(0,ino.length));},
  117:a=>levels(a),112:(a,t)=>{function dfs(n,s){if(!n)return false;s+=n.val;return !n.left&&!n.right?s===t:dfs(n.left,s)||dfs(n.right,s);}return dfs(tree(a),0);},
  129:a=>{function dfs(n,s){if(!n)return 0;s=s*10+n.val;return !n.left&&!n.right?s:dfs(n.left,s)+dfs(n.right,s);}return dfs(tree(a),0);},
  173:(ops,args)=>{let a=[],i=0;return ops.map((op,j)=>{if(op==='BSTIterator'){a=inorder(tree(args[j][0]));i=0;return null;}return op==='next'?a[i++]:i<a.length;});},222:a=>serialize(tree(a)).filter(x=>x!==null).length,637:a=>levels(a).map(row=>sum(row)/row.length),103:a=>levels(a).map((row,i)=>i%2?row.reverse():row),530:a=>{const values=inorder(tree(a));let best=Infinity;for(let i=1;i<values.length;i++)best=Math.min(best,values[i]-values[i-1]);return best;},
  130:a=>{a=a.map(row=>row.slice());const q=[];for(let r=0;r<a.length;r++)for(let c=0;c<a[0].length;c++)if((!r||!c||r===a.length-1||c===a[0].length-1)&&a[r][c]==='O'){a[r][c]='#';q.push([r,c]);}for(let h=0;h<q.length;h++){const[r,c]=q[h];for(const[dr,dc]of[[1,0],[-1,0],[0,1],[0,-1]]){const x=r+dr,y=c+dc;if(a[x]?.[y]==='O'){a[x][y]='#';q.push([x,y]);}}}return a.map(row=>row.map(x=>x==='#'?'O':'X'));},
  133:a=>{if(!a.length)return[];const nodes=a.map((_,i)=>({val:i+1,neighbors:[]}));a.forEach((row,i)=>nodes[i].neighbors=row.map(v=>nodes[v-1]));const copies=new Map();function clone(n){if(copies.has(n))return copies.get(n);const c={val:n.val,neighbors:[]};copies.set(n,c);c.neighbors=n.neighbors.map(clone);return c;}clone(nodes[0]);return nodes.map(n=>copies.get(n).neighbors.map(x=>x.val));},
  399:(equations,values,queries)=>{const g=new Map();function edge(a,b,v){if(!g.has(a))g.set(a,[]);g.get(a).push([b,v]);}equations.forEach(([a,b],i)=>{edge(a,b,values[i]);edge(b,a,1/values[i]);});return queries.map(([a,b])=>{if(!g.has(a)||!g.has(b))return -1;const q=[[a,1]],seen=new Set([a]);for(let h=0;h<q.length;h++){const[u,v]=q[h];if(u===b)return v;for(const[x,w]of g.get(u))if(!seen.has(x)){seen.add(x);q.push([x,v*w]);}}return -1;});},
  210:(n,edges)=>topo(n,edges),
  909:board=>{const n=board.length,q=[[1,0]],seen=new Set([1]);for(let h=0;h<q.length;h++){const[p,d]=q[h];if(p===n*n)return d;for(let x=p+1;x<=Math.min(p+6,n*n);x++){const row=Math.floor((x-1)/n),col=(x-1)%n,v=board[n-1-row][row%2?n-1-col:col],next=v===-1?x:v;if(!seen.has(next)){seen.add(next);q.push([next,d+1]);}}}return -1;},
  433:(start,end,bank)=>{const available=new Set(bank),q=[[start,0]],seen=new Set([start]);if(start===end)return 0;for(let h=0;h<q.length;h++){const[s,d]=q[h];for(let i=0;i<s.length;i++)for(const c of'ACGT'){const t=s.slice(0,i)+c+s.slice(i+1);if(available.has(t)&&!seen.has(t)){if(t===end)return d+1;seen.add(t);q.push([t,d+1]);}}}return -1;},
  127:(start,end,words)=>{const set=new Set(words),q=[[start,1]],seen=new Set([start]);if(!set.has(end))return 0;for(let h=0;h<q.length;h++){const[s,d]=q[h];if(s===end)return d;for(let i=0;i<s.length;i++)for(let c=97;c<=122;c++){const t=s.slice(0,i)+String.fromCharCode(c)+s.slice(i+1);if(set.has(t)&&!seen.has(t)){seen.add(t);q.push([t,d+1]);}}}return 0;},
  211:(ops,args)=>{const root={};function find(n,s,i){if(i===s.length)return !!n.end;if(s[i]!=='.')return !!n[s[i]]&&find(n[s[i]],s,i+1);return Object.keys(n).some(k=>k!=='end'&&find(n[k],s,i+1));}return ops.map((op,i)=>{if(op==='WordDictionary')return null;if(op==='addWord'){let n=root;for(const c of args[i][0])n=n[c]||={};n.end=true;return null;}return find(root,args[i][0],0);});},
  212:(board,words)=>words.filter(w=>wordExists(board,w)),77:(n,k)=>combinations(Array.from({length:n},(_,i)=>i+1),k),52:n=>queens(n).length,
  427:grid=>{function build(r,c,n){const v=grid[r][c];let same=true;for(let i=r;i<r+n;i++)for(let j=c;j<c+n;j++)if(grid[i][j]!==v)same=false;if(same)return[v];const h=n/2;return[0,build(r,c,h),build(r,c+h,h),build(r+h,c,h),build(r+h,c+h,h)];}return build(0,0,grid.length);},
  918:a=>{let hi=0,lo=0,max=-Infinity,min=Infinity,total=0;for(const x of a){hi=Math.max(x,hi+x);lo=Math.min(x,lo+x);max=Math.max(max,hi);min=Math.min(min,lo);total+=x;}return max<0?max:Math.max(max,total-min);},
  162:a=>{let l=0,r=a.length-1;while(l<r){const m=(l+r)>>1;if(a[m]>a[m+1])r=m;else l=m+1;}return l;},
  502:(k,w,profits,capital)=>{const projects=capital.map((c,i)=>[c,profits[i]]).sort((a,b)=>a[0]-b[0]),heap=[];function push(x){heap.push(x);let i=heap.length-1;while(i){const p=(i-1)>>1;if(heap[p]>=heap[i])break;[heap[p],heap[i]]=[heap[i],heap[p]];i=p;}}function pop(){const top=heap[0],last=heap.pop();if(heap.length){heap[0]=last;let i=0;while(2*i+1<heap.length){let j=2*i+1;if(j+1<heap.length&&heap[j+1]>heap[j])j++;if(heap[i]>=heap[j])break;[heap[i],heap[j]]=[heap[j],heap[i]];i=j;}}return top;}let i=0;while(k--){while(i<projects.length&&projects[i][0]<=w)push(projects[i++][1]);if(!heap.length)break;w+=pop();}return w;},
  373:(a,b,k)=>{const heap=[],out=[];function push(x){heap.push(x);let i=heap.length-1;while(i){const p=(i-1)>>1;if(heap[p][0]<=heap[i][0])break;[heap[p],heap[i]]=[heap[i],heap[p]];i=p;}}function pop(){const top=heap[0],last=heap.pop();if(heap.length){heap[0]=last;let i=0;while(2*i+1<heap.length){let j=2*i+1;if(j+1<heap.length&&heap[j+1][0]<heap[j][0])j++;if(heap[i][0]<=heap[j][0])break;[heap[i],heap[j]]=[heap[j],heap[i]];i=j;}}return top;}if(!a.length||!b.length)return[];for(let i=0;i<Math.min(a.length,k);i++)push([a[i]+b[0],i,0]);while(k--&&heap.length){const[_,i,j]=pop();out.push([a[i],b[j]]);if(j+1<b.length)push([a[i]+b[j+1],i,j+1]);}return out;},
  67:(a,b)=>(BigInt('0b'+a)+BigInt('0b'+b)).toString(2),190:n=>{let result=0;for(let i=0;i<32;i++){result=result*2+(n&1);n>>>=1;}return result;},191:n=>{let count=0;while(n){n=(n&(n-1))>>>0;count++;}return count;},
  137:a=>{let ones=0,twos=0;for(const x of a){ones=(ones^x)&~twos;twos=(twos^x)&~ones;}return ones;},201:(l,r)=>{let shift=0;while(l!==r){l>>>=1;r>>>=1;shift++;}return l*2**shift;},9:n=>n>=0&&String(n)===[...String(n)].reverse().join(''),
  66:a=>{a=a.slice();for(let i=a.length-1;i>=0;i--){if(a[i]<9){a[i]++;return a;}a[i]=0;}return[1,...a];},172:n=>{let out=0;while(n){n=Math.floor(n/5);out+=n;}return out;},69:n=>{let l=0,r=Math.min(n,46340)+1;while(l+1<r){const m=Math.floor((l+r)/2);if(m*m<=n)l=m;else r=m;}return l;},
  50:(x,n)=>{if(n<0){x=1/x;n=-n;}let out=1;while(n){if(n%2)out*=x;x*=x;n=Math.floor(n/2);}return out;},
  149:a=>{function gcd(x,y){return y?gcd(y,x%y):Math.abs(x);}let best=1;for(let i=0;i<a.length;i++){const count=new Map();for(let j=i+1;j<a.length;j++){let dx=a[j][0]-a[i][0],dy=a[j][1]-a[i][1];const g=gcd(dx,dy);dx/=g;dy/=g;if(dx<0||dx===0&&dy<0){dx=-dx;dy=-dy;}const key=dx+','+dy;count.set(key,(count.get(key)||0)+1);best=Math.max(best,count.get(key)+1);}}return best;},
  120:a=>{const dp=a.at(-1).slice();for(let i=a.length-2;i>=0;i--)for(let j=0;j<a[i].length;j++)dp[j]=a[i][j]+Math.min(dp[j],dp[j+1]);return dp[0];},
  63:a=>{const dp=Array(a[0].length).fill(0);dp[0]=1;for(const row of a)for(let j=0;j<row.length;j++)if(row[j])dp[j]=0;else if(j)dp[j]+=dp[j-1];return dp.at(-1);},
  97:(a,b,s)=>{if(a.length+b.length!==s.length)return false;const dp=Array(b.length+1).fill(false);dp[0]=true;for(let i=0;i<=a.length;i++)for(let j=0;j<=b.length;j++)if(i||j)dp[j]=!!(i&&dp[j]&&a[i-1]===s[i+j-1]||j&&dp[j-1]&&b[j-1]===s[i+j-1]);return dp.at(-1);},
  123:a=>stock(2,a),188:(k,a)=>stock(Math.min(k,Math.floor(a.length/2)),a),
  221:a=>{const dp=Array(a[0].length+1).fill(0);let best=0;for(const row of a){let diag=0;for(let j=1;j<=row.length;j++){const old=dp[j];dp[j]=String(row[j-1])==='1'?1+Math.min(dp[j],dp[j-1],diag):0;diag=old;best=Math.max(best,dp[j]);}}return best*best;}
};
const helpers={sum,sorted,toList,fromList,cycleList,reverseList,tree,serialize,levels,inorder,combinations,queens,topo,wordExists,stock};
function solve(id,args){return solutions[id](...structuredClone(args));}
function readable(source){
  // 仅排版仓库内生成的可信函数，保留字符串字面量和for语句的分号。
  let out='',indent=0,paren=0,lineStart=true,quote=null;
  const write=c=>{if(lineStart){out+='    '.repeat(indent);lineStart=false;}out+=c;},newline=()=>{out=out.trimEnd()+'\n';lineStart=true;};
  for(let i=0;i<source.length;i++){
    const c=source[i];
    if(quote){write(c);if(c==='\\'&&i+1<source.length)write(source[++i]);else if(c===quote)quote=null;continue;}
    if(c==='"'||c==="'"||c==='`'){quote=c;write(c);continue;}
    if(c==='(')paren++;if(c===')')paren--;
    if(c==='{'){write(c);indent++;newline();}
    else if(c==='}'){indent=Math.max(0,indent-1);if(!lineStart)newline();write(c);newline();}
    else if(c===';'){write(c);if(paren===0)newline();}
    else if(c==='\n'){if(!lineStart)newline();}
    else if(!lineStart||! /\s/.test(c))write(c);
  }
  return out.trim()+'\n';
}
function program(id){
  // 递归和少数共用子题需要补上明确依赖，不包含其他题目的答案。
  const dependencies={46:[46],4:[4],57:[56],61:[189]};
  const ids=[...new Set([String(id),...(dependencies[id]||[]).map(String)])];
  const needed=new Set();let helperSource=ids.map(key=>solutions[key].toString()).join('\n'),changed=true;
  while(changed){changed=false;for(const [name,fn]of Object.entries(helpers))if(!needed.has(name)&&new RegExp('\\b'+name+'\\b').test(helperSource)){needed.add(name);helperSource+='\n'+fn.toString();changed=true;}}
  const source='"use strict";\n'+[...needed].map(name=>['sum','sorted'].includes(name)?'const '+name+'='+helpers[name].toString()+';':helpers[name].toString()).join('\n')+'\nconst solutions={\n'+ids.map(key=>JSON.stringify(key)+':'+solutions[key].toString()).join(',\n')+'\n};\nconst fs=require("node:fs");\nconst lines=fs.readFileSync(0,"utf8").trim().split(/\\r?\\n/);\nfor(const line of lines){if(!line.trim())continue;const args=JSON.parse(line);console.log(JSON.stringify(solutions['+JSON.stringify(String(id))+'](...args)));}\n';
  return '// 本站原创 ACM 参考程序。每行读取 JSON 参数数组，每行输出 JSON 答案。\n'+readable(source);
}
module.exports={solve,program,solutions,helpers};
