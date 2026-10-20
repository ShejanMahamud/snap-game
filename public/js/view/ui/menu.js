/* View: main menu and legend. */
import { $ } from '../../core/dom.js';
import { STAGES, nextStage, totalStars } from '../../model/campaign.js';
import { giftState } from '../../model/gift.js';
import { lvlInfo, playerLevel, qState, todaysQuests } from '../../model/progression.js';
import { curStreak, modeBest, store, yesterdayStr } from '../../model/store.js';
import { coins } from '../../model/shop.js';
import { badgeStats } from '../../model/badges.js';
import { trophyCount } from './trophies.js';
import { playerName, setName } from '../../model/leaderboard.js';
import { drawGem } from '../render.js';
import { starSvg } from './stars.js';

export function refreshMenu(){
  const li=lvlInfo(store.xp||0),td=modeBest('daily'),st=store.streak||0,risk=st>0&&store.last===yesterdayStr();
  const name=playerName()||'Player',stats=badgeStats();
  $('#playerName').textContent=name;$('#homeTrophies').textContent=trophyCount().toLocaleString();
  $('#homeGems').textContent=stats.gems.toLocaleString();$('#homeXp').textContent=(store.xp||0).toLocaleString();
  $('#coinN').textContent=coins().toLocaleString();
  $('#streakN').textContent=curStreak();
  $('#streakPill').classList.toggle('risk',risk);$('#streakTag').hidden=!risk;
  $('#lvBadge').textContent='LV '+li.l;$('#xpFill').style.width=(li.r/li.n*100)+'%';
  $('#giftBtn').hidden=giftState().claimed;
  const ns=nextStage();$('#stageSub').textContent=ns>STAGES?'All stages cleared':(ns%10===0?'Boss · stage '+ns:'Stage '+ns);
  $('#dailyDot').hidden=td>0;$('#starCount').innerHTML=starSvg(true)+totalStars();
  $('#playHard').disabled=li.l<10;$('#hardLock').hidden=li.l>=10;
  const q=qState(),qs=todaysQuests();let done=0;for(const d of qs)if(q.done[d.id])done++;
  $('#qCount').textContent=done+'/'+qs.length;
  buildLegend();
}
export function buildLegend(){
  const L=playerLevel(),items=[['gem','Slice for points'],['gold','Bonus time'],['mystery','Surprise effect'],['bomb','Bomb: lose time'],['dead','Broken: resets combo']];
  if(L>=3)items.push(['speeder','Speeder: fast']);if(L>=5)items.push(['armored','Armored: two hits']);if(L>=9)items.push(['ghost','Ghost: fades']);
  const box=$('#legend');box.textContent='';
  for(const[type,label]of items){
    const d=document.createElement('div');d.className='lg';
    const c=document.createElement('canvas');c.width=56;c.height=56;const k=c.getContext('2d');k.scale(2,2);drawGem(k,type,14,15,type==='bomb'?9:10,.3,0,type==='ghost'?.7:0,2);
    const sp=document.createElement('span');sp.textContent=label;d.appendChild(c);d.appendChild(sp);box.appendChild(d);
  }
}

let showNamePrompt;
export function init(){
  const welcome=$('#welcome'),input=$('#welcomeName'),error=$('#welcomeError');
  function openNamePrompt(required){
    input.value=playerName();error.hidden=true;
    $('#welcomeEyebrow').textContent=required?'YOUR PLAYER CARD':'EDIT PLAYER NAME';
    $('#welcomeTitle').textContent=required?'What should we call you?':'Update your name';
    $('#welcomeCopy').textContent=required?'Pick a name for your profile and leaderboard scores.':'Your name appears on your profile and leaderboard scores.';
    $('#welcomeSubmit').textContent=required?'Let’s play':'Save name';$('#welcomeCancel').hidden=required;
    welcome.hidden=false;setTimeout(()=>input.focus(),50);
  }
  showNamePrompt=openNamePrompt;
  $('#welcomeForm').addEventListener('submit',e=>{
    e.preventDefault();const saved=setName(input.value);
    if(!saved){error.hidden=false;input.focus();return}
    welcome.hidden=true;refreshMenu();
  });
  $('#welcomeCancel').addEventListener('click',()=>{welcome.hidden=true});
  $('#editName').addEventListener('click',()=>openNamePrompt(false));
  $('#welcomeName').addEventListener('input',()=>{error.hidden=true});
  $('#helpBtn').addEventListener('click',()=>{$('#menu').hidden=true;$('#help').hidden=false});
  $('#helpClose').addEventListener('click',()=>{$('#help').hidden=true;$('#menu').hidden=false});
}

export function promptForPlayerName(){
  refreshMenu();
  if(!playerName()&&showNamePrompt)showNamePrompt(true);
}
