# SNAP

A free rubber-band gem slicing game that runs in your browser.

**Pull. Release. Slice.** Drag the band down, let go, and watch it fly up — anything it touches gets sliced. Chain together cuts for big combos, fill the fever bar for double points, and climb the leaderboard. No accounts, no installs, and it plays offline once it's loaded.

## Game modes

- **Daily** — everyone slices the same seed each day, ranked on the daily board.
- **Endless** — survive as long as you can. Scores carry on weekly and all-time boards.
- **Hard** — a tougher endless run, unlocked at level 10.
- **Stages** — 200 campaign stages across 20 worlds, each with a boss.

Earn coins from runs to buy band skins and stage boosts in the shop.

## Tech bits

SNAP is a single Cloudflare Worker: it serves the static frontend, the leaderboard API, and D1-backed user progression — plus `robots.txt` and `sitemap.xml` for the crawlers. The frontend is plain ES modules with no build step, wrapped as a PWA so you can add it to your home screen and play without a signal.

The leaderboard is anti-cheat lite: score physics are sanity-checked, IPs are hashed, submissions are rate-limited, and game sessions are token-validated server-side before a score is accepted.

**Play it live at [snap.dev-shejanmahamud.workers.dev](https://snap.dev-shejanmahamud.workers.dev/).**

## Run it yourself

```bash
npm install
npm run db:init        # set up the local D1 schema
npm run dev            # wrangler dev — game at http://localhost:8787
```

To point the social/Open Graph URLs at a custom domain, then deploy:

```bash
SITE=https://snap.example.com npm run set-site
npm run deploy
```

## License

[MIT](./LICENSE) — though the game assets and brand are reserved.
