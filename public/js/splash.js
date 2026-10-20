/* Branded loading screen: stays up until fonts are ready (max 1.5 s) and for at least half a second. */
const t0 = performance.now();
export function hideSplash() {
  const el = document.getElementById('splash');
  if (!el) return;
  const fonts = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  Promise.race([fonts, new Promise(r => setTimeout(r, 1500))]).then(() => {
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 450); }, Math.max(0, 500 - (performance.now() - t0)));
  });
}
