/* SNAP: one Worker serves the game (static assets), the leaderboard API (D1), robots.txt and sitemap.xml. */
const BOARD = /^(endless|hard|(?:daily|week):(\d{4}-\d{2}-\d{2}))$/;
const MAX_SCORE = 5_000_000;
const SESSION_DURATION = 900000; // 15 minutes
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_SUBMISSIONS_PER_MINUTE = 5;

const json = (data, status = 200) => Response.json(data, { status, headers: { 'cache-control': 'no-store', 'Access-Control-Allow-Origin': '*' } });
const text = (body, type) => new Response(body, { headers: { 'content-type': type, 'cache-control': 'public, max-age=3600' } });

// Cryptographic hash for IP addresses (privacy)
async function hashIP(ip) {
  if (!ip) return null;
  const encoder = new TextEncoder();
  const data = encoder.encode(ip + 'SNAP_SALT_2026');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
}

// Generate secure session token
async function generateSessionToken() {
  const randomBytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Validate game session
async function validateSession(db, sessionId, pid) {
  const session = await db.prepare('SELECT * FROM sessions WHERE session_id = ?1 AND pid = ?2 AND expires > ?3')
    .bind(sessionId, pid, Date.now()).first();
  return session;
}

// Rate limiting check
async function checkRateLimit(db, identifier, action) {
  const now = Date.now();
  const window = Math.floor(now / RATE_LIMIT_WINDOW);
  
  const result = await db.prepare('SELECT count FROM rate_limits WHERE identifier = ?1 AND action = ?2 AND window = ?3')
    .bind(identifier, action, window).first();
  
  const count = result ? result.count : 0;
  
  if (count >= MAX_SUBMISSIONS_PER_MINUTE) {
    return false;
  }
  
  await db.prepare(`INSERT INTO rate_limits (identifier, action, count, window) VALUES (?1, ?2, 1, ?3)
    ON CONFLICT (identifier, action, window) DO UPDATE SET count = count + 1`)
    .bind(identifier, action, window).run();
  
  return true;
}

// Validate score is physically possible
function validateScorePhysics(mode, score, time, events) {
  // Basic physics validation
  if (score < 0 || score > MAX_SCORE) return false;
  if (time < 0 || time > 600) return false; // Max 10 minutes
  
  // Score must be achievable based on time played
  const maxScorePerSecond = 10000; // Generous estimate
  if (score > time * maxScorePerSecond) return false;
  
  // Validate events if provided
  if (events) {
    const { gems = 0, snaps = 0 } = events;
    if (gems < 0 || snaps < 0) return false;
    if (gems > time * 10) return false; // Max ~10 gems per second
  }
  
  return true;
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const ip = req.headers.get('CF-Connecting-IP') || req.headers.get('X-Forwarded-For') || 'unknown';
    
    // CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, X-Session-Token',
          'Access-Control-Max-Age': '86400',
        }
      });
    }
    
    if (url.pathname === '/robots.txt') return text(`User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: ${url.origin}/sitemap.xml\n`, 'text/plain');
    if (url.pathname === '/sitemap.xml') return text(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${url.origin}/</loc></url></urlset>`, 'application/xml');
    
    // Handle HTML requests to inject dynamic OG image URLs
    if (url.pathname === '/' || url.pathname === '/index.html') {
      const res = await env.ASSETS.fetch(req);
      if (res.headers.get('content-type')?.includes('text/html')) {
        let html = await res.text();
        html = html.replaceAll('https://snap.example.com', url.origin);
        return new Response(html, {
          headers: {
            'content-type': 'text/html;charset=UTF-8',
            'cache-control': 'public, max-age=3600',
            // Open Graph specific headers for better social media crawler support
            'X-Robots-Tag': 'index, follow',
          },
        });
      }
      return res;
    }
    
    // Serve og-image.png with proper caching headers for social media crawlers
    if (url.pathname === '/og-image.png') {
      const res = await env.ASSETS.fetch(req);
      return new Response(res.body, {
        headers: {
          'content-type': 'image/png',
          'cache-control': 'public, max-age=31536000, immutable', // Cache for 1 year
          'Access-Control-Allow-Origin': '*', // Allow cross-origin access for social media
        },
      });
    }
    
    // API routes
    if (url.pathname.startsWith('/api/')) {
      try {
        if (url.pathname === '/api/init') return await initUser(req, env.DB, ip);
        if (url.pathname === '/api/session') return await createSession(req, env.DB, ip);
        if (url.pathname === '/api/scores' && req.method === 'GET') return await listScores(url, env.DB);
        if (url.pathname === '/api/scores' && req.method === 'POST') return await submitScore(req, env.DB, ip);
        if (url.pathname === '/api/user') return await getUser(req, env.DB);
        if (url.pathname === '/api/user/save') return await saveUserData(req, env.DB, ip);
        if (url.pathname === '/api/user/stats') return await updateUserStats(req, env.DB, ip);
        if (url.pathname === '/api/stage/seed') return await getStageSeed(req, env.DB);
        return json({ error: 'not_found' }, 404);
      } catch (e) {
        console.error('API Error:', e);
        return json({ error: 'server', message: e.message }, 500);
      }
    }
    
    return env.ASSETS.fetch(req);
  },
};

// Initialize or get user
async function initUser(req, db, ip) {
  if (req.method !== 'POST') return json({ error: 'method' }, 405);
  
  const body = await req.json().catch(() => ({}));
  const pid = body.pid || null;
  
  // Generate new PID if not provided or invalid
  const newPid = pid && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(pid) 
    ? pid 
    : crypto.randomUUID();
  
  const ipHash = await hashIP(ip);
  const now = Date.now();
  
  // Get or create user
  let user = await db.prepare('SELECT * FROM users WHERE pid = ?1').bind(newPid).first();
  
  if (!user) {
    // Create new user
    await db.prepare(`INSERT INTO users (pid, name, xp, coins, created, last_seen, ip_hash, country) 
      VALUES (?1, ?2, 0, 0, ?3, ?3, ?4, NULL)`)
      .bind(newPid, '', now, ipHash).run();
    
    user = { pid: newPid, name: '', xp: 0, coins: 0, created: now, last_seen: now };
  } else {
    // Update last seen
    await db.prepare('UPDATE users SET last_seen = ?1, ip_hash = ?2 WHERE pid = ?3')
      .bind(now, ipHash, newPid).run();
  }
  
  // Get user data
  const userData = await db.prepare('SELECT key, value FROM user_data WHERE pid = ?1').bind(newPid).all();
  const data = {};
  for (const row of userData.results) {
    try {
      data[row.key] = JSON.parse(row.value);
    } catch {
      data[row.key] = row.value;
    }
  }
  
  return json({
    pid: newPid,
    name: user.name,
    xp: user.xp,
    coins: user.coins,
    data
  });
}

// Create game session (anti-cheat)
async function createSession(req, db, ip) {
  if (req.method !== 'POST') return json({ error: 'method' }, 405);
  
  const body = await req.json().catch(() => ({}));
  const { pid, mode, seed } = body;
  
  if (!pid || !mode || typeof seed !== 'number') {
    return json({ error: 'invalid_params' }, 400);
  }
  
  // Check rate limit
  const ipHash = await hashIP(ip);
  const canProceed = await checkRateLimit(db, ipHash, 'create_session');
  if (!canProceed) {
    return json({ error: 'rate_limit' }, 429);
  }
  
  const sessionId = await generateSessionToken();
  const now = Date.now();
  const expires = now + SESSION_DURATION;
  
  await db.prepare(`INSERT INTO sessions (session_id, pid, mode, seed, started, expires, ip_hash)
    VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`)
    .bind(sessionId, pid, mode, seed, now, expires, ipHash).run();
  
  return json({ session_id: sessionId, expires });
}

// Get user data
async function getUser(req, db) {
  if (req.method !== 'GET') return json({ error: 'method' }, 405);
  
  const url = new URL(req.url);
  const pid = url.searchParams.get('pid');
  
  if (!pid) return json({ error: 'missing_pid' }, 400);
  
  const user = await db.prepare('SELECT * FROM users WHERE pid = ?1').bind(pid).first();
  if (!user) return json({ error: 'user_not_found' }, 404);
  
  const userData = await db.prepare('SELECT key, value FROM user_data WHERE pid = ?1').bind(pid).all();
  const data = {};
  for (const row of userData.results) {
    try {
      data[row.key] = JSON.parse(row.value);
    } catch {
      data[row.key] = row.value;
    }
  }
  
  return json({
    name: user.name,
    xp: user.xp,
    coins: user.coins,
    created: user.created,
    data
  });
}

// Save user data (progression, unlocks, etc.)
async function saveUserData(req, db, ip) {
  if (req.method !== 'POST') return json({ error: 'method' }, 405);
  
  const body = await req.json().catch(() => ({}));
  const { pid, data = {} } = body;
  
  if (!pid) return json({ error: 'missing_pid' }, 400);
  
  // Check rate limit
  const ipHash = await hashIP(ip);
  const canProceed = await checkRateLimit(db, ipHash, 'save_data');
  if (!canProceed) {
    return json({ error: 'rate_limit' }, 429);
  }
  
  // Verify user exists
  const user = await db.prepare('SELECT pid FROM users WHERE pid = ?1').bind(pid).first();
  if (!user) return json({ error: 'user_not_found' }, 404);
  
  // Save each data key
  const batch = [];
  for (const [key, value] of Object.entries(data)) {
    // Whitelist allowed keys
    const allowedKeys = ['st', 'daily', 'free', 'hard', 'plays', 'best', 'bstreak', 'streak', 'last', 'skin', 'own', 'boost', 'q', 'pend', 'bg'];
    if (!allowedKeys.includes(key)) continue;
    
    const jsonValue = JSON.stringify(value);
    batch.push(
      db.prepare(`INSERT INTO user_data (pid, key, value) VALUES (?1, ?2, ?3)
        ON CONFLICT (pid, key) DO UPDATE SET value = ?3`)
        .bind(pid, key, jsonValue)
    );
  }
  
  if (batch.length > 0) {
    await db.batch(batch);
  }
  
  return json({ success: true });
}

// Update user stats (for achievements)
async function updateUserStats(req, db, ip) {
  if (req.method !== 'POST') return json({ error: 'method' }, 405);
  
  const body = await req.json().catch(() => ({}));
  const { pid, stats = {} } = body;
  
  if (!pid) return json({ error: 'missing_pid' }, 400);
  
  // Check rate limit
  const ipHash = await hashIP(ip);
  const canProceed = await checkRateLimit(db, ipHash, 'update_stats');
  if (!canProceed) {
    return json({ error: 'rate_limit' }, 429);
  }
  
  const now = Date.now();
  const { gems = 0, gold = 0, mys = 0, fever = 0, rounds = 0, snap = 0, combo = 0, best = 0 } = stats;
  
  // Validate stats (prevent overflow)
  const validate = (n) => Math.max(0, Math.min(Number.MAX_SAFE_INTEGER, parseInt(n) || 0));
  
  await db.prepare(`INSERT INTO user_stats (pid, gems, gold, mys, fever, rounds, snap, combo, best, updated)
    VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)
    ON CONFLICT (pid) DO UPDATE SET 
      gems = gems + ?2,
      gold = gold + ?3,
      mys = mys + ?4,
      fever = fever + ?5,
      rounds = rounds + ?6,
      snap = MAX(snap, ?7),
      combo = MAX(combo, ?8),
      best = MAX(best, ?9),
      updated = ?10`)
    .bind(pid, validate(gems), validate(gold), validate(mys), validate(fever), 
          validate(rounds), validate(snap), validate(combo), validate(best), now)
    .run();
  
  return json({ success: true });
}

// Get stage seed (server-side generation with rotation)
async function getStageSeed(req, db) {
  if (req.method !== 'GET') return json({ error: 'method' }, 405);
  
  const url = new URL(req.url);
  const stageNum = parseInt(url.searchParams.get('stage'));
  
  if (!stageNum || stageNum < 1 || stageNum > 200) {
    return json({ error: 'invalid_stage' }, 400);
  }
  
  // Check if seed exists in database
  let seedData = await db.prepare('SELECT seed, rotated FROM stage_seeds WHERE stage_num = ?1')
    .bind(stageNum).first();
  
  // If not exists or older than 30 days, rotate seed
  const now = Date.now();
  const rotationPeriod = 30 * 24 * 60 * 60 * 1000; // 30 days
  
  if (!seedData || (now - seedData.rotated) > rotationPeriod) {
    // Generate cryptographically secure seed
    const randomBytes = crypto.getRandomValues(new Uint32Array(1));
    const newSeed = randomBytes[0];
    
    await db.prepare(`INSERT INTO stage_seeds (stage_num, seed, rotated) VALUES (?1, ?2, ?3)
      ON CONFLICT (stage_num) DO UPDATE SET seed = ?2, rotated = ?3`)
      .bind(stageNum, newSeed, now).run();
    
    seedData = { seed: newSeed, rotated: now };
  }
  
  return json({ 
    stage: stageNum, 
    seed: seedData.seed,
    next_rotation: seedData.rotated + rotationPeriod
  });
}

// Validate board format with strict whitelist
function validateBoard(board) {
  if (!board || typeof board !== 'string') return false;
  
  // Whitelist allowed board types
  const validBoards = ['endless', 'hard'];
  if (validBoards.includes(board)) return true;
  
  // Validate daily board format: daily:YYYY-MM-DD
  if (board.startsWith('daily:')) {
    const datePart = board.slice(6);
    const dateRegex = /^20[2-9][0-9]-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/;
    if (!dateRegex.test(datePart)) return false;
    
    // Validate date is within reasonable range (not too far in past/future)
    const date = new Date(datePart + 'T12:00:00Z');
    const now = Date.now();
    const dayMs = 86400000;
    const diff = Math.abs(date.getTime() - now);
    return diff < 2 * dayMs; // Within 2 days
  }
  
  // Validate weekly board format: week:YYYY-MM-DD (Monday)
  if (board.startsWith('week:')) {
    const datePart = board.slice(5);
    const dateRegex = /^20[2-9][0-9]-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/;
    if (!dateRegex.test(datePart)) return false;
    
    // Validate date is a Monday and within range
    const date = new Date(datePart + 'T12:00:00Z');
    if (date.getUTCDay() !== 1) return false; // Must be Monday
    
    const now = Date.now();
    const weekMs = 7 * 86400000;
    const diff = Math.abs(date.getTime() - now);
    return diff < 8 * weekMs; // Within 8 weeks
  }
  
  return false;
}

// List leaderboard scores
async function listScores(url, db) {
  const board = url.searchParams.get('board') || '';
  const pid = url.searchParams.get('pid') || '';
  
  // Use strict validation instead of regex
  if (!validateBoard(board)) return json({ error: 'invalid_board' }, 400);
  
  const [top, count, mine] = await db.batch([
    db.prepare('SELECT name, score, country, pid = ?2 AS me FROM scores WHERE board = ?1 ORDER BY score DESC, ts ASC LIMIT 20').bind(board, pid),
    db.prepare('SELECT COUNT(*) AS n FROM scores WHERE board = ?1').bind(board),
    db.prepare('SELECT score, (SELECT COUNT(*) + 1 FROM scores b WHERE b.board = s.board AND b.score > s.score) AS rank FROM scores s WHERE board = ?1 AND pid = ?2').bind(board, pid),
  ]);
  
  return json({ top: top.results, total: count.results[0].n, me: mine.results[0] || null });
}

// Submit score with validation
async function submitScore(req, db, ip) {
  const body = await req.json().catch(() => ({}));
  const { pid, board, name, score, time = 0, events = {}, session_id } = body;
  
  // Validate board with strict whitelist
  if (!validateBoard(board)) {
    return json({ error: 'invalid_board' }, 400);
  }
  
  // Validate inputs
  const nameClean = String(name || '').replace(/[\u0000-\u001f<>&"']/g, '').trim().slice(0, 16);
  
  if (!nameClean || nameClean.length < 2) {
    return json({ error: 'invalid_name', message: 'Name must be at least 2 characters' }, 400);
  }
  
  // Validate PID format (must be UUID)
  if (!pid || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(pid)) {
    return json({ error: 'invalid_pid' }, 400);
  }
  
  // Validate score
  if (!Number.isInteger(score) || score < 1 || score > MAX_SCORE) {
    return json({ error: 'invalid_score' }, 400);
  }
  
  // Physics validation
  if (!validateScorePhysics(board, score, time, events)) {
    return json({ error: 'impossible_score', message: 'Score does not pass physics validation' }, 400);
  }
  
  // Check rate limit
  const ipHash = await hashIP(ip);
  const canProceed = await checkRateLimit(db, ipHash, 'submit_score');
  if (!canProceed) {
    return json({ error: 'rate_limit', message: 'Too many submissions, please wait' }, 429);
  }
  
  // Validate session if provided (optional for now, can be made mandatory)
  if (session_id) {
    const session = await validateSession(db, session_id, pid);
    if (!session) {
      return json({ error: 'invalid_session', message: 'Session expired or invalid' }, 403);
    }
  }
  
  // Get country code
  const cc = req.cf && /^[A-Z]{2}$/.test(req.cf.country || '') && req.cf.country !== 'XX' ? req.cf.country : null;
  
  // Update or insert score
  await db.prepare(
    `INSERT INTO scores (board, pid, name, score, ts, country) VALUES (?1, ?2, ?3, ?4, ?5, ?6)
     ON CONFLICT (board, pid) DO UPDATE SET 
       name = excluded.name, 
       country = COALESCE(excluded.country, country),
       ts = CASE WHEN excluded.score > score THEN excluded.ts ELSE ts END,
       score = MAX(score, excluded.score)`
  ).bind(board, pid, nameClean, score, Date.now(), cc).run();
  
  // Update user record
  await db.prepare('UPDATE users SET name = ?1, last_seen = ?2 WHERE pid = ?3')
    .bind(nameClean, Date.now(), pid).run();
  
  // Return updated leaderboard
  return listScores(new URL(`http://x/?board=${encodeURIComponent(board)}&pid=${encodeURIComponent(pid)}`), db);
}
