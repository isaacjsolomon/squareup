import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync,existsSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {chromium} from 'playwright';
import {SHELL_TRANSLATIONS} from '../doweo-unified-locales.mjs';

test('every main desktop route has the navy/mint shell, icons, and localized real cashflow',{timeout:150000},async()=>{
 const root=resolve(new URL('..',import.meta.url).pathname);
 const server=createServer((req,res)=>{
  const pathname=new URL(req.url,'http://localhost').pathname.replace(/\/$/,'/index.html');
  const path=resolve(root,'.'+pathname);
  if(!path.startsWith(root+'/')||!existsSync(path)){res.writeHead(404);res.end();return;}
  const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.png':'image/png'};
  res.setHeader('Content-Type',types[extname(path)]||'application/octet-stream');
  const bytes=readFileSync(path);
  if(path.endsWith('/index.html')){
   // In production the Cloudflare build injects these legacy extension files.
   res.end(bytes.toString('utf8').replace('</head>',
    '<link rel="stylesheet" href="/doweo-home-add-menu.css"><link rel="stylesheet" href="/doweo-desktop-polish.css"></head>')
    .replace('</body>','<script defer src="/doweo-home-add-menu.js"></script></body>'));
  }else res.end(bytes);
 });
 await new Promise(done=>server.listen(0,'127.0.0.1',done));
 const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true});
 const user='22222222-2222-4222-8222-222222222222';
 const tid='11111111-1111-4111-8111-111111111111';
 const day=new Date().toISOString().slice(0,10);
 const tracker={id:tid,name:'Group Expenses',role:'owner',memberCount:2,currency:'USD',
  members:[{id:user,name:'Alex',isYou:true},{id:'33333333-3333-4333-8333-333333333333',name:'Jordan'}],
  entries:[{id:'44444444-4444-4444-8444-444444444444',type:'debt',from:'Alex',to:'Jordan',
    amount:42,note:'Dinner',date:day}]};
 const personal=[{id:'aaaa',kind:'income',amount:660.8,occurred_on:day,description:'Allowance',category:'Other'},
  {id:'bbbb',kind:'expense',amount:412.3,occurred_on:day,description:'School',category:'Other'}];
 const writes=[],errors=[];
 try{
  const ctx=await browser.newContext({viewport:{width:1536,height:900}});
  await ctx.addInitScript(()=>sessionStorage.setItem('squareup_instagram_invite_shown_session_v2','yes'));
  await ctx.route('https://esm.sh/**',route=>route.fulfill({contentType:'text/javascript',
   body:'export function createClient(){const user={id:"'+user+'",email:"alex@example.test",email_confirmed_at:"2025-01-01",created_at:"2025-01-01",user_metadata:{full_name:"Alex"},app_metadata:{provider:"email"}};return {auth:{getUser:async()=>({data:{user}}),getSession:async()=>({data:{session:{user,access_token:"test"}}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})},rpc:async()=>({data:[]})}}'}));
  await ctx.route(origin+'/api/**',async route=>{
   const req=route.request(),path=new URL(req.url()).pathname.slice(5);let data=[];
   if(req.method()!=='GET')writes.push({path,method:req.method()});
   if(path==='trackers')data=[tracker];
   else if(path==='trackers/'+tid)data=tracker;
   else if(path==='profile')data={id:user,username:'alex_test',displayName:'Alex'};
   else if(path==='finance/transactions')data=personal;
   await route.fulfill({json:data});
  });
  await ctx.route('https://**',route=>{
   const url=new URL(route.request().url());
   return url.origin===origin||url.hostname==='esm.sh'?route.fallback():route.abort();
  });
  const page=await ctx.newPage();
  page.on('pageerror',err=>errors.push(err.message));
  await page.goto(origin,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>typeof window.squareUpApi==='function',{timeout:30000});
  await page.locator('#auth-modal.open').waitFor({state:'hidden',timeout:30000});
  await page.waitForFunction(()=>typeof window.dwUnifiedLocale==='object',{timeout:30000});
  await page.evaluate(()=>document.getElementById('nav-home').click());
  await page.locator('#dw-ref-home').waitFor({state:'visible'});
  await page.waitForFunction(()=>document.querySelector('#dw-ref-stat-income .dw-ref-stat-amount')?.textContent?.includes('660'));
  assert.equal(await page.locator('#dw-ref-stat-income .dw-ref-stat-amount').textContent(),'$660.80');
  assert.equal(await page.locator('#dw-ref-stat-spend .dw-ref-stat-amount').textContent(),'$412.30');
  assert.equal(await page.locator('.dw-ref-chart-month').count(),6);
  assert.equal(await page.locator('.dw-ref-chart-bar').count(),12);
  assert.equal(await page.locator('.dw-ref-chart-gridline').count(),5);
  assert.equal(await page.locator('#dw-ref-home .dw-ref-net-line').count(),0,
   'no artificial five-month flatline leading into a single transaction month');
  assert.equal(await page.locator('.dw-ref-chart-month .dw-ref-empty-month').count(),6);
  const activeBars=await page.locator('.dw-ref-chart-bar').evaluateAll(bar=>
    bar.filter(b=>!b.classList.contains('dw-ref-zero')).map(b=>parseFloat(b.style.height)));
  assert.equal(activeBars.length,2);
  assert.ok(activeBars[0]>activeBars[1]&&activeBars[1]>0,'income/spending bars scale to actual data');
  const label=await page.locator('#dw-ref-home .dw-ref-chart-summary').textContent();
  assert.match(label,/Net this month/);
  mkdirSync(resolve(root,'test-results/unified'),{recursive:true});
  await page.screenshot({path:resolve(root,'test-results/unified/overview.png'),fullPage:true});

  console.log('SHELL_BOOT_STATE',JSON.stringify(await page.evaluate(()=>({
   hasRuntime:!!window.dwUnifiedShell,hasHeader:!!document.getElementById('dw-all-topbar'),
   headerVisible:!!document.getElementById('dw-all-topbar')?.getClientRects().length,
   originalTab:!!document.querySelector('#tracker-dashboard > .sq-workspace-tabs'),
   loggedIn:document.body.className,
   navigation:document.querySelector('.sidebar .squareup-nav')?.children.length,
   firstNavIcon:document.querySelector('#nav-home > .dw-all-nav-icon')?.outerHTML.slice(0,180)||null,
   scripts:[...document.scripts].filter(s=>s.src.includes('unified')).map(s=>s.src),
   resources:performance.getEntriesByType('resource').filter(r=>r.name.includes('unified')).map(r=>[r.name,r.responseStatus])
  }))));
  const sidebar=await page.evaluate(()=>{
   const nav=document.querySelector('.sidebar .squareup-nav');
   return [...nav.querySelectorAll(':scope > button.sq-nav-link,:scope > .dw-nav-social-trigger,:scope > .dw-nav-group > summary')]
    .filter(el=>!!el.getClientRects().length&&getComputedStyle(el).display!=='none')
    .map(el=>{
      const icon=el.querySelector(':scope > .dw-all-nav-icon');
      const label=el.querySelector('.sq-nav-label,.dw-social-label,.dw-nav-group-name');
      const rect=el.getBoundingClientRect(),glyph=icon?.getBoundingClientRect();
      return {id:el.id||el.closest('details')?.dataset.dwNavGroup||el.className,
       height:rect.height,iconWidth:glyph?.width||0,iconHeight:glyph?.height||0,
       iconVisible:icon?getComputedStyle(icon).display!=='none':false,
       textSize:label?getComputedStyle(label).fontSize:'',
       textFamily:label?getComputedStyle(label).fontFamily:''};
    });
  });
  console.log('UNIFIED_SIDEBAR',JSON.stringify(sidebar));
  assert.ok(sidebar.length>=5,'the live sidebar must have at least five destinations');
  for(const row of sidebar){
   assert.ok(Math.abs(row.height-53)<2,row.id+' height must match the unified buttons');
   assert.ok(row.iconVisible&&row.iconWidth>=22&&row.iconHeight>=22,row.id+' icon is missing');
   assert.equal(row.textSize,'16px',row.id+' should share text size');
  }
  assert.equal(new Set(sidebar.map(x=>x.textFamily)).size,1,'all sidebar buttons use the same font');

  async function pageOpen(id,expected){
   await page.evaluate(id=>document.getElementById(id)?.click(),id);
   await page.waitForFunction(cls=>document.body.classList.contains(cls),expected,{timeout:10000});
   await page.locator('#dw-all-topbar').waitFor({state:'visible',timeout:10000});
   const names=await page.locator('#dw-all-top-tabs button').allTextContents();
   assert.deepEqual(names,['Overview','Expenses','Bills','Members'],
    'every page keeps the same tracker tabbar');
   const toolsVisible=await page.locator('#dw-all-top-tools button:visible').count();
   assert.equal(toolsVisible,3,'all pages keep the three account shortcuts');
  }
  await pageOpen('nav-trackers','trackers-view');
  await page.screenshot({path:resolve(root,'test-results/unified/trackers.png'),fullPage:true});
  await pageOpen('nav-analytics','analytics-view');
  await page.screenshot({path:resolve(root,'test-results/unified/analytics.png'),fullPage:true});
  await pageOpen('nav-profile','settings-view');
  await page.screenshot({path:resolve(root,'test-results/unified/settings.png'),fullPage:true});
  await pageOpen('nav-about','about-view');
  await page.screenshot({path:resolve(root,'test-results/unified/about.png'),fullPage:true});
  await page.locator('#dw-all-top-tabs [data-dw-all-tab="expenses"]').click();
  await page.waitForFunction(()=>document.querySelector('#tracker-dashboard.sq-tab-expenses')?.getClientRects().length>0);
  assert.ok(await page.locator('#dw-all-topbar').isVisible(),'new header stays present on Expenses');
  await page.locator('#dw-all-top-tabs [data-dw-all-tab="members"]').click();
  await page.waitForFunction(()=>document.querySelector('#tracker-dashboard.sq-tab-members')?.getClientRects().length>0);
  assert.ok(await page.locator('#dw-all-topbar').isVisible(),'new header stays present on Members');
  await page.locator('#dw-all-top-tabs [data-dw-all-tab="overview"]').click();
  await page.locator('#dw-ref-home').waitFor({state:'visible',timeout:10000});
  for(const code of ['es','fr','he','he-script','zh-Hans','ar','bn']){
   await page.evaluate(code=>{
    window.DoWeoI18n.set(window,code);
    window.dwUnifiedLocale.apply();
   },code);
   const key=code==='he-script'?'he':code;
   const observed=await page.locator('#dw-ref-stat-net .dw-ref-stat-label').textContent();
   assert.equal(observed,SHELL_TRANSLATIONS[key].netBalance,key+' dashboard balance heading is English');
   const chartText=await page.locator('#dw-ref-chart-title').textContent();
   assert.equal(chartText,SHELL_TRANSLATIONS[key].cashFlow,key+' chart heading is untranslated');
   const topText=await page.locator('#dw-all-top-tabs [data-dw-all-tab="overview"]').textContent();
   assert.equal(topText,SHELL_TRANSLATIONS[key].overview,key+' global tab is untranslated');
  }
  await page.evaluate(()=>{window.DoWeoI18n.set(window,'en');window.dwUnifiedLocale.apply();});
  assert.equal(await page.locator('#dw-ref-stat-net .dw-ref-stat-label').textContent(),'Net Balance');

  await page.setViewportSize({width:390,height:844});
  assert.equal(await page.locator('#dw-all-topbar').isVisible(),false,'mobile does not get desktop header');
  assert.equal(await page.locator('#dw-ref-home').isVisible(),false,'original mobile Overview is untouched');
  assert.ok(await page.locator('.sq-mobile-nav').isVisible(),'fixed mobile bottom bar remains usable');
  const bottom=await page.locator('.sq-mobile-nav').evaluate(el=>el.getBoundingClientRect().bottom);
  assert.ok(Math.abs(bottom-844)<3,'mobile bottom navigation remains flush to bottom');
  assert.deepEqual(writes.filter(entry=>entry.path!=='ui-translate'),[],
   'no visual or translation action may write financial, tracker or profile records');
  assert.ok(!errors.some(x=>/unified-shell|unified-localize|dw-ref|not a function/i.test(x)),
   'new shell must not emit runtime errors: '+errors.join('; '));
 }finally{
  await browser.close();
  await new Promise(done=>server.close(done));
 }
});
