/* System: snaps, slicing, scoring, fever and mystery effects. */
import { S } from '../model/state.js';
import { BOOST, COL, FEVER_LEN, GEMCOLS, MAXT, RM } from '../core/constants.js';
import { qProg, qState, todaysQuests } from '../model/progression.js';
import { gemBandDist, maxDepth } from './band.js';
import { bossHit } from './boss.js';
import { haptic, sfxBomb, sfxCrack, sfxCrit, sfxDead, sfxFever, sfxGold, sfxSlice, sfxTwang, stopCreak } from '../view/audio.js';
import { burst, halves, popBig, popText, ring } from '../view/fx.js';

function checkQuests(){
  const q=qState();
  for(const d of todaysQuests()){
    if(!q.done[d.id]&&!S.runDone[d.id]&&qProg(d)>=d.target){S.runDone[d.id]=true;popBig('QUEST COMPLETE',COL.mint,.46);S.flash=Math.max(S.flash,.25);S.flashCol='#3DF2B0';sfxGold()}
  }
}
export function mulNow(){return(S.fever>0?2:1)*(S.x2T>0?2:1)}
function addTime(x){if(S.mode==='stage')return;S.timeLeft=Math.min(MAXT,S.timeLeft+x)}
function safeNow(){return S.fever>0||S.novaSafe}
function startFever(){
  if(S.fever>0)return;
  S.fever=FEVER_LEN;S.feverM=0;S.run.fever++;popBig('FEVER!',COL.glow,.3);S.flash=.5;S.flashCol='#FF3E86';S.slowT=Math.max(S.slowT,.4);sfxFever();haptic([30,30,60]);
}
function checkBest(){
  if(S.bestRef>0&&!S.beatBest&&S.score>S.bestRef){S.beatBest=true;popBig('NEW BEST!',COL.lemon,.26);S.flash=.5;S.flashCol='#fff';sfxGold();burst(S.W/2,S.H*.2,COL.lemon,40,520)}
}
function mysteryFx(g){
  S.run.mys++;let fx=g.fx||'time';if(S.mode==='stage'&&fx==='time')fx='x2';
  if(fx==='time'){S.timeLeft=Math.min(MAXT,S.timeLeft+4);popBig('+4 SECONDS',COL.mint,.42);S.timerPulse=.6}
  else if(fx==='x2'){S.x2T=10;popBig('DOUBLE SCORE',COL.lemon,.42)}
  else if(fx==='fever'){S.feverM=1;startFever()}
  else{
    popBig('NOVA!',COL.glow,.42);S.novaSafe=true;
    for(const o of S.gems.slice())if(o.alive&&o!==g){if(o.type==='boss'){bossHit(o,3);continue}if(o.type==='armored')o.armor=1;onSlice(o)}
    S.novaSafe=false;S.shake=Math.max(S.shake,RM?0:18);
  }
  S.slowT=Math.max(S.slowT,.45);S.flash=Math.max(S.flash,.35);S.flashCol='#fff';
}
function onSlice(g){
  const play=S.state==='play',q=S.snap.quiet;
  if(g.type==='boss'){g.lastSnap=S.snap.id;bossHit(g,1);return}
  if(g.type==='armored'&&g.armor>1){
    g.armor--;g.lastSnap=S.snap.id;burst(g.x,g.y,'#C9D1F5',10,260);ring(g.x,g.y,g.r,'#C9D1F5');
    if(play){S.score+=5*mulNow();popText(g.x,g.y-g.r,'CRACK','#C9D1F5',24)}
    if(!q){sfxCrack();haptic(10)}
    return;
  }
  g.alive=false;g.cut=true;
  if(g.type==='bomb'){
    if(safeNow()){
      burst(g.x,g.y,COL.lemon,18,360);ring(g.x,g.y,g.r,COL.lemon);
      if(play)S.score+=50*mulNow();
      if(!q)sfxSlice(S.combo+2);
    }else{
      if(play)S.timeLeft=Math.max(0,S.timeLeft-3);
      S.combo=0;S.snap.bad=true;burst(g.x,g.y,COL.coral,26,420);burst(g.x,g.y,'#fff',10,300);ring(g.x,g.y,g.r,COL.coral);
      S.shake=RM?0:24;S.flash=.55;S.flashCol='#FF3E3E';if(play)popText(g.x,g.y-g.r,'-3s','#FF8A8A',34);
      if(!q){sfxBomb();haptic(60)}
    }
  }else if(g.type==='dead'){
    if(safeNow()){burst(g.x,g.y,COL.dead,10,200);halves(g);if(play)S.score+=10*mulNow()}
    else{S.combo=0;S.snap.bad=true;burst(g.x,g.y,COL.dead,12,200);halves(g);if(!q)sfxDead()}
  }else{
    S.combo++;if(S.combo>S.stChain)S.stChain=S.combo;
    const mult=Math.min(16,Math.pow(2,Math.min(S.combo,4)));
    let base=g.type==='gold'?100:g.type==='mystery'?50:g.type==='armored'?40:g.type==='speeder'?30:g.type==='ghost'?25:10,crit=false;
    if(g.type==='gem'&&Math.random()<.08){crit=true;base*=3}
    const pts=base*mult*mulNow();
    S.snap.count++;
    if(play){
      S.score+=pts;S.slicedTotal++;S.run.gems++;S.run.score=Math.max(S.run.score,S.score);if(g.type==='gold')S.run.gold++;if(mult>=16)S.run.x16=1;
      addTime(g.type==='gold'?1.5:.12+.03*Math.min(S.combo,5));S.timerPulse=.3;
      if(S.fever<=0)S.feverM=Math.min(1,S.feverM+(g.type==='gold'?.12:g.type==='mystery'?.08:.035));
    }
    const col=g.type==='gold'?COL.gold:g.type==='speeder'?'#7CF3FF':g.type==='armored'?'#C9D1F5':g.type==='ghost'?'#E6D9FF':GEMCOLS[g.c%4];
    burst(g.x,g.y,g.type==='mystery'?COL.lilac:col,g.type==='gold'?30:14,g.type==='gold'?460:300);ring(g.x,g.y,g.r,'#fff');halves(g);
    if(play)popText(g.x,g.y-g.r,(crit?'CRIT ':'+')+pts.toLocaleString(),crit||g.type==='gold'?COL.gold:'#fff',Math.min(48,22+mult*1.6+(crit?6:0)));
    if(crit){S.flash=Math.max(S.flash,.2);S.flashCol='#FFE14D';if(!q)sfxCrit()}
    if(g.type==='gold'){S.slowT=Math.max(S.slowT,.5);S.flash=.35;S.flashCol='#FFE14D';if(!q)sfxGold()}
    else if(g.type==='mystery'){if(play)mysteryFx(g)}
    else if(!q)sfxSlice(S.combo);
    if(S.snap.count===3){S.slowT=Math.max(S.slowT,.35);S.flash=Math.max(S.flash,.22);S.flashCol='#fff'}
    if(S.snap.count>=3)S.shake=Math.max(S.shake,RM?0:6+S.snap.count*2);
    if(!q)haptic(8);
    if(play){if(S.feverM>=1&&S.fever<=0)startFever();checkBest()}
  }
  if(S.snap.count>0||S.snap.rec){S.snap.rec=S.snap.rec||{u:null,W:S.W,H:S.H,restY:S.restY,gems:null};S.snap.rec.u=Array.from(S.u);S.snap.rec.gems=S.gems.map(gm=>({x:gm.x,y:gm.y,r:gm.r,type:gm.type,c:gm.c,cut:gm.cut}))}
  if(play)checkQuests();
}
export function collide(){
  for(const g of S.gems){
    if(!g.alive||g.lastSnap===S.snap.id)continue;
    const d=gemBandDist(g);
    if(d<g.minD)g.minD=d;
    if(d<g.r+3)onSlice(g);
  }
}
export function endSnap(){
  if(!S.snap)return;
  const s=S.snap;S.snap=null;
  if(S.state==='play'){
    if(s.count>S.run.snap)S.run.snap=s.count;
    if(s.count===0&&!s.bad&&S.combo>0)S.combo=0;
    if(s.count>S.bestSnapCount)S.bestSnapCount=s.count;
    if(s.rec&&s.count>S.bestRecCount){S.bestRecCount=s.count;S.bestRec=s.rec}
    if(s.count>=3&&!s.bad){
      popBig('PERFECT SNAP',COL.lemon);S.flash=Math.max(S.flash,.5);S.flashCol='#fff';S.slowT=Math.max(S.slowT,.45);
      addTime(1.5);S.timerPulse=.6;
    }else if(s.count<3){
      let near=null;
      for(const g of S.gems)if(g.alive&&['gem','gold','speeder','armored','ghost'].includes(g.type)&&g.minD<g.r+30&&(!near||g.minD<near.minD))near=g;
      if(near){popBig('SO CLOSE!','#fff');S.slowT=Math.max(S.slowT,.5)}
    }
    checkQuests();
  }
}
export function releaseSnap(depth,quiet){
  for(let i=0;i<S.N;i++)S.v[i]=-BOOST*S.u[i];
  if(depth<22)return;
  S.snap={id:++S.snapSeq,t:0,count:0,bad:false,rec:null,quiet,power:depth/maxDepth()};
  for(const g of S.gems)g.minD=1e9;
  if(S.state==='play')S.snapsTaken++;
  if(!quiet){sfxTwang(S.snap.power,S.combo);haptic(14)}
}
export function releaseHold(){const d=S.hold.depth;S.hold=null;S.pred=null;stopCreak();releaseSnap(d,false)}
