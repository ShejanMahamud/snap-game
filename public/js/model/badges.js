/* Model: badges (achievements). */
import { S } from './state.js';
import { STAGES, stars, totalStars } from './campaign.js';
import { lvlInfo } from './progression.js';
import { curStreak, store, touchStreak, syncToServer } from './store.js';

const BADGE_XP=[100,200,400,800];
const MAX_STAT = Number.MAX_SAFE_INTEGER; // 2^53 - 1

// Safely add to stat with overflow protection
function safeStat(current, increment) {
  const result = (current || 0) + increment;
  return Math.min(MAX_STAT, Math.max(0, result));
}

export function badgeStats(){
  const a=store.as||{};let st=0,cl=0,bs=0;
  for(let n=1;n<=STAGES;n++)if(stars(n)>0){cl++;if(n%10===0)bs++}
  return{
    gems: Math.min(MAX_STAT, a.gems||0),
    rounds: Math.min(MAX_STAT, a.rounds||0),
    gold: Math.min(MAX_STAT, a.gold||0),
    mys: Math.min(MAX_STAT, a.mys||0),
    fever: Math.min(MAX_STAT, a.fever||0),
    snap: a.snap||0,
    combo: a.combo||0,
    stars: totalStars(),
    cleared: cl,
    bosses: bs,
    level: lvlInfo(store.xp||0).l,
    streak: Math.max(store.streak||0,store.bstreak||0),
    best: store.best||0
  };
}
export const BADGES=[];
export function badgeXp(b){return BADGE_XP[b.tier]}
export function badgeTick(r,stageDone){
  const a=store.as=store.as||{};
  
  // Use safe stat accumulation to prevent overflow
  a.gems = safeStat(a.gems, r.gems||0);
  a.gold = safeStat(a.gold, r.gold||0);
  a.mys = safeStat(a.mys, r.mys||0);
  a.fever = safeStat(a.fever, r.fever||0);
  a.rounds = safeStat(a.rounds, 1);
  a.snap = Math.max(a.snap||0, r.snap||0);
  a.combo = Math.max(a.combo||0, S.stChain||0);
  
  store.best = Math.max(store.best||0, S.score);
  touchStreak();
  store.bstreak = curStreak();
  
  syncToServer(); // Sync stats to server
  
  return badgeCheck();
}
export function badgeCheck(){
  const S=badgeStats(),got=store.bg=store.bg||{},out={xp:0,names:[]};
  for(const b of BADGES)if(!got[b.id]&&S[b.key]>=b.target){got[b.id]=1;out.xp+=badgeXp(b);out.names.push(b.name)}
  return out;
}

export function init(){
  (function(){
  const add=(key,name,txt,list)=>list.forEach((t,i)=>BADGES.push({id:key+t,name:name[i]||name[name.length-1],txt:txt(t),key,target:t,tier:Math.min(3,i)}));
  add('gems',['Gem Hunter','Gem Hoarder','Gem Baron','Gem Titan'],t=>'Cut '+t.toLocaleString()+' gems',[100,1000,5000,20000]);
  add('rounds',['Regular','Dedicated','Devoted'],t=>'Play '+t+' rounds',[10,50,200]);
  add('snap',['Big Snap','Huge Snap','Colossal'],t=>'Slice '+t+' gems in one snap',[6,10,15]);
  add('combo',['On a Roll','Unstoppable'],t=>'Reach a '+t+' gem combo',[20,50]);
  add('gold',['Gold Rush','Gold Digger'],t=>'Catch '+t+' gold gems',[25,100]);
  add('mys',['Curious','Gambler'],t=>'Open '+t+' mystery gems',[25,100]);
  add('fever',['Hot','On Fire','Inferno'],t=>'Trigger Fever '+t+' times',[10,50,200]);
  add('stars',['Star Seeker','Star Collector','Star Hoarder','Constellation'],t=>'Earn '+t+' stars',[30,100,300,550]);
  add('cleared',['Explorer','Adventurer','Conqueror'],t=>'Clear '+t+' stages',[20,100,200]);
  add('bosses',['Boss Slayer','Boss Hunter','Boss Legend'],t=>'Defeat '+t+' bosses',[1,5,20]);
  add('level',['Rising','Veteran','Master','Legend'],t=>'Reach level '+t,[10,30,75,150]);
  add('streak',['Back Again','Habit','Devotion'],t=>'Play '+t+' days in a row',[3,7,30]);
  add('best',['Five Figures','Fifty Thousand'],t=>'Score '+t.toLocaleString()+' in one round',[10000,50000]);
})();
}
