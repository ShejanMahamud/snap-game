/* View: leaderboard panel, and the rank line + name form on the result screen. */
import { S } from '../../model/state.js';
import { $ } from '../../core/dom.js';
import { BOARDS, boardFor, boardLabel, boardsForRun, fetchBoard, flushPending, playerName, setName, submitScore } from '../../model/leaderboard.js';
import { challengeUrl } from './challenge.js';

let tab = 'daily', from = 'menu', seq = 0, pending = null;
const num = n => n.toLocaleString();
const NOTES = { weekly: 'Endless runs. Resets Monday (UTC).' };

function row(rank, e) {
  const li = document.createElement('li');
  if (e.me) li.className = 'me';
  const r = document.createElement('i'); r.textContent = rank;
  const nm = document.createElement('span'); nm.textContent = e.name;
  if (e.country) { const cc = document.createElement('em'); cc.className = 'cc'; cc.textContent = e.country; cc.title = e.country; nm.appendChild(cc); }
  const sc = document.createElement('b'); sc.textContent = num(e.score);
  li.append(r, nm, sc);
  return li;
}
async function renderBoard() {
  const my = ++seq, list = $('#boardList'), note = $('#boardNote');
  document.querySelectorAll('#boardTabs button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === tab)));
  list.textContent = ''; note.textContent = 'Loading…';
  try {
    const d = await fetchBoard(boardFor(tab));
    if (my !== seq) return;
    d.top.forEach((e, i) => list.appendChild(row(i + 1, e)));
    if (d.me && !d.top.some(e => e.me)) {
      const gap = document.createElement('li'); gap.className = 'gap'; gap.textContent = '…'; list.appendChild(gap);
      list.appendChild(row(d.me.rank, { name: playerName() || 'You', score: d.me.score, me: true }));
    }
    note.textContent = (d.total ? num(d.total) + (d.total === 1 ? ' player' : ' players') : 'No scores yet. Be the first.') + (NOTES[tab] ? ' · ' + NOTES[tab] : '');
  } catch (e) {
    if (my === seq) note.textContent = 'Leaderboard unavailable. Check your connection.';
  }
}
function openBoard(t) {
  from = $('#result').hidden ? 'menu' : 'result';
  tab = t in BOARDS ? t : 'daily';
  $('#menu').hidden = true; $('#result').hidden = true; $('#board').hidden = false;
  $('#boardName').value = playerName();
  renderBoard();
}
function closeBoard() { $('#board').hidden = true; $('#' + from).hidden = false; }

/* After a rank comes back, point the share text at a "beat my score" link. */
function decorateShare(rankLine) {
  S.shareStr = S.shareStr.replace(/\nhttps?:\/\/\S+$/, '') + '\n' + rankLine + '\n' + challengeUrl(S.mode, S.score, playerName());
  const ta = $('#shareText'); if (ta) ta.value = S.shareStr;
}
async function send(boards, score, tok) {
  const el = $('#rRank');
  el.hidden = false; el.textContent = 'Submitting…';
  try {
    // Prepare game event data for validation
    const gameEvents = {
      gems: S.slicedTotal,
      snaps: S.snapsTaken,
      bestSnap: S.bestSnapCount,
      combo: S.stChain
    };
    
    const time = S.gameDuration || S.survived;
    
    const res = await Promise.all(boards.map(b => submitScore(b, score, time, gameEvents)));
    if (tok !== S.resultToken) return;
    const parts = res.map((d, i) => boardLabel(boards[i]) + ' #' + num(d.me.rank) + ' of ' + num(d.total));
    el.textContent = parts.join(' · ') + (res[0].me.score > score ? ' · best ' + num(res[0].me.score) : '');
    decorateShare(parts[0]);
  } catch (e) {
    if (tok === S.resultToken) {
      const errorMsg = e.message || 'Offline. Your score will upload next time.';
      el.textContent = errorMsg;
      if (e.status === 429) el.textContent = 'Rate limit reached. Please wait a moment.';
      else if (e.status === 403) el.textContent = 'Session validation failed.';
      else if (e.status === 400 && errorMsg.includes('impossible')) el.textContent = 'Score validation failed.';
    }
  }
}
/* Called from showResult(): submit straight away if we know the name, else ask for it first. */
export function reportRun() {
  const boards = boardsForRun(S.mode), tok = S.resultToken;
  $('#rRank').hidden = true; $('#nameForm').hidden = true; pending = null;
  $('#boardLink').hidden = !boards.length;
  if (!boards.length || S.score < 1) return;
  if (playerName()) { send(boards, S.score, tok); return; }
  pending = { boards, score: S.score, tok };
  $('#rRank').hidden = false; $('#rRank').textContent = 'Add a name to join the leaderboard.';
  $('#nameForm').hidden = false;
}
export function init() {
  $('#boardBtn').addEventListener('click', () => openBoard('daily'));
  $('#boardLink').addEventListener('click', () => openBoard(S.mode === 'free' ? 'weekly' : S.mode));
  $('#boardClose').addEventListener('click', closeBoard);
  $('#boardTabs').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { tab = b.dataset.mode; renderBoard(); } });
  $('#nameForm').addEventListener('submit', e => {
    e.preventDefault();
    if (!setName($('#nameIn').value)) return;
    $('#nameForm').hidden = true;
    if (pending) send(pending.boards, pending.score, pending.tok);
    pending = null;
  });
  $('#boardNameForm').addEventListener('submit', e => {
    e.preventDefault();
    if (!setName($('#boardName').value)) return;
    flushPending().then(renderBoard);
  });
  if (navigator.share) {
    const b = $('#nativeShare'); b.hidden = false;
    b.addEventListener('click', () => { navigator.share({ title: 'SNAP', text: S.shareStr }).catch(() => {}); });
  }
  flushPending();
}
