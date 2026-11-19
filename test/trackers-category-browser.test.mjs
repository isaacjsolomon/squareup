import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chromium} from 'playwright';

const source=readFileSync(new URL('../doweo-trips-activity.js',import.meta.url),'utf8');
const start=source.indexOf('/* Desktop-only categories for the existing Trackers gallery. */');
assert.ok(start>=0,'desktop switcher implementation exists');

test('desktop gallery tabs match the tracker tab style and show the correct tracker cards', {timeout:45000}, async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  await page.setContent(`<!DOCTYPE html><html><head><style>
    body{margin:0;background:#0b5576;color:white;font-family:Arial}
    #trackers-page{max-width:1100px;margin:28px auto}
    .dw-section-tabs{display:none!important}
    .trackers-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:16px}
    .tracker-tile{display:block!important;padding:40px;background:#0a253c}
    .sq-create-tracker-row{display:flex!important;grid-column:1/-1}
    .sq-archive-toggle{grid-column:1/-1}
  </style></head><body class="trackers-view">
  <button id="nav-trackers">Trackers</button>
  <section id="trackers-page"><nav class="dw-section-tabs" aria-label="Tracker sections">
    <button type="button" data-dw-section="trackers">All Trackers</button>
    <button type="button" data-dw-section="trip">Trips</button>
    <button type="button" data-dw-section="home">Households</button>
  </nav>
  <div id="trackers-gallery" class="trackers-grid">
   <div class="sq-create-tracker-row"><button>Create new tracker</button></div>
   <article class="tracker-tile" data-tracker-id="one"><h3>Friends</h3><button class="tile-open">Open tracker</button></article>
   <article class="tracker-tile" data-tracker-id="two"><h3>Vacation</h3><button class="tile-open">Open tracker</button></article>
   <article class="tracker-tile" data-tracker-id="three"><h3>Downtown</h3><button class="tile-open">Open tracker</button></article>
   <button class="sq-archive-toggle">Archived trackers</button>
  </div></section></body></html>`);
  await page.evaluate(()=>{
   window.squareUpApi=async path=>{
    if(path==='finance/workspace-links?type=trip')return [{tracker_id:'two'}];
    if(path==='finance/workspace-links?type=household')return [{tracker_id:'three'}];
    return [];
   };
  });
  await page.addScriptTag({content:source.slice(start)});
  const nav=page.locator('#trackers-page>.dw-section-tabs');
  assert.equal(await nav.isVisible(),true,'top category bar must display despite base display:none');
  const layout=await nav.evaluate(el=>{
    const r=el.getBoundingClientRect();
    const buttons=[...el.querySelectorAll('button')].map(b=>({height:b.getBoundingClientRect().height,font:getComputedStyle(b).fontSize}));
    return {width:r.width,display:getComputedStyle(el).display,buttons};
  });
  assert.equal(layout.display,'grid');
  assert.ok(layout.width>900,'tabs span the tracker page width');
  assert.ok(layout.buttons.every(b=>b.height>=60&&parseFloat(b.font)>=17),'buttons use large tracker tab typography');
  const cards=page.locator('.tracker-tile');
  assert.equal(await cards.count(),3);
  await page.getByRole('button',{name:'Trips',exact:true}).click();
  await page.waitForFunction(()=>document.getElementById('dw-gallery-category-status')?.textContent.includes('1 trip tracker'));
  assert.equal(await cards.nth(0).isVisible(),false);
  assert.equal(await cards.nth(1).isVisible(),true);
  assert.equal(await cards.nth(2).isVisible(),false);
  assert.equal(await cards.nth(1).locator('.tile-open').count(),1,'existing card action remains');
  assert.equal(await page.locator('.sq-create-tracker-row').isVisible(),false);
  await page.getByRole('button',{name:'Households',exact:true}).click();
  await page.waitForFunction(()=>document.getElementById('dw-gallery-category-status')?.textContent.includes('1 household tracker'));
  assert.equal(await cards.nth(0).isVisible(),false);
  assert.equal(await cards.nth(1).isVisible(),false);
  assert.equal(await cards.nth(2).isVisible(),true);
  await page.getByRole('button',{name:'All Trackers',exact:true}).click();
  assert.deepEqual(await cards.evaluateAll(nodes=>nodes.map(el=>el.getBoundingClientRect().height>0)),[true,true,true]);
  assert.equal(await page.locator('.sq-create-tracker-row').isVisible(),true);
  assert.equal(await page.locator('.sq-archive-toggle').isVisible(),true);
  await page.getByRole('button',{name:'Trips',exact:true}).click();
  await page.setViewportSize({width:390,height:844});
  await page.waitForFunction(()=>[...document.querySelectorAll('.tracker-tile')].every(el=>!el.hidden));
  assert.equal(await nav.isVisible(),false,'existing mobile nav stays unchanged');
  assert.deepEqual(await cards.evaluateAll(nodes=>nodes.map(el=>el.getBoundingClientRect().height>0)),[true,true,true]);
  assert.equal(await page.locator('.sq-create-tracker-row').isVisible(),true);
  await page.close();
 }finally{await browser.close()}
});
