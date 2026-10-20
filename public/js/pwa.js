/* Offline install: service worker, install button (Android/desktop + iOS hint), offline-ready and update toasts. */
import { $ } from './core/dom.js';
import { saveStore, store } from './model/store.js';

let deferred = null;
const standalone = () => navigator.standalone || (window.matchMedia && matchMedia('(display-mode: standalone)').matches);
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export function toast(msg, actionLabel, action) {
  const el = $('#toast'); if (!el) return;
  el.textContent = '';
  const t = document.createElement('span'); t.textContent = msg; el.appendChild(t);
  if (actionLabel) { const b = document.createElement('button'); b.type = 'button'; b.textContent = actionLabel; b.addEventListener('click', action); el.appendChild(b); }
  el.hidden = false; el.classList.add('show');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => { el.classList.remove('show'); setTimeout(() => { el.hidden = true; }, 300); }, actionLabel ? 8000 : 3500);
}

export function initPwa() {
  const btn = $('#installBtn'), hint = $('#iosHint');
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault(); deferred = e;
    if (btn && !standalone()) btn.hidden = false;
  });
  window.addEventListener('appinstalled', () => { deferred = null; if (btn) btn.hidden = true; toast('SNAP is installed'); });
  if (btn && isIOS() && !standalone()) { btn.textContent = 'Add to Home Screen'; btn.hidden = false; }
  if (btn) btn.addEventListener('click', async () => {
    if (deferred) {
      deferred.prompt();
      try { await deferred.userChoice } catch (_) {}
      deferred = null; btn.hidden = true;
    } else if (hint) hint.hidden = !hint.hidden;
  });
  // the manifest link must live in <head>
  try {
    if (!document.querySelector('link[rel="manifest"]')) {
      const l = document.createElement('link'); l.rel = 'manifest'; l.href = new URL('manifest.webmanifest', document.baseURI).href;
      document.head.appendChild(l);
    }
  } catch (_) {}
  if ('serviceWorker' in navigator && /^https?:/.test(location.protocol)) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').then(reg => {
        reg.addEventListener('updatefound', () => {
          const w = reg.installing;
          if (w) w.addEventListener('statechange', () => {
            if (w.state === 'installed' && navigator.serviceWorker.controller) toast('A new version is ready', 'Reload', () => location.reload());
          });
        });
      }).catch(() => {});
      navigator.serviceWorker.ready.then(() => {
        const tag = $('#offlineTag'); if (tag) tag.hidden = false;
        if (!store.offlineSeen) { store.offlineSeen = 1; saveStore(); toast('Ready to play offline'); }
      });
    });
  }
}
