"use strict";
// 在用户Linux服务器上验证真实沙箱；只使用本仓库内的固定可信程序，不触碰用户提交或战绩。
const fs=require('node:fs'),assert=require('node:assert/strict');
async function main(){
 if(process.platform!=='linux')throw Error('此检查必须在部署判题服务的Linux服务器执行');
 const config=Object.fromEntries(fs.readFileSync('/etc/billiards-study.env','utf8').split(/\r?\n/).filter(s=>/^[A-Z_]+=/.test(s)).map(s=>{const i=s.indexOf('=');return[s.slice(0,i),s.slice(i+1).replace(/^(["'])(.*)\1$/,'$2')];}));
 const token=config.STUDY_RUNNER_TOKEN,base=config.STUDY_RUNNER_URL||'http://127.0.0.1:3999',url=new URL(base);
 if(!token||token.length<32)throw Error('缺少有效判题token');
 if(url.protocol!=='http:'||!['127.0.0.1','localhost','[::1]'].includes(url.hostname))throw Error('冒烟检查只允许连接本机loopback服务');
 async function request(route,data){const res=await fetch(base+route,{method:data?'POST':'GET',headers:{authorization:'Bearer '+token,'content-type':'application/json'},body:data?JSON.stringify(data):undefined,signal:AbortSignal.timeout(55000)});const value=await res.json();if(!res.ok)throw Error(value.error||'判题请求失败');return value;}
 const health=await request('/health');assert.equal(health.ready,true,health.message);assert.equal(health.backend,'native');
 console.log('✓ 轻量沙箱和systemd资源限制就绪');
 const probe=String.raw`#if __has_include("/opt/billiards-club/server.js") || __has_include("/etc/billiards-study.env")
#error Host files must be hidden from the compiler too
#endif
#include <iostream>
#include <fstream>
#include <iterator>
#include <string>
#include <cstdlib>
#include <sys/resource.h>
#include <unistd.h>
std::string link(const char* name){char data[256];auto n=readlink(name,data,sizeof(data));return n<0?"":std::string(data,n);}
int main(){
 std::ifstream db("/opt/billiards-club/data/db.json"),secret("/etc/billiards-study.env"),parent("/proc/1/environ");
 std::string environment((std::istreambuf_iterator<char>(parent)),std::istreambuf_iterator<char>());
 std::ofstream artifact("/artifact/write-probe"),source("/src/main.cpp",std::ios::app);
 rlimit memory{},cpu{},tasks{};getrlimit(RLIMIT_AS,&memory);getrlimit(RLIMIT_CPU,&cpu);getrlimit(RLIMIT_NPROC,&tasks);
 std::cout<<"{\"hidden\":"<<(!db&&!secret&&!artifact&&!source)<<",\"cleanEnv\":"<<(!std::getenv("STUDY_RUNNER_TOKEN")&&environment.find("STUDY_RUNNER_TOKEN=")==std::string::npos)<<",\"limited\":"<<(memory.rlim_max<=268435456&&cpu.rlim_max<=3&&tasks.rlim_max<=32)<<",\"net\":\""<<link("/proc/self/ns/net")<<"\",\"pid\":\""<<link("/proc/self/ns/pid")<<"\"}";
}`;
 async function execute(code){return request('/execute',{language:'cpp',code,inputs:['\n']});}
 const result=await execute(probe);assert.equal(result.status,'OK',result.compileError);assert.equal(result.runs[0].status,'OK',result.runs[0].stderr);
 const isolation=JSON.parse(result.runs[0].stdout);assert.equal(isolation.hidden,1,'源码/产物必须只读且不能访问站点数据库或密钥');assert.equal(isolation.cleanEnv,1,'不能继承worker密钥');assert.equal(isolation.limited,1,'进程资源上限不正确');assert.notEqual(isolation.net,fs.readlinkSync('/proc/self/ns/net'));assert.notEqual(isolation.pid,fs.readlinkSync('/proc/self/ns/pid'));
 console.log('✓ 文件系统、环境变量、PID/网络命名空间及进程上限检查通过');
 const bad=await execute('int main( {');assert.equal(bad.status,'CE');console.log('✓ 编译错误能够返回CE');
 const error=await execute('int main(){return 7;}');assert.equal(error.runs[0].status,'RE');console.log('✓ 异常退出能够返回RE');
 const loop=await execute('int main(){for(;;){}}');assert.equal(loop.runs[0].status,'TLE');console.log('✓ 无限循环能够终止并返回TLE');
 const output=await execute('#include <iostream>\n#include <string>\nint main(){std::string s(8192,\'x\');for(;;)std::cout<<s;}');assert.equal(output.runs[0].status,'OLE');console.log('✓ 大量输出能够终止并返回OLE');
 console.log('全部轻量判题冒烟检查通过；未写入任何账号进度。');
}
main().catch(e=>{console.error('轻量判题检查失败：'+e.message);process.exitCode=1;});
