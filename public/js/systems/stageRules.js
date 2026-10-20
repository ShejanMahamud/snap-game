/* System: stage goal checking. */
import { S } from '../model/state.js';
import { endRound } from '../controller/flow.js';
import { COL } from '../core/constants.js';

export function stageMetric(){
  if(!S.stage)return 0;
  switch(S.stage.kind){
    case'gems':return S.run.gems;
    case'score':return S.score;
    case'snap':return Math.max(S.run.snap,S.snap?S.snap.count:0);
    case'combo':return S.stChain;
    case'gold':return S.run.gold;
    case'mystery':return S.run.mys;
    case'fever':return S.run.fever;
  }
  return 0;
}
export function stageCheck(){
  if(!S.stage)return false;
  if(S.stage.boss){if(S.bossDead){S.stageEnd='boss';endRound('BOSS DOWN!',COL.lemon);return true}return false}
  if(stageMetric()>=S.stage.goal[2]){S.stageEnd='perfect';endRound('PERFECT!',COL.mint);return true}
  return false;
}
export function stageTimeUp(){
  S.timeLeft=0;
  const ok=!S.stage.boss&&stageMetric()>=S.stage.goal[0];
  S.stageEnd=ok?'clear':'fail';
  endRound(ok?'STAGE CLEAR':'TIME UP',ok?COL.mint:COL.coral);
}
