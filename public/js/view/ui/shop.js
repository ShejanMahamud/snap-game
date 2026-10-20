/* View: coin shop (skins and stage boosts). */
import { $ } from '../../core/dom.js';
import { SKINS, ownsSkin, playerLevel } from '../../model/progression.js';
import { BOOSTS, boostCount, buyBoost, buySkin, coins, skinPrice } from '../../model/shop.js';
import { refreshMenu } from './menu.js';
import { sfxGold, haptic } from '../audio.js';

export const COIN_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="#FFC400" stroke="#0E1038" stroke-width="2"/><circle cx="12" cy="12" r="5.5" fill="none" stroke="#0E1038" stroke-width="2" opacity=".55"/></svg>';

function item(sw, name, sub, price, can, onBuy, owned) {
  const li = document.createElement('li');
  const i = document.createElement('i'); i.style.background = sw;
  const t = document.createElement('div'); t.className = 'shopTxt';
  const a = document.createElement('b'); a.textContent = name;
  const s = document.createElement('small'); s.textContent = sub;
  t.append(a, s);
  const b = document.createElement('button'); b.type = 'button'; b.className = 'btn small buy';
  if (owned) { b.textContent = 'Owned'; b.disabled = true; b.classList.add('ghost'); }
  else { b.innerHTML = COIN_SVG + '<span></span>'; b.lastChild.textContent = price.toLocaleString(); b.disabled = !can; b.addEventListener('click', onBuy); }
  li.append(i, t, b);
  return li;
}
function render() {
  const have = coins(), lv = playerLevel();
  $('#shopCoins').textContent = have.toLocaleString();
  const bl = $('#shopBoosts'); bl.textContent = '';
  for (const b of BOOSTS) {
    bl.appendChild(item('linear-gradient(90deg,#3DF2B0,#FFE14D)', b.n, b.txt + (boostCount(b.id) ? ' · you have ' + boostCount(b.id) : ''), b.price, have >= b.price,
      () => { if (buyBoost(b.id)) { sfxGold(); haptic(15); render(); } }));
  }
  const sl = $('#shopSkins'); sl.textContent = '';
  SKINS.forEach((s, i) => {
    if (s.lv <= lv) return;
    const owned = ownsSkin(i), p = skinPrice(i);
    sl.appendChild(item('linear-gradient(90deg,' + s.sw + ')', s.n, 'Skin · or free at LV ' + s.lv, p, have >= p,
      () => { if (buySkin(i)) { sfxGold(); haptic(15); render(); } }, owned));
  });
  if (!sl.children.length) { const li = document.createElement('li'); li.className = 'empty'; li.textContent = 'Every skin is unlocked.'; sl.appendChild(li); }
}
export function init() {
  $('#shopBtn').addEventListener('click', () => { $('#menu').hidden = true; $('#shop').hidden = false; render(); });
  $('#shopClose').addEventListener('click', () => { $('#shop').hidden = true; $('#menu').hidden = false; refreshMenu(); });
}
