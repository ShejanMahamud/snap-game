/* View: daily gift panel. */
import { $ } from '../../core/dom.js';
import { badgeCheck } from '../../model/badges.js';
import { giftAmt, giftState } from '../../model/gift.js';
import { curStreak, dayStr, saveStore, store, touchStreak } from '../../model/store.js';
import { haptic, sfxLevel } from '../audio.js';
import { refreshMenu } from './menu.js';

function renderGift(){
  const g=giftState(),row=$('#gRow');row.textContent='';
  const day=g.day;
  for(let i=1;i<=7;i++){
    const d=document.createElement('div');d.className='gday'+(i<day||(g.claimed&&i===day)?' done':i===day?' today':'')+(i===7?' big':'');
    d.innerHTML='<span>D'+i+'</span><b>'+(i<day||(g.claimed&&i===day)?'&#10003;':giftAmt(i))+'</b>';row.appendChild(d);
  }
  $('#gTitle').textContent=g.claimed?'Claimed':'Day '+day;
  $('#gAmt').textContent='+'+giftAmt(day)+' XP';
  $('#gNote').textContent=g.claimed?'Come back tomorrow for day '+(day%7+1)+'.':(day===7?'Jackpot day.':'Miss a day and it starts over.');
  $('#gClaim').hidden=g.claimed;$('#gLater').textContent=g.claimed?'Close':'Later';
}
export function openGift(){
  renderGift();$('#menu').hidden=true;$('#gift').hidden=false;
}
function closeGift(){$('#gift').hidden=true;$('#menu').hidden=false;refreshMenu()}

export function init(){
  $('#giftBtn').addEventListener('click',openGift);
  $('#gLater').addEventListener('click',closeGift);
  $('#gClaim').addEventListener('click',()=>{
  const g=giftState();if(g.claimed)return;
  const amt=giftAmt(g.day);store.gift={last:dayStr(),day:g.day};
  store.xp=(store.xp||0)+amt;touchStreak();store.bstreak=curStreak();const bc=badgeCheck();store.xp+=bc.xp;saveStore();
  sfxLevel();haptic([20,20,40]);renderGift();
  if(bc.names.length)$('#gNote').textContent='Badge earned: '+bc.names.join(', ');
  $('#gAmt').textContent='+'+(amt+bc.xp)+' XP';
});
}
