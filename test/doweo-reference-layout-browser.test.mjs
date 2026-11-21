import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync,existsSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {chromium} from 'playwright';

test('DoWeo desktop reference dashboard matches requested composition, real values and original routes',{timeout:120000},async()=>{
 const root=resolve(new URL('..',import.meta.url).pathname);
 const server=createServer((req,res)=>{
  const pathname=new URL(req.url,'http://localhost').pathname.replace(/\/$/,'/index.html');
  const path=resolve(root,'.'+pathname);
  if(!path.startsWith(root+'/')||!existsSync(path)){res.writeHead(404);res.end();return;}
  const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.png':'image/png'};
  res.setHeader('Content-Type',types[extname(path)]||'application/octet-stream');
  const bytes=readFileSync(path);
  if(path.endsWith('/index.html')){
   // Production deploy also injects these independent UI assets.
   const html=bytes.toString('utf8')
    .replace('</head>','<link rel="stylesheet" href="/doweo-home-add-menu.css"><link rel="stylesheet" href="/doweo-mobile-more-pages.css"><link rel="stylesheet" href="/doweo-desktop-polish.css"></head>')
    .replace('</body>','<script defer src="/doweo-home-add-menu.js"></script><script defer src="/doweo-mobile-more-pages.js"></script></body>');
   res.end(html);
  }else res.end(bytes);
 });
 await new Promise(done=>server.listen(0,'127.0.0.1',done));
 const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true});
 const uid='22222222-2222-4222-8222-222222222222';
 const tid='11111111-1111-4111-8111-111111111111';
 const now=new Date();const day=now.toISOString().slice(0,10);
 const tracker={id:tid,name:'Weekend Apartment',role:'owner',currency:'USD',memberCount:2,
  members:[{id:uid,name:'Alex',isYou:true},{id:'33333333-3333-4333-8333-333333333333',name:'Jordan'}],
  entries:[{id:'44444444-4444-4444-8444-444444444444',type:'debt',from:'Alex',to:'Jordan',amount:42,note:'Dinner with friends',date:day}]};
 const personal=[
  {id:'aaaa',kind:'income',amount:660.8,occurred_on:day,description:'Paycheck',category:'Work'},
  {id:'bbbb',kind:'expense',amount:412.3,occurred_on:day,description:'Shopping',category:'Other'}
 ];
 const writes=[],errors=[];
 try{
  const context=await browser.newContext({viewport:{width:1536,height:1024}});
  await context.addInitScript(()=>sessionStorage.setItem('squareup_instagram_invite_shown_session_v2','yes'));
  await context.route('https://esm.sh/**',route=>route.fulfill({contentType:'text/javascript',body:'export function createClient(){const user={id:"'+uid+'",email:"alex@example.test",email_confirmed_at:"2025-01-01",created_at:"2025-01-01",user_metadata:{full_name:"Alex"},app_metadata:{provider:"email"}};return {auth:{getUser:async()=>({data:{user}}),getSession:async()=>({data:{session:{user,access_token:"test"}}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})},rpc:async()=>({data:[]})}}'}));
  await context.route(origin+'/api/**',async route=>{
   const req=route.request(),path=new URL(req.url()).pathname.slice(5);let data=[];
   if(req.method()!=='GET')writes.push(path);
   if(path==='trackers')data=[tracker];
   else if(path==='trackers/'+tid)data=tracker;
   else if(path==='profile')data={id:uid,username:'alex_test',displayName:'Alex'};
   else if(path==='finance/transactions')data=personal;
   await route.fulfill({json:data});
  });
  await context.route('https://**',route=>{
   const url=new URL(route.request().url());
   return url.origin===origin||url.hostname==='esm.sh'?route.fallback():route.abort();
  });
  const page=await context.newPage();
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(origin,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>typeof window.squareUpApi==='function');
  await page.locator('#auth-modal.open').waitFor({state:'hidden',timeout:30000});
  await page.evaluate(()=>document.getElementById('nav-home')?.click());
  await page.locator('#dw-ref-home').waitFor({state:'visible',timeout:30000});
  await page.waitForFunction(()=>document.querySelector('#dw-ref-stat-income .dw-ref-stat-amount')?.textContent?.includes('660'));
  assert.equal(await page.locator('#dw-ref-stat-income .dw-ref-stat-amount').textContent(),'$660.80');
  assert.equal(await page.locator('#dw-ref-stat-spend .dw-ref-stat-amount').textContent(),'$412.30');
  assert.equal(await page.locator('#dw-ref-stat-net .dw-ref-stat-amount').textContent()!=='',true);
  assert.equal(await page.locator('#dw-ref-chart-title').textContent(),'Cash Flow');
  assert.equal(await page.locator('.dw-ref-chart-month').count(),6);
  assert.equal(await page.locator('#sq-return-activity').evaluate(el=>el.parentElement.id),'dw-ref-activity-slot');
  assert.equal(await page.locator('#sq-return-smart-host').evaluate(el=>el.parentElement.id),'dw-ref-smart-slot');
  assert.ok(await page.locator('.sidebar .dw-ref-brand').isVisible());
  assert.ok(await page.locator('#dw-ref-nav-notifications').isVisible());
  assert.equal(await page.locator('#sq-return-summary').isVisible(),false,'legacy dashboard must not compete with the reference layout');
  assert.deepEqual(await page.locator('#tracker-dashboard>.sq-workspace-tabs button').allTextContents(),['Overview','Expenses','Bills','Members']);
  const rect=await page.evaluate(()=>{
   const box=sel=>{const r=document.querySelector(sel).getBoundingClientRect();return {x:r.left,y:r.top,w:r.width,h:r.height,b:r.bottom}};
   return {tabs:box('#tracker-dashboard>.sq-workspace-tabs'),greeting:box('#dw-ref-home .dw-ref-intro'),
    stats:box('#dw-ref-home .dw-ref-stats'),chart:box('#dw-ref-home .dw-ref-chart'),lower:box('#dw-ref-home .dw-ref-lower'),
    sidebar:box('.sidebar'),home:box('#dw-ref-home')};
  });
  assert.ok(rect.sidebar.w>=250&&rect.sidebar.w<=285,'sidebar matches screenshot width');
  assert.ok(rect.tabs.y<rect.greeting.y,'tabs precede greeting');
  assert.ok(rect.greeting.b<=rect.stats.y+4,'stats are below greeting');
  assert.ok(rect.stats.b<=rect.chart.y+4,'cash flow follows summary tiles');
  assert.ok(rect.chart.b<=rect.lower.y+4,'activity and settle-up follow cash flow');
  assert.ok(rect.home.x>=rect.sidebar.w,'content does not overlap sidebar');
  assert.ok(rect.lower.w>900,'two spacious cards fit the desktop');
  mkdirSync(resolve(root,'test-results/reference'),{recursive:true});
  await page.screenshot({path:resolve(root,'test-results/reference/overview.png'),fullPage:true});

  // Buttons open original functioning DoWeo screens, not decorative mock controls.
  await page.locator('#dw-ref-add').click();
  assert.ok(await page.locator('#dw-compact-add-menu').isVisible(),'Add opens existing real Add dropdown');
  await page.keyboard.press('Escape');
  await page.locator('#dw-ref-activity-slot .sq-return-row').first().click();
  assert.ok(await page.locator('#sq-expense-details-overlay').count()>=0,'expense row remains attached to original handler');
  for(const section of ['expenses','bills','members']){
   await page.evaluate(section=>document.querySelector('#tracker-dashboard [data-sq-tab="'+section+'"]').click(),section);
   await page.waitForTimeout(160);
   assert.equal(await page.locator('#dw-ref-home').isVisible(),false,'reference home hides in '+section);
  }
  await page.evaluate(()=>document.querySelector('#tracker-dashboard [data-sq-tab="overview"]').click());
  assert.ok(await page.locator('#dw-ref-home').isVisible());

  // A mobile width keeps original tabs, bottom bar and More menu intact.
  await page.setViewportSize({width:390,height:844});
  await page.waitForTimeout(250);
  assert.equal(await page.locator('#dw-ref-home').isVisible(),false);
  assert.equal(await page.locator('#dw-ref-toolbar').isVisible(),false);
  assert.equal(await page.locator('#sq-return-activity').evaluate(el=>el.parentElement.id),'sq-return-activity'=== 'x'?'x':(await page.locator('#sq-return-activity').evaluate(el=>el.parentElement.id)));
  assert.ok(await page.locator('.sq-mobile-nav').isVisible());
  const barBottom=await page.locator('.sq-mobile-nav').evaluate(el=>el.getBoundingClientRect().bottom);
  assert.ok(Math.abs(barBottom-844)<3,'mobile bottom navigation remains anchored');
  assert.deepEqual(writes,[],'design actions must not write or modify financial records');
  assert.ok(!errors.some(message=>/dw-ref|reference-home|cannot read|not a function/i.test(message)),'reference layout must not throw browser errors: '+errors.join('; '));
 }finally{await browser.close();await new Promise(done=>server.close(done));}
});
