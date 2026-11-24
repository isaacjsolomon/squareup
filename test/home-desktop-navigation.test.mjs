import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync,existsSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {chromium} from 'playwright';

// Load the complete application, including every inline script/style and its
// external runtime assets. Only authentication and network data are simulated.
// No production accounts or writes; the browser uses normal UI event handlers.
test('desktop Home remains full width after navigation and shows only four tracker tabs', {timeout:120000}, async()=>{
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
  const context=await browser.newContext({viewport:{width:1440,height:1000}});
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

  await page.evaluate(()=>document.getElementById('nav-home').click());
  mkdirSync(resolve(root,'test-results/bills'),{recursive:true});
  async function verifyHome(label){
   await page.waitForFunction(()=>{
    const dashboard=document.getElementById('tracker-dashboard');
    return dashboard.getClientRects().length&&dashboard.classList.contains('sq-tab-overview');
   });
   await page.waitForTimeout(300);
   const state=await page.evaluate(()=>{
    const box=node=>{const r=node.getBoundingClientRect();return {left:r.left,right:r.right,width:r.width}};
    const wrap=document.querySelector('body > .wrap'),dashboard=document.getElementById('tracker-dashboard');
    const bar=dashboard.querySelector('.sq-workspace-tabs');
    const modern=document.getElementById('dw-ref-home'),legacy=document.getElementById('dw-home-columns');
    const activeOverview=modern&&modern.getClientRects().length?modern:legacy;
    return {viewport:innerWidth,wrap:box(wrap),dashboard:box(dashboard),summary:box(activeOverview),
     display:getComputedStyle(wrap).display,
     toolbarContainers:[...document.querySelectorAll('.dw-inline-tracker-header,.dw-integrated-header')].map(n=>n.tagName+'.'+n.className),
     labels:[...bar.querySelectorAll('button')].filter(b=>b.getClientRects().length&&getComputedStyle(b).display!=='none').map(b=>b.textContent.trim()),
     badContainer:document.body.matches('.dw-inline-tracker-header,.dw-integrated-header')||wrap.matches('.dw-inline-tracker-header,.dw-integrated-header')||dashboard.matches('.dw-inline-tracker-header,.dw-integrated-header')};
   });
   console.log('HOME_NAVIGATION',label,JSON.stringify(state));
   assert.equal(state.badContainer,false,'toolbar classes belong only on the header');
   assert.notEqual(state.display,'flex','page wrapper must keep vertical layout');
   assert.ok(state.dashboard.width>state.viewport*.45,'Home must not collapse into a narrow column');
   assert.ok(state.summary.width>state.dashboard.width*.9,'current reference Overview spans Home');
   assert.ok(state.dashboard.right<=state.viewport+1,'Home stays inside viewport');
   assert.deepEqual(state.labels,['Overview','Expenses','Bills','Members']);
   await page.screenshot({path:resolve(root,'test-results/bills/home-'+label+'.png'),fullPage:true});
  }
  await verifyHome('startup');
  // The live desktop greeting is a single wide white surface ending before the
  // original Add button, and follows the viewer's clock without a reload.
  await page.locator('#dw-ref-greeting').waitFor({state:'visible'});
  const greetingPlacement=await page.evaluate(()=>{
    const banner=document.querySelector('#dw-ref-home .dw-ref-greeting');
    const add=document.getElementById('dw-compact-add');
    const b=banner.getBoundingClientRect(),a=add.getBoundingClientRect();
    return {left:b.left,right:b.right,width:b.width,addLeft:a.left,visible:!!b.width};
  });
  assert.ok(greetingPlacement.visible,'desktop greeting must show on the overview');
  assert.ok(greetingPlacement.width>350,'greeting should use the available horizontal space');
  assert.ok(greetingPlacement.right<=greetingPlacement.addLeft,'greeting must not overlap + Add');
  assert.ok(greetingPlacement.addLeft-greetingPlacement.right<=40,'greeting should extend to the Add button');
  const greetingPhases=await page.evaluate(()=>{
    const OriginalDate=Date;
    const check=hour=>{
      class MockDate extends OriginalDate{
        constructor(...args){super(...(args.length?args:[2026,10,23,hour,30]));}
      }
      window.Date=MockDate;
      try{
        window.dispatchEvent(new Event('focus'));
        return {phase:document.querySelector('#dw-ref-home .dw-ref-greeting')?.dataset.timeOfDay,
          text:document.getElementById('dw-ref-greeting')?.textContent,
          date:document.getElementById('dw-ref-greeting-date')?.textContent};
      }finally{window.Date=OriginalDate;}
    };
    return [check(9),check(14),check(19),check(23)];
  });
  for(const [index,phase] of ['morning','afternoon','evening','night'].entries()){
    assert.equal(greetingPhases[index].phase,phase,'wrong phase '+phase);
    assert.match(greetingPhases[index].text,new RegExp('Good '+phase,'i'));
    assert.ok(greetingPhases[index].date.includes('November'),'date should use the actual local date');
  }
  const originalNet=await page.locator('#sq-clean-net').textContent();
  for(const [amount,status] of [['+$3.24','On track'],['-$5.50','To settle'],['$0.00','All settled'],['—','Balance pending']]){
    await page.locator('#sq-clean-net').evaluate((node,value)=>{node.textContent=value;},amount);
    await page.waitForFunction(value=>document.querySelector('#dw-ref-balance-pill')?.textContent===value,status,{timeout:5000});
  }
  await page.locator('#sq-clean-net').evaluate((node,value)=>{node.textContent=value;},originalNet);
  // Desktop My Wallet must contain only the real destination buttons, exactly
  // one visible icon each. Notifications belongs to the primary sidebar.
  await page.locator('#dw-personal-finance').waitFor({state:'visible'});
  await page.locator('#dw-personal-finance').click();
  await page.locator('#dw-my-wallet-flyout').waitFor({state:'visible'});
  const walletNav=await page.evaluate(()=>{
    const panel=document.getElementById('dw-my-wallet-flyout');
    const buttons=[...panel.querySelectorAll(':scope > button.sq-nav-link')];
    const visibleIcons=button=>[...button.querySelectorAll(':scope > .sq-nav-icon, :scope > .dw-ref-static-icon, :scope > .dw-all-nav-icon')].filter(icon=>{
      const css=getComputedStyle(icon);return css.display!=='none'&&css.visibility!=='hidden';
    }).length;
    return {
      ids:buttons.map(button=>button.id),
      iconCounts:buttons.map(visibleIcons),
      notificationsInSidebar:!!document.querySelector('.sidebar .squareup-nav > #dw-ref-nav-notifications'),
      notificationInWallet:!!panel.querySelector('#dw-ref-nav-notifications'),
      cashFlowCount:document.querySelectorAll('#nav-cashflow').length,
      eventsCount:document.querySelectorAll('#sqev-nav').length,
      analyticsCount:document.querySelectorAll('#nav-analytics').length
    };
  });
  assert.deepEqual(walletNav.ids,['nav-analytics','nav-cashflow','sqev-nav'],'wallet contains only Analytics, Cash Flow, Events');
  assert.deepEqual(walletNav.iconCounts,[1,1,1],'wallet rows contain one visible icon each');
  assert.equal(walletNav.notificationsInSidebar,true,'Notifications remains a direct desktop sidebar button');
  assert.equal(walletNav.notificationInWallet,false,'Notifications is not in My Wallet');
  assert.equal(walletNav.cashFlowCount,1,'Cash Flow is not duplicated');
  assert.equal(walletNav.eventsCount,1,'Events is not duplicated');
  assert.equal(walletNav.analyticsCount,1,'Analytics is not duplicated');
  await page.locator('#dw-personal-finance').click();
  assert.ok(await page.locator('#dw-inline-tracker-picker').isVisible(),'switcher visible on Home Overview');
  for(const section of ['expenses','members','bills']){
   await page.evaluate(section=>document.querySelector('#tracker-dashboard [data-sq-tab="'+section+'"]').click(),section);
   await page.waitForTimeout(300);
   assert.equal(await page.locator('#dw-inline-tracker-picker').isVisible(),false,'switcher hidden on '+section);
   await page.evaluate(()=>document.getElementById('nav-home').click());
   await verifyHome('return-'+section);
   assert.ok(await page.locator('#dw-inline-tracker-picker').isVisible(),'switcher restored on Overview');
  }
  for(const destination of ['nav-trackers','nav-analytics','sq-finance-nav','sqev-nav']){
   for(let attempt=0;attempt<2;attempt++){
    await page.evaluate(id=>document.getElementById(id).click(),destination);
    await page.waitForTimeout(300);
    assert.equal(await page.locator('#dw-inline-tracker-picker').isVisible(),false,'switcher hidden on '+destination);
    await page.evaluate(()=>document.getElementById('nav-home').click());
    await verifyHome(destination+'-'+attempt);
   }
  }
  const templateNames=['ROOMMATES','VACATION','SCHOOL TRIP','WEEKEND GETAWAY','SHARED HOUSEHOLD','CAMPING TRIP','FOOD & DINING'];
  for(let index=0;index<templateNames.length;index++){
   await page.evaluate(({id,index})=>{
    localStorage.setItem('sq_tracker_template_'+id,String(index));
    const selector=document.getElementById('tracker-select');selector.value=id;selector.dispatchEvent(new Event('change',{bubbles:true}));
   },{id:tracker,index});
   await page.waitForFunction(()=>document.getElementById('tracker-dashboard').classList.contains('dw-template-original')&&!document.getElementById('sq-template-dashboard').hidden);
   await page.locator('#sq-template-dashboard .sq-td-kicker').filter({hasText:templateNames[index]}).waitFor();
   assert.equal(await page.locator('#dw-home-columns').count(),0,'redesigned Home excluded from template '+index);
   assert.equal(await page.locator('#sq-return-summary').evaluate(e=>e.parentElement.id),'tracker-dashboard','original summary placement');
   assert.ok(await page.locator('#sq-clean-net').isVisible(),'original balance shown');
   assert.equal(await page.locator('#dw-compact-balance').isVisible(),false,'compact balance hidden');
   assert.equal(await page.locator('#sq-clean-remind').evaluate(e=>e.parentElement.className),'sq-clean-balance-actions','original reminder placement');
   assert.ok(await page.locator('#sq-template-dashboard [data-sq-template-action]').count()>0,'template actions retained');
  }
  await page.evaluate(id=>{
   localStorage.removeItem('sq_tracker_template_'+id);
   const selector=document.getElementById('tracker-select');selector.value=id;selector.dispatchEvent(new Event('change',{bubbles:true}));
  },tracker);
  await page.waitForFunction(()=>!document.getElementById('tracker-dashboard').classList.contains('dw-template-original')&&document.getElementById('sq-template-dashboard').hidden);
  await page.locator('#dw-compact-upcoming').waitFor();
  await verifyHome('regular-after-all-templates');
  console.log('HOME_NAVIGATION_ERRORS',JSON.stringify(errors));
 }finally{await browser.close();await new Promise(done=>server.close(done));}
});
