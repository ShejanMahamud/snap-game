/* Controller: update loop, resize and frame. */
import { S } from '../model/state.js';
import { RM } from '../core/constants.js';
import { endRound } from './flow.js';
import { $, cv } from '../core/dom.js';
import { giftState } from '../model/gift.js';
import { applyZone, mkDiff } from '../model/progression.js';
import { keys } from '../model/state.js';
import { store } from '../model/store.js';
import { buildBand, gemR, maxDepth, shapeInto, stepBand } from '../systems/band.js';
import { moveBoss } from '../systems/boss.js';
import { demoSpawn, spawnDue } from '../systems/generator.js';
import { collide, endSnap, releaseSnap } from '../systems/slicing.js';
import { stageCheck, stageTimeUp } from '../systems/stageRules.js';
import { musicTick, sfxTick, updCreak } from '../view/audio.js';
import { draw, makeBg } from '../view/render.js';
import { openGift } from '../view/ui/gift.js';
import { buildLegend, refreshMenu } from '../view/ui/menu.js';
import { showResult } from '../view/ui/result.js';
import { showStageResult } from '../view/ui/stages.js';

function update(rdt){
  const target=S.slowT>0?.3:1;S.slow+=(target-S.slow)*Math.min(1,rdt*12);S.slowT=Math.max(0,S.slowT-rdt);
  const dt=rdt*S.slow;
  if(S.state==='play'){
    S.survived+=rdt;
    if(S.fever>0){S.fever-=rdt;if(S.fever<0)S.fever=0}else S.timeLeft-=S.mode==='stage'?rdt:rdt*(1+Math.min(1,S.survived/120)*.8)*S.diff.drain;
    S.x2T=Math.max(0,S.x2T-rdt);S.timerPulse=Math.max(0,S.timerPulse-rdt);
    const sec=Math.ceil(S.timeLeft);if(S.fever<=0&&sec<=5&&sec>0&&sec!==S.lastTick){S.lastTick=sec;sfxTick()}
    musicTick();
    if(S.mode==='stage'&&stageCheck()){}
    else if(S.timeLeft<=0){if(S.mode==='stage')stageTimeUp();else{S.timeLeft=0;endRound()}}
    else{S.tg+=dt;spawnDue()}
    S.hintT=Math.max(0,S.hintT-rdt);
  }else if(S.state==='menu'){
    demoSpawn(rdt);
  }else if(S.state==='ending'){
    S.endT-=rdt;if(S.endT<=0){if(S.mode==='stage')showStageResult();else showResult()}
  }
  if(S.state==='menu'&&!S.hold&&!S.demoPaused){
    S.botT-=rdt;
    if(!S.bot&&!S.snap&&S.botT<=0){
      let tgt=null;for(const g of S.gems)if(g.alive&&g.type!=='bomb'&&g.y<S.restY-S.H*.04&&g.y>S.restY-S.H*.2&&(!tgt||g.y>tgt.y))tgt=g;
      S.bot={t:0,gx:tgt?tgt.x:S.W*(.15+Math.random()*.7),depth:S.H*(.09+Math.random()*.06)};
    }
    if(S.bot){S.bot.t+=rdt;const p=Math.min(1,S.bot.t/.28);shapeInto(S.u,S.bot.gx,S.bot.depth*(1-Math.pow(1-p,2)));S.v.fill(0);
      if(S.bot.t>.34){const d=S.bot.depth;S.bot=null;S.botT=1.1+Math.random()*.8;releaseSnap(d,true)}}
  }
  if(S.hold){
    if(S.hold.kb){
      if(keys.l)S.hold.px-=520*rdt;if(keys.r)S.hold.px+=520*rdt;S.hold.px=Math.max(0,Math.min(S.W,S.hold.px));S.kbX=S.hold.px;
      if(keys.d)S.hold.py=Math.min(S.restY+maxDepth(),S.hold.py+460*rdt);
    }
    S.hold.depth=Math.max(0,Math.min(maxDepth(),S.hold.py-S.hold.startY));S.hold.gx=Math.max(0,Math.min(S.W,S.hold.px));
    shapeInto(S.u,S.hold.gx,S.hold.depth);S.v.fill(0);updCreak(S.hold.depth/maxDepth());
  }else if(!S.bot){
    S.acc+=dt;const h=1/300;let n=0;
    while(S.acc>=h&&n<48){stepBand(h,S.u,S.v);if(S.snap){S.snap.t+=h;collide()}S.acc-=h;n++}
    if(n>=48)S.acc=0;
    if(S.snap&&S.snap.t>.62)endSnap();
  }
  if(S.snap){S.trail.push(Float32Array.from(S.u));if(S.trail.length>5)S.trail.shift()}else if(S.trail.length)S.trail.shift();
  if(!S.hold){if(keys.l)S.kbX=Math.max(0,S.kbX-520*rdt);if(keys.r)S.kbX=Math.min(S.W,S.kbX+520*rdt)}
  S.kbMarker=Math.max(0,S.kbMarker-rdt);
  const rg=gemR();
  for(const g of S.gems){
    g.age+=dt;
    if(g.type==='boss'){moveBoss(g,dt);continue}
    const tw=S.mode==='stage'&&S.stage?S.stage.twist:null;
    if(tw){
      g.y=(g.y0!==undefined?g.y0:-rg*2)+g.vy*(tw.speed||1)*S.H*g.age+(tw.pulse?Math.sin(g.age*2.4+g.ph)*tw.pulse*S.H*.04:0);
      g.x=Math.max(g.r,Math.min(S.W-g.r,g.x0*S.W+Math.sin(g.age*g.sf*(tw.zig||1)+g.ph)*S.W*g.sway*(tw.sway||1)+(tw.gust?Math.sin(S.survived*.9)*tw.gust*S.W:0)));
    }else{
      g.y=(g.y0!==undefined?g.y0:-rg*2)+g.vy*S.H*g.age;g.x=Math.max(g.r,Math.min(S.W-g.r,g.x0*S.W+Math.sin(g.age*g.sf+g.ph)*S.W*g.sway));
    }
    g.rot+=g.spin*dt;
  }
  S.gems=S.gems.filter(g=>g.y<S.H+g.r*3);
  for(const p of S.parts){p.life-=dt;if(p.k!=='ring'){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=(p.k==='half'?1200:900)*dt;p.rot+=p.vr*dt}}
  S.parts=S.parts.filter(p=>p.life>0);
  
  // Adaptive particle limit based on performance
  const maxParticles = RM ? 200 : (S.DPR > 1 ? 400 : 520);
  if(S.parts.length>maxParticles)S.parts.splice(0,S.parts.length-maxParticles);
  
  for(const t of S.texts){t.life-=rdt;t.y+=t.vy*rdt}
  S.texts=S.texts.filter(t=>t.life>0);
  S.shake=Math.max(0,S.shake-rdt*60);S.flash=Math.max(0,S.flash-rdt*1.6);
}

let resizeTimeout = null;

export function resize(){
  const r=cv.getBoundingClientRect();S.W=Math.max(200,r.width);S.H=Math.max(300,r.height);S.DPR=Math.min(2,window.devicePixelRatio||1);
  cv.width=Math.round(S.W*S.DPR);cv.height=Math.round(S.H*S.DPR);buildBand();makeBg();$('#menu').style.paddingBottom=(S.H*.2+8)+'px';
}

function debouncedResize() {
  if (resizeTimeout) clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(resize, 300); // Debounce for 300ms
}

export function frame(now){
  const rdt=Math.min(.05,Math.max(0,(now-S.last)/1000));S.last=now;
  try{
    if(!S.paused)update(rdt);
    draw(now);
  }catch(err){
    console.error('Game loop error:', err);
    // Log structured error info for debugging
    console.error({
      timestamp: new Date().toISOString(),
      state: S.state,
      mode: S.mode,
      score: S.score,
      survived: S.survived,
      error: err.message,
      stack: err.stack
    });
    // In production, send to error tracking service (e.g., Sentry)
    // if (window.Sentry) window.Sentry.captureException(err);
  }
  requestAnimationFrame(frame);
}

export function boot(){
  S.diff=mkDiff('free');
  applyZone();
  resize(); // Initial resize
  if(window.ResizeObserver)new ResizeObserver(debouncedResize).observe($('#app'));else window.addEventListener('resize',debouncedResize);
  buildLegend();
  refreshMenu();
  if(!giftState().claimed&&(store.plays||0)>=1)openGift();
  requestAnimationFrame(frame);
  if(document.fonts&&document.fonts.load){document.fonts.load('40px "Bowlby One"').then(()=>{makeBg()}).catch(()=>{})};
}
