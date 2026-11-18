import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chromium} from 'playwright';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const scripts=['doweo-finance-planning.js','doweo-trips-activity.js','doweo-paylinks-currency.js'].map(name=>readFileSync(new URL('../'+name,import.meta.url),'utf8'));
test('mobile Finance Hub keeps original tabs and keeps the retired launcher row hidden',async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844}});
  await page.route('**/*',route=>route.abort());
  await page.setContent(html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,''));
  await page.evaluate(()=>{
   const root=document.getElementById('sq-nextgen');
   root.hidden=false;
   // Production boot scripts normally dismiss this overlay; they are deliberately removed in this isolated test.
   document.getElementById('sq-startup-overlay')?.remove();
   document.getElementById('auth-modal')?.remove();
   document.body.classList.add('sq-finance-open');
   window.squareUpApi=async(path)=>{
    if(path==='trackers')return [{id:'22222222-2222-4222-8222-222222222222',name:'Shared tracker',currency:'USD'}];
    if(path.startsWith('finance-plus/goals'))return [];
    if(path.startsWith('finance-plus/trips'))return [];
    if(path.startsWith('finance-plus/payment-requests'))return [];
    if(path.startsWith('finance-plus/budgets'))return {budgets:[],month:'2026-11'};
    if(path.startsWith('finance-plus/activity'))return {timeline:[]};
    return [];
   };
  });
  const originalTabs=await page.locator('#sq-nextgen .sq-ng-tabs > button').count();
  for(const code of scripts)await page.addScriptTag({content:code});
  assert.equal(await page.locator('#sq-nextgen .sq-ng-tabs > button').count(),originalTabs,'existing mobile Finance tabs unchanged');
  assert.equal(await page.locator('#dw-finance-extras > button').count(),3,'all three launchers grouped');
  assert.equal(await page.locator('#dw-weo-financial-context').isChecked(),false,'Weo financial context must default off');
  assert.equal(await page.locator('#dw-finance-extras').isVisible(),false,'retired launchers stay hidden');
  // Exercise the existing handlers independently of launcher visibility.
  await page.locator('#dw-planning-launch').evaluate(button=>button.click());
  assert.equal(await page.locator('#dw-planning-pane').isVisible(),true);
  await page.locator('#dw-trip-plus-launch').evaluate(button=>button.click());
  assert.equal(await page.locator('#dw-trip-plus').isVisible(),true);
  assert.equal(await page.locator('#dw-planning-pane').isVisible(),false);
  await page.locator('#dw-paylink-launch').evaluate(button=>button.click());
  assert.equal(await page.locator('#dw-paylink-pane').isVisible(),true);
  assert.equal(await page.locator('#dw-trip-plus').isVisible(),false);
 }finally{await browser.close()}
});

test('desktop cash flow metrics and transaction action fit the workspace',async()=>{
 const browser=await chromium.launch();
 try{
  const page=await browser.newPage();
  await page.route('**/*',route=>route.abort());
  await page.setContent(html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,''));
  await page.evaluate(()=>{
   document.body.classList.add('sq-finance-open');
   document.querySelector('#sq-nextgen').hidden=false;
   document.querySelector('#sq-ng-content').innerHTML='<div class="sq-ng-finance-overview"><div class="sq-ng-grid sq-ng-summary-stack">'+['Net cash flow','Income','Spending'].map(x=>'<article class="sq-ng-card">'+x+'</article>').join('')+'</div><button class="sq-ng-add-action" id="sq-ng-open-transaction">Add Expense</button></div><section class="dw-web-trend"></section>';
  });
  for(const width of [1024,1440,2048]){
   await page.setViewportSize({width,height:900});
   const sizes=await page.evaluate(()=>{
    const rect=s=>document.querySelector(s).getBoundingClientRect();
    return [rect('#sq-ng-open-transaction').height,rect('.sq-ng-summary-stack .sq-ng-card').width,rect('.sq-ng-shell').width,rect('#sq-nextgen').width];
   });
   assert.ok(sizes[0]>0&&sizes[0]<=64&&sizes[1]>90&&sizes[2]>=sizes[3]-18,JSON.stringify(sizes));
  }
  await page.evaluate(()=>document.querySelector('#sq-ng-content').innerHTML='<div class="sq-wallet-compact-layout"><section class="sq-ng-card"><div class="sq-wallet-currency"><b>USD</b>'+['Net shared balance','Owed to you','You owe'].map(label=>'<span><small>'+label+'</small><strong>-$310.76</strong></span>').join('')+'</div></section></div>');
  await page.setViewportSize({width:1024,height:900});
  for(const amount of await page.locator('.sq-wallet-currency strong').all()){
   assert.equal(await amount.evaluate(el=>{const r=document.createRange();r.selectNodeContents(el);return r.getClientRects().length}),1);
  }
 }finally{await browser.close()}
});

test('desktop section bars route to the existing views and exclude retired pages',async()=>{
 const browser=await chromium.launch();
 try{
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  await page.route('**/*',route=>route.abort());
  await page.setContent(html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,''));
  const code=await page.evaluate(source=>{
   const parsed=new DOMParser().parseFromString(source,'text/html');
   return [...parsed.scripts].find(s=>s.textContent.includes('window.squareUpOpenFinanceHub=open')).textContent;
  },html);
  await page.evaluate(()=>{window.squareUpApi=async()=>[]});
  await page.addScriptTag({content:code});
  for(const [parent,keys,labels] of [
   ['#analytics-page',['analytics','finance'],['Analytics','Cash Flow']],
   ['#trackers-page',['trackers','trip','home'],['All Trackers','Trips','Households']]
  ]){
   const buttons=page.locator(parent+' .dw-section-tabs button');
   assert.deepEqual(await buttons.allTextContents(),labels);
   for(const key of keys.slice(1)){
    await page.locator(parent+' [data-dw-section="'+key+'"]').evaluate(b=>b.click());
    const active=page.locator('#sq-nextgen .dw-section-tabs[data-current-group]');
    assert.deepEqual(await active.locator('button').allTextContents(),labels);
    assert.equal(await active.locator('[aria-current=page]').getAttribute('data-dw-section'),key);
    await active.locator('button').first().evaluate(b=>b.click());
    assert.equal(await page.locator('#sq-nextgen').evaluate(el=>el.hidden),true);
   }
  }
  await page.evaluate(()=>window.squareUpOpenFinanceHub('insights'));
  assert.equal(await page.locator('#sq-ng-title').textContent(),'Cash Flow');
  assert.equal(await page.locator('#sq-ng-content .dw-analytics-months').count(),1);
  assert.equal(await page.locator('#sq-ng-content .dw-web-comparison').count(),1);
  assert.equal(await page.locator('#sq-ng-content h2').allTextContents().then(t=>t.includes("This month's spending categories")),true);
  for(const key of ['wallet','currencies']){
   await page.evaluate(key=>window.squareUpOpenFinanceHub(key),key);
   assert.equal(await page.locator('#sq-nextgen').evaluate(el=>el.hidden),true);
  }
  await page.evaluate(()=>{document.querySelector('#sq-bills-open').onclick=()=>document.body.dataset.billing='opened';window.squareUpOpenFinanceHub('subscriptions')});
  assert.equal(await page.locator('body').getAttribute('data-billing'),'opened');
 }finally{await browser.close()}
});

test('mobile Chat opens the tracker inbox, a thread, then returns to the inbox',async()=>{
 const browser=await chromium.launch();
 try{
  const page=await browser.newPage({viewport:{width:390,height:844}});
  await page.route('https://chat.test/',route=>route.fulfill({contentType:'text/html',body:'<html></html>'}));
  await page.goto('https://chat.test/');
  await page.route('**/*',route=>route.abort());
  await page.setContent(html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,''));
  const init=html.slice(html.indexOf('function initMobileChatInbox(){'),html.indexOf('initMobileChatInbox();')+'initMobileChatInbox();'.length);
  await page.addScriptTag({content:`
   const currentUser={id:'a'},current={id:'t'},sqMentionIds=new Set();
   const messages=[];
   const supabase={rpc:async()=>({data:[{peer:'b',name:'Sam',eligible:true}]}),from:()=>({
    select(){return this},or(){return this},order(){return this},limit:async()=>({data:messages.slice()}),
    insert:async row=>{messages.push({...row,id:'dm1',sender_id:'a',created_at:new Date().toISOString()});return {error:null}}
   })};
   let squareUpReplyTo=null,sqPhotoFile=null,squareUpChatRows=[];
   const esc=s=>String(s),api=async path=>path==='trackers'?[{id:'t',name:'Test group'}]:[{senderName:'Sam',senderId:'b',message:'Dinner?',createdAt:'2026-11-18T12:00:00Z'}];
   async function loadTrackerChat(){document.getElementById('tracker-chat-messages').textContent='Dinner?'}
  `+init});
  await page.locator('#dw-chat-nav').evaluate(b=>b.click());
  await page.locator('#dw-chat-rows button').waitFor({state:'attached'});
  assert.match(await page.locator('#dw-chat-rows').textContent(),/Test group.*Dinner/);
  await page.locator('#dw-chat-rows button').evaluate(b=>b.click());
  assert.equal(await page.locator('#dw-chat-name').textContent(),'Test group');
  assert.equal(await page.locator('#dw-chat-host #tracker-chat-form').count(),1);
  assert.equal(await page.locator('#tracker-chat-input').evaluate(el=>el===document.activeElement),true);
  await page.locator('#tracker-chat-messages').evaluate(el=>{el.innerHTML='<p>Older message</p>'.repeat(100)});
  for(const height of [844,520]){
   await page.setViewportSize({width:390,height});
   const layout=await page.evaluate(()=>{
    const rect=s=>document.querySelector(s).getBoundingClientRect();
    return {title:rect('#dw-chat-name').top,top:rect('#dw-chats').top,composer:rect('#tracker-chat-form').bottom,bottom:rect('#dw-chats').bottom,scroll:document.querySelector('#tracker-chat-messages').scrollHeight>rect('#tracker-chat-messages').height};
   });
   assert.ok(layout.title>=layout.top&&layout.composer<=layout.bottom+1&&layout.scroll,JSON.stringify(layout));
  }
  await page.locator('#dw-chat-back').evaluate(b=>b.click());
  assert.equal(await page.locator('#dw-chat-list').evaluate(el=>el.hidden),false);
  assert.equal(await page.locator('#dw-chat-host #chat-card').count(),0);
  const dock=page.locator('#dw-chats > .sq-mobile-nav');
  assert.ok(await dock.evaluate(el=>Math.abs(el.getBoundingClientRect().bottom-innerHeight)<2));
  await page.locator('#dw-chat-compose').click();
  await page.locator('#dw-chat-rows button').filter({hasText:'Sam'}).click();
  await page.locator('#dw-dm-input').fill('Private hello');
  await page.locator('#dw-dm-form button').click();
  await page.locator('#dw-dm-messages p').filter({hasText:'Private hello'}).waitFor();
  assert.equal(await dock.isVisible(),false);
 }finally{await browser.close()}
});

test('desktop report tabs clear the visible toolbar on Analytics and Cash Flow',async()=>{
 const browser=await chromium.launch();
 try{
  const page=await browser.newPage();
  await page.route('**/*',route=>route.abort());
  await page.setContent(html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,''));
  const alignment=await page.evaluate(source=>[...new DOMParser().parseFromString(source,'text/html').scripts].find(s=>s.textContent.includes("style.setProperty('--dw-report-top'")).textContent,html);
  await page.addScriptTag({content:alignment});
  for(const width of [1024,1440,2048]){
   await page.setViewportSize({width,height:900});
   for(const section of ['analytics','finance']){
    await page.evaluate(section=>{
     const cash=section==='finance',root=document.querySelector('#sq-nextgen');
     document.body.classList.toggle('analytics-view',!cash);
     document.body.classList.toggle('sq-finance-open',cash);
     root.hidden=!cash;root.dataset.section='finance';
     root.querySelector('[aria-label="Analytics sections"]').toggleAttribute('data-current-group',cash);
    },section);
    await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
    const rects=await page.evaluate(section=>{
     const header=document.querySelector('.wrap>header.tracker-heading').getBoundingClientRect();
     const tabs=document.querySelector((section==='finance'?'#sq-nextgen':'#analytics-page')+' .dw-section-tabs').getBoundingClientRect();
     return [header.bottom,tabs.top,tabs.height];
    },section);
    assert.ok(rects[0]>0&&rects[1]>=rects[0]&&rects[2]>0,section+' '+width+' '+rects);
   }
  }
 }finally{await browser.close()}
});
