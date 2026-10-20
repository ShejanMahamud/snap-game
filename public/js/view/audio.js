/* View: Web Audio synthesis, music and haptics. */
import { S } from '../model/state.js';
import { $ } from '../core/dom.js';

export function audio(){
  if(!S.AC){try{S.AC=new(window.AudioContext||window.webkitAudioContext)();S.master=S.AC.createGain();S.master.gain.value=S.muted?0:.55;const comp=S.AC.createDynamicsCompressor();S.master.connect(comp);comp.connect(S.AC.destination);
    S.noiseBuf=S.AC.createBuffer(1,S.AC.sampleRate*.6,S.AC.sampleRate);const d=S.noiseBuf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1}catch(e){S.AC=null}}
  if(S.AC&&S.AC.state==='suspended')S.AC.resume().catch(()=>{});
  return S.AC;
}
const PENT=[0,2,4,7,9];
function note(step,base){base=base||196;const o=Math.floor(step/5),n=PENT[((step%5)+5)%5];return base*Math.pow(2,(o*12+n)/12)}
function tone(o){
  if(!S.AC||S.muted)return;
  const t=S.AC.currentTime+(o.at||0),osc=S.AC.createOscillator(),g=S.AC.createGain();
  osc.type=o.type||'sine';osc.frequency.setValueAtTime(o.f0,t);
  if(o.f1)osc.frequency.exponentialRampToValueAtTime(o.f1,t+(o.glide||o.dur));
  g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(o.gain||.2,t+.008);g.gain.exponentialRampToValueAtTime(.0001,t+o.dur);
  if(o.lp){const f=S.AC.createBiquadFilter();f.type='lowpass';f.frequency.setValueAtTime(o.lp[0],t);f.frequency.exponentialRampToValueAtTime(o.lp[1],t+o.dur);osc.connect(f);f.connect(g)}else osc.connect(g);
  if(o.vib){const lfo=S.AC.createOscillator(),lg=S.AC.createGain();lfo.frequency.value=o.vib[0];lg.gain.value=o.f0*o.vib[1];lfo.connect(lg);lg.connect(osc.frequency);lfo.start(t);lfo.stop(t+o.dur+.05)}
  g.connect(S.master);osc.start(t);osc.stop(t+o.dur+.05);
}
function hat(at,gain){
  if(!S.AC||S.muted)return;const t=S.AC.currentTime+at,s=S.AC.createBufferSource(),f=S.AC.createBiquadFilter(),g=S.AC.createGain();
  s.buffer=S.noiseBuf;f.type='highpass';f.frequency.value=7000;g.gain.setValueAtTime(gain,t);g.gain.exponentialRampToValueAtTime(.0001,t+.05);
  s.connect(f);f.connect(g);g.connect(S.master);s.start(t);s.stop(t+.06);
}
export function sfxTwang(power,cmb){const f=note(Math.min(cmb,12),131);
  tone({type:'sawtooth',f0:f*1.9,f1:f,glide:.1,dur:.65,gain:.16+.2*power,lp:[4200,420],vib:[7,.018]});
  tone({type:'triangle',f0:f*2,f1:f*2.02,dur:.35,gain:.1});}
export function sfxSlice(cmb){const f=note(cmb+4,220);tone({type:'triangle',f0:f,f1:f*1.02,dur:.18,gain:.24});tone({type:'sine',f0:f*2,dur:.12,gain:.1})}
export function sfxGold(){for(let i=0;i<5;i++)tone({type:'triangle',f0:note(8+i*2,262),dur:.2,gain:.16,at:i*.055})}
export function sfxCrit(){tone({type:'square',f0:880,f1:1760,dur:.14,gain:.12,lp:[5000,1500]});tone({type:'triangle',f0:1320,dur:.2,gain:.12,at:.05})}
export function sfxFever(){for(let i=0;i<8;i++)tone({type:'sawtooth',f0:note(i*2,196),dur:.18,gain:.1,at:i*.045,lp:[3000,800]})}
export function sfxLevel(){for(let i=0;i<7;i++)tone({type:'triangle',f0:note(10+i*2,262),dur:.28,gain:.16,at:i*.08})}
export function sfxDead(){tone({type:'square',f0:190,f1:80,dur:.22,gain:.11,lp:[1400,200]})}
export function sfxCrack(){tone({type:'square',f0:300,f1:150,dur:.09,gain:.12,lp:[2500,400]});tone({type:'triangle',f0:900,dur:.06,gain:.08})}
export function sfxBomb(){if(!S.AC||S.muted)return;const t=S.AC.currentTime,s=S.AC.createBufferSource(),f=S.AC.createBiquadFilter(),g=S.AC.createGain();
  s.buffer=S.noiseBuf;f.type='lowpass';f.frequency.setValueAtTime(900,t);f.frequency.exponentialRampToValueAtTime(60,t+.5);
  g.gain.setValueAtTime(.7,t);g.gain.exponentialRampToValueAtTime(.001,t+.55);s.connect(f);f.connect(g);g.connect(S.master);s.start(t);
  tone({type:'sawtooth',f0:110,f1:32,dur:.5,gain:.3,lp:[500,60]})}
export function sfxTick(){tone({type:'square',f0:880,dur:.06,gain:.07})}

let creakMutex = false;

export function startCreak(){
  if(!S.AC||S.muted||S.creak||creakMutex)return;
  
  creakMutex = true;
  try {
    const o=S.AC.createOscillator(),g=S.AC.createGain();
    o.type='sine';o.frequency.value=70;g.gain.value=.0001;
    o.connect(g);g.connect(S.master);o.start();
    S.creak={o,g};
  } finally {
    creakMutex = false;
  }
}

export function updCreak(p){
  if(!S.creak)return;
  const t=S.AC.currentTime;
  S.creak.o.frequency.setTargetAtTime(70+170*p,t,.03);
  S.creak.g.gain.setTargetAtTime(.02+.07*p,t,.03);
}

export function stopCreak(){
  if(!S.creak||creakMutex)return;
  
  creakMutex = true;
  try {
    const t=S.AC.currentTime;
    S.creak.g.gain.setTargetAtTime(.0001,t,.02);
    S.creak.o.stop(t+.12);
    S.creak=null;
  } catch(e) {
    // Oscillator may already be stopped
    S.creak=null;
  } finally {
    creakMutex = false;
  }
}

export function haptic(ms){
  if(S.muted)return; // Respect mute setting for haptics
  try{navigator.vibrate&&navigator.vibrate(ms)}catch(e){}
}
export const music={on:false,step:0,next:0};
const BASS=[0,0,7,0,5,0,7,9];
export function musicTick(){
  if(!S.AC||S.muted||!music.on)return;
  const now=S.AC.currentTime;if(music.next<now)music.next=now+.05;
  const inten=S.fever>0?2:(S.combo>=3?1:0),spb=60/(S.fever>0?138:116)/2;
  while(music.next<now+.14){
    const at=music.next-now,s=music.step%8;
    tone({type:'triangle',f0:note(BASS[s],65.4),dur:spb*1.6,gain:.1,at,lp:[700,200]});
    if(s%2)hat(at,.03+inten*.015);
    if(s===0||s===4)tone({type:'sine',f0:90,f1:40,dur:.14,gain:.18,at});
    if(inten>=1&&(s%2===0||inten===2))tone({type:'square',f0:note(BASS[(s+3)%8]+10,130.8),dur:spb*.9,gain:.035+inten*.012,at,lp:[2400,900]});
    music.next+=spb;music.step++;
  }
}
const MUTE_ON='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7"/><path d="M19 6a8.5 8.5 0 0 1 0 12"/></svg>';
const MUTE_OFF='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M17 9l5 6M22 9l-5 6"/></svg>';
function paintMute(){const b=$('#mute');b.innerHTML=S.muted?MUTE_OFF:MUTE_ON;b.setAttribute('aria-label',S.muted?'Turn sound on':'Turn sound off')}
export function sfxStar(i){tone({type:'triangle',f0:note(10+i*3,262),dur:.32,gain:.18});tone({type:'sine',f0:note(15+i*3,262),dur:.2,gain:.08,at:.05})}

export function init(){
  try{S.muted=localStorage.getItem('snapband.muted')==='1'}catch(e){};
  $('#mute').addEventListener('click',()=>{S.muted=!S.muted;audio();if(S.master)S.master.gain.value=S.muted?0:.55;try{localStorage.setItem('snapband.muted',S.muted?'1':'0')}catch(e){}paintMute()});
  paintMute();
}
