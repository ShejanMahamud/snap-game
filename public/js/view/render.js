/* View: canvas drawing. */
import { S } from '../model/state.js';
import { COL, FEVER_LEN, F_D, F_M, GEMCOLS, RM, TAU, TBAR } from '../core/constants.js';
import { ctx } from '../core/dom.js';
import { GOALS } from '../model/campaign.js';
import { SKINS, skinIdx } from '../model/progression.js';
import { maxDepth, predict } from '../systems/band.js';
import { stageMetric } from '../systems/stageRules.js';

export function drawDots(c,w,h){const s=24;c.fillStyle='rgba(255,255,255,.07)';for(let y=0,row=0;y<h+s;y+=s,row++)for(let x=(row%2)*s/2;x<w+s;x+=s){c.beginPath();c.arc(x,y,1+(y/h)*3.2,0,TAU);c.fill()}}
export function stageGrad(c,h){const g=c.createLinearGradient(0,0,0,h);g.addColorStop(0,S.COL_TOP);g.addColorStop(1,S.COL_BOT);return g}
export function makeBg(){
  S.bgc=document.createElement('canvas');S.bgc.width=Math.round(S.W*S.DPR);S.bgc.height=Math.round(S.H*S.DPR);
  const c=S.bgc.getContext('2d');c.scale(S.DPR,S.DPR);c.fillStyle=stageGrad(c,S.H);c.fillRect(0,0,S.W,S.H);
  const rg=c.createRadialGradient(S.W/2,S.H*.3,10,S.W/2,S.H*.3,Math.max(S.W,S.H)*.7);rg.addColorStop(0,'rgba(255,255,255,.14)');rg.addColorStop(1,'rgba(255,255,255,0)');c.fillStyle=rg;c.fillRect(0,0,S.W,S.H);
  drawDots(c,S.W,S.H);
}
function hexPath(c,r){c.beginPath();for(let i=0;i<6;i++){const a=i/6*TAU;c.lineTo(Math.cos(a)*r,Math.sin(a)*r)}c.closePath()}
export function txt(c,s,x,y,size,col,align,font,stroke,sw){
  c.font=size+'px '+(font||F_D);c.textAlign=align||'left';c.textBaseline='alphabetic';
  if(stroke!==null){c.lineWidth=sw||6;c.strokeStyle=stroke||COL.ink;c.lineJoin='round';c.strokeText(s,x,y)}
  c.fillStyle=col;c.fillText(s,x,y);
}
export function drawGem(c,type,x,y,r,rot,ci,t,armor){
  c.save();c.translate(x,y);c.lineJoin='round';
  if(type==='gem'){
    c.rotate(rot);hexPath(c,r);c.fillStyle=GEMCOLS[ci%4];c.fill();
    c.fillStyle='rgba(255,255,255,.42)';c.beginPath();c.moveTo(0,0);c.lineTo(Math.cos(TAU*4/6)*r,Math.sin(TAU*4/6)*r);c.lineTo(Math.cos(TAU*5/6)*r,Math.sin(TAU*5/6)*r);c.closePath();c.fill();
    c.fillStyle='rgba(14,16,56,.22)';c.beginPath();c.moveTo(0,0);c.lineTo(r,0);c.lineTo(Math.cos(TAU/6)*r,Math.sin(TAU/6)*r);c.closePath();c.fill();
    hexPath(c,r);c.lineWidth=2.5;c.strokeStyle=COL.ink;c.stroke();
  }else if(type==='gold'){
    c.rotate(rot*.3);c.shadowColor='#FFD400';c.shadowBlur=r*.9;
    c.beginPath();for(let i=0;i<16;i++){const a=i/16*TAU,rr=i%2?r*.68:r*1.05;c.lineTo(Math.cos(a)*rr,Math.sin(a)*rr)}c.closePath();
    const g=c.createRadialGradient(-r*.25,-r*.3,1,0,0,r*1.05);g.addColorStop(0,'#FFFBD0');g.addColorStop(.5,COL.gold);g.addColorStop(1,'#E08A00');c.fillStyle=g;c.fill();
    c.shadowBlur=0;c.lineWidth=2.5;c.strokeStyle=COL.ink;c.stroke();
    const s=r*(.34+.08*Math.sin(t*9));c.fillStyle='#fff';c.beginPath();c.moveTo(-r*.3,-r*.5-s);c.quadraticCurveTo(-r*.3,-r*.5,-r*.3+s,-r*.5);c.quadraticCurveTo(-r*.3,-r*.5,-r*.3,-r*.5+s);c.quadraticCurveTo(-r*.3,-r*.5,-r*.3-s,-r*.5);c.closePath();c.fill();
  }else if(type==='mystery'){
    c.rotate(Math.sin(t*3)*.15);const hh=(t*180)%360;
    const gr=c.createRadialGradient(-r*.3,-r*.3,1,0,0,r);gr.addColorStop(0,'#fff');gr.addColorStop(.35,'hsl('+hh.toFixed(0)+',95%,65%)');gr.addColorStop(1,'hsl('+((hh+80)%360).toFixed(0)+',90%,45%)');
    c.beginPath();c.arc(0,0,r,0,TAU);c.fillStyle=gr;c.fill();c.lineWidth=2.5;c.strokeStyle=COL.ink;c.stroke();
    txt(c,'?',0,r*.4,r*1.3,'#fff','center',F_D,COL.ink,4);
  }else if(type==='speeder'){
    c.lineCap='round';c.lineWidth=3;
    for(let i=-1;i<=1;i++){c.strokeStyle='rgba(124,243,255,'+(i===0?.75:.4)+')';c.beginPath();c.moveTo(i*r*.5,-r*1.1);c.lineTo(i*r*.5,-r*(1.7+(i===0?.6:0)));c.stroke()}
    c.save();c.rotate(rot*.4);hexPath(c,r);c.fillStyle='#7CF3FF';c.fill();
    c.fillStyle='rgba(255,255,255,.5)';c.beginPath();c.moveTo(0,0);c.lineTo(Math.cos(TAU*4/6)*r,Math.sin(TAU*4/6)*r);c.lineTo(Math.cos(TAU*5/6)*r,Math.sin(TAU*5/6)*r);c.closePath();c.fill();
    hexPath(c,r);c.lineWidth=2.5;c.strokeStyle=COL.ink;c.stroke();c.restore();
    c.fillStyle=COL.ink;c.beginPath();c.moveTo(r*.2,-r*.62);c.lineTo(-r*.38,r*.1);c.lineTo(-r*.02,r*.1);c.lineTo(-r*.2,r*.62);c.lineTo(r*.38,-r*.1);c.lineTo(r*.02,-r*.1);c.closePath();c.fill();
  }else if(type==='armored'){
    const cr=armor===1;
    c.save();c.rotate(rot*.3);hexPath(c,r);c.fillStyle=cr?'#B7BEE3':'#8E97C7';c.fill();
    hexPath(c,r*.68);c.fillStyle=cr?'#D3D8F2':'#B7BEE3';c.fill();c.lineWidth=2;c.strokeStyle=COL.ink;c.stroke();
    hexPath(c,r);c.lineWidth=4;c.strokeStyle=COL.ink;c.stroke();
    c.fillStyle=COL.ink;for(let i=0;i<6;i++){const a=i/6*TAU;c.beginPath();c.arc(Math.cos(a)*r*.84,Math.sin(a)*r*.84,2,0,TAU);c.fill()}
    c.restore();
    c.fillStyle=COL.ink;
    if(cr){c.fillRect(-r*.06,-r*.24,r*.12,r*.48);c.strokeStyle=COL.ink;c.lineWidth=2.5;c.lineCap='round';c.beginPath();c.moveTo(-r*.1,-r*.92);c.lineTo(r*.18,-r*.4);c.lineTo(-r*.28,0);c.lineTo(r*.22,r*.5);c.lineTo(-r*.05,r*.92);c.stroke()}
    else{const nb=armor||2;for(let i=0;i<nb;i++)c.fillRect((i-(nb-1)/2)*r*.3-r*.06,-r*.24,r*.12,r*.48)}
  }else if(type==='ghost'){
    c.globalAlpha=.22+.78*Math.abs(Math.sin(t*2.2));c.rotate(Math.sin(t*1.7)*.2);
    hexPath(c,r);c.fillStyle='#E6D9FF';c.fill();
    c.fillStyle='rgba(255,255,255,.65)';c.beginPath();c.moveTo(0,0);c.lineTo(Math.cos(TAU*4/6)*r,Math.sin(TAU*4/6)*r);c.lineTo(Math.cos(TAU*5/6)*r,Math.sin(TAU*5/6)*r);c.closePath();c.fill();
    hexPath(c,r);c.lineWidth=2.5;c.setLineDash([4,3]);c.strokeStyle='#fff';c.stroke();c.setLineDash([]);
    c.fillStyle=COL.ink;c.beginPath();c.arc(-r*.28,-r*.05,r*.12,0,TAU);c.fill();c.beginPath();c.arc(r*.28,-r*.05,r*.12,0,TAU);c.fill();
    c.beginPath();c.arc(0,r*.28,r*.16,0,Math.PI);c.fill();
  }else if(type==='bomb'){
    c.beginPath();c.arc(0,0,r*.92,0,TAU);c.fillStyle=COL.ink;c.fill();c.lineWidth=3;c.strokeStyle=COL.coral;c.stroke();
    c.strokeStyle='rgba(255,255,255,.28)';c.lineWidth=3;c.beginPath();c.arc(0,0,r*.66,Math.PI*1.1,Math.PI*1.55);c.stroke();
    c.strokeStyle=COL.coral;c.lineWidth=3.5;c.lineCap='round';const e=r*.28;c.beginPath();c.moveTo(-e,-e*.5);c.lineTo(e,e*1.5);c.moveTo(e,-e*.5);c.lineTo(-e,e*1.5);c.stroke();
    c.strokeStyle='#C9B8A0';c.lineWidth=3;c.beginPath();c.moveTo(r*.45,-r*.78);c.quadraticCurveTo(r*.8,-r*1.2,r*1.05,-r*1.05);c.stroke();
    const sp=3.5+Math.sin(t*34)*1.5;c.fillStyle=COL.lemon;c.beginPath();c.arc(r*1.05,-r*1.05,sp,0,TAU);c.fill();c.fillStyle=COL.coral;c.beginPath();c.arc(r*1.05,-r*1.05,sp*.5,0,TAU);c.fill();
  }else{
    c.rotate(rot*.5);c.globalAlpha=.92;hexPath(c,r);c.fillStyle='#69709F';c.fill();
    c.fillStyle='rgba(14,16,56,.28)';c.beginPath();c.moveTo(0,0);c.lineTo(r,0);c.lineTo(Math.cos(TAU/6)*r,Math.sin(TAU/6)*r);c.closePath();c.fill();
    c.strokeStyle=COL.ink;c.lineWidth=2;c.beginPath();c.moveTo(-r*.1,-r*.9);c.lineTo(r*.12,-r*.3);c.lineTo(-r*.2,r*.1);c.lineTo(r*.15,r*.8);c.stroke();
    hexPath(c,r);c.setLineDash([5,4]);c.lineWidth=2.5;c.strokeStyle=COL.ink;c.stroke();c.setLineDash([]);
  }
  c.restore();
}
export function drawHalf(c,type,x,y,r,rot,ci,side,t){
  c.save();c.translate(x,y);c.rotate(rot);c.beginPath();c.rect(side>0?0:-r*2.6,-r*2.6,r*2.6,r*5.2);c.clip();drawGem(c,type,0,0,r,0,ci,t);c.restore();
}
function bandPath(c,uu){c.beginPath();for(let i=0;i<S.N;i++){const x=i*S.dx,y=S.restY+uu[i];i?c.lineTo(x,y):c.moveTo(x,y)}}
function bar(c,x,y,w,h,f,col,right){
  c.fillStyle='rgba(14,16,56,.55)';c.fillRect(right?x-w:x,y,w,h);c.fillStyle=col;c.fillRect(right?x-w:x,y,w*Math.max(0,Math.min(1,f)),h);
}
function starPath(c,x,y,r){c.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,rr=i%2?r*.45:r;c.lineTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr)}c.closePath()}
function hudStar(c,x,y,r,on){starPath(c,x,y,r);c.fillStyle=on?COL.gold:'rgba(255,255,255,.28)';c.fill();c.lineWidth=1.5;c.lineJoin='round';c.strokeStyle=COL.ink;c.stroke()}
function drawStageHud(c,m){
  const d=S.stage;if(!d)return;
  const x=m,y=m+54,bw=110;
  if(d.boss){
    const f=Math.max(0,S.timeLeft)/d.time,proj=f>=.6?3:f>=.3?2:1;
    for(let i=0;i<3;i++)hudStar(c,x+8+i*22,y+10,8,i<proj);
    return;
  }
  const mt=stageMetric(),g=d.goal;
  bar(c,x,y,bw,7,mt/g[2],COL.lemon,false);
  for(let i=0;i<3;i++){const px=Math.max(x+7,Math.min(x+bw-7,x+bw*g[i]/g[2]));hudStar(c,px,y+20,6.5,mt>=g[i])}
  let nx=g[2];for(let i=0;i<3;i++)if(g[i]>mt){nx=g[i];break}
  txt(c,Math.min(mt,99999).toLocaleString()+' / '+nx.toLocaleString()+' '+GOALS[d.kind].unit,x,y+44,10,'rgba(255,255,255,.9)','left',F_M,null);
}
function drawBoss(c,g,t){
  const r=g.r,en=g.armor<=g.maxHp*.5,fl=g.hit>0;
  c.save();c.translate(g.x,g.y);c.rotate(g.rot);c.lineJoin='round';c.lineCap='round';
  c.beginPath();c.moveTo(-r*.62,-r*.8);c.lineTo(-r*.52,-r*1.28);c.lineTo(-r*.2,-r*.98);c.lineTo(0,-r*1.38);c.lineTo(r*.2,-r*.98);c.lineTo(r*.52,-r*1.28);c.lineTo(r*.62,-r*.8);c.closePath();
  c.fillStyle=COL.gold;c.fill();c.lineWidth=3;c.strokeStyle=COL.ink;c.stroke();
  hexPath(c,r);c.fillStyle=fl?'#fff':GEMCOLS[g.c%4];c.fill();
  hexPath(c,r*.74);c.fillStyle=fl?'#fff':'rgba(14,16,56,.26)';c.fill();
  hexPath(c,r);c.lineWidth=5;c.strokeStyle=COL.ink;c.stroke();
  for(const s of[-1,1]){
    c.beginPath();c.arc(s*r*.3,-r*.08,r*.17,0,TAU);c.fillStyle='#fff';c.fill();c.lineWidth=3;c.strokeStyle=COL.ink;c.stroke();
    c.beginPath();c.arc(s*r*.3+Math.sin(t*2)*r*.04,-r*.06,r*.07,0,TAU);c.fillStyle=en?COL.coral:COL.ink;c.fill();
    c.lineWidth=4;c.strokeStyle=COL.ink;c.beginPath();c.moveTo(s*r*.5,-r*(en?.42:.34));c.lineTo(s*r*.12,-r*(en?.26:.34));c.stroke();
  }
  c.beginPath();c.moveTo(-r*.3,r*.34);c.lineTo(-r*.15,r*.25);c.lineTo(0,r*.34);c.lineTo(r*.15,r*.25);c.lineTo(r*.3,r*.34);c.lineWidth=4;c.strokeStyle=COL.ink;c.stroke();
  c.restore();
  const bw=r*2.2,bx=g.x-bw/2,by=g.y-r*1.38-20,f=Math.max(0,g.armor)/g.maxHp;
  c.fillStyle='rgba(14,16,56,.75)';c.fillRect(bx-3,by-3,bw+6,13);
  c.fillStyle=f>.5?COL.mint:f>.25?COL.lemon:COL.coral;c.fillRect(bx,by,bw*f,7);
}
export function draw(now){
  const t=now/1000;
  ctx.setTransform(S.DPR,0,0,S.DPR,0,0);
  ctx.drawImage(S.bgc,0,0,S.W,S.H);
  if(S.fever>0){ctx.fillStyle='rgba(255,62,134,'+(.1+.06*Math.sin(t*10)).toFixed(3)+')';ctx.fillRect(0,0,S.W,S.H)}
  if(S.mode==='hard'&&S.state!=='menu'){ctx.fillStyle='rgba(120,0,50,.16)';ctx.fillRect(0,0,S.W,S.H)}
  ctx.save();
  if(S.shake>0)ctx.translate((Math.random()-.5)*S.shake,(Math.random()-.5)*S.shake);
  if(S.hold&&S.hold.depth>22){
    if(!S.pred||Math.abs(S.pred.gx-S.hold.gx)>3||Math.abs(S.pred.d-S.hold.depth)>3)S.pred={gx:S.hold.gx,d:S.hold.depth,mn:predict(S.hold.gx,S.hold.depth)};
    const mn=S.pred.mn;
    ctx.beginPath();ctx.moveTo(0,S.restY);let any=false;
    for(let i=0;i<S.N;i++){const y=S.restY+Math.min(0,mn[i]);ctx.lineTo(i*S.dx,y);if(mn[i]<-6)any=true}
    ctx.lineTo(S.W,S.restY);ctx.closePath();ctx.fillStyle='rgba(61,242,176,.10)';ctx.fill();
    if(any){ctx.beginPath();for(let i=0;i<S.N;i++){const y=S.restY+Math.min(0,mn[i]);i?ctx.lineTo(i*S.dx,y):ctx.moveTo(i*S.dx,y)}ctx.setLineDash([8,7]);ctx.lineWidth=2.5;ctx.strokeStyle=COL.mint;ctx.stroke();ctx.setLineDash([])}
  }
  for(const g of S.gems)if(g.alive&&g.type==='boss')drawBoss(ctx,g,t);
  const tw=S.mode==='stage'&&S.stage&&S.state!=='menu'?S.stage.twist:null;
  for(const g of S.gems)if(g.alive&&g.type!=='boss'){
    let a=1;
    if(tw){
      if(tw.fog)a=Math.max(0,Math.min(1,(g.y/S.H-tw.fog*.35)/.18));
      if(tw.blink&&Math.sin(g.age*3.2+g.ph)<-.2)a=Math.min(a,.12);
    }
    if(a<1){if(a<=0)continue;ctx.globalAlpha=a}
    drawGem(ctx,g.type,g.x,g.y,g.r,g.rot,g.c,t+g.ph,g.armor);
    ctx.globalAlpha=1;
  }
  // band, styled by the equipped skin; rainbow during fever
  const sk=SKINS[skinIdx()],rb=sk.rainbow||S.fever>0,hh=((t*240)%360).toFixed(0);
  const stretch=S.hold?Math.min(1,S.hold.depth/maxDepth()):0,lw=8-3.5*stretch;
  const core=rb?'hsl('+hh+',100%,82%)':sk.core,g1=rb?'hsla('+hh+',100%,60%,.22)':'rgba('+sk.glow+',.22)',g2=rb?'hsla('+hh+',100%,60%,.55)':'rgba('+sk.glow+',.55)';
  ctx.lineCap='round';ctx.lineJoin='round';
  if(S.trail.length&&!RM){for(let k=0;k<S.trail.length;k++){bandPath(ctx,S.trail[k]);ctx.lineWidth=5;ctx.strokeStyle='rgba(255,241,207,'+(.05+.07*k).toFixed(2)+')';ctx.stroke()}}
  bandPath(ctx,S.u);
  ctx.lineWidth=lw+16;ctx.strokeStyle=g1;ctx.stroke();
  ctx.lineWidth=lw+8;ctx.strokeStyle=g2;ctx.stroke();
  ctx.lineWidth=lw;ctx.strokeStyle=core;ctx.stroke();
  if(S.kbMarker>0&&!S.hold&&(S.state==='play'||S.state==='menu')){ctx.fillStyle='rgba(61,242,176,'+Math.min(1,S.kbMarker).toFixed(2)+')';ctx.beginPath();ctx.moveTo(S.kbX,S.restY-14);ctx.lineTo(S.kbX-9,S.restY-30);ctx.lineTo(S.kbX+9,S.restY-30);ctx.closePath();ctx.fill()}
  for(const px of[0,S.W]){ctx.beginPath();ctx.arc(px,S.restY,15,0,TAU);ctx.fillStyle=COL.lemon;ctx.fill();ctx.lineWidth=3;ctx.strokeStyle=COL.ink;ctx.stroke()}
  if(S.hold){const hy=S.restY+(S.hold.depth?S.u[Math.max(0,Math.min(S.N-1,Math.round(S.hold.gx/S.dx)))]:0);ctx.beginPath();ctx.arc(S.hold.gx,hy,16+stretch*6,0,TAU);ctx.lineWidth=3;ctx.strokeStyle='rgba(255,255,255,.85)';ctx.stroke()}
  for(const p of S.parts){
    const a=Math.max(0,Math.min(1,p.life/p.max*1.6));
    if(p.k==='shard'){ctx.save();ctx.globalAlpha=a;ctx.translate(p.x,p.y);ctx.rotate(p.rot);ctx.fillStyle=p.col;ctx.beginPath();ctx.moveTo(-p.size,-p.size*.5);ctx.lineTo(p.size,0);ctx.lineTo(-p.size*.3,p.size*.8);ctx.closePath();ctx.fill();ctx.restore()}
    else if(p.k==='ring'){const k=1-p.life/p.max;ctx.beginPath();ctx.arc(p.x,p.y,p.r0+(p.r1-p.r0)*k,0,TAU);ctx.lineWidth=4*(1-k)+1;ctx.strokeStyle=p.col;ctx.globalAlpha=1-k;ctx.stroke();ctx.globalAlpha=1}
    else{ctx.save();ctx.globalAlpha=a;drawHalf(ctx,p.type,p.x,p.y,p.r,p.rot,p.c,p.side,t);ctx.restore()}
  }
  ctx.restore();
  for(const tx of S.texts){
    const age=tx.max-tx.life,pop=1+.4*Math.max(0,1-age*7),a=Math.min(1,tx.life/(tx.max*.35));
    let fit=1;if(tx.big){ctx.font=tx.size+'px '+F_D;const tw=ctx.measureText(tx.s).width;if(tw>S.W*.9)fit=S.W*.9/tw}
    ctx.save();ctx.globalAlpha=a;ctx.translate(tx.x,tx.y);ctx.scale(pop*fit,pop*fit);txt(ctx,tx.s,0,0,tx.size,tx.col,'center',F_D,COL.ink,tx.big?9:6);ctx.restore();
  }
  if(S.state==='play'||S.state==='ending'){
    const m=Math.max(18,S.W*.04),secs=Math.max(0,Math.ceil(S.timeLeft)),low=S.timeLeft<=5&&S.fever<=0;
    txt(ctx,S.score.toLocaleString(),m,m+44,Math.min(40,S.W*.1),'#fff','left',F_D,COL.ink,6);
    if(S.bestRef>0)bar(ctx,m,m+54,90,5,S.beatBest?1:S.score/S.bestRef,S.beatBest?COL.mint:COL.lemon,false);
    if(S.mode==='hard')txt(ctx,'HARD',m,m+78,11,COL.coral,'left',F_M,null);
    if(S.mode==='stage')drawStageHud(ctx,m);
    const pulse=(low?1+.08*Math.sin(t*14):1)+S.timerPulse*.4,tcol=S.fever>0?COL.glow:low?COL.coral:S.timerPulse>0?COL.mint:COL.lemon;
    ctx.save();ctx.translate(S.W/2,m+46);ctx.scale(pulse,pulse);txt(ctx,S.fever>0?'FEVER':String(secs),0,0,S.fever>0?40:54,tcol,'center',F_D,COL.ink,7);ctx.restore();
    const bw=Math.min(S.W*.36,200);
    if(S.fever>0)bar(ctx,S.W/2-bw/2,m+60,bw,8,S.fever/FEVER_LEN,COL.glow,false);
    else bar(ctx,S.W/2-bw/2,m+60,bw,8,S.timeLeft/(S.mode==='stage'&&S.stage?S.stage.time:TBAR),low?COL.coral:COL.lemon,false);
    if(S.combo>0){
      // Cap multiplier display to prevent infinity
      const mult=Math.min(2048, Math.min(16,Math.pow(2,Math.min(S.combo,4))));
      txt(ctx,'x'+mult,S.W-m,m+44,Math.min(46,S.W*.11)+Math.min(8,S.combo),mult>=16?COL.glow:COL.mint,'right',F_D,COL.ink,6);
    }
    if(S.fever<=0)bar(ctx,S.W-m,m+54,90,5,S.feverM,COL.glow,true);
    if(S.x2T>0)txt(ctx,'x2 '+Math.ceil(S.x2T)+'s',S.W-m,m+80,16,COL.lemon,'right',F_D,COL.ink,4);
    if(S.hintT>0&&S.state==='play')txt(ctx,'Drag down anywhere, then let go',S.W/2,S.H-60,15,'rgba(255,255,255,.9)','center',F_M,COL.ink,4);
  }
  if(S.state==='play'&&S.timeLeft<=5.05&&S.timeLeft>0&&S.fever<=0){const a=.2+.1*Math.sin(t*14),vg=ctx.createRadialGradient(S.W/2,S.H/2,Math.min(S.W,S.H)*.3,S.W/2,S.H/2,Math.max(S.W,S.H)*.75);vg.addColorStop(0,'rgba(255,62,62,0)');vg.addColorStop(1,'rgba(255,62,62,'+a.toFixed(3)+')');ctx.fillStyle=vg;ctx.fillRect(0,0,S.W,S.H)}
  if(S.flash>0){ctx.globalAlpha=Math.min(.6,S.flash)*(RM?.4:1);ctx.fillStyle=S.flashCol;ctx.fillRect(0,0,S.W,S.H);ctx.globalAlpha=1}
}
