import { chromium } from '/home/ubuntu/.npm/_npx/9833c18b2d85bc59/node_modules/playwright/index.mjs';
import fs from 'fs';
const BASE='http://127.0.0.1:8085';
const TOKEN=fs.readFileSync('/tmp/claude-1001/-home-ubuntu/f966faad-a72e-40a1-8e74-cb16cd2c49bf/scratchpad/tok.txt','utf8').trim();
const USER =fs.readFileSync('/tmp/claude-1001/-home-ubuntu/f966faad-a72e-40a1-8e74-cb16cd2c49bf/scratchpad/user.json','utf8').trim();
const ID={device:'2c84e9ec-710c-4f46-9f6f-b212274a9809',couple:'cf211940-d29b-4531-bb21-c41db9940fca',pair:'2f064754-d439-47b1-b52a-b3b8400f6eaa',project:'e8a5b046-114c-4b4d-8317-c28411e7781a',asset:'6ca0cd01-09e6-4e11-913e-76fb86054ccb'};

// route -> primary action. `btn` = exact visible label to click (opens a form/modal,
// closed with Escape, never submitted). `probe` = a DOM assertion for routes whose
// only buttons would write to production.
const PLAN=[
  ['/',                         {probe:'kpi', sel:'.ant-card, [class*=card]', min:3, note:'read-only overview'}],
  ['/devices',                  {btn:'Add Device'}],
  [`/devices/${ID.device}`,     {btn:'Edit'}],
  ['/couples',                  {btn:'Add Couple'}],
  [`/couples/${ID.couple}`,     {btn:'Edit'}],
  ['/pairs',                    {btn:'Add Pair'}],
  [`/pairs/${ID.pair}`,         {btn:'Edit'}],
  ['/map',                      {probe:'map', sel:'.leaflet-container img.leaflet-tile, .leaflet-container', min:1, note:'leaflet tiles'}],
  ['/troubleshooting',          {btn:'Report Error'}],
  ['/comparison',               {probe:'disabled', sel:'button', min:1, note:'Compare disabled until 2 selected (by design)'}],
  ['/documents',                {btn:'Upload'}],
  ['/location-history',         {probe:'form', sel:'.ant-select, .ant-picker', min:1, note:'filter controls'}],
  ['/search',                   {btn:'Filters'}],
  ['/downloads',                {btn:'Upload'}],
  ['/inventory/assets',         {btn:'Add Asset'}],
  [`/inventory/assets/${ID.asset}`, {btn:'Share', share:true}],
  ['/inventory/deployed',       {btn:'Share', share:true}],
  ['/projects',                 {btn:'New Project'}],
  [`/projects/${ID.project}`,   {probe:'tabs', sel:'.ant-tabs-tab', min:5, note:'5 tabs (Step 4 will gate these)'}],
  ['/finance',                  {btn:'Add Expense'}],
  ['/finance/my',               {btn:'Log Advance'}],
  ['/finance/claims',           {btn:'New Claim'}],
  ['/finance/settlement',       {probe:'table', sel:'.ant-table, .ant-empty', min:1, note:'Mark Paid/Reject are writes — not exercised'}],
  ['/personnel',                {btn:'Add Personnel'}],
  ['/audit',                    {probe:'table', sel:'.ant-table, .ant-timeline, .ant-empty', min:1, note:'read-only'}],
  ['/backup',                   {probe:'table', sel:'.ant-table, .ant-card', min:1, note:'Create Backup is a write — not exercised'}],
  ['/reports',                  {probe:'cards', sel:'.ant-card, [class*=card]', min:1, note:'Generate Report is a write — not exercised'}],
  ['/ai',                       {probe:'chat', sel:'textarea, input[type=text]', min:1, note:'New Chat creates a session — not exercised'}],
  ['/settings',                 {probe:'tabs', sel:'.ant-tabs-tab', min:2, note:'tab container'}],
];

const out=[];
for(const [vp,w,h] of [['desktop',1440,900],['mobile',390,844]]){
  const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  const ctx=await browser.newContext({viewport:{width:w,height:h}});
  await ctx.addInitScript(([t,u])=>{localStorage.setItem('access_token',t);localStorage.setItem('auth_user',u);},[TOKEN,USER]);
  const page=await ctx.newPage();
  const netfail=[];
  page.on('requestfailed',r=>netfail.push(`${r.failure()?.errorText} ${r.url().slice(0,90)}`));

  for(const [route,plan] of PLAN){
    const rec={vp,route,result:'',detail:''};
    netfail.length=0;
    try{
      await page.goto(BASE+route,{waitUntil:'domcontentloaded',timeout:20000});
      await page.waitForTimeout(2400);
      if(plan.btn){
        const b=page.locator('button:visible',{hasText:new RegExp(`^${plan.btn}$`,'i')}).first();
        if(await b.count()===0){ rec.result='FAIL'; rec.detail=`button "${plan.btn}" not found`; }
        else if(plan.share){
          const href=await page.evaluate(()=>{ // ShareButton opens wa.me in a new tab; assert the URL it would build
            const w=window; let captured=null; const orig=w.open; w.open=(u)=>{captured=u;return null;};
            const btn=[...document.querySelectorAll('button')].find(x=>/share/i.test(x.innerText)&&x.offsetParent!==null);
            btn?.click(); w.open=orig; return captured;
          });
          rec.result = href && href.startsWith('https://wa.me/?text=') ? 'PASS' : 'FAIL';
          rec.detail = href ? `wa.me link built (${href.length} chars)` : 'no wa.me url produced';
        } else {
          await b.click({timeout:5000});
          await page.waitForTimeout(900);
          const modal=page.locator('.ant-modal-wrap:visible, .ant-drawer-content:visible, [role=dialog]:visible');
          const opened=await modal.count()>0;
          const fields=opened?await page.locator('.ant-modal-wrap:visible input, .ant-drawer-content:visible input, [role=dialog]:visible input').count():0;
          rec.result=opened?'PASS':'FAIL';
          rec.detail=opened?`modal opened, ${fields} inputs, closed without submit`:'click produced no modal';
          if(opened){ await page.keyboard.press('Escape'); await page.waitForTimeout(400); }
        }
      } else {
        const n=await page.locator(plan.sel).count();
        rec.result=n>=plan.min?'PASS':'FAIL';
        rec.detail=`${plan.note}: found ${n} (need >=${plan.min})`;
      }
    }catch(e){ rec.result='FAIL'; rec.detail=String(e.message).replace(/\s+/g,' ').slice(0,110); }
    rec.netfail=[...new Set(netfail)];
    out.push(rec);
    process.stderr.write(`${vp} ${route} ${rec.result} — ${rec.detail}${rec.netfail.length?' | NET:'+rec.netfail.join(';'):''}\n`);
  }
  await browser.close();
}
fs.writeFileSync('/tmp/claude-1001/-home-ubuntu/f966faad-a72e-40a1-8e74-cb16cd2c49bf/scratchpad/actions.json',JSON.stringify(out,null,2));
console.log('action checks:',out.length,'failures:',out.filter(x=>x.result==='FAIL').length);
