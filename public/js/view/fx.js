/* View: particles and floating text. */
import { S } from '../model/state.js';
import { TAU } from '../core/constants.js';

export function popText(x,y,s,col,size,life){life=life||.9;S.texts.push({x,y,vy:-60,life,max:life,s,col,size:size||26})}
export function popBig(s,col,yf){S.texts.push({x:S.W/2,y:S.H*(yf||.34),vy:-16,life:1,max:1,s,col:col||'#fff',size:Math.min(yf?40:54,S.W*(yf?.095:.115)),big:true})}
export function burst(x,y,col,n,spd){for(let i=0;i<n;i++){const a=Math.random()*TAU,s=(.3+Math.random())*spd;S.parts.push({k:'shard',x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-80,rot:Math.random()*TAU,vr:(Math.random()-.5)*14,life:.7+Math.random()*.4,max:1.1,size:4+Math.random()*7,col})}}
export function ring(x,y,r,col){S.parts.push({k:'ring',x,y,r0:r*.6,r1:r*2.8,life:.32,max:.32,col})}
export function halves(g){for(const side of[-1,1])S.parts.push({k:'half',x:g.x,y:g.y,vx:side*(90+Math.random()*80),vy:-120-Math.random()*80,rot:g.rot,vr:side*(3+Math.random()*3),life:.9,max:.9,side,type:g.type,c:g.c,r:g.r})}
