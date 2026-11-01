// Compile only trusted repository reference programs, never user submissions.
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const P=require('../study/problems'),R=require('../study/reference'),Cpp=require('../study/cpp'),Acm=require('../study/acm'),{check}=require('../study/checker');
const dir=path.resolve(__dirname,'../.study-cpp-test');
async function main(){
 fs.mkdirSync(path.join(dir,'include/nlohmann'),{recursive:true});const header=path.join(dir,'include/nlohmann/json.hpp');
 if(!fs.existsSync(header)){const response=await fetch('https://raw.githubusercontent.com/nlohmann/json/v3.11.3/single_include/nlohmann/json.hpp');if(!response.ok)throw Error('JSON test harness header unavailable');fs.writeFileSync(header,await response.text());}
 let compiler=process.env.CXX||'g++',env=process.env;const msvc=process.platform==='win32';
 if(msvc){const install=spawnSync('C:/Program Files (x86)/Microsoft Visual Studio/Installer/vswhere.exe',['-latest','-property','installationPath'],{encoding:'utf8'}).stdout.trim(),vcvars=path.join(install,'VC/Auxiliary/Build/vcvars64.bat');const result=spawnSync('cmd.exe',['/d','/c',`call "${vcvars}" >nul && set`],{encoding:'utf8',windowsVerbatimArguments:true});if(result.status!==0)throw Error(result.stderr);env={};for(const line of result.stdout.split(/\r?\n/)){const i=line.indexOf('=');if(i>0)env[line.slice(0,i)]=line.slice(i+1);}compiler='cl.exe';}
 let total=0;
 for(let start=0;start<P.catalog.problems.length;start+=24){
  const entries=P.catalog.problems.slice(start,start+24).flatMap(p=>[{id:p.id,key:Number(p.id),source:Cpp.acmReference(p.id)},...Cpp.alternatives(p.id).map((v,i)=>({id:p.id,key:Number(p.id)+10000*(i+1),source:v.acmCode}))]);
  if(process.env.ACM_HEADERS_TEST==='1')for(const entry of entries){
   const unit=path.join(dir,'standalone.cpp');fs.writeFileSync(unit,entry.source);
   const flags=msvc?['/nologo','/std:c++14','/EHsc','/utf-8','/Zs',unit]:['-std=c++11','-pedantic-errors','-fsyntax-only',unit];
   const syntax=spawnSync(compiler,flags,{env,cwd:dir,encoding:'utf8',timeout:60000,maxBuffer:1024*1024});if(syntax.status!==0)throw Error('standalone #'+entry.key+'\n'+syntax.stdout+'\n'+syntax.stderr);
  }
  const source=path.join(dir,'plain-'+start+'.cpp'),binary=path.join(dir,'plain-'+start+(msvc?'.exe':''));
  let text=Cpp.includes+'#include <nlohmann/json.hpp>\n';for(const e of entries)text+=`namespace P${e.key} {\n${e.source}\n}\n`;
  text+='int main(){ios::sync_with_stdio(false);string line;while(getline(cin,line)){auto input=nlohmann::json::parse(line);int key=input[0].get<int>();string data=input[1].get<string>();istringstream in(data);ostringstream out;auto* oldIn=cin.rdbuf(in.rdbuf());auto* oldOut=cout.rdbuf(out.rdbuf());cin.clear();int code=0;switch(key){'+entries.map(e=>`case ${e.key}:code=P${e.key}::main();break;`).join('')+'default:return 2;}cin.rdbuf(oldIn);cout.rdbuf(oldOut);cin.clear();if(code)return code;cout<<nlohmann::json(out.str()).dump()<<endl;}}';
  fs.writeFileSync(source,text);
  const args=msvc?['/nologo','/std:c++14','/EHsc','/utf-8','/bigobj','/Od','/I'+path.join(dir,'include'),source,'/Fe:'+binary,'/Fo:'+path.join(dir,'plain-'+start+'.obj')]:['-std=c++11','-pedantic-errors','-O0','-I'+path.join(dir,'include'),source,'-o',binary];
  const built=spawnSync(compiler,args,{env,cwd:dir,encoding:'utf8',timeout:240000,maxBuffer:4*1024*1024});if(built.status!==0)throw Error('compile batch '+start+'\n'+built.stdout+'\n'+built.stderr);
  const cases=entries.flatMap(e=>P.get(e.id).cases.map(args=>({...e,args})));
  const run=spawnSync(binary,[],{input:cases.map(c=>JSON.stringify([c.key,Acm.encode(c.id,c.args)])).join('\n')+'\n',encoding:'utf8',timeout:45000,maxBuffer:8*1024*1024});if(run.status!==0)throw Error('run batch '+start+' '+run.stderr);
  const lines=run.stdout.trim().split(/\r?\n/);if(lines.length!==cases.length)throw Error('wrong output lines '+start+' '+lines.length+'/'+cases.length);
  for(let i=0;i<cases.length;i++){const c=cases[i],stdout=JSON.parse(lines[i]);let actual;try{actual=Acm.decode(c.id,stdout);}catch(e){throw Error('decode #'+c.id+' '+e.message+' '+JSON.stringify(stdout));}if(!check(c.id,c.args,actual,R.solve(c.id,c.args)))throw Error('wrong #'+c.id+' '+JSON.stringify(c.args)+' stdout='+JSON.stringify(stdout));total++;}
  console.log('普通ACM已验证 '+Math.min(start+24,183)+'/183，'+total+'组');
 }
 console.log('全部普通ACM参考解答通过：'+total+'组');
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
