import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync,existsSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {chromium} from 'playwright';

// Use the full application HTML and real existing click handlers; only auth/data are faked.
test('desktop Tracker gallery has no category bar and Overview Add expense menu runs all three original actions',{timeout:120000},async()=>{
 const root=resolve(new URL('..',import.meta.url).pathname);
 const server=createServer((req,res)=>{
  const name=resolve(root,'.'+new URL(req.url,'http://localhost').pathname.replace(/\/$/,'/index.html'));
  if(!name.startsWith(root+'/')||!existsSync(name)){res.writeHead(404);res.end();return}
  res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css'})[extname(name)]||'application/octet-stream');
  const file=readFileSync(name);
  if(name.endsWith('/index.html')){
   const head='<link rel="stylesheet" href="/doweo-trackers-tabs.css"><link rel="stylesheet" href="/doweo-home-add-menu.css"><link rel="stylesheet" href="/doweo-desktop-polish.css">';
   const body='<script defer src="/doweo-home-add-menu.js"></script>';
   res.end(file.toString('utf8').replace('</head>',head+'</head>').replace('</body>',body+'</body>'));
  }else res.end(file);
 });
 await new Promise(done=>server.listen(0,'127.0.0.1',done));
 const origin=process.env.HOME_BASE_URL||'http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 const uid='22222222-2222-4222-8222-222222222222',tid='11111111-1111-4111-8111-111111111111';
 const tracker={id:tid,name:'Group Expenses',role:'owner',memberCount:2,members:[{id:uid,name:'Alex',isYou:true},{id:'33333333-3333-4333-8333-333333333333',name:'Jordan'}],entries:[],currency:'USD'};
 const errors=[],writes=[];
 try{
  const context=await browser.newContext({viewport:{width:1440,height:900}});
  await context.addInitScript(()=>sessionStorage.setItem('squareup_instagram_invite_shown_session_v2','yes'));
  await context.route('https://esm.sh/**',route=>route.fulfill({contentType:'text/javascript',body:'export function createClient(){const user={id:"'+uid+'",email:"alex@example.test",email_confirmed_at:"2025-01-01",created_at:"2025-01-01",user_metadata:{full_name:"Alex"},app_metadata:{provider:"email"}};return {auth:{getUser:async()=>({data:{user}}),getSession:async()=>({data:{session:{user,access_token:"test"}}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})},rpc:async()=>({data:[]})}}'}));
  await context.route(origin+'/api/**',async route=>{
   const req=route.request(),path=new URL(req.url()).pathname.slice(5);let data=[];
   if(req.method()!=='GET')writes.push({method:req.method(),path});
   if(path==='trackers')data=[tracker];
   else if(path==='trackers/'+tid)data=tracker;
   else if(path==='profile')data={id:uid,username:'alex_test',displayName:'Alex'};
   await route.fulfill({json:data});
  });
  await context.route('https://**',route=>{
   const url=new URL(route.request().url());
   return url.origin===origin||url.hostname==='esm.sh'?route.fallback():route.abort();
  });
  const page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>typeof window.squareUpApi==='function',{timeout:30000});
  await page.locator('#auth-modal.open').waitFor({state:'hidden',timeout:30000});

  await page.locator('#nav-trackers').click();
  await page.waitForFunction(()=>document.body.classList.contains('trackers-view'));
  assert.equal(await page.locator('#trackers-page > nav.dw-section-tabs[aria-label="Tracker sections"]').count(),0,'old All Trackers / Trips / Households switcher is removed');
  assert.equal(await page.locator('#trackers-gallery').isVisible(),true,'tracker cards remain visible');

  await page.locator('#nav-home').click();
  const dashboard=page.locator('#tracker-dashboard');
  await page.waitForFunction(()=>document.querySelector('#tracker-dashboard.sq-tab-overview')?.getClientRects().length>0);
  await page.locator('#dw-compact-add[aria-haspopup="menu"]').waitFor({state:'visible',timeout:15000});
  const labels=await dashboard.locator('.sq-workspace-tabs button:visible').allTextContents();
  assert.deepEqual(labels.map(s=>s.trim()),['Overview','Expenses','Bills','Members'],'tracker detail navigation remains unchanged');

  const toggle=page.locator('#dw-compact-add');
  await toggle.click();
  const menu=page.locator('#dw-compact-add-menu');
  assert.equal(await menu.isVisible(),true,'button opens a real dropdown instead of submitting an expense');
  const desktopStyle=await menu.evaluate(el=>{
    const item=el.querySelector('button');
    const icon=item.querySelector('.dw-compact-add-option-icon');
    return {menuRadius:getComputedStyle(el).borderRadius,itemMinHeight:getComputedStyle(item).minHeight,iconHeight:getComputedStyle(icon).height};
  });
  assert.deepEqual(desktopStyle,{menuRadius:'14px',itemMinHeight:'58px',iconHeight:'39px'},'desktop polish is applied without replacing menu actions');
  assert.deepEqual(await menu.locator('[role="menuitem"] strong').allTextContents(),['Add expense','Scan receipt','Split a bill']);
  assert.equal(await page.locator('#sq-expense-dialog').isVisible(),false,'opening menu must not open expense modal');
  await page.keyboard.press('Escape');
  assert.equal(await menu.isVisible(),false,'Escape dismisses the menu');
  assert.equal(await toggle.getAttribute('aria-expanded'),'false');

  await toggle.click();
  await menu.locator('[data-expense-action="quick-expense"]').click();
  await page.locator('#sq-expense-dialog').waitFor({state:'visible'});
  assert.equal(await menu.isVisible(),false,'selecting a command closes dropdown');
  await page.locator('#sq-entry-x').click();
  await page.locator('#sq-expense-dialog').waitFor({state:'hidden'});

  await toggle.click();
  const chooserPromise=page.waitForEvent('filechooser',{timeout:10000});
  await menu.locator('[data-expense-action="quick-receipt"]').click();
  const chooser=await chooserPromise;
  assert.ok(chooser,'Scan receipt must open the actual image picker');
  await page.locator('#sq-receipt-dialog').waitFor({state:'visible'});
  await page.locator('#sq-receipt-x').click();
  await page.locator('#sq-receipt-dialog').waitFor({state:'hidden'});

  await toggle.click();
  await menu.locator('[data-expense-action="quick-split"]').click();
  await page.waitForFunction(()=>document.body.classList.contains('split-view'));
  assert.equal(await page.locator('#split-page').isVisible(),true,'Split a bill opens original bill-splitting screen');
  await page.locator('#split-back').click();

  await page.setViewportSize({width:390,height:844});
  assert.equal(await page.locator('#dw-compact-add-wrapper').isVisible(),false,'desktop-only control is hidden on mobile');
  assert.equal(await page.locator('#dw-compact-add-menu').isVisible(),false,'desktop-only dropdown is hidden on mobile');
  const mobileStyle=await menu.evaluate(el=>{
    const item=el.querySelector('button');
    const icon=item.querySelector('.dw-compact-add-option-icon');
    return {itemMinHeight:getComputedStyle(item).minHeight,iconHeight:getComputedStyle(icon).height};
  });
  assert.deepEqual(mobileStyle,{itemMinHeight:'66px',iconHeight:'43px'},'desktop-only polish does not change mobile button dimensions');
  assert.equal(await page.locator('#tracker-dashboard').isVisible(),true,'mobile tracker Overview remains visible');
  assert.deepEqual(writes,[],'opening actions does not mutate the backend');
  assert.ok(!errors.some(e=>/compact-add-menu|gallerySwitcher|inlineWorkspaces/.test(e)),errors.join('\n'));
 }finally{await browser.close();await new Promise(done=>server.close(done))}
});
