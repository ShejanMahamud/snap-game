/* Model: leaderboard API client (Cloudflare Worker + D1). Enhanced with session tracking. */
import { dayStr, saveStore, store, syncToServer } from './store.js';

export const BOARDS = { daily: 'Daily', weekly: 'Weekly', free: 'Endless', hard: 'Hard' };
export const LABEL = { endless: 'All-time', hard: 'Hard' };

let currentSession = null;

/* The week board runs Monday to Sunday in UTC, keyed by that Monday. */
export function weekKey() {
  const d = new Date(), back = (d.getUTCDay() + 6) % 7;
  return 'week:' + new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - back)).toISOString().slice(0, 10);
}
export function boardFor(tab) {
  return tab === 'daily' ? 'daily:' + dayStr() : tab === 'weekly' ? weekKey() : tab === 'hard' ? 'hard' : tab === 'free' ? 'endless' : null;
}
/* Every board a finished run counts toward. Endless feeds both all-time and this week. */
export function boardsForRun(mode) {
  return mode === 'free' ? [boardFor('free'), weekKey()] : [boardFor(mode)].filter(Boolean);
}
export function boardLabel(board) {
  return board.startsWith('daily:') ? 'Daily' : board.startsWith('week:') ? 'This week' : LABEL[board] || board;
}
function pid() {
  if (!store.pid) {
    store.pid = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2, 12);
    saveStore();
  }
  return store.pid;
}
export function playerName() { return store.name || ''; }
export function setName(n) {
  const cleaned = String(n).replace(/[\u0000-\u001f<>&"']/g, '').trim().slice(0, 16);
  if (cleaned.length < 2) return ''; // Minimum 2 characters
  store.name = cleaned;
  saveStore();
  syncToServer(true); // Immediate sync on name change
  return store.name;
}

// Create game session for anti-cheat
export async function createSession(mode, seed) {
  try {
    const response = await fetch('/api/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pid: pid(), mode, seed })
    });
    
    if (!response.ok) throw new Error('Session creation failed');
    
    const data = await response.json();
    currentSession = { id: data.session_id, mode, seed, started: Date.now() };
    return currentSession;
  } catch (e) {
    console.error('Session creation failed:', e);
    currentSession = null;
    return null;
  }
}

// Get current session
export function getCurrentSession() {
  return currentSession;
}

// Clear session after game ends
export function clearSession() {
  currentSession = null;
}

export async function fetchBoard(board) {
  const r = await fetch('/api/scores?board=' + encodeURIComponent(board) + '&pid=' + encodeURIComponent(pid()), { cache: 'no-store' });
  if (!r.ok) throw new Error('http ' + r.status);
  return r.json();
}

async function post(board, score, time, events, sessionId) {
  const r = await fetch('/api/scores', {
    method: 'POST', 
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ 
      board, 
      score, 
      time,
      events,
      name: playerName(), 
      pid: pid(),
      session_id: sessionId 
    }),
  });
  if (!r.ok) { 
    const e = new Error('http ' + r.status); 
    e.status = r.status; 
    const body = await r.json().catch(() => ({}));
    e.message = body.message || body.error || 'Submission failed';
    throw e; 
  }
  return r.json();
}

/* Offline or failed uploads wait in store.pend and retry on the next launch or submit. */
export async function submitScore(board, score, time = 0, events = {}) {
  const pend = store.pend || (store.pend = {});
  
  // Store submission data
  if (!pend[board] || score > pend[board].score) {
    pend[board] = { score, time, events };
  }
  
  saveStore();
  
  // Get session ID if available
  const sessionId = currentSession && currentSession.mode === board.split(':')[0] ? currentSession.id : null;
  
  try {
    const data = await post(board, pend[board].score, pend[board].time, pend[board].events, sessionId);
    delete pend[board]; 
    saveStore();
    await flushPending();
    syncToServer(true); // Sync immediately after successful submission
    return data;
  } catch (e) {
    // Keep in pending queue for retry
    console.error('Score submission failed:', e.message);
    throw e;
  }
}

export async function flushPending() {
  if (!playerName() || !store.pend) return;
  for (const board of Object.keys(store.pend)) {
    const stale = (board.startsWith('daily:') && board !== boardFor('daily')) || (board.startsWith('week:') && board !== weekKey());
    if (stale) { delete store.pend[board]; continue; }
    try { 
      const { score, time, events } = store.pend[board];
      await post(board, score, time, events, null); 
      delete store.pend[board]; 
    }
    catch (e) { 
      if (e.status === 400 || e.status === 403) delete store.pend[board]; 
      else break; 
    }
  }
  saveStore();
}
