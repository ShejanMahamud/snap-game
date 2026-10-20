/* Controller: starting, ending and leaving rounds. */
import { S } from '../model/state.js';
import { COL } from '../core/constants.js';
import { $ } from '../core/dom.js';
import { stageDef, stageOpen } from '../model/campaign.js';
import { applyZone, mkDiff, playerLevel } from '../model/progression.js';
import { dailySeed, modeBest, store } from '../model/store.js';
import { createSession, clearSession } from '../model/leaderboard.js';
import { spawnBoss } from '../systems/boss.js';
import { createGen, spawnDue } from '../systems/generator.js';
import { endSnap } from '../systems/slicing.js';
import { applyBoosts } from '../model/shop.js';
import { audio, music, stopCreak } from '../view/audio.js';
import { popBig } from '../view/fx.js';
import { makeBg } from '../view/render.js';
import { refreshMenu } from '../view/ui/menu.js';
import { hideStagePanels } from '../view/ui/stages.js';

function resetWorld(){S.gems=[];S.parts=[];S.texts=[];S.snap=null;S.hold=null;S.bot=null;S.pred=null;stopCreak();S.slow=1;S.slowT=0;S.shake=0;S.flash=0;S.u.fill(0);S.v.fill(0)}

export async function startGame(m,sn){
  if(m==='hard'&&playerLevel()<10)return;
  if(m==='stage'&&!stageOpen(sn))return;
  
  S.mode=m;S.stage=m==='stage'?await stageDef(sn):null;S.diff=mkDiff(m,S.stage?S.stage.eff:undefined);resetWorld();S.state='play';S.restY=S.H*.66;applyZone();makeBg();S.score=0;S.combo=0;S.timeLeft=S.stage?S.stage.time:S.diff.startT;S.bestSnapCount=0;S.slicedTotal=0;S.snapsTaken=0;S.bestRec=null;S.bestRecCount=0;S.lastTick=99;S.survived=0;
  S.fever=0;S.feverM=0;S.x2T=0;S.timerPulse=0;S.novaSafe=false;S.beatBest=false;S.bestRef=modeBest(m);
  S.run={gems:0,gold:0,mys:0,fever:0,snap:0,x16:0,score:0};S.runDone={};S.stChain=0;S.stageEnd='';S.bossDead=false;
  
  // Determine seed
  const seed = S.stage ? S.stage.seed : (m === 'daily' ? dailySeed() : (Math.random() * 4294967296) >>> 0);
  S.seed = seed; // Store seed for session tracking
  S.gameStartTime = Date.now(); // Track game start time
  
  S.gen=createGen(seed,S.stage?S.stage.eff:S.diff.eff,S.stage?S.stage.opts:null);S.tg=0;spawnDue();
  
  if(m==='stage'){const bo=applyBoosts();if(bo.time)S.timeLeft+=8;if(bo.fever)S.feverM=.7}
  if(S.stage&&S.stage.boss)spawnBoss();
  S.hintT=(store.plays||0)<3?3.5:0;if(S.stage&&S.stage.n<=2)S.hintT=5;
  S.paused=false;S.trail=[];music.on=true;music.step=0;music.next=0;
  $('#menu').hidden=true;$('#board').hidden=true;$('#shop').hidden=true;$('#hub').hidden=true;$('#help').hidden=true;$('#result').hidden=true;hideStagePanels();$('#pausePanel').hidden=true;$('#pauseBtn').hidden=false;audio();
  popBig(S.stage?(S.stage.boss?'BOSS: '+S.stage.bossName.toUpperCase():'STAGE '+S.stage.n):'GO!',COL.lemon);
  if(S.stage&&S.stage.twist)popBig(S.stage.twist.name.toUpperCase(),COL.lilac,.5);
  
  // Create anti-cheat session for leaderboard modes
  if (m === 'daily' || m === 'free' || m === 'hard') {
    await createSession(m, seed);
  }
}

export function endRound(lbl,col){
  endSnap();if(S.hold){S.hold=null;S.pred=null;stopCreak()}
  music.on=false;S.fever=0;S.x2T=0;
  $('#pauseBtn').hidden=true;S.state='ending';S.endT=1.25;S.slowT=1.25;popBig(lbl||'RUN OVER',col||COL.lemon);S.flash=.4;S.flashCol='#fff';
  
  // Calculate game duration
  S.gameDuration = S.gameStartTime ? (Date.now() - S.gameStartTime) / 1000 : S.survived;
}

export function toMenu(){
  resetWorld();S.paused=false;S.trail=[];music.on=false;S.fever=0;S.x2T=0;
  $('#pausePanel').hidden=true;$('#pauseBtn').hidden=true;S.state='menu';S.demoPaused=false;S.restY=S.H*.8;applyZone();makeBg();S.botT=1;S.demoT=0;refreshMenu();$('#menu').hidden=false;$('#board').hidden=true;$('#hub').hidden=true;$('#help').hidden=true;$('#result').hidden=true;hideStagePanels();
  
  // Clear session when returning to menu
  clearSession();
}
