/* View: progress screen, badges and skins. */
import { S } from '../../model/state.js';
import { $ } from '../../core/dom.js';
import { BADGES, badgeStats, badgeXp } from '../../model/badges.js';
import { STAGES, totalStars } from '../../model/campaign.js';
import { MAXLV, SKINS, ownsSkin, lvlInfo, mkDiff, nextUnlock, qProg, qState, skinIdx, tierName, todaysQuests } from '../../model/progression.js';
import { saveStore, store } from '../../model/store.js';
import { refreshMenu } from './menu.js';
import { renderTrophies } from './trophies.js';

function renderHub(){
  const hli=lvlInfo(store.xp||0),fd=mkDiff('free'),nu=nextUnlock(hli.l);
  $('#hubLv').textContent='LV '+hli.l;$('#hubTitle').textContent=hli.title;$('#hubFill').style.width=(hli.r/hli.n*100)+'%';
  $('#hubXp').textContent=hli.l>=MAXLV?'Max level':(hli.n-hli.r)+' XP to LV '+(hli.l+1);
  $('#hubBest').textContent=(store.best||0).toLocaleString();
  $('#hubDiff').textContent=tierName(fd.eff)+' · danger x'+fd.danger.toFixed(2);
  $('#hubStars').textContent=totalStars()+' / '+(STAGES*3);
  $('#hubNext').textContent=nu?'LV '+nu.lv+' · '+nu.txt:'Everything unlocked';
  const q=qState(),qs=todaysQuests(),list=$('#questList');list.textContent='';
  for(const d of qs){
    const p=Math.min(d.target,qProg(d)),done=!!q.done[d.id],li=document.createElement('li');if(done)li.className='done';
    const a=document.createElement('span');a.textContent=d.txt;const b=document.createElement('b');b.textContent=done?'Done':(p.toLocaleString()+' / '+d.target.toLocaleString());
    const bar=document.createElement('div');bar.className='xpbar';const fill=document.createElement('i');fill.style.width=(p/d.target*100)+'%';fill.style.transition='none';bar.appendChild(fill);
    li.appendChild(a);li.appendChild(b);li.appendChild(bar);list.appendChild(li);
  }
  const lv=lvlInfo(store.xp||0).l,cur=skinIdx(),grid=$('#skinGrid');grid.textContent='';
  SKINS.forEach((s,i)=>{
    const b=document.createElement('button');b.type='button';b.className='skin';const open=s.lv<=lv||ownsSkin(i);b.disabled=!open;b.setAttribute('aria-pressed',String(i===cur));
    const sw=document.createElement('i');sw.style.background='linear-gradient(90deg,'+s.sw+')';const t=document.createElement('span');t.textContent=s.n;const lt=document.createElement('span');lt.className='lvt';lt.textContent=open?'':'LV '+s.lv;
    b.appendChild(sw);b.appendChild(t);b.appendChild(lt);
    b.addEventListener('click',()=>{store.skin=i;saveStore();renderHub()});
    grid.appendChild(b);
  });
  const act=grid.children[cur];if(act&&typeof act.offsetLeft==='number')grid.scrollLeft=Math.max(0,act.offsetLeft-grid.clientWidth/2+act.offsetWidth/2);
}
export function addBadgeLines(ul,res){for(const n of res.names){const li=document.createElement('li');li.textContent='Badge: '+n;ul.appendChild(li)}}
function renderBadges(){
  const S=badgeStats(),got=store.bg||{},ul=$('#badgeList');ul.textContent='';
  const n=BADGES.filter(b=>got[b.id]).length;$('#badgeHead').textContent='Badges · '+n+' / '+BADGES.length;
  let list=BADGES.slice();
  if(!S.badgeAll){list=list.filter(b=>!got[b.id]);list.sort((x,y)=>Math.min(1,S[y.key]/y.target)-Math.min(1,S[x.key]/x.target));list=list.slice(0,4)}
  else list.sort((x,y)=>(got[y.id]?1:0)-(got[x.id]?1:0));
  for(const b of list){
    const has=!!got[b.id],v=Math.min(b.target,S[b.key]),li=document.createElement('li');if(has)li.className='got';
    const top=document.createElement('div'),l=document.createElement('span'),r=document.createElement('small');
    l.innerHTML='<b></b> ';l.firstChild.textContent=b.name;l.appendChild(document.createTextNode(b.txt));
    r.textContent=has?'+'+badgeXp(b)+' XP':v.toLocaleString()+' / '+b.target.toLocaleString();
    top.appendChild(l);top.appendChild(r);li.appendChild(top);
    if(!has){const bar=document.createElement('div');bar.className='xpbar';const f=document.createElement('i');f.style.width=(v/b.target*100)+'%';f.style.transition='none';bar.appendChild(f);li.appendChild(bar)}
    ul.appendChild(li);
  }
  $('#badgeAll').textContent=S.badgeAll?'Show next':'Show all';
}

export function init(){
  $('#hubBtn').addEventListener('click',()=>{renderHub();renderBadges();renderTrophies();$('#menu').hidden=true;$('#hub').hidden=false});
  $('#hubClose').addEventListener('click',()=>{$('#hub').hidden=true;$('#menu').hidden=false;refreshMenu()});
  $('#badgeAll').addEventListener('click',()=>{S.badgeAll=!S.badgeAll;renderBadges()});
}
