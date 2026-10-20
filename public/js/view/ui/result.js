/* View: endless/daily/hard result screen and crates. */
import { S } from '../../model/state.js';
import { startGame, toMenu } from '../../controller/flow.js';
import { RM } from '../../core/constants.js';
import { $ } from '../../core/dom.js';
import { badgeTick } from '../../model/badges.js';
import { MAXLV, QDEFS, QUEST_XP, SKINS, UNLOCKS, diffParams, lvlInfo, qProg, qState, titleFor, todaysQuests, zoneOf } from '../../model/progression.js';
import { curStreak, dayStr, saveStore, store, touchStreak } from '../../model/store.js';
import { haptic, sfxGold, sfxLevel } from '../audio.js';
import { renderCard } from '../shareCard.js';
import { addBadgeLines } from './hub.js';
import { reportRun } from './board.js';
import { QUEST_COINS, addCoins, runCoins } from '../../model/shop.js';

function paintXp(before,after,gain){
  $('#xLv').textContent='LV '+after.l;$('#xGain').textContent='+'+gain+' XP';
  $('#xNext').textContent=after.l>=MAXLV?'Max level':(after.n-after.r)+' XP to LV '+(after.l+1);
  const fill=$('#xFill'),tok=S.resultToken;
  fill.style.transition='none';fill.style.width=(before.r/before.n*100)+'%';void fill.offsetWidth;fill.style.transition='';
  if(after.l>before.l){
    fill.style.width='100%';
    setTimeout(()=>{if(tok!==S.resultToken)return;fill.style.transition='none';fill.style.width='0%';void fill.offsetWidth;fill.style.transition='';fill.style.width=(after.r/after.n*100)+'%';showLevelUp(before.l+1,after.l)},950);
  }else fill.style.width=(after.r/after.n*100)+'%';
}
export function showLevelUp(from,to,sel){
  const el=$(sel||'#levelUp'),items=[];
  for(const u of UNLOCKS)if(u.lv>=from&&u.lv<=to)items.push(u.txt);
  for(const sk of SKINS)if(sk.lv>=from&&sk.lv<=to)items.push(sk.n+' skin');
  if(zoneOf(from-1)!==zoneOf(to))items.push('Zone '+(zoneOf(to)+1));
  el.textContent='Level '+to+': '+titleFor(to)+(items.length?'. Unlocked: '+items.join(', '):'')+'. Danger x'+diffParams(Math.min(260,to)).danger.toFixed(2);
  el.hidden=false;sfxLevel();haptic([20,40,20]);
}

// Cryptographically secure crate roll (prevent Math.random manipulation)
function crateRoll(){
  // Use crypto.getRandomValues for unpredictable results
  const randomArray = new Uint32Array(1);
  crypto.getRandomValues(randomArray);
  const r = randomArray[0] / 0xFFFFFFFF; // Convert to 0-1 range
  
  const pick=a=>a[Math.floor(crypto.getRandomValues(new Uint32Array(1))[0] / 0xFFFFFFFF * a.length)];
  return Math.round((r<.02?500:r<.12?pick([200,250,300]):r<.4?pick([80,100,120,150]):pick([25,30,40,50,60]))*S.diff.xpMul*Math.max(1,S.diff.L/8));
}
function buildCrates(){
  S.crateDone=false;const row=$('#crateRow');row.textContent='';$('#crates').hidden=false;
  for(let i=0;i<3;i++){
    const b=document.createElement('button');b.type='button';b.className='crate';b.textContent='?';b.setAttribute('aria-label','Crate '+(i+1));
    b.addEventListener('click',()=>openCrate(i));row.appendChild(b);
  }
}
function openCrate(i){
  if(S.crateDone)return;S.crateDone=true;
  const bs=Array.from($('#crateRow').children),vals=bs.map(()=>crateRoll()),bonus=vals[i];
  bs.forEach((b,k)=>{b.disabled=true;b.textContent='+'+vals[k];if(k===i){b.classList.add('open');if(vals[k]>=500)b.classList.add('jackpot')}else b.classList.add('dim')});
  const before=lvlInfo(store.xp||0);store.xp=(store.xp||0)+bonus;saveStore();const after=lvlInfo(store.xp);
  const g=parseInt($('#xGain').textContent.replace(/[^0-9]/g,''),10)||0;
  sfxGold();haptic(20);
  paintXp(before,after,g+bonus);
  $('#xGain').textContent='+'+(g+bonus)+' XP';
}
export function showResult(){
  S.state='over';S.resultToken++;
  const qs=todaysQuests(),q=qState(),newly=[];
  for(const d of qs)if(!q.done[d.id]&&qProg(d)>=d.target){q.done[d.id]=true;newly.push(d)}
  for(const d of QDEFS){const k=d.key;q.p[k]=d.type==='sum'?(q.p[k]||0)+(S.run[k]||0):Math.max(q.p[k]||0,S.run[k]||0)}
  const bres=badgeTick(S.run);
  S.run={gems:0,gold:0,mys:0,fever:0,snap:0,x16:0,score:0};
  let newBest=false;
  if(S.mode==='daily'){
    touchStreak();const t=dayStr(),prev=(store.daily&&store.daily.date===t)?store.daily.score:null;
    if(prev===null||S.score>prev)store.daily={date:t,score:S.score};
    newBest=prev!==null&&S.score>prev;
  }else if(S.mode==='hard'){const prev=store.hard||0;if(S.score>prev){store.hard=S.score;newBest=prev>0}}
  else{const prev=store.free||0;if(S.score>prev){store.free=S.score;newBest=prev>0}}
  store.plays=(store.plays||0)+1;store.best=Math.max(store.best||0,S.score);
  const streak=curStreak();
  // Keep a standout score rewarding without letting one run skip dozens of levels.
  const gain=Math.round((Math.round(S.score/500)+S.slicedTotal*.5+S.bestSnapCount*2)*S.diff.xpMul)+newly.length*QUEST_XP+bres.xp+(S.mode==='daily'?Math.min(streak,7)*5:0);
  const before=lvlInfo(store.xp||0);store.xp=(store.xp||0)+gain;const after=lvlInfo(store.xp);saveStore();
  const coinGain=runCoins(S.score,S.slicedTotal)+newly.length*QUEST_COINS;addCoins(coinGain);$('#rCoins').textContent='+'+coinGain+' coins';
  $('#rHead').textContent=S.mode==='daily'?'Daily seed':S.mode==='hard'?'Hard mode':'Endless';
  $('#rBadge').hidden=!newBest;
  $('#rSnap').textContent=S.bestSnapCount;$('#rGems').textContent=S.slicedTotal;$('#rTime').textContent=Math.round(S.survived);
  let hook='';
  if(newBest)hook='';
  else if(S.bestRef>0&&S.score<S.bestRef&&(S.bestRef-S.score)/S.bestRef<=.25)hook='Only '+(S.bestRef-S.score).toLocaleString()+' points from your best.';
  else if(after.l<MAXLV&&after.n-after.r<=Math.max(60,gain))hook='One more run to level '+(after.l+1)+'.';
  const hk=$('#rHook');hk.hidden=!hook;hk.textContent=hook;
  const ql=$('#rQuests');ql.textContent='';
  for(const d of newly){const li=document.createElement('li');li.textContent=d.txt+' · +'+QUEST_XP+' XP';ql.appendChild(li)}
  addBadgeLines(ql,bres);
  $('#levelUp').hidden=true;paintXp(before,after,gain);
  buildCrates();
  const el=$('#rScore'),t0=performance.now(),dur=900;
  (function tick(n){const p=Math.min(1,(n-t0)/dur);el.textContent=Math.round(S.score*(1-Math.pow(1-p,3))).toLocaleString();if(p<1)requestAnimationFrame(tick)})(t0);
  let url='';try{if(/^https?:/.test(location.href))url=location.href.split('#')[0]}catch(e){}
  S.shareStr='SNAP · '+(S.mode==='daily'?'Daily '+dayStr():S.mode==='hard'?'Hard mode':'Endless')+'\n'+S.score.toLocaleString()+' pts · best snap '+S.bestSnapCount+' gems · LV '+after.l+' '+after.title+(S.mode==='daily'?'\nStreak '+streak+' days':'')+(url?'\n'+url:'');
  $('#shareBox').hidden=true;$('#shareText').hidden=true;$('#copyBtn').textContent='Copy score';
  try{$('#cardImg').src=renderCard(streak)}catch(e){}
  $('#result').hidden=false;reportRun();
  const rs=$('#result');if(rs.scrollTo)rs.scrollTo(0,0);
}

export function init(){
  $('#playDaily').addEventListener('click',()=>startGame('daily'));
  $('#playFree').addEventListener('click',()=>startGame('free'));
  $('#playHard').addEventListener('click',()=>startGame('hard'));
  $('#again').addEventListener('click',()=>startGame(S.mode));
  $('#shareBtn').addEventListener('click',()=>{const b=$('#shareBox');b.hidden=!b.hidden;if(!b.hidden&&b.scrollIntoView)b.scrollIntoView({behavior:RM?'auto':'smooth',block:'nearest'})});
  $('#toMenu').addEventListener('click',toMenu);
  $('#copyBtn').addEventListener('click',()=>{
  const b=$('#copyBtn'),ta=$('#shareText');
  const fallback=()=>{ta.value=S.shareStr;ta.hidden=false;ta.focus();ta.select();b.textContent='Select and copy'};
  try{navigator.clipboard.writeText(S.shareStr).then(()=>{b.textContent='Copied';ta.hidden=true;setTimeout(()=>{b.textContent='Copy score'},1600)},fallback)}catch(e){fallback()}
});
}
