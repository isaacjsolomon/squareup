import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chromium} from 'playwright';

const source=readFileSync(new URL('../doweo-trips-activity.js',import.meta.url),'utf8');
const start=source.indexOf('/* Desktop Trackers: mount the EXISTING Finance Hub trip/household workspace inline.');
assert.ok(start>=0,'inline workspace implementation exists');

test('desktop tabs mount complete existing workspaces and restore gallery on All Trackers or mobile', {timeout:45000}, async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  await page.setContent([
   '<!DOCTYPE html><html><head><style>',
   'body{margin:0;background:#095278;color:white;font:16px Arial}',
   '#trackers-page{max-width:1100px;margin:28px auto}',
   '.dw-section-tabs{display:none!important}',
   '#trackers-gallery{display:grid;grid-template-columns:1fr 1fr}',
   '.tracker-tile{display:block!important;background:#0a253c;padding:22px}',
   '#sq-nextgen[hidden]{display:none!important}',
   '#sq-nextgen{position:fixed;inset:0;background:#071522}',
   '#sq-nextgen .sq-ng-shell{padding:40px}',
   '</style></head><body class="trackers-view">',
   '<button id="nav-trackers">Trackers</button><button id="nav-home">Home</button>',
   '<section id="trackers-page"><nav class="dw-section-tabs" aria-label="Tracker sections">',
   '<button type="button" data-dw-section="trackers">All Trackers</button>',
   '<button type="button" data-dw-section="trip">Trips</button>',
   '<button type="button" data-dw-section="home">Households</button></nav>',
   '<div id="trackers-gallery"><button class="sq-create-tracker-row">Create new tracker</button>',
   '<article class="tracker-tile" data-tracker-id="friends"><h3>Friends</h3><button id="open-friends">Open tracker</button></article>',
   '<article class="tracker-tile" data-tracker-id="vacation"><h3>Vacation</h3><button>Open tracker</button></article>',
   '</div></section>',
   '<section id="sq-nextgen" hidden aria-label="DoWeo Finance Workspace"><div class="sq-ng-shell">',
   '<nav class="dw-section-tabs"><button>Finance</button></nav><header class="sq-ng-header">Finance Hub</header>',
   '<div class="sq-ng-tabs"><button>Finance</button></div>',
   '<div id="dw-finance-extras"><button id="dw-planning-launch">Goals &amp; Budgets</button>',
   '<button id="dw-trip-plus-launch">Trip Planner &amp; Activity</button>',
   '<button id="dw-paylink-launch">Pay Link</button></div>',
   '<div id="sq-ng-content"></div><section id="dw-trip-plus">Itinerary</section>',
   '</div></section></body></html>'
  ].join(''));
  await page.evaluate(()=>{
   window.renderedTabs=[];
   window.squareUpOpenFinanceHub=(which)=>{
    window.renderedTabs.push(which);
    const root=document.getElementById('sq-nextgen');
    root.hidden=false;
    document.body.classList.add('sq-finance-open');
    document.body.style.overflow='hidden';
    document.getElementById('sq-ng-content').textContent=which==='trip'?'Your trips | Itinerary | Trip budget | Link existing tracker':'Your households | Chore | Grocery | Household budget | Link existing tracker';
   };
   window.cardClicks=0;
   document.getElementById('open-friends').addEventListener('click',()=>window.cardClicks++);
  });
  await page.addScriptTag({content:source.slice(start)});
  const bar=page.locator('#trackers-page>.dw-section-tabs');
  assert.equal(await bar.isVisible(),true);
  const dimensions=await bar.evaluate(el=>({width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height,buttonHeight:el.querySelector('button').getBoundingClientRect().height}));
  assert.ok(dimensions.width>900,'wide category bar');
  assert.ok(dimensions.buttonHeight>=40&&dimensions.buttonHeight<=48,'compact category buttons');
  assert.ok(dimensions.height<70,'bar is not oversized');

  await page.getByRole('button',{name:'Trips',exact:true}).click();
  assert.equal(await page.locator('#sq-nextgen').isVisible(),true);
  assert.equal(await page.locator('#trackers-gallery').isVisible(),false);
  assert.equal(await page.locator('#sq-nextgen').evaluate(el=>el.parentElement.id),'dw-trackers-workspace-host');
  assert.equal(await page.locator('#sq-nextgen').evaluate(el=>getComputedStyle(el).position),'static');
  assert.match(await page.locator('#sq-ng-content').textContent(),/Itinerary.*Trip budget/);
  assert.equal(await page.locator('#dw-trip-plus-launch').isVisible(),true);
  assert.equal(await page.locator('#dw-planning-launch').isVisible(),true);
  assert.equal(await page.locator('#dw-paylink-launch').isVisible(),false);
  assert.equal(await page.evaluate(()=>document.body.style.overflow),'','no scroll locking inside Trackers');

  await page.getByRole('button',{name:'Households',exact:true}).click();
  assert.match(await page.locator('#sq-ng-content').textContent(),/Chore.*Grocery.*Household budget/);
  assert.equal(await page.locator('#dw-trip-plus-launch').isVisible(),false);
  assert.equal(await page.locator('#dw-planning-launch').isVisible(),true);
  assert.deepEqual(await page.evaluate(()=>window.renderedTabs),['trip','home']);

  await page.getByRole('button',{name:'All Trackers',exact:true}).click();
  assert.equal(await page.locator('#sq-nextgen').isVisible(),false);
  assert.equal(await page.locator('#trackers-gallery').isVisible(),true);
  assert.equal(await page.locator('#sq-nextgen').evaluate(el=>el.parentElement.tagName),'BODY');
  await page.locator('#open-friends').click();
  assert.equal(await page.evaluate(()=>window.cardClicks),1,'original tracker action remains bound');

  await page.getByRole('button',{name:'Trips',exact:true}).click();
  await page.setViewportSize({width:390,height:844});
  await page.waitForFunction(()=>!document.body.classList.contains('dw-trackers-workspace-inline'));
  assert.equal(await bar.isVisible(),false,'no new mobile tab bar');
  assert.equal(await page.locator('#trackers-gallery').isVisible(),true);
  assert.equal(await page.locator('#sq-nextgen').isVisible(),false);
  await page.close();
 }finally{await browser.close()}
});
