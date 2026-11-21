import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chromium} from 'playwright';
const js=readFileSync(new URL('../doweo-first-run.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../doweo-first-run.css',import.meta.url),'utf8');
const fixture=`<!doctype html><html><head><meta charset="utf-8"></head><body>
<section id="onboarding-page" hidden></section>
<button id="nav-home">Home</button><button id="nav-trackers">Trackers</button>
<button id="tb-share">Share tracker</button>
<select id="tracker-select"></select>
<button id="quick-expense">Add expense</button><button id="sq-clean-settle">Settle up</button>
<div id="tracker-dashboard"><section id="sq-return-summary">Overview</section></div>
<section id="trackers-page">
<div class="trackers-header"><h2>My Trackers</h2></div>
<div id="trackers-gallery">
<button id="tracker-gallery-new">Create tracker</button>
</div></section>
</body></html>`;

test('desktop empty-account guide is actionable, accessible and cannot change saved financial data',{timeout:45000},async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1250,height:850}});
  const requests=[];
  page.on('request',request=>requests.push({method:request.method(),url:request.url()}));
  await page.setContent(fixture);
  await page.addStyleTag({content:css});
  await page.evaluate(()=>window.__clicks={});
  await page.evaluate(()=>{
   for(const id of ['tracker-gallery-new','tb-share','nav-home','nav-trackers','quick-expense','sq-clean-settle']){
    document.getElementById(id).addEventListener('click',()=>window.__clicks[id]=(window.__clicks[id]||0)+1);
   }
  });
  await page.addScriptTag({content:js});
  assert.equal(await page.locator('#dw-first-run').isVisible(),false,'never show before gallery finishes loading');
  await page.locator('#tracker-select').evaluate(select=>{
    select.innerHTML='<option value="local">This device</option>';
  });
  await page.locator('#dw-first-run-prompt').waitFor({state:'visible'});
  assert.equal(await page.locator('#dw-first-run').isVisible(),true,
    'Home onboarding appears from loaded tracker picker before Trackers is visited');
  await page.locator('#trackers-gallery').evaluate(el=>{
   const section=document.createElement('section');
   section.className='dw-guided-empty';
   section.innerHTML='<strong>No trackers yet</strong><button type="button">Create your first tracker</button>';
   el.append(section);
  });
  await page.locator('#dw-first-run').waitFor({state:'visible'});
  assert.equal(await page.locator('#dw-first-run-prompt').isVisible(),true,'new desktop users see a Home onboarding invitation');
  assert.equal(await page.locator('#dw-first-run-progress').textContent(),'0 of 4 steps complete');
  assert.equal(await page.locator('#dw-first-run-step-label').count(),0);
  assert.equal(await page.locator('.dw-first-run-step').count(),4);
  assert.equal(await page.locator('.dw-first-run-step-action:disabled').count(),3,'no invitation or payment action before tracker creation');
  await page.locator('#dw-first-run-prompt .dw-first-run-secondary').click();
  await page.locator('#dw-first-run-overlay').waitFor({state:'visible'});
  assert.equal(await page.locator('.dw-first-run-dialog-kicker').textContent(),'EXAMPLE ONLY · 1 / 3');
  for(const words of ['Avery','Blake','Casey']) assert.match(await page.locator('.dw-first-run-example').innerText(),new RegExp(words));
  await page.locator('.dw-first-run-dialog-foot .dw-first-run-primary').click();
  assert.match(await page.locator('.dw-first-run-example').innerText(),/Dinner.*60\.00/);
  await page.locator('.dw-first-run-dialog-foot .dw-first-run-primary').click();
  assert.match(await page.locator('.dw-first-run-example').innerText(),/Blake.*20\.00/);
  await page.locator('.dw-first-run-dialog-foot .dw-first-run-primary').click();
  assert.equal(await page.locator('#dw-first-run-overlay').isVisible(),false,'Finish closes read-only example');
  assert.equal(requests.filter(x=>['POST','PUT','PATCH','DELETE'].includes(x.method)).length,0,'example cannot write data');
  await page.locator('#dw-first-run .dw-first-run-primary').click();
  await page.locator('#dw-first-run-overlay').waitFor({state:'visible'});
  assert.equal(await page.locator('.dw-first-run-dialog-kicker').textContent(),'GETTING STARTED · 1 / 4');
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#dw-first-run-overlay').isVisible(),false);
  await page.locator('.dw-first-run-step-action').first().click();
  assert.equal(await page.evaluate(()=>window.__clicks['tracker-gallery-new']),1,'create delegates to existing action');
  await page.locator('#trackers-gallery').evaluate(el=>{
   el.querySelector('.dw-guided-empty')?.remove();
   const t=document.createElement('article');t.className='tracker-tile';t.textContent='My real tracker';el.append(t);
  });
  await page.locator('#tracker-select').evaluate(select=>{
    const real=document.createElement('option');real.value='real-tracker-id';real.textContent='My real tracker';select.append(real);
  });
  await page.waitForFunction(()=>document.querySelector('#dw-first-run-progress')?.textContent==='1 of 4 steps complete');
  assert.equal(await page.locator('.dw-first-run-step input').first().isChecked(),true,'creation reflects real gallery');
  await page.locator('.dw-first-run-step-action').nth(1).click();
  assert.equal(await page.evaluate(()=>window.__clicks['tb-share']),1,'sharing uses existing flow');
  await page.locator('.dw-first-run-step-action').nth(2).click();
  assert.equal(await page.evaluate(()=>window.__clicks['quick-expense']),1,'expense uses existing flow');
  await page.locator('.dw-first-run-step-action').nth(3).click();
  assert.equal(await page.evaluate(()=>window.__clicks['sq-clean-settle']),1,'settlement uses existing flow');
  await page.locator('.dw-first-run-step input').nth(1).check();
  assert.equal(await page.locator('#dw-first-run-progress').textContent(),'2 of 4 steps complete');
  assert.equal(await page.locator('#dw-first-run-prompt').isVisible(),false,'existing trackers remove introductory Home prompt');
  await page.locator('.dw-first-run-dismiss').click();
  assert.equal(await page.locator('#dw-first-run').isVisible(),false);
  await page.locator('#dw-first-run-open').click();
  assert.equal(await page.locator('#dw-first-run').isVisible(),true,'guide can be reopened');
 }finally{await browser.close();}
});

test('established desktop accounts do not see an intrusive Home prompt',{timeout:30000},async()=>{
 const browser=await chromium.launch({headless:true});
 try{
   const page=await browser.newPage({viewport:{width:1280,height:850}});
   await page.setContent(fixture);
   await page.locator('#tracker-select').evaluate(select=>{
     select.innerHTML='<option value="local">This device</option><option value="saved">Saved tracker</option>';
   });
   await page.addStyleTag({content:css});
   await page.addScriptTag({content:js});
   assert.equal(await page.locator('#dw-first-run-prompt').isVisible(),false);
   assert.equal(await page.locator('#dw-first-run').isVisible(),false);
   await page.locator('#dw-first-run-open').click();
   assert.equal(await page.locator('#dw-first-run').isVisible(),true,'guide remains available on demand');
   assert.equal(await page.locator('#dw-first-run-progress').textContent(),'1 of 4 steps complete');
 }finally{await browser.close()}
});

test('mobile never initializes or displays desktop first-run guide',{timeout:30000},async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844}});
  await page.setContent(fixture);
  await page.addStyleTag({content:css});
  await page.addScriptTag({content:js});
  assert.equal(await page.locator('#dw-first-run').count(),0,'no mobile DOM changes');
  assert.equal(await page.locator('#dw-first-run-overlay').count(),0,'no mobile modal');
  assert.equal(await page.locator('#trackers-gallery .dw-first-run-example-link').count(),0);
 }finally{await browser.close();}
});
