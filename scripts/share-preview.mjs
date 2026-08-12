// Print the WhatsApp message each page would actually send.
//
// Read-only: window.open is replaced so nothing opens, and the captured text is
// stashed in localStorage because it survives whatever navigation the click
// triggers — a page-scoped variable does not.
//
// NOTE: tok.txt expires. A stale token makes every page 401, and the api
// client logs out and redirects, which surfaces as "Execution context was
// destroyed" rather than anything mentioning auth. Re-mint before blaming the
// harness — see STATUS.md.
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE);
import fs from 'fs';
const BASE='http://127.0.0.1:8085';
const TOKEN=fs.readFileSync('./tok.txt','utf8').trim(), USER=fs.readFileSync('./user.json','utf8').trim();
const b=await chromium.launch();
for (const [name,path] of [['Leadership','/leadership'],['Inventory','/inventory/assets'],['My Finance','/finance/my'],['Attendance board','/attendance']]) {
  const c=await b.newContext({viewport:{width:1440,height:900}});
  await c.addInitScript(([t,u])=>{localStorage.setItem('access_token',t);localStorage.setItem('auth_user',u);},[TOKEN,USER]);
  // Stash to localStorage rather than a JS variable: it survives whatever
  // navigation the click triggers, which a page-scoped variable does not.
  await c.addInitScript(()=>{
    const real = window.open;
    window.open = (u,...rest) => { try { localStorage.setItem('__shared', String(u)); } catch {} return null; };
  });
  const pg=await c.newPage();
  await pg.goto(BASE+path,{waitUntil:'load'}).catch(()=>{});
  await pg.waitForSelector('text=Share',{timeout:20000}).catch(()=>{});
  await pg.waitForTimeout(1200);
  await pg.click('text=Share',{timeout:5000}).catch(()=>{});
  await pg.waitForTimeout(900);
  const raw = await pg.evaluate(()=>{ try { return localStorage.getItem('__shared'); } catch { return null; } }).catch(()=>null);
  const msg = raw ? decodeURIComponent(String(raw).split('text=')[1]||'') : '(not captured)';
  console.log(`\n═════ ${name} ═════\n${msg}`);
  await c.close();
}
await b.close();
