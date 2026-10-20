/* View: the trophy shelf. One trophy per world boss; crown tier follows the stars won. */
import { $ } from '../../core/dom.js';
import { BOSSES, STAGES, WORLDS, stars } from '../../model/campaign.js';
import { ZONES } from '../../model/progression.js';

const TIER = ['', '#CD7F32', '#D8DEE9', '#FFC400'];
const TIER_NAME = ['', 'Bronze', 'Silver', 'Gold'];

export function trophyCount() {
  let n = 0;
  for (let w = 0; w < STAGES / 10; w++) if (stars(w * 10 + 10) > 0) n++;
  return n;
}

function trophySvg(w, st) {
  const z = ZONES[w], got = st > 0;
  const body = got ? z[0] : '#2a2e72', inner = got ? 'rgba(14,16,56,.28)' : 'rgba(255,255,255,.05)';
  const crown = got ? TIER[st] : 'rgba(255,255,255,.14)';
  return '<svg viewBox="0 0 48 52" aria-hidden="true">' +
    '<path d="M13 15 15 6l6 5 3-7 3 7 6-5 2 9z" fill="' + crown + '" stroke="#0E1038" stroke-width="2" stroke-linejoin="round"/>' +
    '<path d="M24 14l14 8v16l-14 8-14-8V22z" fill="' + body + '" stroke="#0E1038" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M24 21l8 4.6v9.2l-8 4.6-8-4.6v-9.2z" fill="' + inner + '"/>' +
    (got ? '<circle cx="20" cy="29" r="1.8" fill="#fff"/><circle cx="28" cy="29" r="1.8" fill="#fff"/><path d="M20 35q4 2 8 0" fill="none" stroke="#0E1038" stroke-width="2" stroke-linecap="round"/>'
         : '<text x="24" y="36" text-anchor="middle" font-size="14" fill="rgba(255,255,255,.35)" font-family="monospace">?</text>') +
    '</svg>';
}

function info(w) {
  const st = stars(w * 10 + 10);
  $('#trophyInfo').textContent = st > 0
    ? BOSSES[w] + ' · ' + WORLDS[w] + ' · ' + TIER_NAME[st] + ' crown'
    : 'World ' + (w + 1) + ' · ' + WORLDS[w] + ' · defeat the boss to earn it';
}

export function renderTrophies() {
  const box = $('#trophyGrid');
  box.textContent = '';
  let best = 0;
  for (let w = 0; w < STAGES / 10; w++) {
    const st = stars(w * 10 + 10);
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'trophy' + (st > 0 ? ' got' : '');
    b.setAttribute('aria-label', (st > 0 ? BOSSES[w] + ' trophy, ' + TIER_NAME[st] : 'Locked trophy, world ' + (w + 1)));
    b.innerHTML = trophySvg(w, st);
    b.addEventListener('click', () => { info(w); box.querySelectorAll('.trophy').forEach(x => x.classList.remove('sel')); b.classList.add('sel'); });
    box.appendChild(b);
    if (st > 0) best = w;
  }
  const n = trophyCount();
  $('#trophyHead').textContent = 'Trophies · ' + n + ' / ' + STAGES / 10;
  info(n ? best : 0);
}
