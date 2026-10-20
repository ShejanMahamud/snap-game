/* Model: one rule twist per world (campaign stages only). */
export const TWISTS = [
  null,
  { name: 'Tides',        txt: 'Gems sway wide',            sway: 2.2 },
  { name: 'Fog',          txt: 'Gems fade in late',         fog: 0.45 },
  { name: 'Wind',         txt: 'Gusts push every gem',      gust: 0.09 },
  { name: 'Heat',         txt: 'Gems fall faster',          speed: 1.22 },
  { name: 'Pulse',        txt: 'Gems bob up and down',      pulse: 0.5 },
  { name: 'Blink',        txt: 'Gems flicker out of sight', blink: 1 },
  { name: 'Zigzag',       txt: 'Gems dart side to side',    zig: 2.1 },
  { name: 'Downpour',     txt: 'Many more gems',            dens: 0.62 },
  { name: 'Minefield',    txt: 'Twice the bombs',           bombMul: 1.9 },
  { name: 'Gale',         txt: 'Strong gusts, faster gems', gust: 0.14, speed: 1.1 },
  { name: 'Deep Fog',     txt: 'Thick fog, wide sway',      fog: 0.6, sway: 1.6 },
  { name: 'Ricochet',     txt: 'Zigzag and bobbing',        zig: 2.4, pulse: 0.4 },
  { name: 'Heatwave',     txt: 'Gems fall very fast',       speed: 1.35 },
  { name: 'Storm Tides',  txt: 'Huge sway and wind',        sway: 2.8, gust: 0.07 },
  { name: 'Flicker',      txt: 'Fast gems that blink',      blink: 1, speed: 1.15 },
  { name: 'Blast Zone',   txt: 'Bombs everywhere',          bombMul: 2.3, dens: 0.75 },
  { name: 'Whiteout',     txt: 'Heavy fog and wind',        fog: 0.7, gust: 0.1 },
  { name: 'Chaos',        txt: 'Sway, bobbing and wind',    sway: 2, pulse: 0.4, gust: 0.08 },
  { name: 'Event Horizon', txt: 'Everything at once',       fog: 0.5, blink: 1, speed: 1.25, gust: 0.1, pulse: 0.3 }
];
export function twistFor(world) { return TWISTS[world] || null; }
