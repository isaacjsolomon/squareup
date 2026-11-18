import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync,existsSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {chromium} from 'playwright';

// Load the complete application, including every inline script/style and its
// external runtime assets. Only authentication and network data are simulated.
// No production accounts or writes; the browser uses normal UI event handlers.
test('Recent Activity opens expense details, saves edits, and respects read-only entries', {timeout:120000}, async()=>{
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
 detail.entries=[{id:'88888888-8888-4888-8888-888888888888',type:'debt',from:'Alex',to:'Jordan',amount:12,note:'[Category: Food & Dining] Lunch',date:'2026-11-17',paymentStatus:'confirmed',createdBy:'Alex',canEdit:true}];
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
   else if(path==='trackers/'+tracker+'/entries/88888888-8888-4888-8888-888888888888'&&method==='PATCH'){
    const body=req.postDataJSON();writes.push(body);Object.assign(detail.entries[0],body);data=detail;
   }
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


  await page.evaluate(()=>document.getElementById('nav-trackers').click());
  await page.locator('#trackers-gallery .tile-open').first().click();
  const row=page.locator('#sq-return-activity [data-expense-id="88888888-8888-4888-8888-888888888888"]');
  await row.waitFor();
  const seeAll=page.locator('#dw-home-columns>.sq-overview-activity-panel').getByRole('button',{name:'See all',exact:true});
  await seeAll.click();
  await page.waitForFunction(()=>document.getElementById('tracker-dashboard').classList.contains('sq-tab-expenses'));
  assert.equal(await page.locator('[data-sq-tab="expenses"]').getAttribute('aria-selected'),'true','See all opens all Expenses');

  await page.locator('#dw-expense-workspace').waitFor();
  assert.equal(await page.locator('.dw-expenses-heading h2').textContent(),'Expense History');
  assert.ok((await page.locator('#sq-export-expenses').textContent()).includes('Export Log'));
  assert.equal(await page.locator('#sq-expense-status').isVisible(),false,'standalone Status dropdown removed on desktop');
  const filterPosition=await page.evaluate(()=>{const f=document.getElementById('dw-expense-filter-panel').getBoundingClientRect(),e=document.getElementById('sq-export-expenses').getBoundingClientRect(),s=document.querySelector('.sq-expense-extra').getBoundingClientRect();return {filter:f.left,export:e.left,left:s.left};});
  assert.ok(Math.abs(filterPosition.filter-filterPosition.left)<2&&filterPosition.filter<filterPosition.export,'Filters replaces Status on the left');
  detail.entries.push(...Array.from({length:24},(_,i)=>({...detail.entries[0],id:'fixture-'+i,note:'[Category: Food & Dining] Test expense '+i,paymentStatus:i%2?'pending':'confirmed'})));
  await page.evaluate(()=>window.sqRefreshTrackerNow());
  await page.locator('[data-sq-tab="expenses"]').click();
  await page.waitForFunction(()=>document.querySelectorAll('#history .dw-expense-copy').length===25);
  for(const width of [1024,1440,1920]){
   await page.setViewportSize({width,height:1000});
   await page.waitForTimeout(150);
   const layout=await page.evaluate(()=>{
    const a=document.getElementById('sq-activity-card').getBoundingClientRect(),t=document.getElementById('dw-expense-tools').getBoundingClientRect(),h=document.getElementById('history');
    return {bottom:a.bottom,toolsBottom:t.bottom,scrolls:h.scrollHeight>h.clientHeight,overflow:document.documentElement.scrollWidth>innerWidth+1};
   });
   assert.ok(Math.abs(layout.bottom-layout.toolsBottom)<2,'history bottom aligns with Tools at '+width+' '+JSON.stringify(layout));
   assert.ok(layout.scrolls,'history scrolls internally at '+width);assert.equal(layout.overflow,false);
  }
  await page.setViewportSize({width:1440,height:1000});
  await page.locator('.dw-expense-tabs').getByRole('button',{name:'Pending',exact:true}).click();
  assert.equal(await page.locator('#history>.entry:not([hidden]):not(.dw-type-hidden)').count(),12);
  await page.locator('.dw-expense-tabs').getByRole('button',{name:'All',exact:true}).click();
  await page.locator('#sq-expense-search').fill('Test expense 23');
  await page.waitForFunction(()=>document.querySelectorAll('#history>.entry:not([hidden]):not(.dw-type-hidden)').length===1);
  await page.locator('#sq-expense-search').fill('');
  await page.locator('#history .dw-expense-copy').first().click();
  await page.waitForFunction(()=>document.getElementById('sq-details-overlay').classList.contains('open'));
  await page.getByRole('button',{name:'Close expense details',exact:true}).click();
  mkdirSync(resolve(root,'test-results/bills'),{recursive:true});
  await page.screenshot({path:resolve(root,'test-results/bills/expenses-redesigned-scroll.png'),fullPage:true});


  await page.evaluate(()=>{window.Tesseract={recognize:async()=>({data:{text:'Pizza 10.00\nTOTAL 10.00'}})};});
  const desktopChooserPromise=page.waitForEvent('filechooser');
  await page.locator('#dw-expense-tools [data-sq-quick="quick-receipt"]').click();
  const desktopChooser=await desktopChooserPromise;
  await desktopChooser.setFiles({name:'desktop-receipt.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j5n8AAAAASUVORK5CYII=','base64')});
  await page.waitForFunction(()=>document.getElementById('receipt-status').textContent.includes('Recognized'));
  assert.equal(await page.locator('#receipt-items').getByLabel('Item 1 name',{exact:true}).inputValue(),'Pizza','desktop Tools opens receipt review');
  assert.ok(await page.locator('#dw-receipt-image').isVisible(),'uploaded receipt preview visible');
  const receiptLayout=await page.evaluate(()=>({photo:document.getElementById('dw-receipt-photo').getBoundingClientRect().right,fields:document.getElementById('dw-receipt-fields').getBoundingClientRect().left}));
  assert.ok(receiptLayout.photo<receiptLayout.fields,'receipt alongside editable items on desktop');
  assert.equal(await page.locator('#dw-receipt-extras').getAttribute('open'),null,'Extras collapsed initially');
  await page.locator('#dw-receipt-extras>summary').click();
  await page.locator('#receipt-tax').fill('2');await page.locator('#receipt-tip').fill('3');
  await page.locator('#receipt-items input[type=checkbox]').first().check();
  assert.equal(await page.locator('#dw-receipt-total').textContent(),'$15.00');
  assert.equal(await page.locator('#receipt-save').isDisabled(),true,'mismatched receipt total blocks saving');
  await page.locator('#receipt-total').fill('15');
  assert.equal(await page.locator('#receipt-save').isEnabled(),true,'reviewed matching total enables Save');
  await page.locator('#receipt-tax').fill('0');await page.locator('#receipt-tip').fill('0');await page.locator('#receipt-total').fill('10');
  await page.screenshot({path:resolve(root,'test-results/bills/receipt-side-by-side.png'),fullPage:true});
  await page.locator('#dw-receipt-extras>summary').click();

  await page.locator('#sq-receipt-x').click();
  await page.locator('#dw-expense-tools [data-sq-quick="quick-split"]').click();
  await page.locator('#split-page').waitFor();
  assert.equal(await page.locator('#tracker-dashboard').isVisible(),false,'desktop Split bill replaces Expenses');
  assert.ok(await page.locator('#split-total').isVisible());await page.locator('#split-back').click();
  for(const width of [390,430]){
   await page.setViewportSize({width,height:932});
   await page.locator('#dw-mobile-expense-add').waitFor();
   await page.waitForTimeout(150);
   assert.equal(await page.locator('#dw-expense-tools').isVisible(),false,'mobile has no separate tools row');
   const layout=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth+1,search:document.getElementById('sq-expense-search').getBoundingClientRect().top,filter:document.getElementById('dw-expense-filter-panel').getBoundingClientRect().top}));
   assert.equal(layout.overflow,false,'no mobile overflow '+width);assert.ok(Math.abs(layout.search-layout.filter)<2,'mobile search and filter share a row '+JSON.stringify(layout));
  }
  const balancesDropdown=page.locator('#dw-mobile-balances-dropdown');
  assert.ok(await balancesDropdown.isVisible(),'mobile balances uses a dropdown');assert.equal(await balancesDropdown.getAttribute('open'),null,'balances starts closed');assert.equal(await page.locator('#nets').isVisible(),false);
  await balancesDropdown.locator('summary').click();assert.ok(await page.locator('#nets .net').first().isVisible());
  const signs=await page.locator('#nets .amount').evaluateAll(items=>items.map(el=>({text:el.textContent,before:getComputedStyle(el,'::before').content})));assert.ok(signs.every(x=>!/^[-+−]/.test(x.text)&&x.before==='none'),'amounts show no positive or negative sign');
  await balancesDropdown.locator('summary').click();assert.equal(await page.locator('#nets').isVisible(),false,'balances collapses again');
  const mobileAdd=page.locator('#dw-mobile-expense-add');await mobileAdd.locator('summary').click();
  assert.ok(await mobileAdd.getByRole('button',{name:'Scan receipt',exact:true}).isVisible());
  assert.ok(await mobileAdd.getByRole('button',{name:'Split bill',exact:true}).isVisible());
  const menuIcons=await mobileAdd.locator('button .dw-mobile-option-icon svg').count();assert.equal(menuIcons,3,'all mobile Add options have icons');
  const centered=await mobileAdd.locator('summary').evaluate(el=>{const a=el.getBoundingClientRect(),b=el.querySelector('.dw-add-chevron').getBoundingClientRect();return Math.abs((a.top+a.bottom)/2-(b.top+b.bottom)/2)<1;});assert.ok(centered,'Add arrow centered vertically');
  await page.evaluate(()=>{window.Tesseract={recognize:async()=>({data:{text:'Pizza 10.00\nTOTAL 10.00'}})};});
  const chooserPromise=page.waitForEvent('filechooser');
  await mobileAdd.getByRole('button',{name:'Scan receipt',exact:true}).click();
  const chooser=await chooserPromise;
  assert.equal(await page.locator('#receipt-file').getAttribute('capture'),'environment','camera capture requests rear phone camera');
  await chooser.setFiles({name:'receipt.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j5n8AAAAASUVORK5CYII=','base64')});
  await page.waitForFunction(()=>document.getElementById('receipt-status').textContent.includes('Recognized'));
  assert.equal(await page.locator('#receipt-items').getByLabel('Item 1 name',{exact:true}).inputValue(),'Pizza','captured receipt reaches item review');
  const mobileReceipt=await page.evaluate(()=>({photo:document.getElementById('dw-receipt-photo').getBoundingClientRect().bottom,fields:document.getElementById('dw-receipt-fields').getBoundingClientRect().top,overflow:document.documentElement.scrollWidth>innerWidth+1}));
  assert.equal(await page.locator('#receipt-card').getAttribute('data-receipt-step'),'2','recognized photo advances to Assign');assert.equal(await page.locator('#dw-receipt-photo').isVisible(),false,'Photo step hidden while assigning');assert.equal(mobileReceipt.overflow,false);
  await page.locator('#dw-receipt-next').click();assert.ok(await page.locator('#dw-receipt-step-error').isVisible(),'unassigned items block Continue');
  await page.screenshot({path:resolve(root,'test-results/bills/receipt-mobile-stacked.png'),fullPage:true});
await page.locator('#receipt-items input[type=checkbox]').first().check();assert.ok((await page.locator('#receipt-preview').textContent()).includes('10.00'),'receipt assignment updates the review');
  await page.locator('#dw-receipt-next').click();assert.equal(await page.locator('#receipt-card').getAttribute('data-receipt-step'),'3');
  assert.ok(await page.locator('#receipt-save').isVisible(),'Save only shown at Review');assert.equal(await page.locator('#receipt-items').isVisible(),false);
  assert.equal(await page.locator('#dw-receipt-extras').isVisible(),false,'Review shows summary instead of expanded settings');
  assert.ok(await page.locator('#dw-mobile-receipt-review').isVisible());
  for(const width of [390,430]){
   await page.setViewportSize({width,height:932});
   const clean=await page.evaluate(()=>{const back=document.getElementById('dw-receipt-back').getBoundingClientRect(),save=document.getElementById('receipt-save').getBoundingClientRect(),modal=document.querySelector('#sq-receipt-dialog .sq-action-modal-inner');return {aligned:Math.abs(back.top-save.top)<1,overflow:modal.scrollWidth>modal.clientWidth+1};});
   assert.ok(clean.aligned,'Back and Save align on one row '+width);assert.equal(clean.overflow,false,'no horizontal modal overflow '+width);
  }
  await page.getByRole('button',{name:'Edit tax, tip or options',exact:true}).click();
  assert.equal(await page.locator('#receipt-card').getAttribute('data-receipt-step'),'2');assert.notEqual(await page.locator('#dw-receipt-extras').getAttribute('open'),null);
  await page.locator('#receipt-due').fill('2026-12-01');
  const fits=await page.locator('#receipt-due').evaluate(el=>el.getBoundingClientRect().right<=document.getElementById('dw-receipt-extras').getBoundingClientRect().right);assert.ok(fits,'date input stays within settings');
  await page.locator('#dw-receipt-next').click();assert.equal(await page.locator('#dw-receipt-extras').getAttribute('open'),null,'Extras collapses between steps');assert.equal(await page.locator('#receipt-due').inputValue(),'2026-12-01');
  await page.screenshot({path:resolve(root,'test-results/bills/mobile-receipt-clean-review.png'),fullPage:true});

  await page.locator('#dw-receipt-back').click();assert.equal(await page.locator('#receipt-card').getAttribute('data-receipt-step'),'2');assert.equal(await page.locator('#receipt-items input[type=checkbox]').first().isChecked(),true,'Back keeps assignments');

  await page.locator('#sq-receipt-x').click();
  await mobileAdd.locator('summary').click();
  await mobileAdd.getByRole('button',{name:'Split bill',exact:true}).click();
  await page.locator('#split-page').waitFor();assert.equal(await page.locator('#tracker-dashboard').isVisible(),false,'split page replaces Expenses');
  assert.ok(await page.locator('#split-total').isVisible(),'mobile split form opens');
  assert.equal(await page.locator('#split-page').getAttribute('data-split-step'),'1');
  await page.locator('#dw-split-step-next').click();assert.ok(await page.locator('#dw-split-step-error').isVisible(),'empty total blocks Continue');
  await page.locator('#split-total').fill('115');
  await page.locator('#dw-split-step-next').click();assert.equal(await page.locator('#split-description').inputValue(),'Shared bill','blank description receives a safe default');
  await page.locator('#dw-split-step-next').click();assert.equal(await page.locator('#split-page').getAttribute('data-split-step'),'3','115 equal split continues to Review');
  assert.ok((await page.locator('#split-summary').textContent()).includes('$57.50'),'equal halves retain cents');
  await page.locator('#dw-split-step-back').click();await page.locator('#dw-split-step-back').click();
  await page.locator('#split-total').fill('20');await page.locator('#split-description').fill('Lunch split');
  await page.locator('#dw-split-step-next').click();assert.equal(await page.locator('#split-page').getAttribute('data-split-step'),'2');
  await page.locator('#split-percent').click();await page.getByLabel('Alex percentage',{exact:true}).fill('25');
  await page.locator('#dw-split-step-next').click();assert.ok(await page.locator('#dw-split-step-error').isVisible(),'incorrect percentages block Review');
  await page.getByLabel('Jordan percentage',{exact:true}).fill('75');await page.locator('#dw-split-step-next').click();
  assert.equal(await page.locator('#split-page').getAttribute('data-split-step'),'3');assert.ok(await page.locator('#split-save').isVisible());
  assert.ok((await page.locator('#split-summary').textContent()).includes('$15.00'));assert.equal(await page.locator('#split-total').isVisible(),false);
  await page.screenshot({path:resolve(root,'test-results/bills/mobile-split-bill-review.png'),fullPage:true});
  await page.locator('#dw-split-step-back').click();assert.equal(await page.getByLabel('Alex percentage',{exact:true}).inputValue(),'25','Back retains split amounts');

  await page.locator('#split-back').click();await mobileAdd.waitFor();
  await page.locator('#dw-expense-filter-panel>summary').click();
  assert.ok(await page.locator('#sq-expense-category').isVisible());assert.ok(await page.locator('#sq-expense-member').isVisible());assert.ok(await page.locator('#sq-expense-time').isVisible());
  await page.locator('#dw-expense-filter-panel>summary').click();
  await page.locator('#history .dw-expense-more>button').first().click();
  await page.locator('.dw-expense-menu').getByRole('button',{name:'Edit',exact:true}).click();
  await page.locator('#dw-expense-editor[open]').waitFor();
  await page.locator('#dw-expense-editor').getByRole('button',{name:'Cancel',exact:true}).click();
  await page.getByRole('button',{name:'Close expense details',exact:true}).click();
  await page.screenshot({path:resolve(root,'test-results/bills/mobile-expenses-compact.png'),fullPage:true});
  await page.setViewportSize({width:1440,height:1000});
  await page.waitForTimeout(150);
  await page.locator('#history .dw-expense-more>button').first().click();
  await page.locator('.dw-expense-menu').getByRole('button',{name:'Edit',exact:true}).click();
  await page.locator('#dw-expense-editor[open]').waitFor();
  await page.locator('#dw-expense-editor').getByRole('button',{name:'Cancel',exact:true}).click();
  await page.getByRole('button',{name:'Close expense details',exact:true}).click();
  detail.entries.splice(1);
  await page.evaluate(()=>window.sqRefreshTrackerNow());
  await page.locator('#nav-home').click();await row.waitFor();
  assert.ok(await seeAll.isVisible(),'See all is visible again on return Home');
  for(const width of [1024,1440,1920]){
   await page.setViewportSize({width,height:1000});
   await page.locator('#dw-home-bill-list .dw-home-bill-row').waitFor();
   const state=await page.evaluate(()=>{
    const box=e=>{const r=e.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width}};
    return {
     left:box(document.getElementById('sq-clean-balance')),right:box(document.getElementById('sq-return-members').closest('.sq-return-panel')),
     upcoming:box(document.getElementById('dw-compact-upcoming')),shell:box(document.getElementById('dw-home-columns')),
     summary:box(document.getElementById('dw-home-columns')),
     activity:box(document.getElementById('sq-return-activity').closest('.sq-return-panel')),
     bills:box(document.getElementById('dw-home-bill-list')),subs:box(document.getElementById('dw-home-subscription-list')),
     smart:getComputedStyle(document.querySelector('.sq-return-smart-panel')).display,
     balances:getComputedStyle(document.getElementById('sq-return-balances').closest('.sq-return-panel')).display,
     overflow:document.documentElement.scrollWidth>innerWidth+1
    };
   });
   assert.ok(Math.abs(state.left.width-state.right.width)<2,'equal Home halves at '+width);
   assert.ok(state.left.right<state.upcoming.left&&state.upcoming.right<state.right.left,'three separate cards');
   assert.ok(Math.abs(state.left.width-state.upcoming.width)<2,'three equal cards');
   assert.ok(Math.abs(state.left.top-state.upcoming.top)<2&&Math.abs(state.left.top-state.right.top)<2,'cards share one row');
   assert.ok(Math.abs(state.summary.width-state.shell.width)<2,'overview spans Home');
   assert.ok(Math.abs(state.activity.left-state.left.left)<2&&Math.abs(state.activity.right-state.right.right)<2,'activity spans both columns');
   assert.ok(state.activity.top>=state.left.bottom&&state.activity.top>=state.right.bottom,'activity is below both upper columns');
   assert.ok(state.subs.bottom<=state.bills.top,'upcoming subscriptions before bill summary');
   assert.equal(state.smart,'none');assert.equal(state.balances,'none');assert.equal(state.overflow,false,'no overflow at '+width);
  }
  await page.setViewportSize({width:1440,height:1000});
  const logos=await page.locator('#dw-compact-upcoming .sq-brand-logo').evaluateAll(images=>images.map(image=>({src:image.getAttribute('src'),radius:getComputedStyle(image).borderRadius,local:image.dataset.localVector})));
  assert.ok(logos.length>0);assert.ok(logos.every(image=>image.local==='true'&&image.src.startsWith('/images/service-logos/')),'desktop uses crisp local SVG logos');
  assert.ok(logos.every(image=>parseFloat(image.radius)>0),'logo backgrounds have rounded corners');
  const typography=await page.evaluate(()=>{
   const style=e=>{const s=getComputedStyle(e);return {size:s.fontSize,family:s.fontFamily,weight:s.fontWeight,spacing:s.letterSpacing,line:s.lineHeight}};
   const headings=[document.querySelector('.sq-clean-eyebrow'),document.getElementById('dw-upcoming-title'),document.querySelector('.sq-overview-people-panel h3')].map(style);
   const icons=[...document.querySelectorAll('#dw-compact-upcoming .sq-service-icon')].map(e=>({width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height}));
   return {headings,icons,tops:[document.querySelector('.sq-clean-eyebrow'),document.getElementById('dw-upcoming-title'),document.querySelector('.sq-overview-people-panel h3')].map(e=>e.getBoundingClientRect().top),base:style(document.getElementById('dw-compact-balance')),prefix:style(document.querySelector('.dw-balance-prefix')),amount:style(document.querySelector('.dw-balance-amount'))};
  });
  assert.ok(Math.max(...typography.tops)-Math.min(...typography.tops)<1,'all three card headings line up');
  assert.equal(await page.locator('#dw-upcoming-title').textContent(),'Upcoming Bills');
  assert.deepEqual(typography.headings[0],typography.headings[1],'Balance and Upcoming titles match');
  assert.deepEqual(typography.headings[1],typography.headings[2],'Upcoming and Members titles match');
  assert.ok(typography.icons.length>=2);assert.ok(typography.icons.every(i=>i.width===36&&i.height===36),'consistent compact service icons');
  assert.equal(typography.prefix.size,typography.amount.size,'sign matches the amount size');
  assert.equal(await page.locator('#dw-compact-balance').textContent(),'−$12.00');
  detail.entries[0].from='Jordan';detail.entries[0].to='Alex';
  await page.evaluate(()=>window.sqRefreshTrackerNow());
  await page.waitForFunction(()=>document.getElementById('dw-compact-balance').textContent==='+$12.00');
  assert.ok((await page.locator('#sq-clean-explanation').textContent()).includes('owes'),'who owes whom caption retained');
  detail.entries[0].from='Alex';detail.entries[0].to='Jordan';
  await page.evaluate(()=>window.sqRefreshTrackerNow());
  await page.waitForFunction(()=>document.getElementById('dw-compact-balance').textContent==='−$12.00');
  assert.equal(typography.amount.size,typography.base.size,'amount keeps its original font size');
  const formatting=await page.evaluate(()=>({
   frequencies:['yearly','monthly','weekly','daily'].map(window.dwBillFrequency),
   date:window.dwBillDueDate('2027-11-04')
  }));
  assert.deepEqual(formatting.frequencies,['Yearly','Monthly','Weekly','Daily']);
  assert.equal(formatting.date,'November 4, 2027');
  assert.equal(await page.locator('#dw-compact-upcoming .dw-upcoming-section[data-kind="subscription"]>h3').textContent(),'Subscriptions');
  assert.equal(await page.locator('#dw-compact-upcoming .dw-upcoming-section[data-kind="bill"]>h3').textContent(),'Bills');
  assert.ok((await page.locator('#dw-home-bill-list').textContent()).includes('Monthly · Next due December 1, 2026'));
  const billRow=page.locator('#dw-home-bill-list .dw-home-bill-row').filter({hasText:'Electricity'});
  await billRow.getByRole('button',{name:'View Electricity details',exact:true}).click();
  await page.locator('.sq-premium-dialog h2').filter({hasText:'Electricity'}).waitFor();
  await page.locator('.sq-premium-dialog').getByRole('button',{name:'Close',exact:true}).click();
  const subscription=page.locator('#dw-home-subscription-list .dw-home-bill-row').filter({hasText:'Netflix'});
  await subscription.locator('.dw-home-item-menu summary').click();
  await subscription.getByRole('button',{name:'Edit',exact:true}).click();
  const billEditor=page.getByRole('dialog',{name:'Edit bill or subscription'});
  await billEditor.getByLabel('Name',{exact:true}).fill('Netflix updated');
  await billEditor.getByRole('button',{name:'Save changes',exact:true}).click();
  await page.locator('#dw-home-subscription-list').getByText('Netflix updated',{exact:true}).waitFor();
  assert.ok(await page.locator('#dw-home-columns').isVisible(),'editing bills stays on Home');
  writes.length=0;
  mkdirSync(resolve(root,'test-results/bills'),{recursive:true});
  await page.screenshot({path:resolve(root,'test-results/bills/home-full-width-activity.png'),fullPage:true});
  await row.focus();await row.press('Enter');
  const popup=page.locator('#sq-details-overlay');
  await page.waitForFunction(()=>document.getElementById('sq-details-overlay').classList.contains('open'));
  assert.equal(await page.locator('#sq-details-description').textContent(),'Lunch');
  assert.equal(await page.locator('#sq-details-amount').textContent(),'$12.00');
  await page.getByRole('button',{name:'Edit expense',exact:true}).click();
  const editor=page.locator('#dw-expense-editor');await editor.waitFor();
  await editor.getByLabel('Amount (USD)',{exact:true}).fill('18.50');
  await editor.getByLabel('Description',{exact:true}).fill('Lunch edited');
  await editor.getByLabel('Due date',{exact:true}).fill('2026-12-01');
  await editor.getByRole('button',{name:'Save changes',exact:true}).click();
  await page.waitForFunction(()=>document.getElementById('sq-details-overlay').classList.contains('open')&&document.getElementById('sq-details-amount').textContent==='$18.50');
  assert.equal(writes.length,1,'single PATCH rather than delete/recreate');
  assert.equal(writes[0].note,'[Category: Food & Dining] Lunch edited');
  assert.equal(writes[0].dueDate,'2026-12-01');
  await page.getByRole('button',{name:'Close expense details',exact:true}).click();
  await row.getByText('Lunch edited',{exact:true}).waitFor();
  assert.ok(await row.getByText('Food & Dining',{exact:true}).isVisible(),'category is a clean badge');
  await row.click();assert.equal(await page.locator('#sq-details-description').textContent(),'Lunch edited');
  await page.getByRole('button',{name:'Edit expense',exact:true}).click();
  await editor.getByLabel('Description',{exact:true}).fill('Unsaved');
  await editor.getByRole('button',{name:'Cancel',exact:true}).click();
  assert.equal(writes.length,1);assert.equal(await page.locator('#sq-details-description').textContent(),'Lunch edited');
  mkdirSync(resolve(root,'test-results/bills'),{recursive:true});
  await page.screenshot({path:resolve(root,'test-results/bills/recent-expense-details.png'),fullPage:true});
  await page.getByRole('button',{name:'Close expense details',exact:true}).click();
  detail.entries[0].canEdit=false;
  await page.evaluate(()=>window.sqRefreshTrackerNow());
  await row.click();assert.equal(await page.locator('#dw-expense-edit').isVisible(),false,'read-only entry has no edit button');
  await page.getByRole('button',{name:'Close expense details',exact:true}).click();
  await page.setViewportSize({width:390,height:844});
  assert.equal(await page.locator('#dw-expense-editor').isVisible(),false);
  await page.waitForFunction(()=>!document.getElementById('dw-home-columns')&&document.getElementById('sq-return-summary').parentElement.id==='tracker-dashboard');
  assert.equal(await page.locator('#dw-home-columns').count(),0,'mobile summary restored to original parent');
  assert.equal(await page.locator('#sq-return-summary').evaluate(e=>e.parentElement.id),'tracker-dashboard');

  const mobileHome=page.locator('#dw-mobile-home-layered');await mobileHome.waitFor();
  for(const width of [390,430]){
   await page.setViewportSize({width,height:932});await mobileHome.waitFor();
   const layout=await page.evaluate(()=>{const buttons=[...document.querySelectorAll('#dw-mobile-home-layered .dw-mh-actions button')].map(e=>e.getBoundingClientRect());return {overflow:document.documentElement.scrollWidth>innerWidth+1,aligned:Math.max(...buttons.map(r=>r.top))-Math.min(...buttons.map(r=>r.top))<1,font:getComputedStyle(document.getElementById('dw-mobile-home-layered')).fontFamily,base:getComputedStyle(document.body).fontFamily};});
   assert.equal(layout.overflow,false,'mobile Home has no horizontal overflow '+width);assert.ok(layout.aligned,'all three payment actions share one row');assert.equal(layout.font,layout.base,'current site font retained');
  }
  assert.equal(await page.locator('#dw-mh-amount').textContent(),'$18.50');
  assert.ok((await page.locator('#dw-mh-caption').textContent()).includes('owes'));
  assert.equal(await mobileHome.locator('select').count(),0,'no tracker switcher above amount');
  await page.locator('#dw-mh-upcoming-name').filter({hasText:'Electricity'}).waitFor();
  await mobileHome.getByRole('button',{name:'Log payment',exact:true}).click();
  await page.locator('#sq-expense-dialog').waitFor();assert.ok(await page.locator('#mode-payment').evaluate(e=>e.classList.contains('active')),'Log payment opens payment mode');
  await page.locator('#sq-entry-x').click();
  await page.locator('#dw-mh-members').click();await page.waitForFunction(()=>document.getElementById('tracker-dashboard').classList.contains('sq-tab-members'));
  await page.locator('.sq-mobile-nav [data-target="nav-home"]').click();await mobileHome.waitFor();
  await mobileHome.locator('.dw-mh-see-all').click();await page.waitForFunction(()=>document.getElementById('tracker-dashboard').classList.contains('sq-tab-expenses'));
  await mobileHome.waitFor({state:'detached'});assert.equal(await mobileHome.count(),0,'Home view removed on Expenses');
  await page.locator('.sq-mobile-nav [data-target="nav-home"]').click();await mobileHome.waitFor();
  await mobileHome.locator('.dw-mh-entry').first().click();await page.waitForFunction(()=>document.getElementById('sq-details-overlay').classList.contains('open'));await page.getByRole('button',{name:'Close expense details',exact:true}).click();
  await page.screenshot({path:resolve(root,'test-results/bills/mobile-home-layered-trial.png'),fullPage:true});
  await page.setViewportSize({width:1440,height:1000});await page.waitForFunction(()=>!document.getElementById('dw-mobile-home-layered'));
  const fresh=await context.newPage();await fresh.setViewportSize({width:390,height:844});
  await fresh.goto(origin,{waitUntil:'networkidle'});
  await fresh.waitForFunction(()=>typeof window.squareUpApi==='function');
  await fresh.setViewportSize({width:1440,height:1000});
  await fresh.locator('#dw-compact-upcoming').waitFor();
  await fresh.close();
 }finally{await browser.close();await new Promise(done=>server.close(done));}
});



