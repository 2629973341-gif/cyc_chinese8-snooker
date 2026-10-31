// 编译并运行仓库内可信C++参考解答；绝不用于运行用户提交。
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const P=require('../study/problems'),R=require('../study/reference'),Cpp=require('../study/cpp'),{check}=require('../study/checker');
const root=path.resolve(__dirname,'..'),dir=path.join(root,'.study-cpp-test');
async function main(){
 fs.mkdirSync(path.join(dir,'include','nlohmann'),{recursive:true});
 const header=path.join(dir,'include','nlohmann','json.hpp');
 if(!fs.existsSync(header)){const response=await fetch('https://raw.githubusercontent.com/nlohmann/json/v3.11.3/single_include/nlohmann/json.hpp');if(!response.ok)throw Error('无法下载仅供测试的JSON头文件');fs.writeFileSync(header,await response.text());}
 let compiler=process.env.CXX||'g++',env=process.env,msvc=process.platform==='win32';
 if(msvc){const vswhere='C:/Program Files (x86)/Microsoft Visual Studio/Installer/vswhere.exe';const install=spawnSync(vswhere,['-latest','-property','installationPath'],{encoding:'utf8'}).stdout.trim();
  const vcvars=path.join(install,'VC','Auxiliary','Build','vcvars64.bat');
  const result=spawnSync('cmd.exe',['/d','/c',`call "${vcvars}" >nul && set`],{encoding:'utf8',windowsVerbatimArguments:true});
  if(result.status!==0)throw Error('无法加载MSVC环境 '+result.stderr);
  env={};for(const line of result.stdout.split(/\r?\n/)){const i=line.indexOf('=');if(i>0)env[line.slice(0,i)]=line.slice(i+1);}
  compiler='cl.exe';
 }
 let total=0,primary=0;
 for(let start=Number(process.env.CPP_START_BATCH)||0;start<P.catalog.problems.length;start+=24){
  const problems=P.catalog.problems.slice(start,start+24),source=path.join(dir,'batch-'+start+'.cpp'),binary=path.join(dir,'batch-'+start+(msvc?'.exe':''));
  const entries=problems.flatMap(p=>[{id:p.id,key:Number(p.id),source:Cpp.acmReference(p.id)},...Cpp.alternatives(p.id).map((v,i)=>({id:p.id,key:Number(p.id)+10000*(i+1),source:v.acmCode}))]);
  let text=Cpp.includes+'#include <nlohmann/json.hpp>\n';
  for(const p of entries)text+=`namespace P${p.key} {\n`+p.source+'\n}\n';
  text+='int main(){string line;while(getline(cin,line)){auto input=nlohmann::json::parse(line);int id=input[0].get<int>();auto args=input[1];cerr<<"#"<<id<<" "<<args.dump()<<endl;nlohmann::json out;switch(id){'+entries.map(p=>`case ${p.key}:out=P${p.key}::studyInvoke(args);break;`).join('')+'default:return 2;}cout<<out.dump()<<endl;}}';
  fs.writeFileSync(source,text);
  const args=msvc?['/nologo','/std:c++17','/EHsc','/utf-8','/bigobj','/Od','/I'+path.join(dir,'include'),source,'/Fe:'+binary,'/Fo:'+path.join(dir,'batch-'+start+'.obj')]:['-std=c++17','-O0','-I'+path.join(dir,'include'),source,'-o',binary];
  const compiled=spawnSync(compiler,args,{env,cwd:dir,encoding:'utf8',timeout:240000,maxBuffer:4*1024*1024});
  if(compiled.status!==0)throw Error('C++编译失败 '+start+'\n'+compiled.stdout+'\n'+compiled.stderr);
  const cases=entries.flatMap(p=>P.get(p.id).cases.map(args=>({id:p.id,key:p.key,args})));
  const executed=spawnSync(binary,[],{input:cases.map(c=>JSON.stringify([c.key,c.args])).join('\n')+'\n',encoding:'utf8',timeout:45000,maxBuffer:8*1024*1024});
  if(executed.status!==0)throw Error('参考程序执行失败 '+start+' exit='+executed.status+'\n'+executed.stderr.slice(-1800));
  const lines=executed.stdout.trim().split(/\r?\n/);if(lines.length!==cases.length)throw Error('输出行数不符 '+start);
  for(let i=0;i<cases.length;i++){const c=cases[i],actual=JSON.parse(lines[i]),expected=R.solve(c.id,c.args);if(!check(c.id,c.args,actual,expected))throw Error(`C++答案错误 #${c.id}: ${JSON.stringify(c.args)}\n实际 ${lines[i]}\n期望 ${JSON.stringify(expected)}`);total++;if(c.key===Number(c.id))primary++;}
  console.log(`C++已验证 ${Math.min(start+24,183)}/183 题，累计 ${total} 组用例`);
 }
 console.log('全部C++参考解答编译/执行通过：主解 '+primary+' 组，含多解 '+total+' 组用例');
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
