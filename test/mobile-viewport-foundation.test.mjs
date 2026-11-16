import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chromium} from 'playwright';

const css = readFileSync(new URL('../weo-actions.css', import.meta.url),'utf8');

test('mobile foundation pins navigation and preserves document scrolling',async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844}});
  await page.setContent('<main class="wrap"><section id="tracker-dashboard"><div style="height:1150px">Scrollable dashboard</div></section></main><nav class="sq-mobile-nav" style="height:65px">Navigation</nav>');
  await page.addStyleTag({content:css});
  for(const width of [320,390,740,900]){
   await page.setViewportSize({width,height:844});
   const d=await page.evaluate(()=>{
    const nav=document.querySelector('.sq-mobile-nav').getBoundingClientRect();
    return {bottom:nav.bottom, width:nav.width,viewportWidth:innerWidth,viewportHeight:innerHeight,scroll:document.scrollingElement.scrollHeight,bodyPosition:getComputedStyle(document.body).position};
   });
   assert.ok(Math.abs(d.bottom-d.viewportHeight)<2,`navigation bottom at ${width}: ${JSON.stringify(d)}`);
   assert.ok(Math.abs(d.width-d.viewportWidth)<2,`navigation width at ${width}: ${JSON.stringify(d)}`);
   assert.ok(d.scroll>d.viewportHeight,'content must remain scrollable');
   assert.notEqual(d.bodyPosition,'fixed','body must not be locked');
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'horizontal overflow');
  }
  await page.setViewportSize({width:390,height:844});
  await page.evaluate(()=>window.scrollTo(0,400));
  assert.ok(await page.evaluate(()=>scrollY>0),'page should scroll');
 }finally{await browser.close();}
});

test('mobile dialogs are constrained to the visible viewport',async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:320,height:480}});
  await page.setContent('<div class="modal-bg"><div class="card modal" style="width:900px;height:950px"><button>Save</button></div></div>');
  await page.addStyleTag({content:css});
  const metrics=await page.locator('.card.modal').evaluate(node=>{
   const rect=node.getBoundingClientRect();
   const style=getComputedStyle(node);
   return {width:rect.width,height:rect.height,maxHeight:style.maxHeight,overflowY:style.overflowY};
  });
  assert.ok(metrics.width<=296,`dialog exceeds viewport: ${JSON.stringify(metrics)}`);
  assert.ok(metrics.height<=456,`dialog height exceeds viewport: ${JSON.stringify(metrics)}`);
  assert.equal(metrics.overflowY,'auto');
 }finally{await browser.close();}
});
