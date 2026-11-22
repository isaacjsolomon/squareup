import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chromium} from 'playwright';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const styles=readFileSync(new URL('../styles.css',import.meta.url),'utf8');

test('mobile Overview hides extras and scrolls only when its content overflows',async()=>{
 const browser=await chromium.launch({headless:true,
  ...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844}});
  // Use production markup and every production stylesheet, without account/network
  // scripts. Install the same loaded-tracker state and responsive DOM placement.
  await page.route('**/*',route=>route.abort());
  await page.setContent(html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,''));
  await page.addStyleTag({content:styles});
  await page.evaluate(()=>{
   document.documentElement.className='';
   document.body.className='';
   const wrap=document.querySelector('.wrap'),dashboard=document.getElementById('tracker-dashboard');
   for(const child of [...document.body.children]){
    if(child!==wrap&&!child.matches('style,.sq-mobile-nav'))child.remove();
   }
   for(const child of [...wrap.children]){
    if(child!==dashboard&&!child.matches('.sq-mobile-top'))child.remove();
   }
   // Keep the dashboard's loaded Overview content, including the clear footer.
   for(const child of [...dashboard.children]){
    if(!child.matches('.sq-workspace-tabs,#sq-return-summary,footer'))child.remove();
   }
   document.getElementById('sq-overview-stats').hidden=true;
   document.getElementById('quick-payment').hidden=false;
   document.getElementById('sq-return-greeting').textContent='Welcome back, Isaac';
   document.getElementById('sq-clean-net').textContent='−$6.76';
   document.getElementById('sq-clean-explanation').textContent='Isaac Solomon owes Sasha Levenson · $6.76';
  });
  const placement=html.match(/<script id="sq-calm-desktop-overview-placement">([\s\S]*?)<\/script>/)[1];
  await page.evaluate(placement);
  await page.evaluate(()=>{
   const calc=document.createElement('button');calc.id='sq-quick-calc-launch';
   document.querySelector('.dashboard-actions').append(calc);
  });
  await page.evaluate(html.match(/<script id="sq-mobile-calm-dashboard-js">([\s\S]*?)<\/script>/)[1]);
  // Exercise both possible Smart Settle-Up parents (moved at 740px in the app).
  const smartMarkup=html.match(/<details class="card tracker-collapsible" id="smart-settle-card"[\s\S]*?<\/details>/)[0];
  await page.evaluate(markup=>document.getElementById('tracker-dashboard').insertAdjacentHTML('beforeend',markup),smartMarkup);
  const visible=selector=>page.locator(selector).isVisible();
  for(const width of [320,390,740,741,900]){
   await page.setViewportSize({width,height:844});
   assert.equal(await visible('#smart-settle-card'),false,`smart at ${width}`);
   assert.equal(await visible('.sq-return-smart-panel'),false,`smart wrapper at ${width}`);
   assert.equal(await visible('#clear'),false,`clear at ${width}`);
   const nav=await page.locator('.sq-mobile-nav').boundingBox();
   assert.ok(nav,`nav visible at ${width}`);
   assert.ok(Math.abs(nav.y+nav.height-844)<=2,`nav should touch viewport bottom at ${width}: ${JSON.stringify(nav)}`);
  }
  assert.equal(await visible('#sq-mobile-extra-balances'),false);
  for(const height of [480,320]){
   await page.setViewportSize({width:320,height});
   const metrics=await page.evaluate(()=>{
    const nav=document.querySelector('.sq-mobile-nav').getBoundingClientRect();
    const d=document.getElementById('tracker-dashboard');
    return {navBottom:nav.bottom,viewport:innerHeight,bodyPosition:getComputedStyle(document.body).position,
      dashboardMax:getComputedStyle(d).maxHeight,scrollHeight:document.scrollingElement.scrollHeight};
   });
   assert.ok(Math.abs(metrics.navBottom-height)<=2,JSON.stringify(metrics));
   assert.notEqual(metrics.bodyPosition,'fixed','mobile body must not lock viewport');
   assert.equal(metrics.dashboardMax,'none','dashboard must not clip action cards');
   assert.ok(metrics.scrollHeight>height,'short viewports should permit document scrolling');
   await page.evaluate(()=>window.scrollTo(0,document.scrollingElement.scrollHeight));
   assert.ok(await page.evaluate(()=>scrollY>0),'page must scroll to reach payment cards');
  }
  await page.setViewportSize({width:390,height:1000});
  await page.evaluate(()=>{
   const p=document.createElement('p');p.textContent='Expanded balance details '.repeat(250);
   document.getElementById('sq-return-summary').append(p);
  });
  assert.ok(await page.evaluate(()=>document.scrollingElement.scrollHeight>innerHeight),
    'expanded content must be reachable by document scrolling');
  // A different mobile tab must retain the original clear and settle controls.
  await page.evaluate(()=>document.getElementById('tracker-dashboard').className='sq-tab-members');
  assert.notEqual(await page.evaluate(()=>getComputedStyle(document.body).position),'fixed','other tabs must release the page lock');
  assert.equal(await visible('#clear'),true);
  assert.equal(await visible('#smart-settle-card'),true);
  await page.evaluate(()=>document.getElementById('tracker-dashboard').className='sq-tab-overview');
  await page.setViewportSize({width:1280,height:900});
  await page.evaluate(()=>document.getElementById('sq-return-smart-host').append(document.getElementById('smart-settle-card')));
  // The current desktop home layout intentionally hides the former settle-up panel.
  assert.equal(await visible('#smart-settle-card'),false,'legacy desktop overview panel');
  await page.evaluate(()=>document.getElementById('tracker-dashboard').className='sq-tab-members');
  await page.evaluate(()=>document.getElementById('tracker-dashboard').append(document.getElementById('smart-settle-card')));
  assert.equal(await visible('#smart-settle-card'),true,'desktop settle-up remains available outside the home layout');
  await page.evaluate(()=>document.getElementById('tracker-dashboard').className='sq-tab-overview');
  assert.equal(await visible('#clear'),true,'desktop clear');
  await page.setViewportSize({width:390,height:844});
  assert.equal(await visible('#smart-settle-card'),false,'resizing back to mobile');
 }finally{await browser.close();}
});
