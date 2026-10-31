"use strict";
const $=s=>document.querySelector(s),difficultyNames={EASY:'简单',MEDIUM:'中等',HARD:'困难'};
const verdictNames={AC:'通过本地测试',WA:'答案错误',RE:'运行错误',CE:'编译错误',TLE:'执行超时',OLE:'输出超限'};
let catalog=null,current=null,plan='HOT100',selectedId=null,detailRequest=0,language='javascript',working=false,ready=false,tab='description',restorable=null,saveTimer=null,saveQueue=Promise.resolve(),editVersion=0;
function node(tag,text,cls){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;}
function toast(message){$('#toast').textContent=message;clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').textContent='',3500);}
async function api(url,options={}){const response=await fetch(url,{...options,headers:{'content-type':'application/json',...(catalog?{'x-study-account':catalog.me.id}:{}),...(options.headers||{})}});const data=await response.json().catch(()=>({}));if(response.status===401){$('#app').hidden=true;$('#loginRequired').hidden=false;throw Error('请先登录');}if(!response.ok)throw Error(data.error||'请求失败');return data;}
function totals(){const solved=catalog.problems.filter(p=>p.progress?.acceptedAt).length;$('#totalSolved').textContent=solved;$('#plans').replaceChildren(...catalog.plans.map(p=>{const b=node('button',undefined,p.id===plan?'active':'');b.append(node('span',p.id==='HOT100'?'Hot 100':'面试经典 150'),node('small',`${p.solved} / ${p.total}`));b.onclick=()=>{plan=p.id;totals();renderList();};return b;}));}
function renderList(){
 const query=$('#search').value.trim().toLowerCase(),diff=$('#difficulty').value,completion=$('#completion').value;
 const order=new Map(catalog.plans.find(p=>p.id===plan).ids.map((id,i)=>[id,i]));
 const all=catalog.problems.filter(p=>p.plans.includes(plan)).sort((a,b)=>order.get(a.id)-order.get(b.id)),items=all.filter(p=>(diff==='ALL'||p.difficulty===diff)&&(completion==='ALL'||completion==='AC'&&p.progress?.acceptedAt||completion==='TODO'&&!p.progress?.acceptedAt||completion==='TRIED'&&p.progress?.attempts>0)&&(!query||[p.id,p.title,...p.tags].some(s=>s.toLowerCase().includes(query))));
 const list=$('#problemList');list.replaceChildren();let category='';
 for(const p of items){if(p.categories[plan]!==category){category=p.categories[plan];list.append(node('div',category,'category-label'));}const b=node('button',undefined,'problem-item'+(p.id===selectedId?' active':''));b.dataset.difficulty=p.difficulty;b.dataset.id=p.id;b.setAttribute('aria-current',String(p.id===selectedId));const status=node('span',p.progress?.acceptedAt?'✓':p.progress?.attempts?'◔':'·','item-status'+(p.progress?.acceptedAt?' ac':p.progress?.attempts?' tried':''));status.setAttribute('aria-label',p.progress?.acceptedAt?'已通过':p.progress?.attempts?'已尝试':'未尝试');const title=node('span');title.append(node('small',p.id+'.'),document.createTextNode(p.title));b.append(status,title,node('span',difficultyNames[p.difficulty],'difficulty-dot'));b.onclick=()=>selectProblem(p.id);list.append(b);}
 if(!items.length)list.append(node('p','没有符合筛选条件的题目','no-results'));
 const solved=all.filter(p=>p.progress?.acceptedAt).length;$('#listCount').textContent=`${items.length} 道题`;$('#planProgress').textContent=`已通过 ${solved} / ${all.length}`;$('#progress').max=all.length;$('#progress').value=solved;
}
function numbers(){const count=$('#code').value.split('\n').length;$('#lineNumbers').textContent=Array.from({length:count},(_,i)=>i+1).join('\n');$('#lineNumbers').scrollTop=$('#code').scrollTop;}
function saveSnapshot(snapshot){
 if(!snapshot||!snapshot.code.trim())return Promise.resolve();
 $('#saveState').textContent='保存中…';
 const operation=saveQueue.catch(()=>{}).then(()=>api(`/api/study/problems/${snapshot.id}/draft`,{method:'POST',body:JSON.stringify(snapshot)}));
 saveQueue=operation;
 return operation.then(()=>{if(current?.id===snapshot.id){current.drafts[snapshot.language]={code:snapshot.code,updatedAt:new Date().toISOString()};if(editVersion===snapshot.version)$('#saveState').textContent='已保存至当前账号';}}).catch(e=>{$('#saveState').textContent='保存失败，代码仍在编辑器';throw e;});
}
function snapshot(){return current?{id:current.id,language,code:$('#code').value,version:editVersion}:null;}
async function flush(){clearTimeout(saveTimer);await saveSnapshot(snapshot());}
function fillEditor(){const draft=current?.drafts?.[language];$('#code').value=draft?.code||catalog.templates[language];editVersion++;$('#saveState').textContent=draft?'已恢复本账号草稿':'草稿按账号保存';numbers();}
async function selectProblem(id){
 if(!catalog.problems.some(p=>p.id===id))return;
 try{if(current)await flush();}catch(e){toast(e.message);return;}
 const token=++detailRequest;$('#problemTitle').textContent='加载题目…';
 try{
   const data=await api(`/api/study/problems/${id}`);if(token!==detailRequest)return;
   current={...data.problem,drafts:data.drafts,progress:data.progress};selectedId=id;history.replaceState(null,'','#'+id);
   $('#problemNumber').textContent='NO. '+current.id;$('#problemTitle').textContent=current.title;$('#statement').textContent=current.statement;$('#parameters').textContent=current.parameters;
   $('#problemDifficulty').textContent=difficultyNames[current.difficulty];$('#problemDifficulty').className='badge '+current.difficulty;
   $('#problemCompletion').textContent=current.progress?.acceptedAt?'✓ 已通过':'';$('#tags').replaceChildren(...current.tags.map(t=>node('span',t)));
   $('#exampleInput').textContent=current.example.input;$('#exampleOutput').textContent=current.example.output;$('#stdin').value=current.example.input+'\n';$('#sourceLink').href=current.source;$('#editorialLink').href=current.editorial;
   $('#testHint').textContent=`${current.testCount} 组本地测试`;fillEditor();renderList();renderSolutions();$('#historyList').replaceChildren();setTab('description');
   $('#workspace').classList.remove('show-list','show-editor');if(!working)clearResult();buttons();
 }catch(e){toast(e.message);$('#problemTitle').textContent='加载失败，请重新选择题目';}
}
function setTab(value){tab=value;for(const name of['description','solutions','history'])$('#'+name+'Panel').hidden=name!==value;document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===value));if(value==='history')loadHistory();}
function renderSolutions(){
 $('#solutionList').replaceChildren(...current.solutions.map(s=>{const card=node('section',undefined,'solution-card');card.append(node('h3',s.title),node('p',s.idea));if(s.complexity)card.append(node('p','时间 / 空间：'+s.complexity,'muted'));if(s.code){const details=node('details'),summary=node('summary','展开 JavaScript 完整 ACM 程序'),pre=node('pre',s.code),copy=node('button','复制参考代码','quiet');copy.onclick=async()=>{try{if(navigator.clipboard&&window.isSecureContext){await navigator.clipboard.writeText(s.code);toast('已复制');}else{const t=node('textarea');t.value=s.code;t.style.position='fixed';t.style.opacity='0';document.body.append(t);t.select();const ok=document.execCommand('copy');t.remove();toast(ok?'已复制':'浏览器不允许复制，请手动选择代码');}}catch{toast('复制失败，请手动选择代码');}};details.append(summary,copy,pre);card.append(details);}return card;}));
}
async function loadHistory(){if(!current)return;const id=current.id;$('#historyList').replaceChildren(node('p','加载中…','muted'));try{const data=await api(`/api/study/submissions?problemId=${id}`);if(current.id!==id)return;$('#historyList').replaceChildren(...data.submissions.map(s=>{const b=node('button',undefined,'history-row'),title=node('span',verdictNames[s.verdict]||s.verdict,s.verdict==='AC'?'success':'failure'),info=node('span',`${s.passed} / ${s.total} · ${s.language}`);info.append(node('small',new Date(s.createdAt).toLocaleString('zh-CN')));b.append(title,info);b.onclick=()=>viewSubmission(s.id);return b;}));if(!data.submissions.length)$('#historyList').append(node('p','还没有提交。从第一次尝试开始吧。','muted'));}catch(e){$('#historyList').replaceChildren(node('p',e.message,'failure'));}}
async function viewSubmission(id){try{const data=await api(`/api/study/submissions/${id}`);restorable=data.submission;$('#submissionMeta').textContent=`${restorable.title} · ${restorable.language} · ${verdictNames[restorable.verdict]} · ${new Date(restorable.createdAt).toLocaleString('zh-CN')}`;$('#submissionCode').textContent=restorable.code;$('#submissionDialog').showModal();}catch(e){toast(e.message);}}
function buttons(){$('#run').disabled=$('#submit').disabled=working||!ready||!current;$('#submit').textContent=working?'正在判题…':'提交判题 ↗';$('#language').disabled=working;}
function clearResult(){$('#result').replaceChildren(node('div','每一次尝试，都离答案更近一点。','empty-result'));}
function resultLine(label,value){$('#result').append(node('div',label,'result-label'),node('pre',String(value??'')));}
async function execute(submit){
 if(working||!current||!ready)return;
 const job={id:current.id,title:current.title,language,code:$('#code').value,stdin:$('#stdin').value};if(!job.code.trim())return toast('请先输入代码');
 working=true;buttons();$('#result').replaceChildren(node('p',`${submit?'提交判题':'运行自测'} · ${job.title}，等待隔离环境返回…`,'muted'));
 try{
   await flush();
   const data=await api(`/api/study/problems/${job.id}/${submit?'submit':'run'}`,{method:'POST',body:JSON.stringify(job)});
   $('#result').replaceChildren();
   if(submit){const s=data.submission,heading=node('div',undefined,'result-heading');heading.append(node('strong',verdictNames[s.verdict]||s.verdict,s.verdict==='AC'?'success':'failure'),node('span',`${s.passed} / ${s.total}`));$('#result').append(heading,node('p',`#${job.id} ${job.title} · ${job.language} · 最慢测试墙钟 ${s.timeMs} ms（含容器开销）`));if(s.failed){$('#result').append(node('p',`第 ${s.failed.case} 组：${s.failed.message}`));if(s.failed.input!==undefined){resultLine('示例输入',s.failed.input);resultLine('期望输出',JSON.stringify(s.failed.expected));resultLine('实际输出',s.failed.actual);}else $('#result').append(node('p','隐藏测试仅显示状态，不下发输入或答案。'));}if(s.compileError)resultLine('编译信息',s.compileError);const p=catalog.problems.find(p=>p.id===job.id);p.progress=data.progress;catalog.plans=data.plans;totals();renderList();if(current.id===job.id){current.progress=data.progress;$('#problemCompletion').textContent=data.progress.acceptedAt?'✓ 已通过':'';if(tab==='history')loadHistory();}}
   else if(data.status==='CE')resultLine('编译失败',data.compileError);
   else for(const [i,r]of data.runs.entries()){const heading=node('div',undefined,'result-heading');heading.append(node('strong',r.status==='OK'?'运行完成（未判定答案）':verdictNames[r.status],r.status==='OK'?'success':'failure'),node('span',`${r.timeMs} ms`));$('#result').append(heading);resultLine('标准输出',r.stdout||'（无输出）');if(r.stderr)resultLine('标准错误',r.stderr);}
 }catch(e){$('#result').replaceChildren(node('p',e.message,'failure'));toast(e.message);}
 finally{working=false;buttons();}
}
async function checkRunner(){ready=false;buttons();$('#runnerStatus').textContent='检查判题环境…';try{const data=await api('/api/study/status');ready=data.ready;$('#runnerStatus').textContent=ready?'隔离判题已就绪':'判题环境未就绪';$('#runnerDot').classList.toggle('ready',ready);$('#environmentNotice').hidden=ready;$('#environmentNotice').textContent=data.message;}catch(e){$('#runnerStatus').textContent='判题环境连接失败';$('#environmentNotice').hidden=false;$('#environmentNotice').textContent=e.message;}buttons();}
$('#code').addEventListener('input',()=>{editVersion++;numbers();$('#saveState').textContent='尚未保存';clearTimeout(saveTimer);const s=snapshot();saveTimer=setTimeout(()=>saveSnapshot(s).catch(e=>toast(e.message)),850);});
$('#code').addEventListener('scroll',()=>$('#lineNumbers').scrollTop=$('#code').scrollTop);
$('#code').addEventListener('keydown',e=>{if(e.key==='Tab'){e.preventDefault();const code=$('#code'),start=code.selectionStart,end=code.selectionEnd;code.setRangeText('    ',start,end,'end');code.dispatchEvent(new Event('input'));}if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();execute(e.shiftKey);}});
$('#language').onchange=async()=>{const next=$('#language').value;try{await flush();language=next;fillEditor();}catch(e){$('#language').value=language;toast(e.message);}};
$('#resetCode').onclick=()=>{if(!current||!confirm('用空白ACM模板覆盖当前编辑器？历史提交仍保留。'))return;$('#code').value=catalog.templates[language];$('#code').dispatchEvent(new Event('input'));};
$('#useExample').onclick=$('#exampleButton').onclick=()=>{if(current){$('#stdin').value=current.example.input+'\n';$('#workspace').classList.add('show-editor');toast('示例已填入标准输入');}};
$('#search').oninput=$('#difficulty').onchange=$('#completion').onchange=renderList;
document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>setTab(b.dataset.tab));
$('#run').onclick=()=>execute(false);$('#submit').onclick=()=>execute(true);$('#retryRunner').onclick=checkRunner;
$('#toggleList').onclick=()=>$('#workspace').classList.toggle('show-list');$('#toggleProblem').onclick=()=>$('#workspace').classList.remove('show-list','show-editor');$('#toggleEditor').onclick=()=>{$('#workspace').classList.remove('show-list');$('#workspace').classList.add('show-editor');};
$('#closeSubmission').onclick=()=>$('#submissionDialog').close();
$('#restoreSubmission').onclick=async()=>{if(!restorable||!confirm('将该历史提交恢复到编辑器？'))return;try{await flush();language=restorable.language;$('#language').value=language;$('#code').value=restorable.code;$('#code').dispatchEvent(new Event('input'));$('#submissionDialog').close();$('#workspace').classList.add('show-editor');toast('已恢复，不会自动提交');}catch(e){toast(e.message);}};
window.addEventListener('beforeunload',e=>{if($('#saveState').textContent.includes('尚未')||$('#saveState').textContent.includes('失败')||$('#saveState').textContent==='保存中…'){e.preventDefault();e.returnValue='';}});
async function init(){try{catalog=await api('/api/study/catalog');$('#account').textContent=catalog.me.username;$('#app').hidden=false;$('#language').replaceChildren(...catalog.languages.map(l=>{const o=node('option',l.name);o.value=l.id;return o;}));$('#syncedAt').textContent=new Date(catalog.syncedAt).toLocaleDateString('zh-CN');totals();renderList();const id=location.hash.slice(1);await selectProblem(catalog.problems.some(p=>p.id===id)?id:'1');await checkRunner();}catch(e){toast(e.message);}}
init();
