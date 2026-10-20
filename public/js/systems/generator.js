/* System: seeded gem wave generator. */
import { S } from '../model/state.js';
import { COL, TAU } from '../core/constants.js';
import { mulberry32 } from '../core/rng.js';
import { diffParams } from '../model/progression.js';
import { saveStore, store } from '../model/store.js';
import { gemR } from './band.js';
import { popBig } from '../view/fx.js';

export function createGen(seed,eff,opts){
  opts=opts||{};const r=mulberry32(seed),gn={t:-2.6,storm:false},P=diffParams(eff),lf=P.lf,hf=P.hf,hits=eff>=90?4:eff>=40?3:2,rampT=80-20*Math.min(1,hf/2.8);
  gn.step=function(){
    const t=gn.t,prog=Math.min(1,Math.max(0,t)/rampT),stormOn=eff>=30&&t>0&&(t%26)>=21,stormK=stormOn?1.35+.15*Math.min(1,(eff-30)/150):1;
    const sp=P.sp*(1+.7*prog)*stormK,out=[],roll=r(),mineP=(eff>=7&&!opts.noMine)?.01+.03*lf+.004*hf:0;
    if(roll<mineP){
      const n=eff>=100?8:eff>=50?7:6,gap=Math.floor(r()*n),gap2=r()<Math.max(.1,.5-.4*Math.min(1,(eff-7)/100))?(gap+1)%n:-1,vy=Math.min(1,(.2+r()*.08)*sp),ph=r()*TAU;
      for(let i=0;i<n;i++)out.push({t,x:.1+i*(.8/(n-1)),type:(i===gap||i===gap2)?'gem':'bomb',vy,ph,c:Math.floor(r()*4),sway:.012,sf:1.4,intro:i===0?'mine':null});
    }else if(roll<mineP+.26){
      const n=3+Math.floor(r()*3),cx=.28+r()*.44,vy=Math.min(1,(.2+r()*.1)*sp),ph=r()*TAU,bad=r()<.4+.2*lf?Math.floor(r()*n):-1,bt=r()<.5?'bomb':'dead';
      for(let i=0;i<n;i++)out.push({t,x:cx+(i-(n-1)/2)*.1,type:i===bad?bt:'gem',vy,ph,c:Math.floor(r()*4),sway:.012,sf:1.4,intro:null});
    }else{
      const q=r(),gold=opts.goldP!==undefined?opts.goldP:.05,mys=(opts.mysP&&t>1)?opts.mysP:(t>5?.045:0),bomb=(.10+prog*.08+lf*.035+hf*.016)*(opts.bombMul||1),dead=.12+prog*.08+lf*.03+hf*.012;
      let type='gem',intro=null;
      if(q<gold)type='gold';else if(q<gold+mys)type='mystery';else if(q<gold+mys+bomb)type='bomb';else if(q<gold+mys+bomb+dead)type='dead';
      if(type==='gem'){
        const sr=r(),pSp=eff>=3?.06+.07*lf+.01*hf:0,pAr=eff>=5?.07+.08*lf+.01*hf:0,pGh=eff>=9?.06+.07*lf+.01*hf:0;
        if(sr<pSp){type='speeder';intro='speeder'}
        else if(sr<pSp+pAr){type='armored';intro=hits>=4?'armor4':hits===3?'armor3':'armored'}
        else if(sr<pSp+pAr+pGh){type='ghost';intro='ghost'}
      }
      const f=r(),fx=f<.35?'time':f<.6?'x2':f<.8?'nova':'fever',drift=eff>=2&&r()<Math.min(.9,.18+.4*lf+.03*hf),base=Math.min(1,(.2+r()*.16)*sp);
      out.push({t,x:.1+r()*.8,type,vy:type==='speeder'?Math.min(1.15,base*1.5):base,ph:r()*TAU,c:Math.floor(r()*4),fx,sway:drift?.035+.07*lf+.01*hf:.012,sf:drift?2.4:1.4,intro,hits});
    }
    if(stormOn&&!gn.storm&&out.length)out[0].banner='STORM!';
    gn.storm=stormOn;
    gn.t+=Math.max(.16,(.42+r()*.34-prog*.16)*(1-.22*lf)*(1-.07*Math.min(hf,2.8)))*(opts.dens||1);
    return out;
  };
  return gn;
}
export function newGem(x0,type,vy,ph,c,age,fx,sway,sf,hits){const sc=(type==='bomb'||type==='dead')?1:S.diff.rs;return{x0,type,vy,ph,c,age,fx,sway:sway||.012,sf:sf||1.4,armor:type==='armored'?(hits||2):0,lastSnap:0,x:0,y:-99,r:gemR()*sc*(type==='gold'?1.15:type==='mystery'?1.1:1),alive:true,cut:false,minD:1e9,rot:Math.random()*TAU,spin:(Math.random()-.5)*1.6}}
const INTRO={speeder:'SPEEDER: FAST, WORTH MORE',armored:'ARMORED: SNAP IT TWICE',armor3:'ARMOR: THREE HITS',armor4:'ARMOR: FOUR HITS',ghost:'GHOST: FADES IN AND OUT',mine:'MINEFIELD: FIND THE GAP'};
function intro(k){if(!INTRO[k])return;store.seen=store.seen||{};if(store.seen[k])return;store.seen[k]=1;saveStore();popBig(INTRO[k],COL.lilac,.5)}
export function spawnDue(){let n=0;while(S.gen&&S.gen.t<=S.tg&&n++<30){for(const sp of S.gen.step()){S.gems.push(newGem(sp.x,sp.type,sp.vy,sp.ph,sp.c,S.tg-sp.t,sp.fx,sp.sway,sp.sf,sp.hits));if(S.state==='play'){if(sp.intro)intro(sp.intro);if(sp.banner)popBig(sp.banner,COL.coral,.5)}}}}
export function demoSpawn(rdt){
  S.demoT-=rdt;if(S.demoT>0)return;S.demoT=.28+Math.random()*.22;
  // Keep a steady stream on the title screen so the demo reads as an active game,
  // even when the menu's automatic snap clears a wave near the band.
  if(Math.random()<.48){
    const n=3+Math.floor(Math.random()*3),cx=.2+Math.random()*.6,vy=.25+Math.random()*.08,ph=Math.random()*TAU;
    for(let i=0;i<n;i++)S.gems.push(newGem(Math.max(.06,Math.min(.94,cx+(i-(n-1)/2)*.09)),'gem',vy,ph,Math.floor(Math.random()*4),0));
  }else{
    const q=Math.random(),type=q<.05?'gold':q<.11?'bomb':q<.16?'dead':q<.22?'mystery':'gem';
    S.gems.push(newGem(.06+Math.random()*.88,type,.24+Math.random()*.12,Math.random()*TAU,Math.floor(Math.random()*4),0,'time'));
  }
}
