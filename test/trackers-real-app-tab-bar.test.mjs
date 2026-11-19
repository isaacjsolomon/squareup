import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync,existsSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {chromium} from 'playwright';

// Full application integration: the actual index and its runtime styles/scripts.
test('Trackers bar is visible on real desktop app and survives both workspace transitions', {timeout:120000}, async()=>{
 const root=resolve(new URL('..',import.meta.url).pathname);
 const server=createServer((req,res)=>{
  const name=resolve(root,'.'+new URL(req.url,'http://localhost').pathname.replace(/\/$/,'/index.html'));
  if(!name.startsWith(root+'/')||!existsSync(name)){res.writeHead(404);res.end();return}
  res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json'})[extname(name)]||'application/octet-stream');
  const file=readFileSync(name);
  if(name.endsWith('/index.html')){
   res.end(file.toString('utf8').replace('</head>','<link rel="stylesheet" href="/doweo-trackers-tabs.css?v=regression"></head>'));
  }else res.end(file);
 });
 await new Promise(done=>server.listen(0,'127.0.0.1',done));
 const origin=process.env.TRACKERS_BASE_URL||('http://127.0.0.1:'+server.address().port);
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 const uid='22222222-2222-4222-8222-222222222222',id='11111111-1111-4111-8111-111111111111';
 const tracker={id,name:'Family Vacation',role:'owner',memberCount:1,members:[{id:uid,name:'Alex',isYou:true}],entries:[],currency:'USD'};
 try{
  const context=await browser.newContext({viewport:{width:1440,height:900}});
  await context.addInitScript(()=>sessionStorage.setItem('squareup_instagram_invite_shown_session_v2','yes'));
  const fakeSdk='export function createClient(){const user={id:"'+uid+'",email:"alex@example.test",email_confirmed_at:"2025-01-01",created_at:"2025-01-01",user_metadata:{full_name:"Alex"},app_metadata:{provider:"email"}};return {auth:{getUser:async()=>({data:{user}}),getSession:async()=>({data:{session:{user,access_token:"test"}}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})},rpc:async()=>({data:[]})}}';
  await context.route('https://esm.sh/**',route=>route.fulfill({contentType:'text/javascript',body:fakeSdk}));
  await context.route(origin+'/api/**',async route=>{
   const url=new URL(route.request().url()),path=url.pathname.slice(5);
   let data=[];
   if(path==='trackers')data=[tracker];
   else if(path==='trackers/'+id)data=tracker;
   else if(path==='profile')data={id:uid,username:'alex_test',displayName:'Alex'};
   else if(path==='finance/workspace-links')data=[{tracker_id:id,workspace_type:url.searchParams.get('type')}];
   await route.fulfill({json:data});
  });
  await context.route('https://**',route=>{
   const url=new URL(route.request().url());
   return url.hostname==='esm.sh'||url.origin===origin?route.fallback():route.abort();
  });
  const page=await context.newPage();
  const errors=[];page.on('pageerror',err=>errors.push(err.message));
  await page.goto(origin,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>typeof window.squareUpApi==='function',{timeout:30000});
  await page.locator('#auth-modal.open').waitFor({state:'hidden',timeout:30000});
  await page.locator('#nav-trackers').click();
  assert.equal(await page.locator('#sq-ng-content').evaluate(el=>el.parentElement?.classList.contains('sq-ng-shell')),true,'Finance workspace content must be directly under shell, not nested inside its header');
  const nav=page.locator('#trackers-page > nav.dw-section-tabs[aria-label="Tracker sections"]');
  await page.waitForFunction(()=>document.body.classList.contains('trackers-view'));
  await page.waitForFunction(()=>document.querySelector('#trackers-page > nav[aria-label="Tracker sections"]')?.dataset.inlineWorkspaces==='true');
  assert.equal(await nav.isVisible(),true,'All Trackers bar visible in real app');
  assert.deepEqual(await nav.locator('button').allTextContents(),['All Trackers','Trips','Households']);
  const metrics=await nav.evaluate(el=>({display:getComputedStyle(el).display,position:getComputedStyle(el).position,height:el.getBoundingClientRect().height}));
  assert.equal(metrics.display,'grid');
  assert.equal(metrics.position,'sticky');
  assert.ok(metrics.height>=40&&metrics.height<75,'tab bar remains compact');
  await nav.getByRole('button',{name:'Trips'}).click();
  await page.waitForFunction(()=>document.getElementById('sq-nextgen')?.parentElement?.id==='dw-trackers-workspace-host');
  assert.equal(await nav.isVisible(),true,'Trips does not hide the bar');
  await page.waitForFunction(()=>document.getElementById('sq-ng-content')?.textContent?.includes('Your trips'));
  const tripState=await page.locator('#sq-ng-content').evaluate(el=>{
    const nodes=[el,el.parentElement,el.parentElement?.parentElement,el.parentElement?.parentElement?.parentElement,document.getElementById('dw-trackers-workspace-host'),document.getElementById('trackers-page')];
    return nodes.map(n=>n&&({tag:n.tagName,id:n.id,classes:n.className,hidden:n.hidden,display:getComputedStyle(n).display,visibility:getComputedStyle(n).visibility,opacity:getComputedStyle(n).opacity,rect:{width:n.getBoundingClientRect().width,height:n.getBoundingClientRect().height},scrollHeight:n.scrollHeight}));
  });
  console.log('TRIP_LAYOUT_VISIBILITY',JSON.stringify(tripState));
  assert.equal(await page.locator('#sq-ng-content .sq-ng-workspace-directory').isVisible(),true,'Trip workspace directory must actually be visible on-screen');
  assert.equal(await page.locator('#sq-ng-content .sq-ng-workspace-open').isVisible(),true,'Trip workspace entry is actionable');
  await page.locator('#sq-ng-content .sq-ng-workspace-open').first().click();
  await page.locator('#sq-ng-content .sq-ng-trip-hero').waitFor({state:'visible'});
  assert.equal(await page.locator('#sq-ng-content [data-ng-trip-action="budget"]').isVisible(),true,'Trip budget action is visible');
  await page.locator('#sq-ng-content [data-ng-trip-action="budget"]').click();
  assert.equal(await page.locator('#sq-ng-content #sq-ng-trip-plan-editor').isVisible(),true,'Trip budget editor actually opens');
  mkdirSync(resolve(root,'test-results/trackers'),{recursive:true});
  await page.screenshot({path:resolve(root,'test-results/trackers/trips-visible.png'),fullPage:true});
  await page.locator('#sq-ng-content #sq-ng-workspace-back').click();
  assert.equal(await page.locator('#sq-ng-content #sq-ng-workspace-new').isVisible(),true,'Trip create action must be visible');
  await nav.getByRole('button',{name:'Households'}).click();
  assert.equal(await nav.isVisible(),true,'Households does not hide the bar');
  await page.waitForFunction(()=>document.getElementById('sq-ng-content')?.textContent?.includes('Your households'));
  assert.equal(await page.locator('#sq-ng-content .sq-ng-workspace-directory').isVisible(),true,'Household workspace directory must actually be visible on-screen');
  await page.locator('#sq-ng-content .sq-ng-workspace-open').first().click();
  await page.locator('#sq-ng-content .sq-ng-household-hero').waitFor({state:'visible'});
  assert.equal(await page.locator('#sq-ng-content [data-ng-trip-action="budget"]').isVisible(),true,'Household budget action is visible');
  await page.locator('#sq-ng-content [data-ng-trip-action="budget"]').click();
  assert.equal(await page.locator('#sq-ng-content #sq-ng-trip-plan-editor').isVisible(),true,'Household budget editor actually opens');
  mkdirSync(resolve(root,'test-results/trackers'),{recursive:true});
  await page.screenshot({path:resolve(root,'test-results/trackers/households-visible.png'),fullPage:true});
  await page.locator('#sq-ng-content #sq-ng-workspace-back').click();
  assert.equal(await page.locator('#sq-ng-content #sq-ng-workspace-new').isVisible(),true,'Household create action must be visible');
  await nav.getByRole('button',{name:'All Trackers'}).click();
  assert.equal(await nav.isVisible(),true,'All Trackers restores bar');
  assert.equal(await page.locator('#trackers-gallery').isVisible(),true,'existing cards are available');
  await page.setViewportSize({width:390,height:844});
  assert.equal(await nav.isVisible(),false,'new bar does not change mobile');
  assert.equal(await page.locator('#trackers-gallery').isVisible(),true);
  assert.ok(!errors.some(e=>e.includes('inlineWorkspaces')),'no initialization errors');
 }finally{await browser.close();await new Promise(done=>server.close(done))}
});
