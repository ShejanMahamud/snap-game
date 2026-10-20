/* System: boss behaviour. */
import { S } from '../model/state.js';
import { COL, RM, TAU } from '../core/constants.js';
import { newGem } from './generator.js';
import { mulNow } from './slicing.js';
import { haptic, sfxCrack, sfxLevel } from '../view/audio.js';
import { burst, popText, ring } from '../view/fx.js';

export function spawnBoss(){
  const d=S.stage;
  
  // Validate viewport dimensions
  if (S.W < 100 || S.H < 100) {
    console.warn('Viewport too small for boss spawn');
    return;
  }
  
  const hp=d.hp,r=Math.max(40,Math.min(72,Math.min(S.W,S.H)*.11));
  const g=newGem(.5,'boss',0,Math.random()*TAU,d.world%4,0,null,0,1,hp);
  g.armor=hp;g.maxHp=hp;g.r=r;g.baseSpd=.85+.035*d.world;g.hit=0;g.bt=2.6;g.y=-r*2;
  S.gems.push(g);
}
export function moveBoss(g,dt){
  const en=g.armor<=g.maxHp*.5,k=Math.min(1,g.age/1.2);
  g.ph+=g.baseSpd*(en?1.45:1)*dt;
  g.x=S.W/2+Math.sin(g.ph)*(S.W/2-g.r-8);
  
  // Adaptive Y positioning based on aspect ratio
  const aspectRatio = S.W / S.H;
  const targetY = aspectRatio > 0.7 ? S.H*.31 : S.H*.25; // Lower on portrait
  
  g.y=-g.r*2+(targetY+g.r*2)*(1-Math.pow(1-k,3))+Math.sin(g.age*2.6)*5;
  g.rot=Math.sin(g.age*1.9)*.08;g.hit=Math.max(0,g.hit-dt);
  g.bt-=dt;
  if(g.bt<=0&&k>=1&&S.state==='play'){
    g.bt=Math.max(1.3,(2.9-.06*S.stage.world)*(en?.7:1));
    const b=newGem(g.x/S.W,'bomb',.3+.008*S.stage.world,Math.random()*TAU,0,0);b.y0=g.y+g.r*.7;S.gems.push(b);
  }
}
export function bossHit(g,n){
  const play=S.state==='play',q=S.snap&&S.snap.quiet;
  
  // Prevent multiple hits from same snap
  if (g.lastSnap === S.snapSeq) return;
  g.lastSnap = S.snapSeq;
  
  g.armor=Math.max(0,g.armor-n);g.hit=.25;
  burst(g.x,g.y,'#fff',16,360);ring(g.x,g.y,g.r,COL.lemon);
  if(play){S.score+=100*n*mulNow();popText(g.x,g.y-g.r*1.9,n>1?'-'+n:'HIT','#fff',28)}
  S.shake=Math.max(S.shake,RM?0:10);S.slowT=Math.max(S.slowT,.12);
  if(!q){sfxCrack();haptic(25)}
  if(g.armor<=0&&g.alive){g.alive=false;g.cut=true;bossDown(g)}
}
function bossDown(g){
  S.bossDead=true;
  burst(g.x,g.y,COL.lemon,60,620);burst(g.x,g.y,'#fff',30,480);ring(g.x,g.y,g.r,COL.lemon);ring(g.x,g.y,g.r*1.6,'#fff');
  for(const o of S.gems)if(o.alive&&o!==g){o.alive=false;burst(o.x,o.y,o.type==='bomb'?COL.coral:'#fff',8,260)}
  S.shake=RM?0:30;S.flash=.7;S.flashCol='#fff';S.slowT=Math.max(S.slowT,.8);
  if(S.state==='play')S.score+=1000*mulNow();
  sfxLevel();haptic([40,30,80]);
}
