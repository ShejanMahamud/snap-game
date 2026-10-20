/* Controller: pointer, keyboard and pause input. */
import { S } from '../model/state.js';
import { startGame, toMenu } from './flow.js';
import { $, cv } from '../core/dom.js';
import { keys } from '../model/state.js';
import { endSnap, releaseHold } from '../systems/slicing.js';
import { audio, startCreak, stopCreak } from '../view/audio.js';

function pt(e){const r=cv.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top}}
const up=e=>{if(S.hold&&e.pointerId===S.hold.id)releaseHold()};
function takeMenuControl(){
  if(S.state!=='menu')return;
  S.demoPaused=true;S.bot=null;S.u.fill(0);S.v.fill(0);
}
function setPaused(p){
  if(p&&S.state!=='play')return;
  S.paused=p;$('#pausePanel').hidden=!p;
  if(p){if(S.hold){S.hold=null;S.pred=null;stopCreak()}for(const k in keys)keys[k]=false}
  else S.last=performance.now();
  if(p)$('#resumeBtn').focus();
}
function kbStart(){
  if(S.hold||S.paused||(S.state!=='play'&&S.state!=='menu'))return;
  audio();endSnap();takeMenuControl();if(!S.kbX)S.kbX=S.W/2;
  S.hold={id:'kb',kb:true,px:S.kbX,py:S.restY,gx:S.kbX,depth:0,startY:S.restY};startCreak();S.hintT=0;
}
function isDown(e){return e.key===' '||e.key==='ArrowDown'}

export function init(){
  cv.addEventListener('pointerdown',e=>{
  if(S.state!=='play'&&S.state!=='menu')return;
  e.preventDefault();audio();try{cv.setPointerCapture(e.pointerId)}catch(_){}
  if(S.hold)return;
  const p=pt(e);endSnap();takeMenuControl();
  S.hold={id:e.pointerId,px:p.x,py:p.y,gx:p.x,depth:0,startY:Math.abs(p.y-S.restY)<70?S.restY:p.y};
  startCreak();S.hintT=0;
});
  cv.addEventListener('pointermove',e=>{if(S.hold&&e.pointerId===S.hold.id){const p=pt(e);S.hold.px=p.x;S.hold.py=p.y}});
  cv.addEventListener('pointerup',up);
  cv.addEventListener('pointercancel',up);
  cv.addEventListener('lostpointercapture',up);
  window.addEventListener('blur',()=>{if(S.hold)releaseHold()});
  cv.addEventListener('contextmenu',e=>e.preventDefault());
  $('#pauseBtn').addEventListener('click',()=>setPaused(true));
  $('#resumeBtn').addEventListener('click',()=>setPaused(false));
  $('#quitBtn').addEventListener('click',()=>{S.paused=false;toMenu()});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)setPaused(true)});
  window.addEventListener('keydown',e=>{
  const el=e.target;if(el&&el.closest&&el.closest('button,textarea,input'))return;
  if(e.key==='p'||e.key==='P'||e.key==='Escape'){if(S.state==='play'||S.paused){e.preventDefault();setPaused(!S.paused)}return}
  if(S.state==='over'&&e.key==='Enter'){e.preventDefault();startGame(S.mode,S.stage&&S.stage.n);return}
  if(S.paused||(S.state!=='play'&&S.state!=='menu'))return;
  
  // Check if any modal is open BEFORE processing keys
  if(!$('#shop').hidden||!$('#board').hidden||!$('#hub').hidden||!$('#help').hidden||!$('#map').hidden||!$('#brief').hidden||!$('#gift').hidden)return;
  
  if(e.key==='ArrowLeft'){keys.l=true;S.kbMarker=2;if(!S.kbX)S.kbX=S.W/2;e.preventDefault()}
  else if(e.key==='ArrowRight'){keys.r=true;S.kbMarker=2;if(!S.kbX)S.kbX=S.W/2;e.preventDefault()}
  else if(isDown(e)){e.preventDefault();keys.d=true;S.kbMarker=0;kbStart()}
});
  window.addEventListener('keyup',e=>{
  if(e.key==='ArrowLeft')keys.l=false;else if(e.key==='ArrowRight')keys.r=false;
  else if(isDown(e)){keys.d=false;if(S.hold&&S.hold.kb)releaseHold()}
});
}
