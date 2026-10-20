/* Model: persistence (localStorage + server sync) and dates/streaks. */

const KEY='snapband.v1';
const API_BASE = '';

function loadStore(){try{return JSON.parse(localStorage.getItem(KEY))||{}}catch(e){return{}}}
export function saveStore(){try{localStorage.setItem(KEY,JSON.stringify(store))}catch(e){}}
export let store=loadStore();

// Always use UTC for dates to prevent timezone manipulation
export function dayStr(d){
  d = d || new Date();
  return d.getUTCFullYear() + '-' + 
         String(d.getUTCMonth() + 1).padStart(2, '0') + '-' + 
         String(d.getUTCDate()).padStart(2, '0');
}
export function yesterdayStr(){return dayStr(new Date(Date.now()-864e5))}
export function curStreak(){const t=dayStr(),y=yesterdayStr();return(store.last===t||store.last===y)?(store.streak||0):0}
export function touchStreak(){const t=dayStr();if(store.last===t)return;store.streak=store.last===yesterdayStr()?(store.streak||0)+1:1;store.last=t}
export function dailySeed(){let s=2166136261;for(const ch of dayStr()){s^=ch.charCodeAt(0);s=Math.imul(s,16777619)}return s>>>0}
export function modeBest(m){return m==='stage'?0:m==='daily'?((store.daily&&store.daily.date===dayStr())?store.daily.score:0):m==='hard'?(store.hard||0):(store.free||0)}

// Server sync functions
let syncInProgress = false;
let syncQueue = [];

export async function initializeUser() {
  try {
    const response = await fetch(`${API_BASE}/api/init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pid: store.pid })
    });
    
    if (!response.ok) throw new Error('Init failed');
    
    const data = await response.json();
    
    // Merge server data with local
    store.pid = data.pid;
    store.name = store.name || data.name;
    store.xp = Math.max(store.xp || 0, data.xp);
    store.coins = Math.max(store.coins || 0, data.coins);
    
    // Merge server data keys
    for (const [key, value] of Object.entries(data.data || {})) {
      if (!store[key]) store[key] = value;
    }
    
    saveStore();
    
    // Initial sync to server
    await syncToServer();
    
    return true;
  } catch (e) {
    console.error('User init failed:', e);
    // Generate local PID if server unavailable
    if (!store.pid) {
      store.pid = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2, 12);
      saveStore();
    }
    return false;
  }
}

export async function syncToServer(immediate = false) {
  if (!store.pid) return;
  
  // Queue sync request
  syncQueue.push(Date.now());
  
  // Debounce syncs (wait 2 seconds unless immediate)
  if (!immediate && syncQueue.length === 1) {
    setTimeout(() => performSync(), 2000);
    return;
  }
  
  if (immediate && !syncInProgress) {
    await performSync();
  }
}

async function performSync() {
  if (syncInProgress) return;
  syncQueue = [];
  syncInProgress = true;
  
  try {
    // Sync user data
    const dataToSync = {
      st: store.st,
      daily: store.daily,
      free: store.free,
      hard: store.hard,
      plays: store.plays,
      best: store.best,
      bstreak: store.bstreak,
      streak: store.streak,
      last: store.last,
      skin: store.skin,
      own: store.own,
      boost: store.boost,
      q: store.q,
      pend: store.pend,
      bg: store.bg
    };
    
    await fetch(`${API_BASE}/api/user/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pid: store.pid, data: dataToSync })
    });
    
    // Sync stats for achievements
    if (store.as) {
      await fetch(`${API_BASE}/api/user/stats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          pid: store.pid, 
          stats: store.as 
        })
      });
    }
  } catch (e) {
    console.error('Sync failed:', e);
  } finally {
    syncInProgress = false;
  }
}

// Sync on visibility change
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      syncToServer(true);
    }
  });
  
  // Sync before unload
  window.addEventListener('beforeunload', () => {
    syncToServer(true);
  });
}

// Periodic sync every 30 seconds
setInterval(() => syncToServer(false), 30000);
