// 只同步公开题单元数据（题号、名称、标签、顺序），不抓取题干或付费题解。
import {writeFile} from 'node:fs/promises';
const plans=[['HOT100','top-100-liked',100],['INTERVIEW150','top-interview-150',150]];
const problems=new Map(),lists=[];
for(const [id,slug,count] of plans){
  const response=await fetch(`https://leetcode.cn/studyplan/${slug}/`,{signal:AbortSignal.timeout(20000)});
  if(!response.ok)throw Error(`题单读取失败 ${response.status}`);
  const html=await response.text(),match=html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if(!match)throw Error('官方页面结构改变，未覆盖现有目录');
  const page=JSON.parse(match[1]);
  const plan=page.props.pageProps.dehydratedState.queries.map(q=>q.state.data?.studyPlanV2Detail).find(Boolean);
  const ids=[];
  for(const group of plan.planSubGroups)for(const q of group.questions){
    const key=String(q.questionFrontendId);ids.push(key);
    if(!/^\d+$/.test(key))throw Error('出现不支持的题号');
    if(!problems.has(key))problems.set(key,{id:key,title:q.translatedTitle||q.title,slug:q.titleSlug,difficulty:q.difficulty,tags:q.topicTags.map(t=>t.nameTranslated||t.name),plans:[],categories:{}});
    const problem=problems.get(key);problem.plans.push(id);problem.categories[id]=group.name;
  }
  if(ids.length!==count||new Set(ids).size!==count)throw Error(`${id} 数量异常，未写入目录`);
  lists.push({id,title:plan.name,url:`https://leetcode.cn/studyplan/${slug}/`,ids});
}
const data={syncedAt:new Date().toISOString(),plans:lists,problems:[...problems.values()]};
await writeFile(new URL('../study/catalog.json',import.meta.url),JSON.stringify(data,null,2)+'\n');
console.log(`公开元数据已同步：${lists.map(p=>p.ids.length).join(' / ')}，去重 ${data.problems.length} 题`);
