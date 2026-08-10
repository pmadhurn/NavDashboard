// Render the nav as a NON-admin, for three personas, at two widths.
//
// Setup is the same as route-sweep.mjs (tok.txt + user.json); see its header.
// Run:
//   PLAYWRIGHT_MODULE=... PLAYWRIGHT_BROWSERS_PATH=... node scripts/nav-personas.mjs
//
// TWO interceptions are required and BOTH are load-bearing:
//   1. localStorage.auth_user — what authStore hydrates `user` from.
//   2. GET /auth/me           — Layout's useCurrentUser() writes the response
//                               straight back into the store, so without this
//                               the injected persona is replaced by the real
//                               ADMIN a moment after load and every persona
//                               renders 10 tabs. That looks like a permission
//                               bug in the product; it is a bug in the harness.
//
// Read-only: no DB write, no form submitted.
//
// Original note: No DB write: the token stays the admin's
// (the backend still authorises it), but auth_user — the payload authStore
// hydrates `user` from, and the only thing the client-side nav and route
// guard read — carries a narrowed permission map.
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE);
import fs from 'fs';

const BASE = 'http://127.0.0.1:8085';
const TOKEN = fs.readFileSync('./tok.txt', 'utf8').trim();
const base = JSON.parse(fs.readFileSync('./user.json', 'utf8'));

const PERSONAS = {
  technician: {
    role: 'TECHNICIAN',
    permissions: {
      devices: 'EDIT', inventory: 'EDIT', documents: 'EDIT',
      troubleshooting: 'EDIT', downloads: 'EDIT', projects: 'EDIT',
      personnel: 'VIEW', attendance: 'EDIT', updates: 'EDIT', exports: 'EDIT',
    },
  },
  viewer: {
    role: 'VIEWER',
    permissions: {
      devices: 'VIEW', inventory: 'VIEW', documents: 'VIEW',
      troubleshooting: 'VIEW', downloads: 'VIEW', projects: 'VIEW',
      attendance: 'VIEW', updates: 'VIEW',
    },
  },
  boss: {
    role: 'VIEWER',
    permissions: {
      leadership: 'VIEW', updates: 'EDIT', attendance: 'VIEW',
      projects: 'VIEW', finance: 'VIEW', devices: 'VIEW', personnel: 'VIEW',
    },
  },
};

const browser = await chromium.launch();

for (const [name, persona] of Object.entries(PERSONAS)) {
  const user = JSON.stringify({ ...base, ...persona });
  for (const [vp, w, h] of [['desk', 1440, 900], ['mob', 390, 844]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h } });
    await ctx.addInitScript(([t, u]) => {
      localStorage.setItem('access_token', t);
      localStorage.setItem('auth_user', u);
    }, [TOKEN, user]);
    const page = await ctx.newPage();
    // Layout calls useCurrentUser(), which GETs /auth/me and writes the result
    // straight back into the store — replacing the injected persona with the
    // real ADMIN. Seeding localStorage alone is NOT enough; the response has to
    // be intercepted too, or every persona renders as an admin.
    await page.route('**/api/v1/auth/me', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: user }));
    const errors = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 90)); });
    await page.goto(BASE + '/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);

    const tabs = await page.$$eval('.navos-tab, nav[aria-label="Workspaces"] button',
      (els) => els.map((e) => e.getAttribute('title') || e.textContent.trim()).filter(Boolean));
    const of = await page.evaluate(() =>
      document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    await page.screenshot({ path: `na-${name}-${vp}.png` });
    console.log(`${(name + '/' + vp).padEnd(18)} tabs=${tabs.length} [${tabs.join(', ')}] overflowX=${of ? 'YES' : 'no'} errors=${errors.length}`);
    await ctx.close();
  }

  // A route the persona must NOT reach should bounce to /
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(([t, u]) => {
    localStorage.setItem('access_token', t);
    localStorage.setItem('auth_user', u);
  }, [TOKEN, user]);
  const page = await ctx.newPage();
  await page.route('**/api/v1/auth/me', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: user }));
  await page.goto(BASE + '/settings', { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  console.log(`${(name + ' /settings').padEnd(18)} -> ${new URL(page.url()).pathname} ${new URL(page.url()).pathname === '/' ? '(blocked, correct)' : '(REACHED — BAD)'}`);
  await ctx.close();
}

await browser.close();
