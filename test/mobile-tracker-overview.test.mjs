import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chromium} from 'playwright';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');

test('mobile Overview hides extras and scrolls only when its content overflows',async()=>{
 const browser=await chromium.launch({headless:true,
  ...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844}});
  // Use production markup and every production stylesheet, without account/network
  // scripts. Install the same loaded-tracker state and responsive DOM placement.
  await page.route('**/*',route=>route.abort());
  await page.setContent(html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,''));
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
  await page.evaluate(html.match(/<script id="dw-mobile-overview-fit-script">([\s\S]*?)<\/script>/)[1]);
  // Exercise both possible Smart Settle-Up parents (moved at 740px in the app).
  const smartMarkup=html.match(/<details class="card tracker-collapsible" id="smart-settle-card"[\s\S]*?<\/details>/)[0];
  await page.evaluate(markup=>document.getElementById('tracker-dashboard').insertAdjacentHTML('beforeend',markup),smartMarkup);
  const visible=selector=>page.locator(selector).isVisible();
  for(const width of [320,390,740,741,900]){
   await page.setViewportSize({width,height:1000});
   assert.equal(await visible('#smart-settle-card'),false,`smart at ${width}`);
   assert.equal(await visible('.sq-return-smart-panel'),false,`smart wrapper at ${width}`);
   assert.equal(await visible('#clear'),false,`clear at ${width}`);
   assert.equal(await page.locator('#tracker-dashboard').evaluate(e=>getComputedStyle(e).paddingBottom),'0px');
  }
  await page.setViewportSize({width:390,height:1000});
  await page.waitForFunction(()=>document.documentElement.classList.contains('dw-mobile-overview-fit'));
  assert.equal(await visible('#sq-mobile-extra-balances'),false);
  assert.equal(await page.evaluate(()=>getComputedStyle(document.documentElement).overflowY),'hidden');
  assert.ok(await page.evaluate(()=>document.scrollingElement.scrollHeight<=innerHeight+1),'fitting content must not scroll');
  for(const height of [480,320]){
   await page.setViewportSize({width:320,height});
   await page.waitForFunction(()=>!document.documentElement.classList.contains('dw-mobile-overview-fit'));
   assert.ok(await page.evaluate(()=>document.scrollingElement.scrollHeight>innerHeight),'small screens must overflow');
   await page.evaluate(()=>{document.documentElement.style.scrollBehavior='auto';scrollTo(0,document.scrollingElement.scrollHeight);});
   assert.ok(await page.evaluate(()=>scrollY>0),'overflow must remain scrollable');
   assert.ok(await page.evaluate(()=>{
    const content=document.getElementById('sq-return-summary').getBoundingClientRect();
    const nav=document.querySelector('.sq-mobile-nav').getBoundingClientRect();
    return content.bottom<=nav.top;
   }),'last content must clear fixed navigation at the end of the page');
  }
  await page.setViewportSize({width:390,height:1000});
  await page.evaluate(()=>{
   const p=document.createElement('p');p.textContent='Expanded balance details '.repeat(250);
   document.getElementById('sq-return-summary').append(p);
  });
  assert.ok(await page.evaluate(()=>document.scrollingElement.scrollHeight>innerHeight),'expanded content must overflow');
  await page.waitForFunction(()=>!document.documentElement.classList.contains('dw-mobile-overview-fit'));
  // A different mobile tab must retain the original clear and settle controls.
  await page.evaluate(()=>document.getElementById('tracker-dashboard').className='sq-tab-members');
  assert.equal(await visible('#clear'),true);
  assert.equal(await visible('#smart-settle-card'),true);
  await page.evaluate(()=>document.getElementById('tracker-dashboard').className='sq-tab-overview');
  await page.setViewportSize({width:1280,height:900});
  await page.evaluate(()=>document.getElementById('sq-return-smart-host').append(document.getElementById('smart-settle-card')));
  assert.equal(await visible('#smart-settle-card'),true,'desktop Smart Settle-Up');
  assert.equal(await visible('#clear'),true,'desktop clear');
  await page.setViewportSize({width:390,height:844});
  assert.equal(await visible('#smart-settle-card'),false,'resizing back to mobile');
 }finally{await browser.close();}
});
