"use strict";
const {signatures,designs,parse}=require('./cpp-interfaces'),{bodies,classes,helpers,variants}=require('./cpp-solutions');
const MODES=[{id:'LEETCODE',name:'力扣模式 · 函数模板'},{id:'ACM_TEMPLATE',name:'ACM · 输入输出模板'},{id:'ACM_BLANK',name:'ACM · 空白代码'}];
const includes=['algorithm','array','bitset','climits','cstdint','cmath','cctype','cstdlib','deque','functional','iostream','iomanip','iterator','list','limits','map','memory','numeric','queue','random','set','sstream','stack','stdexcept','string','tuple','unordered_map','unordered_set','utility','vector'].map(x=>`#include <${x}>`).join('\n')+'\nusing namespace std;\n';
const listNode='struct ListNode { int val; ListNode* next; ListNode(int x=0,ListNode* n=nullptr):val(x),next(n){} };\n';
const treeNode='struct TreeNode { int val; TreeNode *left,*right; TreeNode(int x=0,TreeNode* l=nullptr,TreeNode* r=nullptr):val(x),left(l),right(r){} };\n';
const nodeTypes={
138:'class Node { public: int val; Node *next=nullptr,*random=nullptr; Node(int x):val(x){} };\n',
133:'class Node { public: int val; vector<Node*> neighbors; Node(int x=0):val(x){} };\n',
117:'class Node { public: int val; Node *left=nullptr,*right=nullptr,*next=nullptr; Node(int x=0):val(x){} };\n',
427:'class Node { public: bool val,isLeaf; Node *topLeft=nullptr,*topRight=nullptr,*bottomLeft=nullptr,*bottomRight=nullptr; Node(bool v=false,bool leaf=false,Node* tl=nullptr,Node* tr=nullptr,Node* bl=nullptr,Node* br=nullptr):val(v),isLeaf(leaf),topLeft(tl),topRight(tr),bottomLeft(bl),bottomRight(br){} };\n'
};
const support=String.raw`
using json=nlohmann::json;
ListNode* readList(const json& values,int pos=-1) {
    vector<ListNode*> nodes; for(auto& v:values) nodes.push_back(new ListNode(v.get<int>()));
    for(size_t i=1;i<nodes.size();++i) nodes[i-1]->next=nodes[i];
    if(!nodes.empty()&&pos>=0) nodes.back()->next=nodes.at(pos);
    return nodes.empty()?nullptr:nodes[0];
}
json writeList(ListNode* head) {
    json out=json::array(); unordered_set<ListNode*> seen;
    while(head) { if(!seen.insert(head).second||seen.size()>100000) throw runtime_error("链表输出出现环或过长"); out.push_back(head->val); head=head->next; } return out;
}
template<class T> T* readTree(const json& values) {
    if(values.empty()||values[0].is_null()) return nullptr;
    auto root=new T(values[0].template get<int>()); vector<T*> q={root}; size_t i=1;
    for(size_t h=0;h<q.size()&&i<values.size();++h) for(auto child:{&q[h]->left,&q[h]->right}) {
        if(i<values.size()&&!values[i].is_null()) { *child=new T(values[i].template get<int>()); q.push_back(*child); } ++i;
    } return root;
}
template<class T> json writeTree(T* root) {
    json out=json::array(); if(!root) return out; vector<T*> q={root}; unordered_set<T*> seen;
    for(size_t i=0;i<q.size();++i) { auto n=q[i]; if(!n) { out.push_back(nullptr); continue; }
        if(!seen.insert(n).second||seen.size()>100000) throw runtime_error("树结构存在重复节点或过长");
        out.push_back(n->val); q.push_back(n->left); q.push_back(n->right);
    }
    while(!out.empty()&&out.back().is_null()) out.erase(out.size()-1); return out;
}
TreeNode* treeValue(TreeNode* root,int value) {
    if(!root||root->val==value) return root; auto l=treeValue(root->left,value); return l?l:treeValue(root->right,value);
}
vector<vector<char>> readChars(const json& values) {
    vector<vector<char>> out; for(auto& row:values) { vector<char> line;
        for(auto& v:row) { string text=v.get<string>(); if(text.size()!=1) throw runtime_error("字符格必须为单字符字符串"); line.push_back(text[0]); } out.push_back(line);
    } return out;
}
json writeChars(const vector<vector<char>>& values) {
    json out=json::array(); for(auto& row:values) { json line=json::array(); for(char ch:row) line.push_back(string(1,ch)); out.push_back(line); } return out;
}
`;
function structure(id){const sig=signatures[id]||designs[id]?.constructor||'';return(sig.includes('ListNode')?listNode:'')+(sig.includes('TreeNode')?treeNode:'')+(nodeTypes[id]||'');}
function typeNotes(id){const definition=structure(id);return definition?'/* 平台预置以下节点结构，不要重复定义：\n'+definition.replace(/;\s*/g,';\n').trim()+'\n*/\n':'';}
function rename(source,params){return source.replace(/("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\/\/[^\n]*|\/\*[\s\S]*?\*\/)|\b([abcd])\b/g,(all,literal,key)=>literal||params[key.charCodeAt(0)-97]?.name||all);}
function reference(id,bodyOverride){
 id=String(id);if(classes[id]&&!bodyOverride)return '// C++11；标准头文件由平台提供。\n'+typeNotes(id)+classes[id]+'\n';
 const method=parse(signatures[id]),params=method.params.map(p=>({...p,name:String(id)==='1'?p.name:'arg_'+p.name})),body=rename(bodyOverride||bodies[id],params);if(!body)throw Error('缺少C++解答 '+id);
 let source=body,changed=true;const needed=new Set();while(changed){changed=false;for(const [name,code]of Object.entries(helpers))if(!needed.has(name)&&new RegExp('\\b'+name+'\\b').test(source)){needed.add(name);source+='\n'+code;changed=true;}}
 const definitions=[...needed].map(name=>helpers[name]).join('\n\n');
 const signature=method.returns+' '+method.name+'('+params.map(p=>p.type+' '+p.name).join(', ')+')';
 return '// C++11；标准头文件及节点结构由平台提供。\n'+typeNotes(id)+(definitions?definitions+'\n\n':'')+'class Solution {\npublic:\n    '+signature+' {\n'+body.split('\n').map(line=>'        '+line).join('\n')+'\n    }\n};\n';
}
function leetcodeTemplate(id){
 if(designs[id]){const d=designs[id];return `// 平台已提供节点结构与标准头文件；此模式不需要 main。\n`+typeNotes(id)+`class ${d.name} {\npublic:\n    ${d.name}(${d.constructor}) {\n        // TODO: 初始化数据结构\n    }\n`+d.methods.map(m=>`\n    ${m} {\n        // TODO: 实现操作\n        throw logic_error("TODO");\n    }\n`).join('')+'};\n';}
 return '// 平台已提供标准头文件和本题节点结构；只实现函数，不要写 main。\n'+typeNotes(id)+'class Solution {\npublic:\n    '+signatures[id]+' {\n        // TODO: 在这里实现算法\n        throw logic_error("TODO");\n    }\n};\n';
}
function legacyTemplates(id){return{LEETCODE:leetcodeTemplate(id),ACM_TEMPLATE:'#include <iostream>\n#include <string>\n#include <vector>\n#include <algorithm>\n#include <nlohmann/json.hpp>\nusing namespace std;\nusing json=nlohmann::json;\n\nint main() {\n    ios::sync_with_stdio(false); cin.tie(nullptr);\n    string line;\n    while (getline(cin, line)) {\n        if (line.empty()) continue;\n        json args = json::parse(line);\n        // 按左侧参数说明读取数据，例如：\n        // vector<int> nums = args[0].get<vector<int>>();\n        // TODO: 编写算法，并将结果保存到 answer。\n        json answer = nullptr;\n        cout << answer.dump() << "\\n";\n    }\n}\n',ACM_BLANK:''};}
function convert(type,expression){type=type.replace(/&/g,'').trim();if(type==='TreeNode*')return`readTree<TreeNode>(${expression})`;if(type==='ListNode*')return`readList(${expression})`;if(type==='vector<ListNode*>')return`readLists(${expression})`;if(type==='vector<vector<char>>')return`readChars(${expression})`;return`${expression}.get<${type}>()`;}
function driver(id){
 id=String(id);
 if(designs[id]){const design=designs[id],ctor=design.constructor?parse('void ctor('+design.constructor+')').params:[];return `const auto& ops=args.at(0); const auto& params=args.at(1);\njson out=json::array(); unique_ptr<${design.name}> object;\nfor(size_t i=0;i<ops.size();++i) {\nstring op=ops[i].get<string>();\nif(op=="${design.name}") { object.reset(new ${design.name}(${ctor.map((p,k)=>convert(p.type,`params.at(i).at(${k})`)).join(',')})); out.push_back(nullptr); }\n`+design.methods.map((signature)=>{const method=parse(signature);return`else if(op=="${method.name}") { if(!object) throw runtime_error("请先调用构造方法"); ${method.params.map((p,k)=>`auto v${k}=${convert(p.type,`params.at(i).at(${k})`)};`).join('')} `+(method.returns==='void'?`object->${method.name}(${method.params.map((_,k)=>'v'+k).join(',')}); out.push_back(nullptr);`:`out.push_back(object->${method.name}(${method.params.map((_,k)=>'v'+k).join(',')}));`)+' }\n';}).join('')+'else throw runtime_error("未知操作");\n}\nreturn out;';}
 const method=parse(signatures[id]);let setup=method.params.map((p,i)=>`auto v${i}=${convert(p.type,`args.at(${i})`)};`).join('\n');
 if(id==='160')setup=String.raw`auto shared=readList(json::array()); int skipA=args.at(2).get<int>(),skipB=args.at(3).get<int>();
json tail=json::array(); for(size_t i=skipA;i<args[0].size();++i) tail.push_back(args[0][i]); shared=readList(tail);
auto attach=[&](const json& values,int count) { ListNode dummy; auto p=&dummy; for(int i=0;i<count;++i) { p->next=new ListNode(values.at(i).get<int>()); p=p->next; } p->next=shared; return dummy.next; };
auto v0=attach(args.at(0),skipA),v1=attach(args.at(1),skipB);`;
 if(id==='141'||id==='142')setup='auto v0=readList(args.at(0),args.at(1).get<int>());';
 if(id==='236')setup='auto v0=readTree<TreeNode>(args.at(0)); auto v1=treeValue(v0,args.at(1).get<int>()),v2=treeValue(v0,args.at(2).get<int>());';
 if(id==='138')setup=String.raw`vector<Node*> nodes; for(auto& item:args.at(0)) nodes.push_back(new Node(item.at(0).get<int>()));
for(size_t i=0;i<nodes.size();++i) { if(i+1<nodes.size()) nodes[i]->next=nodes[i+1]; if(!args[0][i][1].is_null()) nodes[i]->random=nodes.at(args[0][i][1].get<int>()); }
Node* v0=nodes.empty()?nullptr:nodes[0];`;
 if(id==='133')setup=String.raw`vector<Node*> nodes; for(size_t i=0;i<args.at(0).size();++i) nodes.push_back(new Node((int)i+1));
for(size_t i=0;i<nodes.size();++i) for(auto& neighbor:args[0][i]) nodes[i]->neighbors.push_back(nodes.at(neighbor.get<int>()-1));
Node* v0=nodes.empty()?nullptr:nodes[0];`;
 if(id==='117')setup='auto v0=readTree<Node>(args.at(0));';
 const call=`object.${method.name}(${method.params.map((_,i)=>'v'+i).join(',')})`;
 let result=method.returns==='void'?`${call};\nreturn v0;`:`auto answer=${call};\nreturn answer;`;
 if([27,26,80].includes(Number(id)))result=`int length=${call}; if(length<0||length>(int)v0.size()) throw runtime_error("返回长度无效"); v0.resize(length); return v0;`;
 if(method.returns==='ListNode*')result=`auto answer=${call}; return writeList(answer);`;
 if(method.returns==='TreeNode*')result=`auto answer=${call}; return writeTree(answer);`;
 if(id==='160'||id==='236')result=`auto answer=${call}; return answer?json(answer->val):json(nullptr);`;
 if(id==='142')result=`auto answer=${call}; auto node=v0; int index=0; unordered_set<ListNode*> seen; while(node&&seen.insert(node).second) { if(node==answer) return index; node=node->next; ++index; } return -1;`;
 if(id==='114')result=`${call}; json out=json::array(); unordered_set<TreeNode*> seen; while(v0) { if(v0->left||!seen.insert(v0).second) throw runtime_error("展开结果不是合法右链"); out.push_back(v0->val); v0=v0->right; } return out;`;
 if(id==='130')result=`${call}; return writeChars(v0);`;
 if(id==='138')result=String.raw`auto answer=CALL; vector<Node*> copies; unordered_map<Node*,int> index;
for(auto p=answer;p;p=p->next) { if(index.count(p)||copies.size()>100000) throw runtime_error("复制链表出现环"); index[p]=copies.size(); copies.push_back(p); }
json out=json::array(); for(auto p:copies) { if(p->random&&!index.count(p->random)) throw runtime_error("random指针指向链外"); out.push_back(json::array({p->val,p->random?json(index[p->random]):json(nullptr)})); } return out;`.replace('CALL',call);
 if(id==='133')result=String.raw`auto answer=CALL; if(!answer) return json::array(); map<int,Node*> found; queue<Node*> q; q.push(answer); found[answer->val]=answer;
while(!q.empty()) { auto p=q.front(); q.pop(); for(auto next:p->neighbors) if(!found.count(next->val)) { found[next->val]=next; q.push(next); if(found.size()>100000) throw runtime_error("图过大"); } }
json out=json::array(); for(auto& entry:found) { json row=json::array(); for(auto next:entry.second->neighbors) row.push_back(next->val); out.push_back(row); } return out;`.replace('CALL',call);
 if(id==='117')result=String.raw`auto answer=CALL; json out=json::array(); Node* level=answer; unordered_set<Node*> seen;
while(level) { json row=json::array(); Node* nextLevel=nullptr;
for(auto p=level;p;p=p->next) { if(!seen.insert(p).second) throw runtime_error("next出现环或跨层"); row.push_back(p->val); if(!nextLevel) nextLevel=p->left?p->left:p->right; }
out.push_back(row); level=nextLevel;
} return out;`.replace('CALL',call);
 if(id==='427')result=String.raw`auto answer=CALL; unordered_set<Node*> seen;
function<json(Node*)> serialize=[&](Node* p)->json { if(!p||!seen.insert(p).second) throw runtime_error("四叉树结构无效"); if(p->isLeaf) return json::array({p->val?1:0}); return json::array({0,serialize(p->topLeft),serialize(p->topRight),serialize(p->bottomLeft),serialize(p->bottomRight)}); };
return serialize(answer);`.replace('CALL',call);
 return setup+'\nSolution object;\n'+result;
}
function wrap(id,code,mode='LEETCODE'){
 if(mode!=='LEETCODE')return code;
 const invoke=driver(id),markers=[['readList','ListNode* readList'],['writeList','json writeList'],['readTree','template<class T> T* readTree'],['writeTree','template<class T> json writeTree'],['treeValue','TreeNode* treeValue'],['readChars','vector<vector<char>> readChars'],['writeChars','json writeChars']];
 const adapter={};for(let i=0;i<markers.length;i++)adapter[markers[i][0]]=support.slice(support.indexOf(markers[i][1]),i+1<markers.length?support.indexOf(markers[i+1][1]):support.length);
 adapter.readLists='vector<ListNode*> readLists(const json& rows) { vector<ListNode*> out; for(auto& row:rows) out.push_back(readList(row)); return out; }\n';
 const needed=new Set();let scan=invoke,changed=true;while(changed){changed=false;for(const [name,source]of Object.entries(adapter))if(!needed.has(name)&&new RegExp('\\b'+name+'\\b').test(scan)){needed.add(name);scan+='\n'+source;changed=true;}}
 const runtime='using json=nlohmann::json;\n'+Object.keys(adapter).filter(name=>needed.has(name)).map(name=>adapter[name]).join('\n');
 return includes+'#include <nlohmann/json.hpp>\n'+structure(id)+'\n'+runtime+'\n'+code+'\njson studyInvoke(json args) {\n'+invoke+'\n}\nint main() {\n    ios::sync_with_stdio(false); cin.tie(nullptr);\n    string line;\n    try { while(getline(cin,line)) { if(line.empty()) continue; cout<<studyInvoke(json::parse(line)).dump()<<"\\n"; } }\n    catch(const exception& e) { cerr<<e.what()<<"\\n"; return 1; }\n}\n';
}
function legacyAcmReference(id){
 // 完整ACM程序包含节点结构、JSON适配和main；力扣参考代码不包含这些包装。
 return wrap(id,reference(id),'LEETCODE');
}
for(const p of require('./catalog.json').problems)if(!signatures[p.id]&&!designs[p.id]||!bodies[p.id]&&!classes[p.id])throw Error('C++接口或解答缺少题目 '+p.id);
function templates(id){return {...legacyTemplates(id),ACM_TEMPLATE:require("./acm").program(id,leetcodeTemplate(id),module.exports)};}
function acmReference(id){return require("./acm").program(id,reference(id),module.exports);}
module.exports={MODES,templates,legacyTemplates,reference,acmReference,legacyAcmReference,wrap,driver,structure,includes};
module.exports.alternatives=id=>(variants[id]||[]).map(v=>({title:v.title,idea:v.idea,language:'cpp',code:reference(id,v.body),acmCode:require("./acm").program(id,reference(id,v.body),module.exports),legacyAcmCode:wrap(id,reference(id,v.body))}));
module.exports.idea=(id,fallback)=>require('./cpp-solutions').explanations[id]||fallback;
