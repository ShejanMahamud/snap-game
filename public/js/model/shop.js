/* Model: coins, the shop, and boosts. Boosts only work in campaign stages so leaderboards stay fair. */
import { SKINS, ownsSkin } from './progression.js';
import { saveStore, store, syncToServer } from './store.js';

export const QUEST_COINS = 15;
export const BOOSTS = [
  { id: 'time', n: 'Extra time', txt: '+8 seconds in a stage', price: 60 },
  { id: 'fever', n: 'Fever start', txt: 'Fever bar starts 70% full', price: 80 },
];
export const equip = { time: false, fever: false };

export const coins = () => store.coins || 0;
export function addCoins(n) { 
  store.coins = coins() + Math.max(0, Math.round(n)); 
  saveStore(); 
  syncToServer(); // Sync coins to server
}
export const runCoins = (score, gems) => Math.max(1, Math.round(score / 60 + gems / 2));
export const skinPrice = i => Math.round((60 + SKINS[i].lv * 35) / 10) * 10;
export const boostCount = id => (store.boost && store.boost[id]) || 0;

function spend(n) { 
  if (coins() < n) return false; 
  store.coins = coins() - n; 
  syncToServer(); // Sync after spending
  return true; 
}
export function buySkin(i) {
  if (ownsSkin(i) || !spend(skinPrice(i))) return false;
  (store.own || (store.own = {}))[i] = 1; store.skin = i; saveStore(); 
  syncToServer(true); // Immediate sync on purchase
  return true;
}
export function buyBoost(id) {
  const b = BOOSTS.find(x => x.id === id);
  if (!b || !spend(b.price)) return false;
  (store.boost || (store.boost = {}))[id] = boostCount(id) + 1; saveStore(); 
  syncToServer(true); // Immediate sync on purchase
  return true;
}
/* Consume whatever is switched on in the stage briefing. */
export function applyBoosts() {
  const used = { time: 0, fever: 0 };
  for (const b of BOOSTS) {
    if (equip[b.id] && boostCount(b.id) > 0) { store.boost[b.id]--; used[b.id] = 1; }
    equip[b.id] = false;
  }
  saveStore();
  syncToServer(); // Sync after using boosts
  return used;
}
