/* Model: levels, titles, skins, unlocks, difficulty and daily quests. */
import { S } from './state.js';
import { START_TIME } from '../core/constants.js';
import { $ } from '../core/dom.js';
import { mulberry32 } from '../core/rng.js';
import { dailySeed, dayStr, store } from './store.js';

export const MAXLV=200;
const TITLES=['Pebble','Rookie','Twanger','Slicer','Sharpshooter','Gem Hunter','Snapper','Band Master','Legend','Mythic','Ironband','Shockwave','Razor','Stormcaller','Overload','Apex','Phantom','Titan','Ascendant','Snap God'];
function need(l){return 100+50*(l-1)}
const RANKS=['Snap God','Rift Walker','Void Hunter','Star Slicer','Nova Lord','Comet King','Galaxy Smith','Quasar','Centurion','Eternal','Mythweaver','Cosmic Twang','Singularity','Infinity Band','Worldbreaker','Timeless','Apex Legend','Last Snap'];
export function titleFor(l){return l<=20?TITLES[l-1]:l>=MAXLV?'The Final Snap':RANKS[Math.min(RANKS.length-1,Math.floor((l-20)/10))]}
export const ZONES=[['#4047E6','#1A1E96'],['#0FA3B1','#08455A'],['#7B3FE4','#2A0F6B'],['#E0457B','#5B0F3A'],['#F0803C','#6B2A0A'],['#2BB673','#0B4A2E'],['#1CB5E0','#000046'],['#C33764','#1D2671'],['#9D50BB','#2C1A4A'],['#EB5757','#3A0D0D'],['#56AB2F','#1A3A0A'],['#2193B0','#0A2A4A'],['#DD5E89','#4A1A5C'],['#F7BB97','#7A2E1A'],['#4568DC','#0F1647'],['#B24592','#2A0A3A'],['#11998E','#06302D'],['#FF512F','#4A0A1A'],['#614385','#1B1030'],['#232526','#000000']];
export function zoneOf(l){return Math.min(19,Math.max(0,Math.floor((l-1)/10)))}
export function lvlInfo(xp){
  if(S._li.x===xp)return S._li.v;
  let l=1,r=xp;while(l<MAXLV&&r>=need(l)){r-=need(l);l++}
  if(l>=MAXLV)r=Math.min(r,need(l));
  const v={l,r,n:need(l),title:titleFor(l)};S._li={x:xp,v};return v;
}
export const SKINS=[
  {n:'Cream',lv:1,core:'#FFF1CF',glow:'255,62,134',sw:'#FFF1CF,#FF3E86'},
  {n:'Mint',lv:2,core:'#D9FFF0',glow:'0,214,160',sw:'#D9FFF0,#00D6A0'},
  {n:'Sunset',lv:4,core:'#FFE3A8',glow:'255,122,41',sw:'#FFE3A8,#FF7A29'},
  {n:'Ice',lv:6,core:'#E6F4FF',glow:'63,169,255',sw:'#E6F4FF,#3FA9FF'},
  {n:'Gold',lv:8,core:'#FFF3B0',glow:'255,184,0',sw:'#FFF3B0,#FFB800'},
  {n:'Rainbow',lv:10,rainbow:true,core:'#fff',glow:'255,255,255',sw:'#FF3E86,#FFE14D,#3DF2B0,#3FA9FF,#B9A3FF'},
  {n:'Void',lv:12,core:'#E9D5FF',glow:'140,60,255',sw:'#E9D5FF,#8C3CFF'},
  {n:'Plasma',lv:15,core:'#FFD6F5',glow:'255,0,200',sw:'#FFD6F5,#FF00C8'},
  {n:'Inferno',lv:20,core:'#FFF4E0',glow:'255,60,0',sw:'#FFF4E0,#FF3C00'},
  {n:'Nebula',lv:30,core:'#D6E4FF',glow:'90,120,255',sw:'#D6E4FF,#5A78FF'},
  {n:'Toxic',lv:40,core:'#E5FFD0',glow:'120,255,0',sw:'#E5FFD0,#78FF00'},
  {n:'Sakura',lv:60,core:'#FFE0EC',glow:'255,105,160',sw:'#FFE0EC,#FF69A0'},
  {n:'Obsidian',lv:100,core:'#C8C8E0',glow:'90,90,140',sw:'#C8C8E0,#5A5A8C'},
  {n:'Solar',lv:150,core:'#FFFAD1',glow:'255,200,0',sw:'#FFFAD1,#FFC800'},
  {n:'Cosmic',lv:200,rainbow:true,core:'#fff',glow:'255,255,255',sw:'#FF3E86,#FFE14D,#3DF2B0,#3FA9FF,#B9A3FF,#FF3E86'}
];
export const ownsSkin=i=>!!(store.own&&store.own[i]);
export function skinIdx(){const l=lvlInfo(store.xp||0).l,i=Math.min(store.skin||0,SKINS.length-1);return(SKINS[i].lv<=l||ownsSkin(i))?i:0}
export const UNLOCKS=[{lv:2,k:'drift',txt:'Drifting gems'},{lv:3,k:'speeder',txt:'Speeder gems'},{lv:5,k:'armored',txt:'Armored gems'},{lv:7,k:'mine',txt:'Minefields'},{lv:9,k:'ghost',txt:'Ghost gems'},{lv:10,k:'hard',txt:'Hard mode'},{lv:30,k:'storm',txt:'Speed storms'},{lv:40,k:'armor3',txt:'Triple armor'},{lv:50,k:'mine2',txt:'Bigger minefields'},{lv:90,k:'armor4',txt:'Quad armor'},{lv:100,k:'mine3',txt:'Huge minefields'}];
export function playerLevel(){return lvlInfo(store.xp||0).l}
export function diffParams(eff){
  const d=Math.max(0,eff-1),lf=Math.min(1,d/24),hf=Math.log(1+Math.max(0,d-24)/12);
  const sp=(1+.4*lf)*(1+.12*hf),dens=1/((1-.22*lf)*(1-.07*Math.min(hf,2.8))),drain=1+.25*lf+.07*hf;
  return{d,lf,hf,sp,dens,drain,rs:1-Math.min(.32,.0015*d),startT:Math.max(30,Math.round(START_TIME-8*lf-1.2*hf)),danger:sp*dens*drain};
}
export function mkDiff(m,e){
  const L=playerLevel(),eff=Math.min(260,e!==undefined?e:m==='daily'?6:m==='hard'?L+8:L),P=diffParams(eff);
  return Object.assign({m,L,eff},P,{xpMul:(1+.55*(P.danger-1))*(m==='hard'?1.75:1)});
}
export function tierName(e){return e<3?'Chill':e<10?'Steady':e<20?'Spicy':e<35?'Brutal':e<60?'Insane':e<100?'Nightmare':e<150?'Mythic':'Impossible'}
export function applyZone(){
  const z=ZONES[(S.mode==='stage'&&S.stage&&S.state!=='menu')?S.stage.world:zoneOf(playerLevel())];S.COL_TOP=z[0];S.COL_BOT=z[1];
  try{document.body.style.background=S.COL_BOT;$('#app').style.background=S.COL_BOT}catch(e){}
}
export function nextUnlock(l){
  let lv=1e9;for(const u of UNLOCKS)if(u.lv>l&&u.lv<lv)lv=u.lv;for(const sk of SKINS)if(sk.lv>l&&sk.lv<lv)lv=sk.lv;
  if(lv===1e9)return null;
  const t=[];for(const u of UNLOCKS)if(u.lv===lv)t.push(u.txt);for(const sk of SKINS)if(sk.lv===lv)t.push(sk.n+' skin');
  return{lv,txt:t.join(', ')};
}
export const QDEFS=[
  {id:'gems',txt:'Slice 60 gems',target:60,type:'sum',key:'gems'},
  {id:'snap5',txt:'Land a 5-gem snap',target:5,type:'max',key:'snap'},
  {id:'gold3',txt:'Catch 3 gold gems',target:3,type:'sum',key:'gold'},
  {id:'x16',txt:'Reach a x16 combo',target:1,type:'max',key:'x16'},
  {id:'score',txt:'Score 3,000 in one run',target:3000,type:'max',key:'score'},
  {id:'mys',txt:'Open 2 mystery gems',target:2,type:'sum',key:'mys'},
  {id:'fever',txt:'Trigger Fever',target:1,type:'sum',key:'fever'}
];
export const QUEST_XP=150;
export function qState(){const t=dayStr();if(!store.q||store.q.date!==t)store.q={date:t,p:{},done:{}};return store.q}
export function todaysQuests(){const r=mulberry32(dailySeed()^0x5bd1e995),pool=QDEFS.slice();for(let i=pool.length-1;i>0;i--){const j=Math.floor(r()*(i+1));const tmp=pool[i];pool[i]=pool[j];pool[j]=tmp}return pool.slice(0,3)}
export function qProg(d){const q=qState(),b=q.p[d.key]||0,rv=S.run[d.key]||0;return d.type==='sum'?b+rv:Math.max(b,rv)}
