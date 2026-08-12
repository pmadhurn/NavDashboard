// Phase 10 sweep: every route, both themes, phone width.
//
// Checks the non-negotiables that a render test does not: no document-level
// horizontal scroll, no console errors, no element wider than the viewport,
// and no permanent spinner (a page still showing a loading state after 8s has not
// terminated, which N1 forbids).
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
import fs from 'fs';

const BASE = process.env.BASE || 'http://127.0.0.1:8085';
const TOKEN = fs.readFileSync(process.env.TOK_FILE || './tok.txt', 'utf8').trim();
const USER = fs.readFileSync(process.env.USER_FILE || './user.json', 'utf8').trim();

const ID = {
  device: '2c84e9ec-710c-4f46-9f6f-b212274a9809',
  couple: 'cf211940-d29b-4531-bb21-c41db9940fca',
  pair: '2f064754-d439-47b1-b52a-b3b8400f6eaa',
  project: 'e8a5b046-114c-4b4d-8317-c28411e7781a',
  asset: '6ca0cd01-09e6-4e11-913e-76fb86054ccb',
};

const ROUTES = [
  '/', '/me', '/me/attendance', '/overview',
  '/devices', `/devices/${ID.device}`, '/couples', `/couples/${ID.couple}`,
  '/pairs', `/pairs/${ID.pair}`, '/map', '/troubleshooting', '/comparison',
  '/documents', '/location-history', '/search', '/downloads',
  '/inventory/assets', `/inventory/assets/${ID.asset}`, '/inventory/deployed',
  '/inventory/returns', '/inventory/handovers', '/inventory/kits', '/inventory/repairs',
  '/projects', `/projects/${ID.project}`,
  '/finance', '/finance/my', '/finance/claims', '/finance/settlement',
  '/attendance', '/compoff', '/updates', '/leadership',
  '/personnel', '/audit', '/backup', '/reports', '/ai',
  '/settings', '/settings/access', '/system',
];

const browser = await chromium.launch();
let checks = 0, problems = 0;

for (const theme of ['dark', 'light']) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.addInitScript(
    ([t, u, th]) => {
      localStorage.setItem('access_token', t);
      localStorage.setItem('auth_user', u);
      localStorage.setItem('theme_mode', th);
    },
    [TOKEN, USER, theme]
  );
  const page = await ctx.newPage();

  for (const route of ROUTES) {
    const errors = [];
    page.removeAllListeners('console');
    page.on('console', (m) => {
      if (m.type() === 'error' && !m.text().includes('404')) errors.push(m.text().slice(0, 90));
    });

    await page.goto(BASE + route, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(900);

    const r = await page.evaluate(() => {
      const doc = document.documentElement;
      const overflow = doc.scrollWidth > doc.clientWidth + 1;
      // Any element sticking out past the viewport is the usual cause.
      let widest = null;
      if (overflow) {
        for (const el of Array.from(document.querySelectorAll('body *'))) {
          const rect = el.getBoundingClientRect();
          if (rect.right > window.innerWidth + 2 && rect.width > 40) {
            widest = (el.tagName + '.' + (el.className || '').toString().slice(0, 40)).slice(0, 60);
            break;
          }
        }
      }
      const spinning = !!document.querySelector('.ant-spin-spinning');
      const blank = (document.body.innerText || '').trim().length < 20;
      return { overflow, widest, spinning, blank };
    }).catch(() => ({ overflow: false, spinning: false, blank: true, widest: 'eval failed' }));

    checks++;
    const bad = r.overflow || r.spinning || r.blank || errors.length > 0;
    if (bad) {
      problems++;
      console.log(
        `${theme.padEnd(5)} ${route.padEnd(34)}` +
          (r.overflow ? ` OVERFLOW(${r.widest})` : '') +
          (r.spinning ? ' STILL-SPINNING' : '') +
          (r.blank ? ' BLANK' : '') +
          (errors.length ? ` ERR:${errors[0]}` : '')
      );
    }
  }
  await ctx.close();
}

await browser.close();
console.log(`\n${checks} checks · ${problems} problem(s)`);
