/* View: world map, stage briefing and stage result. */
import { TWISTS } from '../../model/twists.js';
import { BOOSTS, QUEST_COINS, addCoins, boostCount, equip } from '../../model/shop.js';
import { S } from '../../model/state.js';
import { startGame, toMenu } from '../../controller/flow.js';
import { $ } from '../../core/dom.js';
import { badgeTick } from '../../model/badges.js';
import { BOSSES, GOALS, STAGES, WORLDS, calcStars, nextStage, stageDef, stageOpen, stageWorld, stars } from '../../model/campaign.js';
import { MAXLV, QDEFS, QUEST_XP, ZONES, lvlInfo, qProg, qState, todaysQuests } from '../../model/progression.js';
import { saveStore, store } from '../../model/store.js';
import { stageMetric } from '../../systems/stageRules.js';
import { haptic, sfxStar } from '../audio.js';
import { addBadgeLines } from './hub.js';
import { refreshMenu } from './menu.js';
import { showLevelUp } from './result.js';
import { starSvg, starsHtml } from './stars.js';

export function hideStagePanels(){$('#map').hidden=true;$('#brief').hidden=true;$('#stageRes').hidden=true}
function openMap(w){
  if(S.state!=='menu')toMenu();
  S.mapWorld=w!==undefined?w:stageWorld(Math.min(nextStage(),STAGES));
  renderMap();$('#menu').hidden=true;$('#board').hidden=true;$('#shop').hidden=true;$('#hub').hidden=true;$('#help').hidden=true;hideStagePanels();$('#map').hidden=false;
}
function renderMap(){
  const w=S.mapWorld,z=ZONES[w];
  $('#map').style.background='linear-gradient(180deg,'+z[0]+'e6,'+z[1]+'f7)';
  $('#wNum').textContent='World '+(w+1)+' of 20';$('#wName').textContent=WORLDS[w];
  $('#wTwist').textContent=TWISTS[w]?'Twist · '+TWISTS[w].name:'No twist';
  let got=0;for(let i=1;i<=10;i++)got+=stars(w*10+i);
  $('#wStars').innerHTML=starSvg(true)+' '+got+' / 30';
  $('#wPrev').disabled=w===0;$('#wNext').disabled=w===19;
  const box=$('#nodes'),cur=nextStage();box.textContent='';
  for(let i=1;i<=10;i++){
    const n=w*10+i,b=document.createElement('button'),st=stars(n);
    b.type='button';b.className='node'+(i===10?' boss':'')+(st>0?' cleared':'')+(n===cur?' cur':'');
    b.disabled=!stageOpen(n);
    b.setAttribute('aria-label',(i===10?'Boss stage ':'Stage ')+n+', '+st+' of 3 stars'+(b.disabled?', locked':''));
    b.innerHTML=(i===10?'<span>Boss '+BOSSES[w]+'</span>':'<b>'+n+'</b>')+'<span class="stars">'+starsHtml(st)+'</span>';
    b.addEventListener('click',()=>openBrief(n));
    box.appendChild(b);
  }
}
function renderBoosts(){
  const box=$('#bBoosts');box.textContent='';let any=false;
  for(const b of BOOSTS){
    const n=boostCount(b.id);if(!n)continue;any=true;equip[b.id]=false;
    const el=document.createElement('button');el.type='button';el.className='chip';el.setAttribute('aria-pressed','false');el.textContent=b.n+' ×'+n;el.title=b.txt;
    el.addEventListener('click',()=>{equip[b.id]=!equip[b.id];el.setAttribute('aria-pressed',String(equip[b.id]))});
    box.appendChild(el);
  }
  box.hidden=!any;
}
async function openBrief(n){
  n=Math.max(1,Math.min(STAGES,n|0));if(!stageOpen(n))return;
  if(S.state!=='menu')toMenu();
  S.briefN=n;const d=await stageDef(n),z=ZONES[d.world];
  $('#brief').style.background='linear-gradient(180deg,'+z[0]+'e6,'+z[1]+'f7)';
  $('#bWorld').textContent='World '+(d.world+1)+' · '+WORLDS[d.world]+(d.boss?' · Boss':'');
  $('#bTitle').textContent='Stage '+n;
  $('#bTwist').textContent=d.twist?'Twist · '+d.twist.name+': '+d.twist.txt:'';
  $('#bGoal').textContent=d.boss?'Defeat '+d.bossName:GOALS[d.kind].txt(d.goal[0]);
  $('#bBest').innerHTML=starsHtml(stars(n));
  const ul=$('#bTiers');ul.textContent='';
  const rows=d.boss?[['Win',1],[Math.round(d.time*.3)+'s left',2],[Math.round(d.time*.6)+'s left',3]]:d.goal.map((g,i)=>[GOALS[d.kind].short(g),i+1]);
  for(const r of rows){
    const li=document.createElement('li');if(stars(n)>=r[1])li.className='got';
    li.innerHTML='<span class="stars">'+starsHtml(r[1])+'</span><b>'+r[0]+'</b>';
    ul.appendChild(li);
  }
  renderBoosts();
  $('#bNote').textContent=d.time+' seconds'+(d.boss?' · stars by time left':'');
  $('#menu').hidden=true;$('#hub').hidden=true;$('#help').hidden=true;hideStagePanels();$('#brief').hidden=false;
}
function paintStageXp(before,after,gain){
  $('#srLv').textContent='LV '+after.l;$('#srGain').textContent='+'+gain+' XP';
  $('#srXpNote').textContent=after.l>=MAXLV?'Max level':(after.n-after.r)+' XP to LV '+(after.l+1);
  const fill=$('#srFill'),tok=S.resultToken;
  fill.style.transition='none';fill.style.width=(before.r/before.n*100)+'%';void fill.offsetWidth;fill.style.transition='';
  if(after.l>before.l){
    fill.style.width='100%';
    setTimeout(()=>{if(tok!==S.resultToken)return;fill.style.transition='none';fill.style.width='0%';void fill.offsetWidth;fill.style.transition='';fill.style.width=(after.r/after.n*100)+'%';showLevelUp(before.l+1,after.l,'#srLevelUp')},950);
  }else fill.style.width=(after.r/after.n*100)+'%';
}
export function showStageResult(){
  S.state='over';S.resultToken++;
  const d=S.stage,metric=stageMetric(),won=d.boss?S.stageEnd==='boss':metric>=d.goal[0];
  const left=Math.max(0,S.timeLeft),st=won?calcStars(d,metric,left):0;
  const qs=todaysQuests(),q=qState(),newly=[];
  for(const dq of qs)if(!q.done[dq.id]&&qProg(dq)>=dq.target){q.done[dq.id]=true;newly.push(dq)}
  for(const dq of QDEFS){const k=dq.key;q.p[k]=dq.type==='sum'?(q.p[k]||0)+(S.run[k]||0):Math.max(q.p[k]||0,S.run[k]||0)}
  store.st=store.st||{};const prev=store.st[d.n]||0,first=won&&prev<1;if(st>prev)store.st[d.n]=st;
  const bres=badgeTick(S.run,true);
  S.run={gems:0,gold:0,mys:0,fever:0,snap:0,x16:0,score:0};
  store.plays=(store.plays||0)+1;
  const gain=(won?Math.round((20+20*st+(first?50:0)+Math.min(40,Math.round(S.score/400)))*(1+.1*d.world)):Math.round(5+S.score/800))+newly.length*QUEST_XP+bres.xp;
  const before=lvlInfo(store.xp||0);store.xp=(store.xp||0)+gain;const after=lvlInfo(store.xp);saveStore();
  const coinGain=(won?10+10*st+(first?30:0):3)+newly.length*QUEST_COINS;addCoins(coinGain);$('#srCoins').textContent='+'+coinGain+' coins';
  const z=ZONES[d.world];$('#stageRes').style.background='linear-gradient(180deg,'+z[0]+'e6,'+z[1]+'f7)';
  $('#srHead').textContent='Stage '+d.n+' · '+WORLDS[d.world];
  $('#srTitle').textContent=won?(d.boss?'Boss defeated':st===3?'Perfect':'Stage clear'):'Try again';
  const box=$('#srStars'),tok=S.resultToken;box.innerHTML=starsHtml(0);
  for(let i=0;i<st;i++)setTimeout(()=>{if(tok!==S.resultToken)return;const sv=box.querySelectorAll('svg')[i];if(sv)sv.classList.add('on');sfxStar(i);haptic(12)},450+i*420);
  $('#srNew').hidden=!(won&&st>prev&&prev>0);
  $('#srScore').textContent=S.score.toLocaleString();
  $('#srMetricLbl').textContent=d.boss?'Boss':GOALS[d.kind].label;
  $('#srMetric').textContent=d.boss?(won?'Down':'Alive'):metric.toLocaleString();
  $('#srTime').textContent=Math.round(left)+'s';
  const ql=$('#srQuests');ql.textContent='';
  for(const dq of newly){const li=document.createElement('li');li.textContent=dq.txt+' · +'+QUEST_XP+' XP';ql.appendChild(li)}
  if(d.boss&&first){const li=document.createElement('li');li.textContent='Trophy: '+BOSSES[d.world];ql.appendChild(li)}
  addBadgeLines(ql,bres);
  $('#srLevelUp').hidden=true;paintStageXp(before,after,gain);
  $('#srNextBtn').hidden=!(won&&d.n<STAGES);
  $('#srRetry').className=(won&&d.n<STAGES)?'btn ghost':'btn';
  hideStagePanels();$('#stageRes').hidden=false;
  const rs=$('#stageRes');if(rs.scrollTo)rs.scrollTo(0,0);
}

export function init(){
  $('#playStage').addEventListener('click',()=>{const n=nextStage();if(n>STAGES)openMap(19);else openBrief(n)});
  $('#mapBtn').addEventListener('click',()=>openMap());
  $('#mapClose').addEventListener('click',()=>{hideStagePanels();$('#menu').hidden=false;refreshMenu()});
  $('#wPrev').addEventListener('click',()=>{S.mapWorld=Math.max(0,S.mapWorld-1);renderMap()});
  $('#wNext').addEventListener('click',()=>{S.mapWorld=Math.min(19,S.mapWorld+1);renderMap()});
  $('#bStart').addEventListener('click',()=>startGame('stage',S.briefN));
  $('#bBack').addEventListener('click',()=>openMap(stageWorld(S.briefN)));
  $('#srRetry').addEventListener('click',()=>startGame('stage',S.stage?S.stage.n:1));
  $('#srNextBtn').addEventListener('click',()=>openBrief((S.stage?S.stage.n:0)+1));
  $('#srMap').addEventListener('click',()=>openMap(S.stage?S.stage.world:0));
}
