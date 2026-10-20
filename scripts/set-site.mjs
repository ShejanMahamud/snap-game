// Usage: SITE=https://snap.yourname.workers.dev npm run set-site
// Social crawlers need absolute URLs, so this swaps the placeholder in index.html.
import { readFileSync, writeFileSync } from 'node:fs';
const site = (process.env.SITE || process.argv[2] || '').replace(/\/$/, '');
if (!/^https?:\/\/[^/]+$/.test(site)) { console.error('Set SITE=https://your-domain'); process.exit(1); }
const f = new URL('../public/index.html', import.meta.url);
writeFileSync(f, readFileSync(f, 'utf8').replaceAll(/https?:\/\/snap\.example\.com|__SITE__/g, site));
console.log('Updated index.html with', site);
