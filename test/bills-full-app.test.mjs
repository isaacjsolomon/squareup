import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync,existsSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {chromium} from 'playwright';

// Load the complete application, including every inline script/style and its
// external runtime assets. Only authentication and network data are simulated.
// No production accounts or writes; the browser uses normal UI event handlers.
test('full app Bills layout, calendar, add/edit/reopen and responsive navigation', {timeout:120000}, async()=>{
 const root=resolve(new URL('..',import.meta.url).pathname);
 const server=createServer((req,res)=>{
  const path=resolve(root,'.'+new URL(req.url,'http://localhost').pathname.replace(/\/$/,'/index.html'));
  if(!path.startsWith(root+'/')||!existsSync(path)){res.writeHead(404);res.end();return;}
  const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css'};
  res.setHeader('Content-Type',types[extname(path)]||'application/octet-stream');res.end(readFileSync(path));
 });
 await new Promise(done=>server.listen(0,'127.0.0.1',done));
 const origin=process.env.BILLS_BASE_URL||'http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 const tracker='11111111-1111-4111-8111-111111111111',user='22222222-2222-4222-8222-222222222222',friend='33333333-3333-4333-8333-333333333333';
 const detail={id:tracker,name:'Weekend apartment',role:'owner',members:[{id:user,name:'Alex',isYou:true},{id:friend,name:'Jordan'}],entries:[],currency:'USD'};
 let bills=[{id:'44444444-4444-4444-8444-444444444444',name:'Electricity',amount:68,due:'2026-12-01',frequency:'monthly',kind:'bill',active:true,recurring_enabled:true},{id:'55555555-5555-4555-8555-555555555555',name:'Netflix',amount:20,due:'2026-12-05',frequency:'monthly',kind:'subscription',active:true,recurring_enabled:true}];
 const writes=[],errors=[];
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  await context.addInitScript(()=>{sessionStorage.setItem('squareup_instagram_invite_shown_session_v2','yes');});
  // A local fake auth SDK exercises the app's existing signed-in startup path.
  await context.route('https://esm.sh/**',route=>route.fulfill({contentType:'text/javascript',body:`export function createClient(){const user={id:'${user}',email:'alex@example.test',email_confirmed_at:'2025-01-01',created_at:'2025-01-01',user_metadata:{full_name:'Alex'},app_metadata:{provider:'email'}};return {auth:{getUser:async()=>({data:{user}}),getSession:async()=>({data:{session:{user,access_token:'test-only'}}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})},rpc:async()=>({data:[]})}}`}));
  await context.route(origin+'/api/**',async route=>{
   const req=route.request(),path=new URL(req.url()).pathname.slice(5),method=req.method();let data=[];
   if(path==='trackers')data=[detail];
   else if(path==='trackers/'+tracker)data=detail;
   else if(path==='profile')data={id:user,username:'alex_test',displayName:'Alex'};
   else if(path==='trackers/'+tracker+'/bills'){
    if(method==='POST'){const body=req.postDataJSON();writes.push({method,body});const bill={...body,id:'66666666-6666-4666-8666-666666666666',active:true};bills.push(bill);data=bill;}else data=bills;
   }else if(path.startsWith('trackers/'+tracker+'/bills/')&&method==='PATCH'){
    const body=req.postDataJSON(),id=path.split('/').at(-1);writes.push({method,body});const bill=bills.find(x=>x.id===id);Object.assign(bill,body);data=bill;
   }
   await route.fulfill({json:data});
  });
  await context.route('https://**',route=>(new URL(route.request().url()).hostname==='esm.sh'||new URL(route.request().url()).origin===origin)?route.fallback():route.abort());
  const page=await context.newPage();page.on('pageerror',error=>errors.push(error.stack));
  await page.goto(origin,{waitUntil:'networkidle'});
  await page.waitForFunction(()=>typeof window.squareUpApi==='function');
  await page.locator('#auth-modal.open').waitFor({state:'hidden'});
  // The public tracker navigation is used; never replace Bills HTML or CSS.
  await page.evaluate(()=>document.getElementById('sq-bills-open').click());
  await page.locator('#sq-bills-bill-list .sq-bills-row').waitFor();
  mkdirSync(resolve(root,'test-results/bills'),{recursive:true});
  for(const width of [320,375,390,430]){
   await page.setViewportSize({width,height:844});
   await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));
   await page.waitForFunction(()=>{const t=document.querySelector('.sq-bills-workspace-tabs').getBoundingClientRect(),h=document.querySelector('.sq-mobile-top').getBoundingClientRect(),p=document.getElementById('sq-bills-page').getBoundingClientRect();return t.top>=h.bottom+8&&Math.abs(t.width-p.width)<1});
   const state=await page.evaluate(()=>{
    const box=s=>{const r=document.querySelector(s).getBoundingClientRect();return {top:r.top,bottom:r.bottom,left:r.left,right:r.right,height:r.height}};
    const nav=box('.sq-bills-workspace-tabs'),back=box('.sq-bills-back'),title=box('.sq-bills-title');
    const a=box('.sq-premium-metrics article:first-child'),b=box('.sq-premium-metrics article:nth-child(2)');
    const bottom=box('.sq-mobile-nav'),header=box('.sq-mobile-top');
    const styles=s=>{const e=document.querySelector(s),c=getComputedStyle(e);return {box:box(s),height:c.height,minHeight:c.minHeight,padding:c.padding,margin:c.margin}};
    return {nav,back,title,a,b,bottom,header,width:innerWidth,overflow:document.documentElement.scrollWidth,body:document.body.className,wrap:styles('body > .wrap'),manager:styles('#trackers-page'),footer:styles('.sq-legal-footer')};
   });
   console.log('FULL_APP_LAYOUT',width,JSON.stringify(state));
   assert.ok(state.nav.top>=state.header.bottom+8,'all tabs must be below the fixed header');
   assert.ok(state.nav.bottom<=state.back.top+1,'tabs must be above Back');
   assert.ok(state.back.bottom<=state.title.top+1,'Back must be above title');
   assert.ok(state.title.bottom<=state.a.top+1,'metrics below title');
   assert.ok(Math.abs(state.a.top-state.b.top)<2,'metrics side by side');
   assert.ok(state.a.height<=150&&state.b.height<=150,'compact metrics');
   assert.ok(state.overflow<=width+1,'no horizontal overflow');
   assert.ok(Math.abs(state.bottom.bottom-844)<2,'bottom navigation anchored');
   assert.equal(await page.locator('#sq-bills-create').isVisible(),false,'Add form stays collapsed until requested');
   const gap=await page.evaluate(()=>document.querySelector('.sq-legal-footer').getBoundingClientRect().top-document.querySelector('.dw-bills-calendar-fold').getBoundingClientRect().bottom);
   assert.ok(gap<90,'no unused spacer below the calendar: '+gap);
   await page.screenshot({path:resolve(root,`test-results/bills/mobile-${width}.png`),fullPage:true});
   await page.screenshot({path:resolve(root,`test-results/bills/viewport-${width}.png`)});
   await page.locator('.dw-bills-calendar-fold').scrollIntoViewIfNeeded();
   const headerOnTop=await page.evaluate(()=>{const r=document.querySelector('.sq-mobile-top').getBoundingClientRect();return !!document.elementFromPoint(r.left+r.width/2,r.top+r.height/2)?.closest('.sq-mobile-top')});
   assert.ok(headerOnTop,'fixed header remains above Bills while scrolling');
   const visibleTabs=await page.evaluate(()=>{const h=document.querySelector('.sq-mobile-top').getBoundingClientRect(),t=document.querySelector('.sq-bills-workspace-tabs').getBoundingClientRect();return t.top>=h.bottom+8&&t.bottom<innerHeight-100});
   assert.ok(visibleTabs,'entire tab bar stays visible while scrolling');
   await page.screenshot({path:resolve(root,`test-results/bills/scrolled-${width}.png`)});
   for(const name of ['Electricity','Netflix']){
    const row=page.locator('.sq-bills-row').filter({hasText:name});
    await row.getByRole('button',{name:'Edit',exact:true}).click();
    const dialog=page.getByRole('dialog',{name:'Edit bill or subscription'});
    await dialog.getByLabel('Name',{exact:true}).fill(name+' updated');
    await dialog.getByRole('button',{name:'Save changes'}).click();
    await dialog.waitFor({state:'hidden'});
    const updated=page.locator('.sq-bills-row').filter({hasText:name+' updated'});
    await updated.getByRole('button',{name:'Edit',exact:true}).click();
    assert.equal(await dialog.getByLabel('Name',{exact:true}).inputValue(),name+' updated');
    await dialog.getByLabel('Name',{exact:true}).fill(name);
    await dialog.getByRole('button',{name:'Save changes'}).click();await dialog.waitFor({state:'hidden'});
   }
  }
  // Model the standalone iPhone status safe area and a taller header. This only
  // changes the environment around the real page; Bills markup/styles stay intact.
  const safeAreaStyle=await page.addStyleTag({content:'html body.sq-bills-open .wrap > .sq-mobile-top{top:59px!important;min-height:76px!important;height:76px!important}'});
  for(const width of [320,375,390,430]){
   await page.setViewportSize({width,height:844});
   await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));
   const safeHeader=await page.locator('.sq-mobile-top').boundingBox();
   assert.ok(Math.abs(safeHeader.y-59)<1&&safeHeader.height>=76,'test must apply the simulated iPhone safe area');
   await page.waitForFunction(()=>{const h=document.querySelector('.sq-mobile-top').getBoundingClientRect(),t=document.querySelector('.sq-bills-workspace-tabs').getBoundingClientRect();return t.top>=h.bottom+8&&Math.abs(t.width-document.getElementById('sq-bills-page').getBoundingClientRect().width)<1});
   await page.screenshot({path:resolve(root,`test-results/bills/iphone-safe-area-${width}.png`)});
   await page.locator('.dw-bills-calendar-fold').scrollIntoViewIfNeeded();
   const clear=await page.evaluate(()=>{const h=document.querySelector('.sq-mobile-top').getBoundingClientRect(),t=document.querySelector('.sq-bills-workspace-tabs').getBoundingClientRect();return t.top>=h.bottom+8&&t.bottom<innerHeight-100});
   assert.ok(clear,'safe-area header never covers sticky tabs at '+width);
   await page.screenshot({path:resolve(root,`test-results/bills/iphone-safe-area-scrolled-${width}.png`)});
  }
  // Match the reported page: no bills and one saved subscription.
  const allBills=bills;bills=bills.filter(item=>item.kind==='subscription');
  await page.setViewportSize({width:390,height:844});
  await page.locator('#sq-bills-tracker').selectOption(tracker);
  await page.waitForFunction(()=>document.getElementById('sq-bills-bill-list').textContent==='No bills yet.');
  await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));
  await page.screenshot({path:resolve(root,'test-results/bills/iphone-subscriptions-only-390.png')});
  bills=allBills;await page.locator('#sq-bills-tracker').selectOption(tracker);
  await page.locator('#sq-bills-bill-list .sq-bills-row').waitFor();
  await safeAreaStyle.evaluate(el=>el.remove());
  await page.locator('.dw-bills-calendar-fold > summary').click();
  assert.ok(await page.locator('#sq-premium-next').isVisible());
  await page.locator('#sq-premium-next').click();
  await page.screenshot({path:resolve(root,'test-results/bills/calendar-430.png'),fullPage:true});
  await page.locator('.sq-bill-create-heading h3').click();
  await page.locator('#sq-bill-name').fill('Water');await page.locator('#sq-bill-amount').fill('32');await page.locator('#sq-bill-date').fill('2026-12-10');
  await page.locator('.sq-bill-type-tab[data-kind="bill"]').click();
  await page.screenshot({path:resolve(root,'test-results/bills/add-430.png')});
  await page.locator('#sq-bills-create button[type="submit"]').click();
  await page.locator('#sq-bill-saved-overlay').waitFor();
  assert.equal(writes.filter(x=>x.method==='POST').length,1,'one create request');
  await page.getByRole('button',{name:'Done',exact:true}).click();
  // Close the existing add dialog after saving, then reopen the saved record.
  if(await page.locator('.sq-bill-modal-portal:not([hidden])').count())await page.locator('#sq-bill-mobile-toggle').click();
  await page.locator('.sq-bills-row').filter({hasText:'Water'}).getByRole('button',{name:'Edit',exact:true}).click();
  await page.screenshot({path:resolve(root,'test-results/bills/edit-430.png')});
  assert.equal(await page.getByRole('dialog',{name:'Edit bill or subscription'}).getByLabel('Name',{exact:true}).inputValue(),'Water');
  await page.getByRole('button',{name:'Cancel',exact:true}).click();
  await page.setViewportSize({width:1280,height:900});
  await page.waitForFunction(()=>!document.getElementById('sq-bills-page').classList.contains('dw-bills-compact'));
  assert.equal(await page.locator('.sq-premium-calendar').evaluate(e=>e.parentElement.className),'sq-premium-overview');
  await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));
  await page.screenshot({path:resolve(root,'test-results/bills/desktop-1280.png'),fullPage:true});
  await page.setViewportSize({width:375,height:844});
  await page.locator('.dw-bills-calendar-fold').waitFor();
  await page.locator('[data-sq-bills-tab="overview"]').click();
  await page.waitForFunction(()=>!document.body.classList.contains('sq-bills-open'));
  assert.equal(writes.filter(x=>x.method==='PATCH').length,16,'both kinds saved/reopened at all four widths');
  // Record errors alongside screenshots for debugging complete app integration.
  console.log('FULL_APP_ERRORS',JSON.stringify(errors));
 }finally{await browser.close();await new Promise(done=>server.close(done));}
});
