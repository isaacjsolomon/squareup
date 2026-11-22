import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const base=(process.env.HOME_BASE_URL||'https://doweo.app').replace(/\/$/,'');
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
 await page.goto(base+'/?visual-check=original-instagram-v3',{waitUntil:'domcontentloaded',timeout:45000});
 await page.locator('#sq-instagram-invite').waitFor({state:'attached',timeout:20000});
 await page.waitForFunction(()=>{
  return !!Array.from(document.styleSheets).find(s=>s.href?.includes('doweo-desktop-standalone.css?v=20261122-analytics-match-v7'));
 },null,{timeout:25000});

 const result=await page.evaluate(async()=>{
  const invite=document.getElementById('sq-instagram-invite');
  invite.hidden=false;
  await new Promise(resolve=>requestAnimationFrame(resolve));
  const card=invite.querySelector('.sq-ig-card');
  const close=invite.querySelector('.sq-ig-x');
  const logo=invite.querySelector('.sq-ig-mark');
  const title=invite.querySelector('#sq-ig-title');
  const css=el=>getComputedStyle(el);
  return {
   visible:css(invite).display!=='none',
   cardWidth:card.getBoundingClientRect().width,
   closeWidth:close.getBoundingClientRect().width,
   closeHeight:close.getBoundingClientRect().height,
   closeRounded:css(close).borderRadius,
   titleFont:css(title).fontSize,
   markBackground:css(logo).backgroundImage,
   inheritedCloseClass:close.classList.contains('doweo-close-control'),
  };
 });
 console.log('Live Instagram popup geometry:',JSON.stringify(result));
 assert.ok(result.visible,'Instagram invite should be visible');
 assert.ok(result.cardWidth>=300&&result.cardWidth<=422,'Original popup must be compact (max 420px)');
 assert.ok(Math.abs(result.closeWidth-36)<2&&Math.abs(result.closeHeight-36)<2,'Close button must be 36px round');
 assert.ok(result.closeRounded==='50%','Close button must be circular');
 assert.equal(result.titleFont,'22px');
 assert.ok(result.markBackground.includes('gradient'),'Instagram mark must keep its colorful gradient');
 assert.equal(result.inheritedCloseClass,false,'Desktop popup must opt out of the global large close style');

 const mirrored=await page.evaluate(async()=>{
  const backdrop=document.getElementById('backdrop');
  backdrop.style.backgroundImage='linear-gradient(123deg, rgb(1, 2, 3), rgb(4, 5, 6))';
  await new Promise(resolve=>setTimeout(resolve,100));
  return document.documentElement.style.getPropertyValue('--dw-selected-tracker-wallpaper');
 });
 assert.ok(mirrored.includes('123deg'),'Tracker wallpaper must propagate to desktop page styles');

 const financeNav=await page.evaluate(async()=>{
  const hub=document.getElementById('sq-nextgen');
  const sidebar=document.querySelector('aside.sidebar .squareup-nav')||document.querySelector('aside.sidebar');
  if(!hub||!sidebar||typeof window.squareUpCloseFinanceHub!=='function')throw new Error('Finance router not ready');
  function prime(){
   hub.style.removeProperty('display');hub.hidden=false;hub.dataset.section='finance';
   document.body.classList.add('sq-finance-open');
  }
  prime();
  const headingStyle=getComputedStyle(hub.querySelector('.sq-ng-header')).display;
  if(typeof window.dwCashFlowAnalyticsRender!=='function')throw new Error('Cash Flow Analytics renderer is missing');
  const today=new Date().toISOString().slice(0,10);
  const content=hub.querySelector('#sq-ng-content');
  window.dwCashFlowAnalyticsRender({
   content,
   finance:[{id:'test-1',kind:'income',amount:100,description:'Sample income',category:'Work',occurred_on:today},
            {id:'test-2',kind:'expense',amount:20,description:'Sample expense',category:'Food',occurred_on:today}],
   money:v=>'
  const nav=document.createElement('button');nav.type='button';nav.textContent='Navigation regression probe';
  sidebar.append(nav);
  nav.click();
  await new Promise(resolve=>requestAnimationFrame(resolve));
  const sidebarResult={hidden:hub.hidden,cssDisplay:getComputedStyle(hub).display,openClass:document.body.classList.contains('sq-finance-open')};
  nav.remove();
  const top=document.createElement('header');top.id='dw-all-topbar';
  const tab=document.createElement('button');tab.dataset.dwAllTab='expenses';top.append(tab);
  document.body.append(top);
  prime();tab.click();
  await new Promise(resolve=>requestAnimationFrame(resolve));
  const topResult={hidden:hub.hidden,cssDisplay:getComputedStyle(hub).display,openClass:document.body.classList.contains('sq-finance-open')};
  top.remove();
  return {headingStyle,panelBackground,titleColor,kpiCount,chartCount,sidebarResult,topResult};
 });
 console.log('Live Cash Flow navigation:',JSON.stringify(financeNav));
 for(const [name,part] of Object.entries({sidebar:financeNav.sidebarResult,topTab:financeNav.topResult})){
  assert.equal(part.hidden,true,name+' navigation must close the Cash Flow DOM');
  assert.equal(part.cssDisplay,'none',name+' navigation must remove finance overlay from viewport');
  assert.equal(part.openClass,false,name+' navigation must clear cashflow-open state');
 }
 assert.equal(financeNav.headingStyle,'none','Old dark finance heading card must be hidden');
 assert.equal(financeNav.panelBackground,'rgb(247, 250, 255)','Cash Flow panels must match Spending Analytics white cards');
 assert.equal(financeNav.titleColor,'rgb(25, 45, 80)','Cash Flow title must match Analytics navy typography');
 assert.equal(financeNav.kpiCount,4,'Cash Flow must display four analytics-style KPI cards');
 assert.equal(financeNav.chartCount,2,'Cash Flow must display two analytics-style chart panels');

 await page.setViewportSize({width:390,height:844});
 await page.waitForTimeout(100);
 assert.equal(await page.locator('#sq-instagram-invite .sq-ig-x').evaluate(el=>el.classList.contains('doweo-close-control')),true,'Mobile original close control remains unchanged');
 console.log('Original Instagram desktop popup and wallpaper mirroring verified; mobile close control unchanged');
}finally{
 await browser.close();
}
+Number(v).toFixed(2),
   esc:v=>String(v).replace(/[&<>"]/g,''),
   refresh:()=>{}
  });
  const panelBackground=getComputedStyle(content.querySelector('.dw-cash-panel')).backgroundColor;
  const titleColor=getComputedStyle(content.querySelector('.dw-cash-header h2')).color;
  const kpiCount=content.querySelectorAll('.dw-cash-kpis .analytics-stat').length;
  const chartCount=content.querySelectorAll('.dw-cash-charts .dw-cash-panel').length;
  const nav=document.createElement('button');nav.type='button';nav.textContent='Navigation regression probe';
  sidebar.append(nav);
  nav.click();
  await new Promise(resolve=>requestAnimationFrame(resolve));
  const sidebarResult={hidden:hub.hidden,cssDisplay:getComputedStyle(hub).display,openClass:document.body.classList.contains('sq-finance-open')};
  nav.remove();
  const top=document.createElement('header');top.id='dw-all-topbar';
  const tab=document.createElement('button');tab.dataset.dwAllTab='expenses';top.append(tab);
  document.body.append(top);
  prime();tab.click();
  await new Promise(resolve=>requestAnimationFrame(resolve));
  const topResult={hidden:hub.hidden,cssDisplay:getComputedStyle(hub).display,openClass:document.body.classList.contains('sq-finance-open')};
  top.remove();
  return {headingStyle,subtitleStyle,sidebarResult,topResult};
 });
 console.log('Live Cash Flow navigation:',JSON.stringify(financeNav));
 for(const [name,part] of Object.entries({sidebar:financeNav.sidebarResult,topTab:financeNav.topResult})){
  assert.equal(part.hidden,true,name+' navigation must close the Cash Flow DOM');
  assert.equal(part.cssDisplay,'none',name+' navigation must remove finance overlay from viewport');
  assert.equal(part.openClass,false,name+' navigation must clear cashflow-open state');
 }
 assert.notEqual(financeNav.headingStyle,'rgba(0, 0, 0, 0)','Cash Flow title requires an opaque readable surface');
 assert.ok(/rgb\(2(?:0[0-9]|1[0-9]|2[0-9]),/.test(financeNav.subtitleStyle)||
  financeNav.subtitleStyle==='rgb(214, 233, 245)','Cash Flow subtitle must be light against the dark header');

 await page.setViewportSize({width:390,height:844});
 await page.waitForTimeout(100);
 assert.equal(await page.locator('#sq-instagram-invite .sq-ig-x').evaluate(el=>el.classList.contains('doweo-close-control')),true,'Mobile original close control remains unchanged');
 console.log('Original Instagram desktop popup and wallpaper mirroring verified; mobile close control unchanged');
}finally{
 await browser.close();
}
