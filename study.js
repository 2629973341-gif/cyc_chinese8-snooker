"use strict";
const $=s=>document.querySelector(s),difficultyNames={EASY:'简单',MEDIUM:'中等',HARD:'困难'};
const verdictNames={AC:'通过本地测试',WA:'答案错误',RE:'运行错误',CE:'编译错误',TLE:'执行超时',OLE:'输出超限'};
const modeNames={LEETCODE:'力扣模式',ACM_TEMPLATE:'ACM · 有模板',ACM_BLANK:'ACM · 无模板'};
let catalog=null,current=null,plan='HOT100',selectedId=null,language='cpp',mode='LEETCODE',working=false,changing=false,ready=false,tab='description',restorable=null,saveTimer=null,saveQueue=Promise.resolve(),editVersion=0,notice='';
let ioFormat='TEXT',dashboard=null;
function currentFormat(){return mode==='LEETCODE'?'JSON':ioFormat;}
function node(tag,text,cls){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;}
function toast(message){$('#toast').textContent=message;clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').textContent='',3500);}
async function api(url,options={}){const response=await fetch(url,{...options,headers:{'content-type':'application/json',...(catalog?{'x-study-account':catalog.me.id}:{}),...(options.headers||{})}});const data=await response.json().catch(()=>({}));if(response.status===401){$('#app').hidden=true;$('#loginRequired').hidden=false;throw Error('请先登录');}if(!response.ok)throw Error(data.error||'请求失败');return data;}
function setting(key,value){try{if(value===undefined)return localStorage.getItem('study.ide.'+key);localStorage.setItem('study.ide.'+key,String(value));}catch{}return null;}
function escapeHTML(text){return text.replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}
function highlight(source){
 const tokens=/(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')|(#\s*\w+)|\b(alignas|auto|bool|break|case|catch|char|class|const|constexpr|continue|default|delete|do|double|else|enum|explicit|false|float|for|friend|if|inline|int|long|namespace|new|noexcept|nullptr|private|protected|public|return|short|signed|sizeof|static|struct|switch|template|this|throw|true|try|typedef|typename|union|unsigned|using|virtual|void|volatile|while)\b|\b(std|string|vector|array|deque|queue|priority_queue|stack|list|map|unordered_map|set|unordered_set|pair|tuple|function|json|TreeNode|ListNode|Node|Solution|size_t|uint32_t|unique_ptr)\b|\b(\d+(?:\.\d+)?(?:[eE][+-]?\d+)?[uUlLfF]*)\b|(\b[A-Za-z_]\w*)(?=\s*\()/g;
 let html='',last=0;for(const m of source.matchAll(tokens)){html+=escapeHTML(source.slice(last,m.index));const kind=m[1]?'comment':m[2]?'string':m[3]?'preprocessor':m[4]?'keyword':m[5]?'type':m[6]?'number':'function';html+='<span class="tok-'+kind+'">'+escapeHTML(m[0])+'</span>';last=m.index+m[0].length;}return html+escapeHTML(source.slice(last));
}
function totals(){
 $('#totalSolved').textContent=catalog.problems.filter(p=>p.progress?.acceptedAt).length;$('#totalCount').textContent=' / '+catalog.problems.length;
 $('#plans').replaceChildren(...catalog.plans.map(p=>{const b=node('button',undefined,p.id===plan?'active':'');b.append(node('span',p.id==='HOT100'?'Hot 100':'面试经典 150'),node('small',`${p.solved} / ${p.total}`));b.onclick=()=>{plan=p.id;totals();renderList();};return b;}));
}
function renderList(){
 const query=$('#search').value.trim().toLowerCase(),diff=$('#difficulty').value,completion=$('#completion').value;
 const order=new Map(catalog.plans.find(p=>p.id===plan).ids.map((id,i)=>[id,i]));
 const all=catalog.problems.filter(p=>p.plans.includes(plan)).sort((a,b)=>order.get(a.id)-order.get(b.id));
 const items=all.filter(p=>(diff==='ALL'||p.difficulty===diff)&&(completion==='ALL'||completion==='AC'&&p.progress?.acceptedAt||completion==='TODO'&&!p.progress?.acceptedAt||completion==='TRIED'&&p.progress?.attempts>0)&&(!query||[p.id,p.title,...p.tags].some(s=>s.toLowerCase().includes(query))));
 const list=$('#problemList');list.replaceChildren();let category='';
 for(const p of items){
  if(p.categories[plan]!==category){category=p.categories[plan];list.append(node('div',category,'category-label'));}
  const b=node('button',undefined,'problem-item'+(p.id===selectedId?' active':''));b.dataset.difficulty=p.difficulty;b.dataset.id=p.id;b.setAttribute('aria-current',String(p.id===selectedId));
  const status=node('span',p.progress?.acceptedAt?'✓':p.progress?.attempts?'◔':'·','item-status'+(p.progress?.acceptedAt?' ac':p.progress?.attempts?' tried':''));status.setAttribute('aria-label',p.progress?.acceptedAt?'已通过':p.progress?.attempts?'已尝试':'未尝试');
  const title=node('span');title.append(node('small',p.id+'.'),document.createTextNode(p.title));b.append(status,title,node('span',difficultyNames[p.difficulty],'difficulty-dot'));b.onclick=()=>selectProblem(p.id);list.append(b);
 }
 if(!items.length)list.append(node('p','没有符合筛选条件的题目','no-results'));
 const solved=all.filter(p=>p.progress?.acceptedAt).length;$('#listCount').textContent=`${items.length} 道题`;$('#planProgress').textContent=`通过 ${solved} / ${all.length}`;$('#progress').max=all.length;$('#progress').value=solved;
}
function cursor(){const before=$('#code').value.slice(0,$('#code').selectionStart),lines=before.split('\n');$('#cursorPosition').textContent=`行 ${lines.length}，列 ${lines.at(-1).length+1}`;}
function syncScroll(){const code=$('#code');$('#lineNumbers').scrollTop=code.scrollTop;$('#codeHighlight').style.transform=`translate(${-code.scrollLeft}px, ${-code.scrollTop}px)`;}
function numbers(){const source=$('#code').value;$('#lineNumbers').textContent=Array.from({length:source.split('\n').length},(_,i)=>i+1).join('\n');$('#codeHighlight').innerHTML=highlight(source)+'\n';syncScroll();cursor();}
function draftKey(value=mode,format=currentFormat()){return 'cpp:'+value+(value!=='LEETCODE'&&format==='TEXT'?':TEXT':'');}
function saveSnapshot(snapshot){
 if(!snapshot)return Promise.resolve();$('#saveState').textContent='保存中…';
 const operation=saveQueue.catch(()=>{}).then(()=>api(`/api/study/problems/${snapshot.id}/draft`,{method:'POST',body:JSON.stringify(snapshot)}));saveQueue=operation;
 return operation.then(()=>{if(current?.id===snapshot.id){current.drafts[draftKey(snapshot.mode,snapshot.ioFormat)]={code:snapshot.code,updatedAt:new Date().toISOString(),mode:snapshot.mode};if(editVersion===snapshot.version&&mode===snapshot.mode)$('#saveState').textContent='已保存至当前账号';}}).catch(e=>{$('#saveState').textContent='保存失败，代码仍在编辑器';throw e;});
}
function snapshot(){return current?{id:current.id,language:'cpp',mode,ioFormat:currentFormat(),code:$('#code').value,version:editVersion}:null;}
async function flush(){clearTimeout(saveTimer);await saveSnapshot(snapshot());}
function updateMode(){
 $('#ioFormat').hidden=mode==='LEETCODE';$('#ioFormat').value=ioFormat;
 $('#modeDescription').textContent=mode==='LEETCODE'?'力扣模式：只实现本题的 class Solution 或设计类，无需 main。平台负责读入和输出。':currentFormat()==='TEXT'?(mode==='ACM_TEMPLATE'?'ACM 新手模板：已提供 cin 读入、函数调用与 cout 输出，完成 core code 标记之间的函数即可。':'ACM 空白：自行编写普通文本读入、算法和输出。')+' 请按下方本题格式输入，不使用 JSON。':'旧版 JSON 兼容模式：保留原模板、草稿及判题协议。新练习建议选择普通文本。';
 $('#modeBreadcrumb').textContent='C++11 › '+modeNames[mode]+' › '+(current?.id||'');$('#executionMode').textContent=modeNames[mode];$('#solutionFormat').value=mode==='LEETCODE'?'LEETCODE':'ACM';
}
function updateExamples(){
 if(!current)return;const text=currentFormat()==='TEXT',example=text?current.acm:current.example;
 $('#exampleInput').textContent=example.input;$('#exampleOutput').textContent=example.output;$('#stdin').value=example.input;
 $('#inputLabel').textContent=text?'普通文本输入 · 按左侧本题格式，可连续多组':'每行一个 JSON 参数数组';
 $('#protocolText').textContent=text?current.acm.description:'每行输入一个JSON参数数组，每行输出一个JSON答案。力扣模式由平台负责输入输出。旧版ACM由自己的main读写JSON。';
}
async function loadDashboard(){dashboard=await api('/api/study/dashboard');renderDashboard();}
function renderDashboard(){
 if(!dashboard)return;const d=dashboard;
 $('#plannerStatus').textContent=`${d.today} · 北京时间 · 今日提交 ${d.todayAttempted} 题，AC/复习 ${d.todaySolved} 题（同题去重）`;
 $('#streak').textContent=`连续 ${d.streak} 天 / 累计 ${d.totalCheckins} 天`;
 $('#dailyGoalStatus').textContent=d.schedule?`${d.active?'今日':'尚未开始'} ${d.todaySolved} / ${d.dailyGoal} · 剩余 ${d.remaining} 题${d.estimatedFinish?' · 预计 '+d.estimatedFinish+' 完成':''}`:'还没有计划，选择题单和每日目标开始。';
 $('#checkin').disabled=d.checked||!d.eligible;$('#checkin').textContent=d.checked?'今日已打卡':'今日打卡';
 $('#checkinHint').textContent=d.eligible?'一次提交即可打卡；每日目标另行统计，打卡不代表已通过。':'当天至少提交一道题后可打卡，不要求AC；自测不计入。';
 $('#calendar').replaceChildren(...d.calendar.map(day=>{const cell=node('span',String(Number(day.date.slice(-2))),day.checked?'checked':day.attempted?'attempted':'');cell.title=`${day.date}：${day.checked?'已打卡':'未打卡'}，提交 ${day.attempted} 题，AC ${day.solved} 题`;return cell;}));
 $('#todayTasks').replaceChildren(...d.suggested.map(p=>{const b=node('button',`#${p.id} ${p.title}`);b.onclick=()=>{$('#plannerDialog').close();plan=d.schedule.collection;totals();renderList();selectProblem(p.id);};return b;}));
 if(!d.suggested.length)$('#todayTasks').append(node('p',d.goalMet?'今日目标已达成，可继续练习或复习。':d.schedule&&!d.active?'计划尚未到开始日期。':'没有待练习推荐，先保存计划或题单已完成。','muted'));
}
$('#plannerButton').onclick=async()=>{try{await loadDashboard();const s=dashboard.schedule;$('#scheduleCollection').value=s?.collection||plan;$('#scheduleGoal').value=s?.dailyGoal||3;$('#scheduleStart').value=s?.startDate||dashboard.today;$('#plannerDialog').showModal();}catch(e){toast(e.message);}};
$('#closePlanner').onclick=()=>$('#plannerDialog').close();
$('#scheduleForm').onsubmit=async e=>{e.preventDefault();$('#saveSchedule').disabled=true;try{dashboard=await api('/api/study/schedule',{method:'POST',body:JSON.stringify({collection:$('#scheduleCollection').value,dailyGoal:Number($('#scheduleGoal').value),startDate:$('#scheduleStart').value})});renderDashboard();toast('刷题计划已保存到当前账号');}catch(e){toast(e.message);}finally{$('#saveSchedule').disabled=false;}};
$('#checkin').onclick=async()=>{$('#checkin').disabled=true;try{dashboard=await api('/api/study/checkin',{method:'POST',body:'{}'});renderDashboard();toast('打卡成功');}catch(e){toast(e.message);await loadDashboard().catch(()=>{});}};
setInterval(()=>{if($('#plannerDialog').open&&document.visibilityState==='visible')loadDashboard().catch(()=>{});},60000);
$('#ioFormat').onchange=async()=>{if(working||changing)return;const next=$('#ioFormat').value;changing=true;buttons();try{await flush();ioFormat=next;fillEditor();clearResult();}catch(e){$('#ioFormat').value=ioFormat;toast(e.message);}finally{changing=false;buttons();}};
function fillEditor(){
 const draft=current?.drafts?.[draftKey()]||(mode==='ACM_TEMPLATE'&&currentFormat()==='JSON'?current?.drafts?.cpp:null);
 $('#code').value=draft?draft.code:(currentFormat()==='JSON'&&mode!=='LEETCODE'?current.legacyTemplates[mode]:current.templates[mode]);editVersion++;$('#saveState').textContent=draft?'已恢复本模式草稿':'本模式草稿独立保存';$('#code').scrollTop=$('#code').scrollLeft=0;numbers();updateMode();renderSolutions();updateExamples();
}
async function selectProblem(id){
 if(changing||!catalog.problems.some(p=>p.id===id))return;
 changing=true;buttons();
 try{
  if(current)await flush();const data=await api(`/api/study/problems/${id}`);
  current={...data.problem,drafts:data.drafts,progress:data.progress,templates:data.templates,legacyTemplates:data.legacyTemplates};selectedId=id;history.replaceState(null,'','#'+id);
  $('#problemNumber').textContent='#'+current.id;$('#problemTitle').textContent=current.title;$('#statement').textContent=current.statement;$('#parameters').textContent=current.parameters;
  $('#problemDifficulty').textContent=difficultyNames[current.difficulty];$('#problemDifficulty').className='badge '+current.difficulty;$('#problemCompletion').textContent=current.progress?.acceptedAt?'✓ 已通过':'';$('#tags').replaceChildren(...current.tags.map(t=>node('span',t)));
  $('#exampleInput').textContent=current.example.input;$('#exampleOutput').textContent=current.example.output;$('#stdin').value=current.example.input+'\n';$('#sourceLink').href=current.source;$('#editorialLink').href=current.editorial;
  $('#testHint').textContent=`${current.testCount} 组测试`;$('#statusProblem').textContent=`#${current.id} ${current.title}`;fillEditor();renderList();setTab('description');$('#historyList').replaceChildren();
  $('#workspace').classList.remove('show-list','show-editor');if(!working)clearResult();
 }catch(e){toast(e.message);}finally{changing=false;buttons();}
}
function mobileView(view){const w=$('#workspace');w.classList.toggle('show-list',view==='list');w.classList.toggle('show-editor',view==='editor');}
function setTab(value){tab=value;for(const name of['description','solutions','history'])$('#'+name+'Panel').hidden=name!==value;document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===value));if(value==='history')loadHistory();}
async function copyText(text){try{if(navigator.clipboard&&window.isSecureContext)await navigator.clipboard.writeText(text);else{const t=node('textarea');t.value=text;t.style.position='fixed';t.style.opacity='0';document.body.append(t);t.select();const ok=document.execCommand('copy');t.remove();if(!ok)throw Error();}toast('已复制 C++ 代码');}catch{toast('浏览器不允许复制，请手动选中代码');}}
function renderSolutions(){
 if(!current)return;const acm=$('#solutionFormat').value==='ACM';
 $('#solutionList').replaceChildren(...current.solutions.map(s=>{const card=node('section',undefined,'solution-card');card.append(node('h3',s.title),node('p',s.idea));
  const code=acm?(currentFormat()==='JSON'&&mode!=='LEETCODE'?s.legacyAcmCode:s.acmCode)||s.code:s.code;
  if(code){const details=node('details'),summary=node('summary',acm?'C++11 · ACM 完整程序':'C++11 · 力扣函数 / 类');details.open=true;const pre=node('pre');pre.innerHTML=highlight(code);const actions=node('div',undefined,'solution-actions'),copy=node('button','复制代码','quiet');copy.onclick=()=>copyText(code);actions.append(copy);details.append(summary,actions,pre);card.append(details);}
  return card;
 }));
}
async function loadHistory(){if(!current)return;const id=current.id;$('#historyList').replaceChildren(node('p','加载中…','muted'));try{const data=await api(`/api/study/submissions?problemId=${id}`);if(current.id!==id)return;
 $('#historyList').replaceChildren(...data.submissions.map(s=>{const b=node('button',undefined,'history-row'),title=node('span',verdictNames[s.verdict]||s.verdict,s.verdict==='AC'?'success':'failure'),info=node('span',`${s.passed} / ${s.total} · ${s.language==='cpp'?(s.standard==='c++11'?'C++11':'C++17（旧版）'):s.language} · ${modeNames[s.mode]||'旧版ACM'}`);info.append(node('small',new Date(s.createdAt).toLocaleString('zh-CN')));b.append(title,info);b.onclick=()=>viewSubmission(s.id);return b;}));if(!data.submissions.length)$('#historyList').append(node('p','还没有提交记录。','muted'));
 }catch(e){$('#historyList').replaceChildren(node('p',e.message,'failure'));}}
async function viewSubmission(id){try{const data=await api(`/api/study/submissions/${id}`);restorable=data.submission;if(current?.id!==restorable.problemId)return;$('#submissionMeta').textContent=`${restorable.title} · ${restorable.language} · ${modeNames[restorable.mode]||'旧版ACM'} · ${verdictNames[restorable.verdict]}`;$('#submissionCode').innerHTML=highlight(restorable.code);$('#restoreSubmission').disabled=restorable.language!=='cpp';$('#restoreSubmission').title=restorable.language!=='cpp'?'旧版其他语言仅供查看，不能直接恢复为C++':'';$('#submissionDialog').showModal();}catch(e){toast(e.message);}}
function buttons(){$('#run').disabled=$('#submit').disabled=working||changing||!ready||!current;$('#submit').textContent=working?'判题中…':'提交判题';$('#mode').disabled=$('#ioFormat').disabled=working||changing;$('#resetCode').disabled=changing;$('#code').readOnly=changing;}
function clearResult(){$('#result').replaceChildren(node('div','运行后查看输出；提交后检查全部本地测试。','empty-result'));}
function setTestTab(output){$('#inputPanel').hidden=output;$('#result').hidden=!output;$('#inputTab').classList.toggle('active',!output);$('#outputTab').classList.toggle('active',output);$('#editorPane').classList.remove('terminal-collapsed');}
function resultLine(label,value){$('#result').append(node('div',label,'result-label'),node('pre',String(value??'')));}
async function execute(submit){
 if(working||changing||!current||!ready)return;
 const job={id:current.id,title:current.title,language:'cpp',mode,ioFormat:currentFormat(),code:$('#code').value,stdin:$('#stdin').value};if(!job.code.trim())return toast('请先输入 C++ 代码');
 working=true;buttons();setTestTab(true);$('#result').replaceChildren(node('p',`${submit?'提交判题':'运行自测'} · ${job.title} · ${modeNames[job.mode]}，等待隔离环境返回…`,'muted'));
 try{
  await flush();const data=await api(`/api/study/problems/${job.id}/${submit?'submit':'run'}`,{method:'POST',body:JSON.stringify(job)});$('#result').replaceChildren();
  if(submit){const s=data.submission,heading=node('div',undefined,'result-heading');heading.append(node('strong',verdictNames[s.verdict]||s.verdict,s.verdict==='AC'?'success':'failure'),node('span',`${s.passed} / ${s.total}`));$('#result').append(heading,node('p',`#${job.id} · C++11 · ${modeNames[job.mode]} · 最慢测试墙钟 ${s.timeMs} ms（含沙箱启动开销）`));
   if(s.failed){$('#result').append(node('p',`第 ${s.failed.case} 组：${s.failed.message}`));if(s.failed.input!==undefined){resultLine('示例输入',s.failed.input);resultLine('期望输出',job.ioFormat==='TEXT'?s.failed.expected:JSON.stringify(s.failed.expected));resultLine('实际输出',s.failed.actual);}else $('#result').append(node('p','隐藏测试仅显示状态，不下发输入或答案。'));}
   if(s.compileError)resultLine('编译信息',s.compileError);catalog.problems.find(p=>p.id===job.id).progress=data.progress;catalog.plans=data.plans;totals();renderList();loadDashboard().catch(()=>{});
   if(current.id===job.id){current.progress=data.progress;$('#problemCompletion').textContent=data.progress.acceptedAt?'✓ 已通过':'';if(tab==='history')loadHistory();}
  }else if(data.status==='CE')resultLine('编译失败',data.compileError);
  else for(const r of data.runs){const heading=node('div',undefined,'result-heading');heading.append(node('strong',r.status==='OK'?'运行完成（未判定答案）':verdictNames[r.status],r.status==='OK'?'success':'failure'),node('span',`${r.timeMs} ms`));$('#result').append(heading);resultLine('标准输出',r.stdout||'（无输出）');if(r.stderr)resultLine('标准错误',r.stderr);}
 }catch(e){$('#result').replaceChildren(node('p',e.message,'failure'));toast(e.message);}finally{working=false;buttons();}
}
async function checkRunner(){ready=false;buttons();$('#runnerStatus').textContent='检查判题环境…';try{const data=await api('/api/study/status');ready=data.ready;notice=data.message;$('#runnerStatus').textContent=ready?'轻量C++判题就绪':'判题未配置';$('#runnerStatus').title=notice;$('#runnerDot').classList.toggle('ready',ready);$('#environmentNotice').hidden=ready;$('#environmentNotice').textContent=notice;}catch(e){notice=e.message;$('#runnerStatus').textContent='判题连接失败';$('#environmentNotice').hidden=false;$('#environmentNotice').textContent=notice;}buttons();}
function edit(){editVersion++;numbers();$('#saveState').textContent='尚未保存';clearTimeout(saveTimer);const s=snapshot();saveTimer=setTimeout(()=>saveSnapshot(s).catch(e=>toast(e.message)),850);}
$('#code').addEventListener('input',edit);$('#code').addEventListener('scroll',syncScroll);$('#code').addEventListener('keyup',cursor);$('#code').addEventListener('click',cursor);
$('#code').addEventListener('keydown',e=>{
 const code=$('#code');if(e.key==='Tab'){e.preventDefault();code.setRangeText('    ',code.selectionStart,code.selectionEnd,'end');edit();}
 if(e.key==='Enter'&&!e.ctrlKey&&!e.metaKey){e.preventDefault();const start=code.selectionStart,base=code.value.slice(0,start).split('\n').at(-1).match(/^\s*/)[0],indent=base+(code.value[start-1]==='{'?'    ':'');code.setRangeText('\n'+indent,start,code.selectionEnd,'end');edit();}
 if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();execute(e.shiftKey);}
 if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'){e.preventDefault();flush().then(()=>toast('已保存当前模式草稿')).catch(err=>toast(err.message));}
});
$('#mode').onchange=async()=>{const next=$('#mode').value;if(working||changing){$('#mode').value=mode;return;}changing=true;buttons();try{await flush();mode=next;setting('mode',mode);fillEditor();}catch(e){$('#mode').value=mode;toast(e.message);}finally{changing=false;buttons();}};
$('#solutionFormat').onchange=renderSolutions;
$('#resetCode').onclick=()=>{if(!current||!confirm(mode==='ACM_BLANK'?'清空当前模式代码？历史提交仍保留。':'用当前模式的空白模板覆盖编辑器？历史提交仍保留。'))return;$('#code').value=(currentFormat()==='JSON'&&mode!=='LEETCODE'?current.legacyTemplates:current.templates)[mode];edit();};
$('#useExample').onclick=$('#exampleButton').onclick=()=>{if(current){updateExamples();setTestTab(false);mobileView('editor');toast('示例已填入测试输入');}};
$('#search').oninput=$('#difficulty').onchange=$('#completion').onchange=renderList;
document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>setTab(b.dataset.tab));$('#run').onclick=()=>execute(false);$('#submit').onclick=()=>execute(true);$('#retryRunner').onclick=checkRunner;$('#runnerStatus').onclick=()=>{$('#environmentNotice').textContent=notice;$('#environmentNotice').hidden=!$('#environmentNotice').hidden;};
$('#toggleList').onclick=()=>mobileView('list');$('#toggleProblem').onclick=()=>mobileView('problem');$('#toggleEditor').onclick=()=>mobileView('editor');
$('#catalogToggle').onclick=()=>{const w=$('#workspace');w.classList.toggle('catalog-collapsed');w.classList.remove('editor-only');$('#catalogToggle').classList.toggle('active',!w.classList.contains('catalog-collapsed'));setting('catalog',w.classList.contains('catalog-collapsed')?'hidden':'shown');};
for(const [id,name]of[['descriptionActivity','description'],['solutionActivity','solutions'],['historyActivity','history']])$('#'+id).onclick=()=>{$('#workspace').classList.remove('editor-only');mobileView('problem');setTab(name);};
$('#readFocus').onclick=()=>{const w=$('#workspace');w.classList.remove('editor-only');w.classList.toggle('reading-only');};$('#editorFocus').onclick=()=>{$('#workspace').classList.remove('reading-only');$('#workspace').classList.toggle('editor-only');};
$('#inputTab').onclick=()=>setTestTab(false);$('#outputTab').onclick=()=>setTestTab(true);$('#terminalToggle').onclick=()=>$('#editorPane').classList.toggle('terminal-collapsed');$('#closeTerminal').onclick=()=>$('#editorPane').classList.add('terminal-collapsed');
function font(delta){const value=Math.max(12,Math.min(22,(Number(setting('font'))||15)+delta));setting('font',value);document.documentElement.style.setProperty('--code-font',value+'px');syncScroll();}$('#fontSmaller').onclick=()=>font(-1);$('#fontLarger').onclick=()=>font(1);
$('#themeButton').onclick=()=>{const theme=document.body.dataset.theme==='dark'?'light':'dark';document.body.dataset.theme=theme;setting('theme',theme);};
function resizeHandle(id,horizontal,update){
 const handle=$('#'+id);
 handle.addEventListener('pointerdown',e=>{
  if(e.button!==0||(!horizontal&&innerWidth<=800))return;
  e.preventDefault();handle.classList.add('dragging');document.body.classList.add('resizing');
  const move=event=>{if(event.pointerId===e.pointerId)update(event);};
  const finish=()=>{handle.classList.remove('dragging');document.body.classList.remove('resizing');window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',finish);window.removeEventListener('pointercancel',finish);window.removeEventListener('blur',finish);};
  // 监听窗口避免窄分隔条移位或捕获丢失后停止跟随；同时保留触屏指针捕获。
  window.addEventListener('pointermove',move);window.addEventListener('pointerup',finish);window.addEventListener('pointercancel',finish);window.addEventListener('blur',finish);
  try{handle.setPointerCapture(e.pointerId);}catch{}
 });
 handle.addEventListener('keydown',e=>{const change=(e.key==='ArrowLeft'||e.key==='ArrowUp')?-15:(e.key==='ArrowRight'||e.key==='ArrowDown')?15:0;if(!change)return;e.preventDefault();const r=handle.getBoundingClientRect();update({clientX:r.left+change,clientY:r.top+change});});
}
resizeHandle('sidebarResize',false,e=>{const r=$('#workspace').getBoundingClientRect(),width=Math.max(145,Math.min(390,r.width-600,e.clientX-r.left));document.documentElement.style.setProperty('--sidebar-width',width+'px');setting('sidebar',width);});
resizeHandle('problemResize',false,e=>{const r=$('#problemPane').getBoundingClientRect(),total=$('#workspace').getBoundingClientRect(),width=Math.max(265,Math.min(total.right-r.left-290,e.clientX-r.left));document.documentElement.style.setProperty('--problem-width',width+'px');setting('problem',width);});
resizeHandle('terminalResize',true,e=>{const r=$('#editorPane').getBoundingClientRect(),height=Math.max(85,Math.min(r.height-200,r.bottom-e.clientY-44));document.documentElement.style.setProperty('--terminal-height',height+'px');setting('terminal',height);});
$('#closeSubmission').onclick=()=>$('#submissionDialog').close();$('#restoreSubmission').onclick=async()=>{if(!restorable||restorable.language!=='cpp'||!confirm('恢复此 C++ 提交到对应模式？不会自动提交。'))return;try{await flush();mode=modeNames[restorable.mode]?restorable.mode:'ACM_TEMPLATE';$('#mode').value=mode;ioFormat=restorable.ioFormat||'JSON';current.drafts[draftKey()]={code:restorable.code};fillEditor();edit();$('#submissionDialog').close();$('#workspace').classList.remove('reading-only');mobileView('editor');}catch(e){toast(e.message);}};
window.addEventListener('beforeunload',e=>{if(/尚未|失败|保存中/.test($('#saveState').textContent)){e.preventDefault();e.returnValue='';}});
async function init(){try{
 const theme=setting('theme');if(theme==='light')document.body.dataset.theme=theme;font(0);for(const [name,key,lo,hi]of[['sidebar-width','sidebar',145,390],['problem-width','problem',265,1000],['terminal-height','terminal',85,500]]){const value=Number(setting(key));if(value>=lo&&value<=hi)document.documentElement.style.setProperty('--'+name,value+'px');}
 if(setting('catalog')==='hidden'){$('#workspace').classList.add('catalog-collapsed');$('#catalogToggle').classList.remove('active');}
 catalog=await api('/api/study/catalog');$('#account').textContent=catalog.me.username;$('#app').hidden=false;$('#mode').replaceChildren(...catalog.modes.map(m=>{const o=node('option',m.name);o.value=m.id;return o;}));if(modeNames[setting('mode')])mode=setting('mode');$('#mode').value=mode;
 $('#syncedAt').textContent='题单 '+new Date(catalog.syncedAt).toLocaleDateString('zh-CN');totals();renderList();const id=location.hash.slice(1);await selectProblem(catalog.problems.some(p=>p.id===id)?id:'1');await checkRunner();await loadDashboard();
 }catch(e){toast(e.message);}}
init();
