/* View: "beat my score" links (?m=daily&s=4321&n=Name) and app shortcuts (?play=daily). */
import { $ } from '../../core/dom.js';
import { startGame } from '../../controller/flow.js';
import { BOARDS } from '../../model/leaderboard.js';

const MODES = ['daily', 'free', 'hard'];
export function challengeUrl(mode, score, name) {
  return location.origin + '/?m=' + mode + '&s=' + score + '&n=' + encodeURIComponent(name);
}
export function init() {
  const q = new URLSearchParams(location.search);
  const m = q.get('m'), s = parseInt(q.get('s'), 10), n = (q.get('n') || '').replace(/[\u0000-\u001f<>&"']/g, '').trim().slice(0, 16);
  if (MODES.includes(m) && s > 0 && s <= 5e6 && n) {
    $('#chTxt').textContent = n + ' scored ' + s.toLocaleString() + ' on ' + BOARDS[m] + '. Can you beat it?';
    $('#challenge').hidden = false;
    $('#chGo').addEventListener('click', () => { $('#challenge').hidden = true; startGame(m); });
  }
  const play = q.get('play');
  if (m || play) history.replaceState(null, '', location.pathname);
  if (play === 'ranks') setTimeout(() => $('#boardBtn').click(), 0);
  else if (play === 'stage') setTimeout(() => $('#playStage').click(), 0);
  else if (MODES.includes(play)) setTimeout(() => $('#' + { daily: 'playDaily', free: 'playFree', hard: 'playHard' }[play]).click(), 0);
}
