/* Model: 200 stages in 20 worlds, goals and star rules. */
import { twistFor } from './twists.js';
import { S } from './state.js';
import { mulberry32 } from '../core/rng.js';
import { store } from './store.js';

export const STAGES=200;
export const WORLDS=['Cobalt Cove','Teal Tides','Violet Vale','Rose Ridge','Ember Dunes','Jade Grove','Midnight Sky','Crimson Cliffs','Amethyst Hollow','Scarlet Rift','Moss Maze','Azure Abyss','Orchid Orbit','Peach Peaks','Indigo Isles','Magenta Mines','Emerald Temple','Blaze Basin','Plum Palace','The Black Hole'];
export const BOSSES=['Gloop','Frostjaw','Voltus','Rosethorn','Magmaw','Mossback','Nightowl','Cragfang','Hexmother','Redwing','Thornlord','Abyssa','Orbitron','Peachpit','Isleking','Mineshaft','Temple Guard','Blazor','Plumbeard','The Void'];
export const GOALS={
  gems:{txt:n=>'Cut '+n+' gems',short:n=>n+' gems',label:'Gems cut',unit:'gems'},
  score:{txt:n=>'Score '+n.toLocaleString()+' points',short:n=>n.toLocaleString()+' pts',label:'Score',unit:'pts'},
  snap:{txt:n=>'Slice '+n+' gems in one snap',short:n=>n+' in one snap',label:'Best snap',unit:'snap'},
  combo:{txt:n=>'Build a '+n+' gem combo',short:n=>n+' combo',label:'Best combo',unit:'combo'},
  gold:{txt:n=>'Catch '+n+' gold gem'+(n>1?'s':''),short:n=>n+' gold',label:'Gold caught',unit:'gold'},
  mystery:{txt:n=>'Open '+n+' mystery gem'+(n>1?'s':''),short:n=>n+' mystery',label:'Mystery opened',unit:'mystery'},
  fever:{txt:n=>'Trigger Fever '+n+(n>1?' times':' time'),short:n=>n+'x fever',label:'Fevers',unit:'fever'}
};
const KIND_MIN={gems:1,score:1,snap:4,combo:5,gold:6,mystery:8,fever:9};
export function stageWorld(n){return Math.floor((n-1)/10)}
function stageEff(n){return Math.min(260,1+(n-1)*.7)}

// Cache for stage seeds from server
const seedCache = {};

// Fetch stage seed from server (with fallback to deterministic)
async function getStageSeed(n) {
  // Check cache first
  if (seedCache[n]) return seedCache[n];
  
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1200);
    let response;
    try {
      response = await fetch(`/api/stage/seed?stage=${n}`, { cache: 'force-cache', signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }
    if (response.ok) {
      const data = await response.json();
      seedCache[n] = data.seed;
      return data.seed;
    }
  } catch (e) {
    console.warn('Failed to fetch stage seed from server, using fallback:', e);
  }
  
  // Fallback to deterministic seed (better than before but still predictable)
  // This is only used if server is unavailable
  return stageSeedFallback(n);
}

// Fallback deterministic seed (improved but still predictable)
function stageSeedFallback(n){
  let h=(2166136261^(n*2654435761))>>>0;
  h=Math.imul(h^h>>>15,0x2c1b3c6d);
  h=Math.imul(h^h>>>12,0x297a2d39);
  return(h^h>>>15)>>>0;
}
function buildKinds(){
  S.KINDS=[];let prev='';
  for(let n=1;n<=STAGES;n++){
    if(n%10===0){S.KINDS.push('boss');continue}
    const r=mulberry32(stageSeedFallback(n)^0x9e3779b9),pool=[];
    for(const k in KIND_MIN)if(n>=KIND_MIN[k]){const w=(k==='gems'||k==='score')?3:2;for(let i=0;i<w;i++)pool.push(k)}
    let k=n<=3?'gems':pool[Math.floor(r()*pool.length)];
    for(let a=0;a<4&&k===prev&&n>3;a++)k=pool[Math.floor(r()*pool.length)];
    S.KINDS.push(k);prev=k;
  }
}
const EFFP=[1,10,30,60,100,140];
const BASE={gems:[55,50,45,42,40,38],score:[8000,9000,10000,11000,12000,12000],snap:[5,5,6,6,6,6],combo:[12,14,16,16,16,16],gold:[3,3,3,3,3,3],mystery:[3,3,3,3,3,3],fever:[2,2,2,2,2,2]};
function thresholds(kind,eff,time,n){
  const arr=BASE[kind];let i=0;while(i<EFFP.length-2&&eff>EFFP[i+1])i++;
  const t=Math.max(0,Math.min(1,(eff-EFFP[i])/(EFFP[i+1]-EFFP[i])));
  let med=arr[i]+(arr[i+1]-arr[i])*t;
  if(kind!=='snap'&&kind!=='combo')med*=time/40;
  const ease=n<=6?.7:1,f=[.5,.8,1.1],MIN={gems:[6,9,12],score:[400,800,1200],snap:[3,4,5],combo:[4,6,9],gold:[1,2,3],mystery:[1,2,3],fever:[1,2,3]}[kind],out=[];
  const q=kind==='score'?(med>4000?100:50):1;
  for(let k=0;k<3;k++){let v=Math.round(med*f[k]*ease/q)*q;v=Math.max(MIN[k],v,k?out[k-1]+1:0);out.push(v)}
  return out;
}
export async function stageDef(n){
  n=Math.max(1,Math.min(STAGES,n|0));
  if(!S.KINDS)buildKinds();
  const world=stageWorld(n),eff=stageEff(n),kind=S.KINDS[n-1],seed=await getStageSeed(n),tw=twistFor(world);
  if(kind==='boss')return{n,world,eff,kind,boss:true,bossName:BOSSES[world],time:45,hp:8+Math.round(world*.9),goal:[1,1,1],seed,twist:tw,opts:{noMine:true,dens:1.7*(tw&&tw.dens||1),bombMul:tw&&tw.bombMul}};
  const time=n<=5?40:30+5*Math.floor(mulberry32(seed^0x1234567)()*4);
  const opts=kind==='gold'?{goldP:.2}:kind==='mystery'?{mysP:.16}:kind==='fever'?{goldP:.1}:{};
  if(tw){opts.dens=tw.dens;opts.bombMul=tw.bombMul}
  return{n,world,eff,kind,boss:false,time,goal:thresholds(kind,eff,time,n),seed,twist:tw,opts};
}
export function stars(n){return(store.st&&store.st[n])||0}
export function stageOpen(n){return n<=1||stars(n-1)>=1}
export function nextStage(){for(let n=1;n<=STAGES;n++)if(stars(n)<1)return n;return STAGES+1}
export function totalStars(){let t=0;for(let n=1;n<=STAGES;n++)t+=stars(n);return t}
export function calcStars(d,metric,left){
  if(d.boss){const f=left/d.time;return f>=.6?3:f>=.3?2:1}
  return metric>=d.goal[2]?3:metric>=d.goal[1]?2:metric>=d.goal[0]?1:0;
}
