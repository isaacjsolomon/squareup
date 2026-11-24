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
  console.log('CHART_GEOMETRY',JSON.stringify(await page.evaluate(()=>{
    const rect=selector=>{
      const el=document.querySelector(selector);if(!el)return null;
      const r=el.getBoundingClientRect(),cs=getComputedStyle(el);
      return {x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),
       h:Math.round(r.height),display:cs.display,flex:cs.flex,
       position:cs.position,overflow:cs.overflow,minHeight:cs.minHeight,maxHeight:cs.maxHeight,
       computedHeight:cs.height,inlineHeight:el.style.height};
    };
    return {plot:rect('.dw-ref-month-chart'),grid:rect('.dw-ref-chart-grid'),
      months:rect('.dw-ref-chart-months'),month:rect('.dw-ref-chart-month'),
      tracks:rect('.dw-ref-chart-tracks'),track:rect('.dw-ref-chart-track'),
      income:rect('.dw-ref-chart-bar:not(.dw-ref-zero)'),label:rect('.dw-ref-chart-month small'),
      body:rect('#dw-ref-home .dw-ref-chart-body')};
  })));
  const plotted=await page.locator('#dw-ref-home .dw-ref-chart-bar:not(.dw-ref-zero)').evaluateAll(nodes=>nodes.map(el=>({
    height:el.getBoundingClientRect().height,
    parentHeight:el.parentElement.getBoundingClientRect().height
  })));
  assert.ok(plotted.length>=2&&plotted.every(row=>row.height>12&&row.parentHeight>100),
   'cashflow bars must be genuinely visible, not merely assigned nonzero CSS percentages: '+JSON.stringify(plotted));
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
      // My Wallet uses its approved custom icon rather than a generic duplicate.
      const icon=el.querySelector(':scope > .dw-all-nav-icon,:scope > .dw-my-wallet-icon');
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
  const overviewTabs=await page.evaluate(()=>{
    const el=document.querySelector('#tracker-dashboard>.sq-workspace-tabs');
    const r=el.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height};
  });
  await pageOpen('nav-trackers','trackers-view');
  const trackerGap=await page.evaluate(()=>({bottom:document.getElementById('dw-all-top-tabs').getBoundingClientRect().bottom,first:document.getElementById('trackers-gallery').getBoundingClientRect().top}));
  assert.ok(trackerGap.first>=trackerGap.bottom+12,'Shared tabs must not cover tracker tiles or creation controls: '+JSON.stringify(trackerGap));
  console.log('TRACKERS_GEOMETRY',JSON.stringify(await page.evaluate(()=>{
    const rect=selector=>{
      const el=document.querySelector(selector);if(!el)return null;
      const r=el.getBoundingClientRect(),c=getComputedStyle(el);
      return {x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height),
        marginTop:c.marginTop,paddingTop:c.paddingTop,position:c.position,display:c.display,
        flex:c.flex,align:c.alignSelf,minHeight:c.minHeight};
    };
    const page=document.getElementById('trackers-page');
    return {bodyClass:document.body.className,wrap:rect('body>.wrap'),trackers:rect('#trackers-page'),
      firstChild:page?.firstElementChild?.id||page?.firstElementChild?.className,
      children:[...page.children].slice(0,12).map(el=>({id:el.id,cls:el.className,y:Math.round(el.getBoundingClientRect().y),h:Math.round(el.getBoundingClientRect().height)})),
      topbar:rect('#dw-all-topbar'),gallery:rect('#trackers-gallery'),header:rect('.trackers-header'),
      parentChain:(()=>{const chain=[];for(let el=page;el&&chain.length<9;el=el.parentElement){const r=el.getBoundingClientRect(),c=getComputedStyle(el);chain.push({tag:el.tagName,id:el.id,cls:String(el.className).slice(0,55),y:Math.round(r.y),h:Math.round(r.height),display:c.display,position:c.position,marginTop:c.marginTop,paddingTop:c.paddingTop,minHeight:c.minHeight});}return chain;})(),
      insideWrap:document.querySelector('body>.wrap').contains(page),
      precedingSiblings:[...document.querySelector('body>.wrap').children]
        .slice(0,[...document.querySelector('body>.wrap').children].indexOf(page))
        .map(el=>{const rr=el.getBoundingClientRect(),cs=getComputedStyle(el);return {
          id:el.id,cls:typeof el.className==='string'?el.className.slice(0,55):'',
          h:Math.round(rr.height),y:Math.round(rr.y),display:cs.display,
          position:cs.position,order:cs.order,marginTop:cs.marginTop,marginBottom:cs.marginBottom
        }}).filter(x=>x.h>0||x.display!=='none').slice(-22)};
  })));

  const trackersTop=await page.locator('#trackers-page').evaluate(el=>el.getBoundingClientRect().top);
  assert.ok(trackersTop>=80&&trackersTop<260,
   'Trackers content must start directly beneath the shared topbar, not after a blank full viewport: '+trackersTop);
  await page.screenshot({path:resolve(root,'test-results/unified/trackers.png'),fullPage:true});
  const trackerTitle=page.locator('#trackers-gallery .tracker-tile h3').first();
  if(await trackerTitle.count()){
    const trackerTitleColor=await trackerTitle.evaluate(el=>getComputedStyle(el).color);
    assert.equal(trackerTitleColor,'rgb(243, 248, 252)','tracker names must use the approved off-white against navy tiles');
  }

  await pageOpen('nav-friends','friends-view');
  const friendsView=await page.locator('#friends-page').evaluate(el=>{
    const r=el.getBoundingClientRect();
    return {display:getComputedStyle(el).display,y:r.top,h:r.height,visible:!!r.height,
      tabs:el.querySelectorAll('[data-friends-tab]').length,
      search:!!el.querySelector('#sq-friend-query'),
      results:!!el.querySelector('#sq-friends-results')};
  });
  console.log('FRIENDS_VISIBILITY',JSON.stringify(friendsView));
  assert.ok(friendsView.visible&&friendsView.y>80&&friendsView.y<360,
    'Friends must display beneath the top navigation, not as an empty page: '+JSON.stringify(friendsView));
  assert.equal(friendsView.tabs,3,'Friends retains My Friends, Pending and Find Friends');
  assert.ok(friendsView.search&&friendsView.results,'Friends search and list remain available');
  await pageOpen('nav-analytics','analytics-view');
  await page.screenshot({path:resolve(root,'test-results/unified/analytics.png'),fullPage:true});
  const analyticsPanel=await page.locator('#analytics-page .sq-analytics-panel').first().evaluate(el=>({
    background:getComputedStyle(el).backgroundColor,color:getComputedStyle(el).color
  }));
  console.log('ANALYTICS_SURFACE',JSON.stringify(analyticsPanel));
  assert.equal(analyticsPanel.background,'rgb(247, 250, 255)',
    'Analytics cards must use matching light surfaces, not unrelated dark panels');

  const secondaryTabs=await page.evaluate(()=>{
    const el=document.getElementById('dw-all-top-tabs');
    const r=el.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height};
  });
  console.log('MATCHING_TOPBARS',JSON.stringify({overviewTabs,secondaryTabs}));
  assert.ok(secondaryTabs.y>=0&&secondaryTabs.y<=45,
    'Shared white tabs should stay at the top of the viewport, not over page headings: '+JSON.stringify(secondaryTabs));
  assert.equal(await page.evaluate(()=>document.getElementById('dw-all-topbar').parentElement===document.body),true,
    'Shared tabs must be attached directly to BODY to avoid transformed page containers');
  for(const key of ['x','y','w','h'])assert.ok(Math.abs(overviewTabs[key]-secondaryTabs[key])<3,
    'Overview and secondary topbars must share '+key+': '+JSON.stringify({overviewTabs,secondaryTabs}));

  await pageOpen('nav-profile','settings-view');
  await page.screenshot({path:resolve(root,'test-results/unified/settings.png'),fullPage:true});
  await pageOpen('nav-about','about-view');
  console.log('ABOUT_GEOMETRY',JSON.stringify(await page.evaluate(()=>{
    const about=document.getElementById('about-page'),wrap=document.querySelector('body>.wrap');
    const box=el=>{if(!el)return null;const r=el.getBoundingClientRect(),c=getComputedStyle(el);return {y:Math.round(r.y),h:Math.round(r.height),display:c.display,position:c.position,minHeight:c.minHeight,paddingTop:c.paddingTop}};
    return {about:box(about),wrap:box(wrap),insideWrap:wrap.contains(about),
      siblings:[...wrap.children].map(el=>({tag:el.tagName,id:el.id,cls:String(el.className).slice(0,60),...box(el)})).filter(x=>x.h>0).slice(0,15)};
  })));

  console.log('ABOUT_ROUTE_DEBUG',JSON.stringify(await page.evaluate(()=>{
    const a=document.getElementById('about-page'),t=document.getElementById('trackers-page');
    const info=el=>{if(!el)return null;const r=el.getBoundingClientRect(),c=getComputedStyle(el);return {id:el.id,parent:el.parentElement?.id||el.parentElement?.tagName,display:c.display,inline:el.getAttribute('style'),y:r.y,h:r.height,marginTop:c.marginTop}};
    return {bodyClasses:document.body.className,about:info(a),trackers:info(t),preceding:[...document.body.children].filter(x=>x.getBoundingClientRect().height>0).map(info).slice(0,12)};
  })));
  const aboutTop=await page.locator('#about-page').evaluate(el=>el.getBoundingClientRect().top);
  assert.ok(aboutTop>=80&&aboutTop<260,
   'About content must appear immediately beneath shared navigation: '+aboutTop);
  await page.screenshot({path:resolve(root,'test-results/unified/about.png'),fullPage:true});
  await page.locator('#dw-all-top-tabs [data-dw-all-tab="expenses"]').click();
  await page.waitForFunction(()=>document.querySelector('#tracker-dashboard.sq-tab-expenses')?.getClientRects().length>0);
  assert.ok(await page.locator('#dw-all-topbar').isVisible(),'new header stays present on Expenses');
  await page.locator('#dw-expense-workspace #sq-activity-card').waitFor({state:'visible',timeout:10000});
  const expensesVisual=await page.locator('#dw-expense-workspace #sq-activity-card').evaluate(el=>({
    background:getComputedStyle(el).backgroundImage,
    heading:getComputedStyle(el.querySelector('.dw-expenses-heading h2')).color
  }));
  console.log('EXPENSES_SURFACE',JSON.stringify(expensesVisual));
  assert.ok(expensesVisual.background.includes('rgb(251, 252, 255)'),
    'Expenses must inherit the same pale card palette as Overview');

  await page.locator('#dw-all-top-tabs [data-dw-all-tab="members"]').click();
  await page.waitForFunction(()=>document.querySelector('#tracker-dashboard.sq-tab-members')?.getClientRects().length>0);
  assert.ok(await page.locator('#dw-all-topbar').isVisible(),'new header stays present on Members');
  await page.locator('#dw-all-top-tabs [data-dw-all-tab="bills"]').click();
  await page.locator('#sq-bills-page').waitFor({state:'visible',timeout:10000});
  assert.equal(await page.locator('#sq-bills-page .sq-bills-workspace-tabs').isVisible(),false,
    'Bills must not show a second row of tracker tabs');

  // Screenshot regressions: verify ACTUAL loaded stylesheet/cascade, not only source CSS.
  assert.ok(await page.locator('link[href*="doweo-page-repairs.css"]').count(),
   'the latest page repairs stylesheet must be linked in the real HTML');
  await page.waitForFunction(()=>getComputedStyle(document.querySelector('#sq-bills-page .sq-bill-create-card')).backgroundColor==='rgb(16, 33, 57)',{timeout:10000});
  const billsGeometry=await page.evaluate(()=>{
   const back=document.getElementById('sq-bills-back').getBoundingClientRect();
   const tabs=document.getElementById('dw-all-top-tabs').getBoundingClientRect();
   const cal=document.querySelector('#sq-bills-page .sq-premium-calendar');
   return {backTop:back.top,backLeft:back.left,backRight:back.right,tabsBottom:tabs.bottom,
    calendarBg:getComputedStyle(cal).backgroundColor,
    calendarGradient:getComputedStyle(cal).backgroundImage,
    calendarStroke:getComputedStyle(cal).borderTopColor,
    plusStroke:getComputedStyle(document.getElementById('sq-bill-mobile-toggle')).borderTopColor,
    calendarText:getComputedStyle(cal.querySelector('.sq-premium-days')||cal).color,
    billCardBackground:getComputedStyle(document.querySelector('#sq-bills-page .sq-bill-create-card')).backgroundColor,
    billCardText:getComputedStyle(document.querySelector('#sq-bills-page .sq-bill-create-card h3')).color,
    metricBackground:getComputedStyle(document.querySelector('#sq-bills-page .sq-premium-metrics article')).backgroundColor,
    secondMetricBackground:getComputedStyle(document.querySelectorAll('#sq-bills-page .sq-premium-metrics article')[1]).backgroundColor,
    billsListBackground:getComputedStyle(document.querySelector('#sq-bills-page .sq-bills-columns .sq-bills-card')).backgroundColor,
    subscriptionsBackground:getComputedStyle(document.querySelectorAll('#sq-bills-page .sq-bills-columns .sq-bills-card')[1]).backgroundColor,
    calendarDayText:getComputedStyle(document.querySelector('#sq-bills-page .sq-premium-days button:not(:disabled)')).color};
  });
  assert.ok(billsGeometry.backTop>billsGeometry.tabsBottom+8,
   'Bills Back to Home must be below the global tabs: '+JSON.stringify(billsGeometry));
  assert.ok(billsGeometry.backRight<1536&&billsGeometry.backLeft>=0,
   'Bills Back to Home must be fully inside the screen');
  assert.match(billsGeometry.calendarGradient,/linear-gradient\(/,
    'Calendar must have the reference deep-navy gradient, not a white fill');
  assert.equal(billsGeometry.calendarStroke,'rgb(154, 203, 213)',
    'Reference calendar stroke must be thin light cyan');
  assert.equal(billsGeometry.plusStroke,'rgb(104, 218, 201)',
    'Add button must have mint outline');
  assert.match(billsGeometry.calendarBg,/^rgb\(16, 33, 57\)$/, 
   'billing calendar must have a solid navy background, not pale white');
  assert.match(billsGeometry.calendarText,/^rgb\(247, 251, 255\)$/, 
   'calendar date grid must use readable light text against navy');
  assert.match(billsGeometry.billCardBackground,/^rgb\(16, 33, 57\)$/, 
    'Bill panels must use the actual navy surface, not white');
  assert.match(billsGeometry.metricBackground,/^rgb\(16, 33, 57\)$/, 
    'Monthly totals card should be navy too');
  for(const [name,value] of Object.entries({secondMetric:billsGeometry.secondMetricBackground,bills:billsGeometry.billsListBackground,subscriptions:billsGeometry.subscriptionsBackground})){
    assert.equal(value,'rgb(16, 33, 57)',name+' card must match the navy reference');
  }
  assert.equal(billsGeometry.calendarDayText,'rgb(220, 234, 245)', 'calendar dates remain readable');
  assert.equal(billsGeometry.billCardText,'rgb(247, 251, 255)',
    'Bill card text must be white on navy');
  assert.ok(await page.locator('#sq-bills-create').count(),'Bills create form and save functionality must remain');
  await page.screenshot({path:resolve(root,'test-results/unified/bills-page-repairs.png'),fullPage:true});

  await pageOpen('dw-ref-nav-notifications','notifications-view');
  await page.waitForFunction(()=>getComputedStyle(document.getElementById('notifications-panel')).backgroundColor==='rgb(19, 46, 75)',{timeout:10000});
  const notificationsVisual=await page.evaluate(()=>({
    bodyBackground:getComputedStyle(document.body).backgroundColor,
    workspaceBackground:getComputedStyle(document.querySelector('body > .wrap')).backgroundColor,
    panelBackground:getComputedStyle(document.getElementById('notifications-panel')).backgroundColor,
    backdropImage:getComputedStyle(document.getElementById('backdrop')).backgroundImage,
    backdropBackground:getComputedStyle(document.getElementById('backdrop')).backgroundColor
  }));
  assert.equal(notificationsVisual.workspaceBackground,'rgb(11, 29, 52)',
   'Notifications workspace must be navy: '+JSON.stringify(notificationsVisual));
  assert.equal(notificationsVisual.panelBackground,'rgb(19, 46, 75)',
   'Notifications panel must no longer be the old white surface');
  assert.equal(notificationsVisual.backdropImage,'none',
   'Notifications must suppress the selected tracker photo on the actual #backdrop element');
  assert.match(notificationsVisual.backdropBackground,/^rgba?\(11, 31, 56(?:, [0-9.]+)?\)$/,
   'The wallpaper layer must use navy RGB channels (a translucent backdrop is allowed)');
  await page.screenshot({path:resolve(root,'test-results/unified/notifications-page-repairs.png'),fullPage:true});

  await page.evaluate(()=>window.squareUpOpenFinanceHub?.('finance'));
  await page.waitForFunction(()=>document.body.classList.contains('sq-finance-open')&&
   document.getElementById('sq-nextgen')?.dataset.section==='finance',{timeout:10000});
  await page.locator('#sq-ng-open-transaction').waitFor({state:'visible',timeout:10000});
  const cashFlowVisual=await page.evaluate(()=>{
    const view=document.getElementById('sq-nextgen');
    const back=document.getElementById('sq-ng-back');
    return {bg:getComputedStyle(view).backgroundColor,
      scroll:getComputedStyle(view).overflowY,backVisible:!!back?.getClientRects().length,
      addVisible:!!document.getElementById('sq-ng-open-transaction')?.getClientRects().length,
      rows:document.querySelectorAll('#sq-ng-content .sq-ng-item').length,
      contentColumns:getComputedStyle(document.getElementById('sq-ng-content')).gridTemplateColumns,
      trendSurface:getComputedStyle(document.querySelector('#sq-ng-content .dw-web-trend')).backgroundColor,
      activityVisible:!!document.querySelector('#sq-ng-content .sq-ng-section')?.getClientRects().length};
  });
  assert.equal(cashFlowVisual.scroll,'auto','Cash Flow must remain scrollable');
  assert.ok(cashFlowVisual.backVisible&&cashFlowVisual.addVisible&&cashFlowVisual.rows===2,
   'Cash Flow must retain navigation, add actions and real transaction rows: '+JSON.stringify(cashFlowVisual));
  assert.equal(cashFlowVisual.bg,'rgb(234, 241, 252)',
    'Cash Flow needs same pale analytics canvas');
  assert.equal(cashFlowVisual.trendSurface,'rgb(247, 250, 255)',
    'Cash Flow chart must use Analytics panel treatment');
  assert.ok(cashFlowVisual.activityVisible,
    'recent personal activity must remain visible after layout change');
  await page.screenshot({path:resolve(root,'test-results/unified/cashflow-page-repairs.png'),fullPage:true});
  await page.locator('#sq-ng-back').click();
  await page.waitForFunction(()=>!document.body.classList.contains('sq-finance-open'),{timeout:10000});

  await page.evaluate(()=>document.getElementById('nav-home')?.click());
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
