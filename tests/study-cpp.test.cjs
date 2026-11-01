const test=require('node:test'),assert=require('node:assert/strict');
const P=require('../study/problems'),Cpp=require('../study/cpp');

test('183题统一C++11题解，函数模式与完整ACM代码均齐全，空白模式真正为空',()=>{
 let alternatives=0;
 for(const p of P.catalog.problems){
  const templates=Cpp.templates(p.id);assert.match(templates.LEETCODE,/TODO/);assert.match(templates.ACM_TEMPLATE,/int main\(\)/);assert.equal(templates.ACM_BLANK,'');
  const detail=P.detail(p.id);for(const s of detail.solutions){assert.equal(s.language,'cpp');assert.match(s.code,/class /);assert.doesNotMatch(s.code,/int main\(/);assert.match(s.acmCode,/int main\(\)/);assert.doesNotMatch(s.acmCode,/nlohmann\/json.hpp/);assert.ok(!s.code.includes('const fs=require'));
  }alternatives+=detail.solutions.length-1;
 }
 assert.equal(alternatives,10);
});

test('题解、模板与调用适配不依赖C++14/17专有语法或库函数',()=>{
 for(const p of P.catalog.problems){
  const detail=P.detail(p.id),templates=Cpp.templates(p.id);
  for(const source of[...Object.values(templates),...detail.solutions.flatMap(s=>[s.code,s.acmCode,Cpp.wrap(p.id,s.code)])]){
   assert.doesNotMatch(source,/\bauto\s*&?\s*\[|\bmake_unique\s*<|\bgcd\s*\(|\bif\s+constexpr|\b(?:string_view|optional|variant)\s*[< ]/,p.id);
   assert.doesNotMatch(source,/\]\s*\([^)]*\bauto\b/,p.id);
  }
 }
});

test('力扣调用包装涵盖节点身份、原地函数、字符矩阵及设计类，ACM代码不被改写',()=>{
 assert.ok(Cpp.wrap(1,Cpp.reference(1)).includes('object.twoSum(v0,v1)'));
 assert.ok(!Cpp.wrap(1,Cpp.reference(1)).includes('readList('),'数组题不应混入不相关的节点适配');
 assert.match(Cpp.templates(138).LEETCODE,/random/);assert.match(Cpp.templates(117).LEETCODE,/next/);assert.match(Cpp.templates(133).LEETCODE,/neighbors/);
 assert.match(Cpp.wrap(160,Cpp.reference(160)),/shared/);assert.match(Cpp.wrap(141,Cpp.reference(141)),/readList\(args.at\(0\),args.at\(1\)/);
 assert.match(Cpp.wrap(236,Cpp.reference(236)),/treeValue/);assert.match(Cpp.wrap(130,Cpp.reference(130)),/writeChars/);
 assert.match(Cpp.wrap(27,Cpp.reference(27)),/v0.resize\(length\)/);
 for(const id of[146,155,173,208,211,295,380])assert.match(Cpp.wrap(id,Cpp.reference(id)),/object.reset\(new /);
 const source='#include <iostream>\nint main(){std::cout<<"null";}';assert.equal(Cpp.wrap(1,source,'ACM_TEMPLATE'),source);assert.equal(Cpp.wrap(1,source,'ACM_BLANK'),source);
});
