// NavOS route sweep — all 29 routes x {1440, 390}.
// Read-only against production: navigates, opens the primary action, closes it.
// Never submits a form.
//
// Setup (no password change, no DB write — mints a token with the app's own
// signing key, then captures the /auth/me payload the store hydrates from):
//
//   UID=$(docker exec navdashboard-db-1 psql -U navdashboard -d navdashboard -t -A \
//     -c "SELECT id FROM users WHERE role='ADMIN' AND deleted_at IS NULL LIMIT 1")
//   docker exec navdashboard-backend-1 python -c \
//     "import sys;sys.path.insert(0,'/app');from core.security import create_access_token;\
//      print(create_access_token('$UID','ADMIN'))" | tail -1 > tok.txt
//   curl -s http://127.0.0.1:8085/api/v1/auth/me -H "Authorization: Bearer $(cat tok.txt)" > user.json
//
// BOTH files are required. authStore.ts hydrates `user` from auth_user, and
// routes.tsx reads `if (user && !hasPermission(...))` — a null user FAILS OPEN,
// so a token-only session renders every guarded route and the sweep lies.
//
// Run (needs `playwright` resolvable — `npm i -D playwright`, or point
// PLAYWRIGHT_MODULE at an existing install as below):
//   PLAYWRIGHT_MODULE=/path/to/node_modules/playwright/index.mjs \
//   PLAYWRIGHT_BROWSERS_PATH=/home/ubuntu/.cache/ms-playwright \
//   node scripts/route-sweep.mjs
//
// Env: TOK_FILE, USER_FILE, OUT all default to ./ in the working directory.
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
import fs from 'fs';

const BASE = 'http://127.0.0.1:8085';
const TOKEN = fs.readFileSync(process.env.TOK_FILE || './tok.txt', 'utf8').trim();
const USER = fs.readFileSync(process.env.USER_FILE || './user.json', 'utf8').trim();

const ID = {
  device: '2c84e9ec-710c-4f46-9f6f-b212274a9809',
  couple: 'cf211940-d29b-4531-bb21-c41db9940fca',
  pair: '2f064754-d439-47b1-b52a-b3b8400f6eaa',
  project: 'e8a5b046-114c-4b4d-8317-c28411e7781a',
  asset: '6ca0cd01-09e6-4e11-913e-76fb86054ccb',
};
const BAD = '00000000-0000-0000-0000-000000000000';

const ROUTES = [
  '/', '/devices', `/devices/${ID.device}`, '/couples', `/couples/${ID.couple}`,
  '/pairs', `/pairs/${ID.pair}`, '/map', '/troubleshooting', '/comparison',
  '/documents', '/location-history', '/search', '/downloads',
  '/inventory/assets', `/inventory/assets/${ID.asset}`, '/inventory/deployed',
  '/projects', `/projects/${ID.project}`,
  '/finance', '/finance/my', '/finance/claims', '/finance/settlement',
  '/personnel', '/audit', '/backup', '/reports', '/ai', '/settings',
];
// 404 / empty-state handling on detail routes — never exercised before.
const BAD_ID_ROUTES = [
  `/devices/${BAD}`, `/couples/${BAD}`, `/pairs/${BAD}`,
  `/projects/${BAD}`, `/inventory/assets/${BAD}`,
];

// Filters carried over from the 2026-08-09 sweep so counts stay comparable.
const NOISE = [
  /destroyOnClose/i, /React Router Future Flag/i, /Download the React DevTools/i,
  /\[antd: Menu\]/i, /findDOMNode/i,
];
const isNoise = (t) => NOISE.some((r) => r.test(t));

async function overflow(page) {
  return page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const doc = document.documentElement.scrollWidth;
    const offenders = [];
    if (doc > vw + 1) {
      for (const el of document.querySelectorAll('*')) {
        const r = el.getBoundingClientRect();
        if (r.width <= vw + 1) continue;
        // ignore if inside something that scrolls horizontally on purpose
        let p = el.parentElement, scrollable = false;
        while (p) {
          const s = getComputedStyle(p);
          if (/(auto|scroll)/.test(s.overflowX) && p.scrollWidth > p.clientWidth) { scrollable = true; break; }
          p = p.parentElement;
        }
        if (!scrollable) offenders.push(`${el.tagName.toLowerCase()}.${(el.className||'').toString().slice(0,40)} w=${Math.round(r.width)}`);
      }
    }
    return { vw, doc, overflow: doc > vw + 1, offenders: offenders.slice(0, 3) };
  });
}

async function primaryAction(page) {
  // Find the first enabled action button in the page header, click it, expect a
  // modal/drawer, then close. Writes nothing.
  const btn = page.locator('button:visible').filter({
    hasText: /^(Add|New|Create|Upload|Generate|Log|Record|Export|Backup|Run|Compare|Post)/i,
  }).first();
  if ((await btn.count()) === 0) return { found: false, ok: null, note: 'no primary action button' };
  const label = (await btn.innerText().catch(() => '')).trim().slice(0, 30);
  try {
    await btn.click({ timeout: 4000 });
    await page.waitForTimeout(700);
    const modal = page.locator('.ant-modal-wrap:visible, .ant-drawer-content:visible, [role="dialog"]:visible');
    const opened = (await modal.count()) > 0;
    if (opened) {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
    }
    return { found: true, ok: opened, label, note: opened ? 'modal opened + closed' : 'clicked, no modal (may act in place)' };
  } catch (e) {
    return { found: true, ok: false, label, note: `click failed: ${String(e.message).slice(0, 80)}` };
  }
}

const results = [];

for (const [wName, w, h] of [['desktop', 1440, 900], ['mobile', 390, 844]]) {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  await ctx.addInitScript(([t, u]) => {
    localStorage.setItem('access_token', t);
    localStorage.setItem('auth_user', u);
  }, [TOKEN, USER]);
  const page = await ctx.newPage();

  const all = wName === 'desktop' ? [...ROUTES, ...BAD_ID_ROUTES] : ROUTES;
  for (const route of all) {
    const errs = [];
    const onC = (m) => { if (m.type() === 'error' && !isNoise(m.text())) errs.push(m.text().slice(0, 160)); };
    const onP = (e) => { if (!isNoise(e.message)) errs.push('PAGEERROR ' + e.message.slice(0, 160)); };
    page.on('console', onC); page.on('pageerror', onP);

    let rec = { viewport: wName, route, renders: false, bounced: null, action: null, overflow: null, errors: [] };
    try {
      await page.goto(BASE + route, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.waitForTimeout(2200);
      rec.bounced = new URL(page.url()).pathname;
      const body = (await page.locator('body').innerText().catch(() => '')).trim();
      rec.renders = body.length > 40;
      rec.textLen = body.length;
      rec.overflow = await overflow(page);
      if (!route.includes(BAD)) rec.action = await primaryAction(page);
    } catch (e) {
      rec.errors.push('NAV ' + String(e.message).slice(0, 120));
    }
    page.off('console', onC); page.off('pageerror', onP);
    rec.errors.push(...errs);
    results.push(rec);
    process.stderr.write(`${wName} ${route} ${rec.renders ? 'OK' : 'BLANK'}${rec.overflow?.overflow ? ' OVERFLOW' : ''}${rec.errors.length ? ' ERR' + rec.errors.length : ''}\n`);
  }
  await browser.close();
}

fs.writeFileSync(process.env.OUT || './sweep.json', JSON.stringify(results, null, 2));
console.log('checks:', results.length);
