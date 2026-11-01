"use strict";
// Plain-text ACM protocol. Never evaluate user code here; only encode/decode data.
const {signatures,designs,parse}=require('./cpp-interfaces');
function clean(t){return t.replace(/&/g,'').trim();}
function vector(t){return /^vector<(.+)>$/.exec(t)?.[1];}
function fields(id){
 id=String(id);if(designs[id])return[];
 const result=parse(signatures[id]).params.map(p=>({...p,type:clean(p.type)}));
 if(['141','142'].includes(id))result.push({name:'pos',type:'int'});
 if(id==='160')result.push({name:'skipA',type:'int'},{name:'skipB',type:'int'});
 if(id==='236'){result[1].type=result[2].type='int';}
 return result.map(p=>({...p,wire:p.type==='ListNode*'?'vector<int>':p.type==='TreeNode*'||id==='117'&&p.type==='Node*'?'TREE':p.type==='vector<ListNode*>'?'vector<vector<int>>':id==='138'&&p.type==='Node*'?'RANDOM':id==='133'&&p.type==='Node*'?'vector<vector<int>>':p.type}));
}
function sequence(t){return !!vector(t)||t==='TREE'||t==='RANDOM';}
function scalar(t){return !sequence(t)&&t!=='string';}
function resultType(id){id=String(id);if(designs[id])return'DESIGN';if(['160','236'].includes(id))return'NULLINT';if(id==='142')return'int';if(id==='138')return'RANDOM';if(id==='133')return'vector<vector<int>>';if(id==='117')return'vector<vector<int>>';if(id==='427')return'QUAD';if(id==='114')return'vector<int>';const m=parse(signatures[id]);if(['27','26','80'].includes(id))return'vector<int>';const t=clean(m.returns==='void'?m.params[0].type:m.returns);return t==='TreeNode*'?'TREE':t==='ListNode*'?'vector<int>':t;}
function encodeValue(type,value,top=false){
 if(type==='TREE')return value.length?value.map(x=>x===null?'null':String(x)).join(' ')+'\n':'';
 if(type==='RANDOM')return value.map(row=>row.map(x=>x===null?-1:x).join(' ')+'\n').join('');
 const inner=vector(type);
 if(inner){let out=top?'':value.length+'\n';if(scalar(inner))return out+(value.length?value.map(x=>String(x)).join(' ')+'\n':'');return out+value.map(v=>encodeValue(inner,v)).join('');}
 return String(value)+'\n';
}
function encode(id,args){
 id=String(id);if(designs[id]){let out=args[0].length+'\n';for(let i=0;i<args[0].length;i++){const op=args[0][i],d=designs[id],m=op===d.name?parse('void ctor('+d.constructor+')'):parse(d.methods.find(s=>parse(s).name===op));out+=op+'\n';m.params.forEach((p,k)=>{let t=clean(p.type),v=args[1][i][k];if(t==='TreeNode*'){out+=v.length+'\n'+encodeValue('TREE',v,true);}else out+=encodeValue(t,v);});}return out;}
 const f=fields(id),head=[];for(let i=0;i<f.length;i++){if(sequence(f[i].wire))head.push(args[i].length);else if(scalar(f[i].wire))head.push(args[i]);}
 return(head.length?head.join(' ')+'\n':'')+f.map((p,i)=>scalar(p.wire)?'':encodeValue(p.wire,args[i],true)).join('');
}
function output(id,value){
 function write(t,v,top=false){if(t==='NULLINT')return(v===null?'null':String(v))+'\n';if(t==='TREE')return v.map(x=>x===null?'null':x).join(' ')+'\n';if(t==='RANDOM')return v.length+'\n'+v.map(row=>row.map(x=>x===null?-1:x).join(' ')+'\n').join('');if(t==='QUAD')return v.length===1?'L '+v[0]+' ':'B '+v.slice(1).map(x=>write('QUAD',x)).join('');const inner=vector(t);if(inner){if(scalar(inner))return(top?'':v.length+' ')+v.join(' ')+'\n';return v.length+'\n'+v.map(x=>write(inner,x)).join('');}return String(v)+'\n';}
 if(resultType(id)==='DESIGN')return value.map(v=>v===null?'null':String(v)).join('\n')+'\n';return write(resultType(id),value,true);
}
function decode(id,text){
 const tokens=text.trim()?text.trim().split(/\s+/):[];let at=0;const next=()=>{if(at>=tokens.length)throw Error('输出不完整');return tokens[at++];};
 const number=()=>{const s=next();if(!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(s)||!Number.isFinite(Number(s)))throw Error('应输出数值');return Number(s);};
 const count=()=>{const n=number();if(!Number.isInteger(n)||n<0||n>100000)throw Error('结果长度无效');return n;};
 function read(t,top=false){if(t==='NULLINT'){if(tokens[at]==='null'){at++;return null;}return number();}if(t==='TREE'){return tokens.splice(at).map(s=>{if(s==='null')return null;if(!/^-?\d+$/.test(s))throw Error('树节点格式错误');return Number(s);});}if(t==='RANDOM'){return Array.from({length:count()},()=>[number(),((x)=>x===-1?null:x)(number())]);}if(t==='QUAD'){const tag=next();if(tag==='L')return[number()];if(tag!=='B')throw Error('四叉树应输出L或B');return[0,read(t),read(t),read(t),read(t)];}const inner=vector(t);if(inner){const n=top&&scalar(inner)?tokens.length-at:count();return Array.from({length:n},()=>read(inner));}if(t==='bool'){const s=next();if(!['true','false','0','1'].includes(s))throw Error('布尔输出应为true/false');return s==='true'||s==='1';}if(t==='char')return next();return number();}
 const type=resultType(id);
 // String results are line-based, preserving spaces and empty strings.
 if(type==='string')return text.replace(/\r\n/g,'\n').replace(/\n$/,'');
 if(type.includes('string')||type==='DESIGN'){
  const lines=text.replace(/\r\n/g,'\n').split('\n');if(lines.at(-1)==='')lines.pop();let i=0;
  function lineRead(t){const v=lines[i++];if(v===undefined)throw Error('输出不完整');if(t==='string')return v;const inner=vector(t);if(inner){const n=Number(v);if(!/^\d+$/.test(v)||n>100000)throw Error('结果长度无效');return Array.from({length:n},()=>lineRead(inner));}if(v==='null')return null;if(v==='true'||v==='false')return v==='true';if(!Number.isFinite(Number(v)))throw Error('输出格式错误');return Number(v);}
  const answer=type==='DESIGN'?lines.map(s=>s==='null'?null:s==='true'?true:s==='false'?false:(s.trim()&&Number.isFinite(Number(s))?Number(s):NaN)):lineRead(type);if(type!=='DESIGN'&&i!==lines.length)throw Error('多余输出');return answer;
 }
 const answer=read(type,true);if(at!==tokens.length)throw Error('存在多余输出');return answer;
}
function describe(id){
 if(designs[id])return'每组先输入操作数q；接着每个操作名独占一行，再按构造函数/方法参数顺序输入参数。数值独占一行，字符串原样独占一行（可以为空）；树输入节点数和层序值，空节点写null。每个操作输出一行，构造及void操作输出null。';
 const f=fields(id),headers=f.filter(p=>p.wire!=='string').map(p=>sequence(p.wire)?p.name+'的长度':p.name);
 return(headers.length?'每组第一行依次输入：'+headers.join('、')+'。\n':'')+f.filter(p=>!scalar(p.wire)).map(p=>p.name+'：'+(p.wire==='string'?'独占一行，保留空格；空串输入空行。':p.wire==='TREE'?'按层序输入节点值，空节点写null。':p.wire==='RANDOM'?'每行输入一个节点的值和random下标；无random写-1。':p.wire.includes('vector<vector')?'依次输入各行：先写该行长度，再输入该行元素；字符串元素各占一行。':p.wire==='vector<string>'?'每个字符串独占一行，空串输入空行。':'依次输入元素，用空格分隔；长度0时不需要元素行。')).join('\n')+'\n可连续输入多组直到EOF。输出：'+(resultType(id)==='QUAD'?'四叉树先序：叶子写L和0/1，分支写B后接四个子树。':'一维数值数组直接输出元素（不带长度），空数组输出空行；嵌套数组/字符串数组先输出长度，再输出各项；布尔输出true/false。树输出层序，空节点写null。');
}
// Helpers are shown only for problems that need richer input/output structures.
const runtime=String.raw`
bool bgNumbers = false;
template<class T> void bgRead(T& value) { if(!(cin >> value)) throw runtime_error("input format error"); bgNumbers = true; }
void bgRead(string& value) {
    if (bgNumbers) { cin.ignore(numeric_limits<streamsize>::max(), '\n'); bgNumbers = false; }
    if(!getline(cin, value)) throw runtime_error("missing string line");
}
template<class T> void bgRead(vector<T>& values) {
    int size; bgRead(size); if(size<0||size>100000) throw runtime_error("invalid size");
    values.resize(size); for(int i=0;i<size;++i) bgRead(values[i]);
}
template<class T> void bgWrite(const T& value) { cout << value << '\n'; }
void bgWrite(bool value) { cout << (value ? "true" : "false") << '\n'; }
template<class T> void bgWrite(const vector<T>& values) {
    cout << values.size() << '\n'; for(size_t i=0;i<values.size();++i) bgWrite(values[i]);
}
template<class T> void bgAnswer(const T& value) { bgWrite(value); }
void bgAnswer(const vector<int>& values) { for(size_t i=0;i<values.size();++i) { if(i) cout << ' '; cout << values[i]; } cout << '\n'; }
void bgAnswer(const vector<double>& values) { for(size_t i=0;i<values.size();++i) { if(i) cout << ' '; cout << values[i]; } cout << '\n'; }
`;
const nodes=String.raw`
ListNode* bgList(const vector<int>& values) { ListNode dummy; ListNode* tail=&dummy; for(size_t i=0;i<values.size();++i) { tail->next=new ListNode(values[i]); tail=tail->next; } return dummy.next; }
vector<int> bgListValues(ListNode* head) { vector<int> values; set<ListNode*> seen; while(head) { if(!seen.insert(head).second) throw runtime_error("list cycle"); values.push_back(head->val); head=head->next; } return values; }
template<class T> T* bgTree(const vector<string>& values) {
    if(values.empty()||values[0]=="null") return nullptr;
    T* root=new T(stoi(values[0])); vector<T*> queue(1,root); size_t i=1;
    for(size_t h=0;h<queue.size()&&i<values.size();++h) {
        if(values[i]!="null") { queue[h]->left=new T(stoi(values[i])); queue.push_back(queue[h]->left); } ++i;
        if(i<values.size()) { if(values[i]!="null") { queue[h]->right=new T(stoi(values[i])); queue.push_back(queue[h]->right); } ++i; }
    } return root;
}
template<class T> void bgTreeAnswer(T* root) {
    vector<T*> queue; vector<string> values; set<T*> seen; if(root) queue.push_back(root);
    for(size_t i=0;i<queue.size();++i) { T* p=queue[i]; if(!p) { values.push_back("null"); continue; }
        if(!seen.insert(p).second) throw runtime_error("tree cycle"); values.push_back(to_string(p->val)); queue.push_back(p->left); queue.push_back(p->right);
    }
    while(!values.empty()&&values.back()=="null") values.pop_back();
    for(size_t i=0;i<values.size();++i) { if(i) cout << ' '; cout << values[i]; } cout << '\n';
}
TreeNode* bgFind(TreeNode* p,int value) { if(!p||p->val==value) return p; TreeNode* left=bgFind(p->left,value); return left?left:bgFind(p->right,value); }
`;
function minimalHeaders(code){const names={algorithm:'sort|swap|reverse|min|max|lower_bound|upper_bound|next_permutation|nth_element|fill',array:'array',bitset:'bitset',climits:'INT_MIN|INT_MAX|LLONG_MAX',cstdint:'uint32_t',cmath:'sqrt|pow|abs|ceil|floor',cctype:'isalnum|tolower|isdigit|isspace|isalpha',cstdlib:'abs',deque:'deque',functional:'function|greater',iostream:'cin|cout|cerr',iomanip:'setprecision',iterator:'next|prev|distance',list:'list',limits:'numeric_limits',map:'map|multimap',memory:'unique_ptr',numeric:'accumulate|iota',queue:'queue|priority_queue',random:'mt19937|random_device|uniform_int_distribution',set:'set|multiset',sstream:'stringstream|istringstream',stack:'stack',stdexcept:'runtime_error|logic_error',string:'string|stoi|to_string',tuple:'tuple|get',unordered_map:'unordered_map',unordered_set:'unordered_set',utility:'pair|move',vector:'vector'};return Object.entries(names).filter(([,re])=>new RegExp('\\b('+re+')\\b').test(code)).map(([header])=>'#include <'+header+'>').join('\n')+'\nusing namespace std;\n\n';}
function program(id,core,cpp){
 id=String(id);const f=fields(id),hasList=/ListNode/.test(core),hasTree=/TreeNode/.test(core)||id==='117',special=['138','133','427'].includes(id);
 let helper=runtime;
 if(hasList)helper+=nodes.slice(0,nodes.indexOf('template<class T> T* bgTree'));
 if(hasTree){helper+=nodes.slice(nodes.indexOf('template<class T> T* bgTree'),nodes.indexOf('TreeNode* bgFind'));if(id==='236')helper+=nodes.slice(nodes.indexOf('TreeNode* bgFind'));}
 let main='';
 if(designs[id]){
  const d=designs[id];main=`int count;\n    while(cin >> count) {\n        bgNumbers = true;\n        ${d.name}* object = nullptr;\n        for(int step=0;step<count;++step) {\n            string op; bgRead(op);\n`;
  for(const [index,sig]of['void '+d.name+'('+d.constructor+')',...d.methods].entries()){
   const m=parse(sig);main+=`            ${index?'else ':''}if(op == "${m.name}") {\n`;
   m.params.forEach((p,k)=>{const t=clean(p.type);if(t==='TreeNode*')main+=`                vector<string> tokens; int size; bgRead(size); tokens.resize(size); for(int j=0;j<size;++j) cin >> tokens[j]; bgNumbers=true; TreeNode* value${k}=bgTree<TreeNode>(tokens);\n`;else main+=`                ${t} value${k}; bgRead(value${k});\n`;});
   const args=m.params.map((_,i)=>'value'+i).join(', ');
   main+=index===0?`                delete object; object=new ${d.name}(${args}); cout << "null\\n";\n`:`                if(!object) throw runtime_error("constructor required");\n                `+(m.returns==='void'?`object->${m.name}(${args}); cout << "null\\n";`:`bgAnswer(object->${m.name}(${args}));` )+'\n';main+='            }\n';
  }
  main+='            else throw runtime_error("unknown operation");\n        }\n        delete object;\n    }\n';
 }else{
  const head=f.filter(p=>p.wire!=='string');
  const headerName=p=>sequence(p.wire)?p.name+'Size':p.name;
  main=head.map(p=>`    ${sequence(p.wire)?'int':p.type} ${headerName(p)};\n`).join('');
  main+=head.length?'    while(cin'+head.map(p=>' >> '+headerName(p)).join('')+') {\n        bgNumbers = true;\n':'    string '+f[0].name+';\n    while(getline(cin, '+f[0].name+')) {\n';
  for(const [index,p]of f.entries()){
   if(scalar(p.wire))continue;if(p.wire==='string'){if(head.length||index>0)main+='        string '+p.name+'; bgRead('+p.name+');\n';continue;}
   const size=headerName(p),raw=p.name+'Input';main+=`        if(${size}<0||${size}>100000) throw runtime_error("invalid size");\n`;
   if(p.wire==='TREE')main+=`        vector<string> ${raw}(${size}); for(int i=0;i<${size};++i) cin >> ${raw}[i]; if(${size}) bgNumbers=true;\n        ${p.type} ${p.name}=bgTree<${p.type.replace('*','')}>(${raw});\n`;
   else if(p.wire==='RANDOM')main+=`        vector<Node*> nodes(${size}); vector<int> randomIndex(${size});\n        for(int i=0;i<${size};++i) { int value; cin >> value >> randomIndex[i]; nodes[i]=new Node(value); }\n        for(int i=0;i<${size};++i) { if(i+1<${size}) nodes[i]->next=nodes[i+1]; if(randomIndex[i]>=0) nodes[i]->random=nodes.at(randomIndex[i]); }\n        Node* ${p.name}=nodes.empty()?nullptr:nodes[0];\n`;
   else{
    main+=`        ${p.wire} ${raw}(${size});\n        for(int i=0;i<${size};++i) bgRead(${raw}[i]);\n`;
    if(p.type==='ListNode*')main+=`        ListNode* ${p.name}=bgList(${raw});\n`;
    else if(p.type==='vector<ListNode*>')main+=`        vector<ListNode*> ${p.name}; for(size_t i=0;i<${raw}.size();++i) ${p.name}.push_back(bgList(${raw}[i]));\n`;
    else if(p.type==='Node*')main+=`        vector<Node*> nodes(${size}); for(int i=0;i<${size};++i) nodes[i]=new Node(i+1);\n        for(int i=0;i<${size};++i) for(size_t j=0;j<${raw}[i].size();++j) nodes[i]->neighbors.push_back(nodes.at(${raw}[i][j]-1));\n        Node* ${p.name}=nodes.empty()?nullptr:nodes[0];\n`;
    else main+=`        ${p.type}& ${p.name}=${raw};\n`;
   }
  }
  if(['141','142'].includes(id))main+='        if(pos>=0) { ListNode* tail=head; ListNode* entry=head; for(int i=0;i<pos;++i) entry=entry->next; while(tail->next) tail=tail->next; tail->next=entry; }\n';
  if(id==='160')main+='        ListNode* common=headA; for(int i=0;i<skipA&&common;++i) common=common->next;\n        ListNode dummy(0,headB); ListNode* tail=&dummy; for(int i=0;i<skipB;++i) tail=tail->next; tail->next=common; headB=dummy.next;\n';
  const m=parse(signatures[id]),args=m.params.map(p=>id==='236'&&p.type==='TreeNode*'&&p.name!=='root'?`bgFind(root,${p.name})`:p.name).join(', '),call=`Solution().${m.name}(${args})`;
  main+=m.returns==='void'?`        ${call};\n`:`        ${m.returns} result=${call};\n`;
  if(['27','26','80'].includes(id))main+='        if(result<0||result>(int)nums.size()) throw runtime_error("invalid result length"); nums.resize(result); bgAnswer(nums);\n';
  else if(id==='114')main+='        vector<int> values; set<TreeNode*> seen; while(root) { if(root->left||!seen.insert(root).second) throw runtime_error("invalid right chain"); values.push_back(root->val); root=root->right; } bgAnswer(values);\n';
  else if(['160','236'].includes(id))main+='        if(result) cout << result->val << "\\n"; else cout << "null\\n";\n';
  else if(id==='142')main+='        int index=0,answer=-1; set<ListNode*> seen; for(ListNode* p=head;p&&seen.insert(p).second;p=p->next,++index) if(p==result) answer=index; cout << answer << "\\n";\n';
  else if(id==='138')main+='        vector<Node*> values; map<Node*,int> positions; for(Node* p=result;p;p=p->next) { if(positions.count(p)) throw runtime_error("cycle"); positions[p]=values.size(); values.push_back(p); } cout << values.size() << "\\n"; for(size_t i=0;i<values.size();++i) { if(values[i]->random&&!positions.count(values[i]->random)) throw runtime_error("external random"); cout << values[i]->val << " " << (values[i]->random?positions[values[i]->random]:-1) << "\\n"; }\n';
  else if(id==='133')main+='        map<int,Node*> found; queue<Node*> q; if(result) {q.push(result);found[result->val]=result;} while(!q.empty()) { Node* p=q.front();q.pop();for(size_t i=0;i<p->neighbors.size();++i) if(!found.count(p->neighbors[i]->val)) {found[p->neighbors[i]->val]=p->neighbors[i];q.push(p->neighbors[i]);}} vector<vector<int>> rows;for(map<int,Node*>::iterator it=found.begin();it!=found.end();++it) {vector<int> row;for(size_t i=0;i<it->second->neighbors.size();++i)row.push_back(it->second->neighbors[i]->val);rows.push_back(row);} bgAnswer(rows);\n';
  else if(id==='117')main+='        vector<vector<int>> rows; set<Node*> seen; while(result) { vector<int> row; Node* next=nullptr; for(Node* p=result;p;p=p->next) {if(!seen.insert(p).second)throw runtime_error("invalid next");row.push_back(p->val);if(!next)next=p->left?p->left:p->right;}rows.push_back(row);result=next;} bgAnswer(rows);\n';
  else if(id==='427')main+='        set<Node*> seen; function<void(Node*)> print=[&](Node* p) {if(!p||!seen.insert(p).second)throw runtime_error("invalid quad tree");if(p->isLeaf)cout << "L " << (p->val?1:0) << " ";else {cout << "B ";print(p->topLeft);print(p->topRight);print(p->bottomLeft);print(p->bottomRight);}}; print(result);cout << "\\n";\n';
  else if(m.returns==='TreeNode*')main+='        bgTreeAnswer(result);\n';
  else if(m.returns==='ListNode*')main+='        bgAnswer(bgListValues(result));\n';
  else main+=`        bgAnswer(${m.returns==='void'?m.params[0].name:'result'});\n`;
  main+='    }\n';
 }
 // Two Sum deliberately mirrors a beginner's conventional n/target + array harness.
 if(id==='1'){
  helper='';main='    int n, target;\n    while (cin >> n >> target) {\n        if(n<0||n>100000) return 1;\n        vector<int> nums(n);\n        for (int i = 0; i < n; i++) cin >> nums[i];\n        vector<int> result = Solution().twoSum(nums, target);\n        if (result.size() == 2) {\n            if (result[0] > result[1]) swap(result[0], result[1]);\n            cout << result[0] << " " << result[1] << endl;\n        } else cout << endl;\n    }\n';
 }
 core=core.replace(/^\/\/[^\n]*\n/,'');
 const body=(hasList||hasTree||special?cpp.structure(id)+'\n':'')+'\n// -- core code template start\n'+core+'// -- core code template end\n'+(helper?'\n// 输入输出辅助：通常无需修改，完成上方核心函数即可。\n'+helper:'')+'\nint main() {\n    ios::sync_with_stdio(false); cin.tie(nullptr);\n'+(id==='1'?'':'    cout << setprecision(17);\n')+main+'    return 0;\n}\n';
 const headers=minimalHeaders(body);return(id==='1'&&!headers.includes('<unordered_map>')?'#include <unordered_map>\n':'')+headers+body;
}
module.exports={fields,resultType,encode,decode,output,describe,program};
