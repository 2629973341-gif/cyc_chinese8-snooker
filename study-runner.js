"use strict";
// 轻量判题独立进程：不使用Docker，不在裸宿主上运行用户代码。
const http=require('node:http'),crypto=require('node:crypto');
const {createNativeRunner}=require('./study/native-runner');
function createRunner({token=process.env.STUDY_RUNNER_TOKEN||'',engine=createNativeRunner()}={}){
 let active=false;
 function reply(res,status,data){res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store'});res.end(JSON.stringify(data));}
 return http.createServer(async(req,res)=>{
  const received=Buffer.from(req.headers.authorization||''),expected=Buffer.from('Bearer '+token);
  if(token.length<32||received.length!==expected.length||!crypto.timingSafeEqual(received,expected))return reply(res,401,{error:'未授权'});
  try{
   if(req.method==='GET'&&req.url==='/health')return reply(res,200,await engine.health());
   if(req.method!=='POST'||req.url!=='/execute')return reply(res,404,{error:'不存在'});
   if(active)return reply(res,429,{error:'轻量判题一次处理一份代码，请稍后重试'});
   active=true;
   try{
    const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>1048576)throw Object.assign(Error('请求过大'),{status:413});chunks.push(chunk);}
    let payload;try{payload=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw Object.assign(Error('JSON格式错误'),{status:400});}
    reply(res,200,await engine.execute(payload));
   }finally{active=false;}
  }catch(e){reply(res,e.status||503,{error:e.message});}
 });
}
if(require.main===module){
 if((process.env.STUDY_RUNNER_TOKEN||'').length<32)throw Error('STUDY_RUNNER_TOKEN 至少需要32字符');
 const server=createRunner();server.requestTimeout=65000;
 server.listen(Number(process.env.STUDY_RUNNER_PORT)||3999,'127.0.0.1',()=>console.log('Lightweight C++ study runner listening on loopback'));
}
module.exports={createRunner};
