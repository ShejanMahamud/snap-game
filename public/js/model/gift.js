/* Model: the 7-day daily gift track. */
import { lvlInfo } from './progression.js';
import { dayStr, store, yesterdayStr } from './store.js';

const GIFT=[50,80,120,160,220,300,600];
export function giftState(){
  const g=store.gift||{last:'',day:0},t=dayStr();
  if(g.last===t)return{claimed:true,day:g.day};
  return{claimed:false,day:g.last===yesterdayStr()?(g.day%7)+1:1};
}
export function giftAmt(day){return Math.round(GIFT[day-1]*(1+lvlInfo(store.xp||0).l*.04))}
