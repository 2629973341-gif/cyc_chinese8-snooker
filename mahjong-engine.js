"use strict";
const crypto = require("node:crypto");
const RULES = Object.freeze({ name: "泉州麻将·16张", reserve: 16, multipliers: { 平胡: 1, 自摸: 2, 游金: 3, 双游: 6, 三游: 9, 三金倒: 3, 八花: 3 }, description: "144张，16张手牌，5组面子加1对。四家双骰比点定首庄，同点重掷；庄胡或流局连庄，闲家胡接庄。闲家底1，庄家相关底2+连庄次数。翻金、白板代金面值，游金3/6/9倍。" });
const WIN_NAMES = ["", "游金", "双游", "三游"];
const NAMES = ["一万","二万","三万","四万","五万","六万","七万","八万","九万","一筒","二筒","三筒","四筒","五筒","六筒","七筒","八筒","九筒","一条","二条","三条","四条","五条","六条","七条","八条","九条","东","南","西","北","中","发","白","春","夏","秋","冬","梅","兰","竹","菊"];
function shuffle(a) { for (let i=a.length-1;i>0;i--) { const j=crypto.randomInt(i+1); [a[i],a[j]]=[a[j],a[i]]; } return a; }
const sort = hand => hand.sort((a,b)=>a-b);
const effective = (tile,gold) => tile===33&&gold!==33?gold:tile;
function counts(hand,gold) { const c=Array(34).fill(0); let wild=0; for(const t of hand) { if(t===gold)wild++; else c[effective(t,gold)]++; } return {c,wild}; }

// 精确分解面子：先消耗最小的非金牌；刻子、顺子分别回溯。顺子允许金补在前、中、后。
// 返回其中一种可行分解；没有非金牌时，剩余金牌只能每3张组成一个面子。
function melds(c,wild,memo=new Map()) {
  const key=c.join(",")+":"+wild;
  if(memo.has(key))return memo.get(key);
  const i=c.findIndex(n=>n>0);
  if(i<0)return wild%3===0?[]:null;
  const take=Math.min(3,c[i]),missing=3-take;
  if(wild>=missing) {
    c[i]-=take; const rest=melds(c,wild-missing,memo); c[i]+=take;
    if(rest!==null)return [{kind:"TRIPLET",tiles:[i,i,i]}].concat(rest);
  }
  if(i<27)for(let start=Math.max(Math.floor(i/9)*9,i-2);start<=Math.min(i,Math.floor(i/9)*9+6);start++) {
    const used=[],tiles=[start,start+1,start+2]; let need=0;
    for(const t of tiles)if(c[t]) {c[t]--;used.push(t);} else need++;
    const rest=need<=wild?melds(c,wild-need,memo):null;
    for(const t of used)c[t]++;
    if(rest!==null)return [{kind:"CHI",tiles}].concat(rest);
  }
  memo.set(key,null);return null;
}
function winningShape(hand,gold,open=0,selfDraw=true) {
  if(hand.length!==17-3*open)return null;
  const {c,wild}=counts(hand,gold);
  for(let pair=0;pair<34;pair++) {
    const used=Math.min(2,c[pair]),need=2-used;
    if(need>wild||(!selfDraw&&need>0))continue;
    c[pair]-=used;const groups=melds(c,wild-need);c[pair]+=used;
    if(groups!==null)return {pair,groups};
  }
  return null;
}
function goldWait(hand,gold,open=0) {
  if(hand.length!==16-3*open)return false;
  const {c,wild}=counts(hand,gold);
  return wild>=1&&melds(c,wild-1)!==null;
}
function log(s,text) { s.log.push(text); if(s.log.length>40)s.log.shift(); }
function rollDealer(randomInt=n=>crypto.randomInt(n)){
  let candidates=[0,1,2,3];const rounds=[];
  while(candidates.length>1){const rolls=candidates.map(seat=>{const dice=[randomInt(6)+1,randomInt(6)+1];return{seat,dice,total:dice[0]+dice[1]}});rounds.push(rolls);const high=Math.max(...rolls.map(r=>r.total));candidates=rolls.filter(r=>r.total===high).map(r=>r.seat);}
  return{rounds,winner:candidates[0]};
}
// 只有已经结算的胡牌/流局推进庄次；未完成牌局的确认重开保留原庄及连庄数。
function nextRound(previous,settled=true){
  const dealer=previous?.dealer??0,streak=previous?.streak||0;
  if(!settled||previous?.status!=="FINISHED")return{dealer,streak,dealerReason:"原庄重开"};
  if(previous.winner===null||previous.winner===dealer)return{dealer,streak:streak+1,dealerReason:previous.winner===null?"流局连庄":"庄家胡牌连庄"};
  return{dealer:previous.winner,streak:0,dealerReason:"闲家胡牌接庄"};
}
function createGame(options={}) {
  const initial=!Number.isInteger(options.dealer)||options.dealer<0||options.dealer>3,dealerRoll=initial?rollDealer():null,dealer=initial?dealerRoll.winner:options.dealer,streak=Math.max(0,Math.floor(options.streak||0));
  const wall=shuffle(Array.from({length:34},(_,t)=>Array(4).fill(t)).flat().concat(Array.from({length:8},(_,i)=>34+i)));
  const s={version:2,phase:"DISCARD",turn:dealer,dealer,streak,dealerBase:2+streak,dealerReason:options.dealerReason||"摇骰定庄",dealerRoll,rollStartedAt:initial?Date.now():null,rollUntil:initial?Date.now()+2200:null,gold:null,indicator:null,wall,hands:[[],[],[],[]],flowers:[[],[],[],[]],melds:[[],[],[],[]],discards:[[],[],[],[]],you:[0,0,0,0],drawn:[null,null,null,null],pending:null,lockSeat:null,steps:0,status:"PLAYING",winner:null,scores:[0,0,0,0],result:null,log:[],nextAt:Date.now()+900};
  for(let n=0;n<16;n++)for(let seat=0;seat<4;seat++)deal(s,seat,false);
  let t=s.wall.pop();while(t>=34){s.flowers[dealer].push(t);t=s.wall.pop();}s.gold=t;s.indicator=t;
  for(const h of s.hands)sort(h);
  log(s,`${s.dealerReason}：${["东","南","西","北"][dealer]}家坐庄 · 连庄${streak}次 · 庄底${s.dealerBase}`);
  log(s,`翻金：${NAMES[t]}；庄家${["东","南","西","北"][dealer]}家先行`);
  draw(s,dealer);
  if(initial&&s.status==="PLAYING")s.phase="ROLLING_DICE";
  return s;
}
function deal(s,seat,reserve=true) {
  if(reserve&&s.wall.length<=RULES.reserve){finishDraw(s);return null;}
  let t=s.wall.shift();
  while(t>=34) { s.flowers[seat].push(t);if(!s.wall.length||(reserve&&s.wall.length<=RULES.reserve)){finishDraw(s);return null;}t=s.wall.pop(); }
  if(t===undefined){finishDraw(s);return null;}s.hands[seat].push(t);sort(s.hands[seat]);return t;
}
function draw(s,seat) {
  if(s.status!=="PLAYING")return;
  s.turn=seat;s.phase="DISCARD";s.pending=null;
  if(s.lockSeat===seat)s.lockSeat=null;
  s.drawn[seat]=deal(s,seat);
  s.nextAt=Date.now()+900;
  if(s.status==="PLAYING"&&s.flowers[seat].length===8)finish(s,seat,"八花");
}
function finishDraw(s) {s.status="FINISHED";s.phase="FINISHED";s.winner=null;s.result={name:"流局",scores:[0,0,0,0],detail:"牌墙剩16张，本局结束"};s.pending=null;log(s,"牌墙不足，流局");}
function winName(s,seat,selfDraw=true) {
  const hand=s.hands[seat];
  if(s.flowers[seat].length===8)return "八花";
  if(hand.filter(t=>t===s.gold).length===3&&(s.steps===0||s.wall.length<=RULES.reserve+1))return "三金倒";
  if(selfDraw&&s.you[seat])return WIN_NAMES[s.you[seat]];
  const shape=winningShape(hand,s.gold,s.melds[seat].length,selfDraw);
  if(!shape)return null;
  return selfDraw?"自摸":"平胡";
}
function water(s,seat,shape) {
  let n=s.flowers[seat].length+s.hands[seat].filter(t=>t===s.gold).length;
  for(const m of s.melds[seat])if(m.kind!=="CHI")n+=(m.kind==="KONG"?(m.concealed?3:2):0)+(effective(m.tiles[0],s.gold)>=27?1:0);
  for(const m of shape?.groups||[])if(m.kind==="TRIPLET")n+=m.tiles[0]>=27?2:1;
  return n;
}
function finish(s,seat,name) {
  const shape=winningShape(s.hands[seat],s.gold,s.melds[seat].length,true),n=water(s,seat,shape),multiplier=RULES.multipliers[name]||1;
  const dealerBase=2+(s.streak||0),scores=[0,0,0,0];for(let p=0;p<4;p++)if(p!==seat){const pay=((p===s.dealer||seat===s.dealer?dealerBase:1)+n)*multiplier;scores[p]-=pay;scores[seat]+=pay;}
  s.scores=scores;s.winner=seat;s.status="FINISHED";s.phase="FINISHED";s.pending=null;
  s.result={name,water:n,multiplier,scores,dealerBase,detail:`${name} · ${multiplier}倍 · ${n}水 · 庄底${dealerBase}`};log(s,`${["东","南","西","北"][seat]}家${s.result.detail}`);
}
function sequences(s,seat,tile) {
  if(tile===s.gold)return [];
  const t=effective(tile,s.gold);if(t>=27)return [];
  const out=[];
  for(let start=Math.max(Math.floor(t/9)*9,t-2);start<=Math.min(t,Math.floor(t/9)*9+6);start++) {
    const needed=[start,start+1,start+2];needed.splice(needed.indexOf(t),1);
    const copy=s.hands[seat].slice(),physical=[];
    for(const n of needed){const i=copy.findIndex(x=>x!==s.gold&&effective(x,s.gold)===n);if(i<0)break;physical.push(copy.splice(i,1)[0]);}
    if(physical.length===2)out.push(physical);
  }return out;
}
function reactionOptions(s,seat) {
  const p=s.pending;if(!p||seat===p.from||p.replies[seat])return [];
  if(s.lockSeat!==null||p.tile===s.gold||s.you[seat])return [];
  const options=[];
  if(winningShape(s.hands[seat].concat(p.tile),s.gold,s.melds[seat].length,false))options.push({type:"HU",label:"胡"});
  if(p.kind==="ROB_KONG")return options;
  const count=s.hands[seat].filter(t=>t===p.tile).length;
  if(count>=3&&s.wall.length>RULES.reserve)options.push({type:"KONG",tile:p.tile,label:"杠"});
  if(count>=2)options.push({type:"PONG",tile:p.tile,label:"碰"});
  if(seat===(p.from+1)%4)for(const tiles of sequences(s,seat,p.tile))options.push({type:"CHI",tiles,label:"吃"});
  return options;
}
function ownOptions(s,seat) {
  if(s.status!=="PLAYING"||s.phase!=="DISCARD"||s.turn!==seat)return [];
  const options=[],name=winName(s,seat);
  if(name)options.push({type:"HU",label:name});
  if(s.wall.length>RULES.reserve&&!s.you[seat])for(const t of new Set(s.hands[seat])) {
    if(t===s.gold)continue;
    const n=s.hands[seat].filter(x=>x===t).length;
    if(n===4)options.push({type:"KONG",tile:t,label:"暗杠"});
    if(s.melds[seat].some(m=>m.kind==="PONG"&&m.tiles[0]===t))options.push({type:"ADD_KONG",tile:t,label:"补杠"});
  }
  return options;
}
function remove(hand,tiles) {for(const t of tiles){const i=hand.indexOf(t);if(i<0)throw Error("手中没有该牌");hand.splice(i,1);}}
function beginReaction(s,from,tile,kind="DISCARD") {
  s.phase="REACTION";s.pending={from,tile,kind,replies:{},deadline:Date.now()+20000};s.nextAt=Date.now()+750;
  for(let p=0;p<4;p++)if(p!==from&&!reactionOptions(s,p).length)s.pending.replies[p]={type:"PASS"};
  resolve(s);
}
function resolve(s) {
  const p=s.pending;if(!p)return;
  const order=[1,2,3].map(n=>(p.from+n)%4);
  if(order.some(seat=>!p.replies[seat]))return;
  const rank={HU:3,KONG:2,PONG:2,CHI:1,PASS:0};
  const claims=order.filter(seat=>p.replies[seat].type!=="PASS").sort((a,b)=>rank[p.replies[b].type]-rank[p.replies[a].type]);
  if(!claims.length){if(p.kind==="ROB_KONG"){completeAddedKong(s,p.from,p.tile);}else draw(s,(p.from+1)%4);return;}
  const seat=claims[0],a=p.replies[seat];
  if(a.type==="HU") {if(p.kind==="DISCARD")s.discards[p.from].pop();else remove(s.hands[p.from],[p.tile]);s.hands[seat].push(p.tile);sort(s.hands[seat]);finish(s,seat,p.kind==="ROB_KONG"?"自摸":"平胡");return;}
  const tiles=a.type==="CHI"?a.tiles:Array(a.type==="KONG"?3:2).fill(p.tile);
  remove(s.hands[seat],tiles);s.discards[p.from].pop();s.melds[seat].push({kind:a.type,tiles:tiles.concat(p.tile),from:p.from,concealed:false});
  s.turn=seat;s.pending=null;s.phase="DISCARD";s.drawn[seat]=null;s.you[seat]=0;s.nextAt=Date.now()+900;
  log(s,`${["东","南","西","北"][seat]}家${a.type==="CHI"?"吃":a.type==="PONG"?"碰":"杠"}${NAMES[p.tile]}`);
  if(a.type==="KONG")draw(s,seat);
}
function completeAddedKong(s,seat,tile) {remove(s.hands[seat],[tile]);const m=s.melds[seat].find(x=>x.kind==="PONG"&&x.tiles[0]===tile);m.kind="KONG";m.tiles.push(tile);draw(s,seat);}
function apply(s,seat,action) {
  if(s.status!=="PLAYING")throw Error("本局已结束");
  if(!Number.isInteger(seat)||seat<0||seat>3)throw Error("座位无效");
  if(s.phase==="REACTION") {
    if(seat===s.pending.from||s.pending.replies[seat])throw Error("当前无需响应");
    const legal=reactionOptions(s,seat),choice=legal.find(x=>x.type===action.type&&(x.type!=="CHI"||JSON.stringify(x.tiles)===JSON.stringify(action.tiles)));
    if(action.type!=="PASS"&&!choice)throw Error("不能执行该操作");
    s.pending.replies[seat]=choice||{type:"PASS"};resolve(s);return;
  }
  if(s.turn!==seat||s.phase!=="DISCARD")throw Error("还没轮到你");
  if(action.type==="DISCARD") {
    const tile=action.tile;if(!Number.isInteger(tile)||!s.hands[seat].includes(tile))throw Error("手中没有该牌");
    const copy=s.hands[seat].slice();remove(copy,[tile]);
    const waiting=goldWait(copy,s.gold,s.melds[seat].length);
    if(s.you[seat]&&(!waiting||tile!==s.gold))throw Error("游金中只能胡牌，或打金升级游金");
    remove(s.hands[seat],[tile]);s.discards[seat].push(tile);s.drawn[seat]=null;s.steps++;
    s.you[seat]=waiting?(tile===s.gold?Math.min(3,Math.max(1,s.you[seat])+1):Math.max(1,s.you[seat])):0;
    if(tile===s.gold)s.lockSeat=seat;
    log(s,`${["东","南","西","北"][seat]}家打出${NAMES[tile]}${s.you[seat]?` · ${WIN_NAMES[s.you[seat]]}`:""}`);
    beginReaction(s,seat,tile);return;
  }
  const choice=ownOptions(s,seat).find(x=>x.type===action.type&&(x.tile===undefined||x.tile===action.tile));
  if(!choice)throw Error("不能执行该操作");
  if(choice.type==="HU"){finish(s,seat,winName(s,seat));return;}
  if(choice.type==="ADD_KONG"){beginReaction(s,seat,choice.tile,"ROB_KONG");return;}
  remove(s.hands[seat],Array(4).fill(choice.tile));s.melds[seat].push({kind:"KONG",tiles:Array(4).fill(choice.tile),from:seat,concealed:true});log(s,`${["东","南","西","北"][seat]}家暗杠`);draw(s,seat);
}
// AI 优先胡牌，再保留金牌、对子、刻子和相邻搭子；孤张字牌及孤立幺九优先舍出。
function aiDiscard(s,seat) {
  const hand=s.hands[seat],{c}=counts(hand,s.gold);let best=hand[0],score=Infinity;
  for(const t of new Set(hand)) {
    const copy=hand.slice();remove(copy,[t]);
    if(s.you[seat]&&(t!==s.gold||!goldWait(copy,s.gold,s.melds[seat].length)))continue;
    if(goldWait(copy,s.gold,s.melds[seat].length))return t;
    const n=effective(t,s.gold);let value=t===s.gold?100:0;
    value+=(c[n]-1)*8;
    if(n<27)for(const d of [-2,-1,1,2])if(n+d>=0&&n+d<27&&Math.floor((n+d)/9)===Math.floor(n/9))value+=c[n+d]*(Math.abs(d)===1?3:1.5);
    if(n>=27&&c[n]===1)value-=3;
    value+=t/1000;if(value<score){score=value;best=t;}
  }return best;
}
function tick(s,humanSeats,now=Date.now()) {
  if(s.status!=="PLAYING")return false;
  if(s.phase==="ROLLING_DICE"){if(now<s.rollUntil)return false;s.phase="DISCARD";s.nextAt=now+900;log(s,`骰子定庄：${["东","南","西","北"][s.dealer]}家，开始出牌`);return true;}
  if(s.phase==="REACTION") {
    const p=s.pending;let changed=false;
    for(let seat=0;seat<4;seat++)if(seat!==p.from&&!p.replies[seat]&&((!humanSeats.includes(seat)&&now>=s.nextAt)||now>=p.deadline)) {
      const choices=reactionOptions(s,seat);p.replies[seat]=humanSeats.includes(seat)?{type:"PASS"}:choices.find(x=>x.type==="HU")||choices.find(x=>x.type==="KONG"||x.type==="PONG")||choices.find(x=>x.type==="CHI")||{type:"PASS"};changed=true;
    }if(changed)resolve(s);return changed;
  }
  if(humanSeats.includes(s.turn)||now<s.nextAt)return false;
  const seat=s.turn,options=ownOptions(s,seat),choice=options.find(x=>x.type==="HU")||options.find(x=>x.type==="KONG"||x.type==="ADD_KONG");
  apply(s,seat,choice||{type:"DISCARD",tile:aiDiscard(s,seat)});return true;
}
function view(s,seat) {
  const options=s.phase==="REACTION"?reactionOptions(s,seat):ownOptions(s,seat);
  return {phase:s.phase,status:s.status,turn:s.turn,dealer:s.dealer,streak:s.streak||0,dealerBase:2+(s.streak||0),dealerReason:s.dealerReason||"原庄继续",dealerRoll:s.dealerRoll||null,rollStartedAt:s.rollStartedAt||null,rollUntil:s.rollUntil||null,nextDealer:s.status==="FINISHED"?nextRound(s):null,gold:s.gold,indicator:s.indicator,remaining:s.wall.length,seat,steps:s.steps,
    hands:s.hands.map((h,i)=>i===seat||s.status==="FINISHED"?h.slice():Array(h.length).fill(null)),flowers:s.flowers,melds:s.melds.map((ms,i)=>ms.map(m=>({...m,tiles:m.concealed&&i!==seat&&s.status!=="FINISHED"?Array(4).fill(null):m.tiles}))),discards:s.discards,you:s.you,
    drawn:s.drawn[seat],pending:s.pending?{from:s.pending.from,tile:s.pending.tile,kind:s.pending.kind,deadline:s.pending.deadline,responded:!!s.pending.replies[seat]}:null,
    options,winner:s.winner,scores:s.scores,result:s.result,log:s.log,rules:RULES};
}
module.exports={createGame,apply,tick,view,winningShape,goldWait,aiDiscard,rollDealer,nextRound,RULES,NAMES,effective};
