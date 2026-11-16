import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chromium} from 'playwright';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const css=readFileSync(new URL('../doweo-bills-mobile-dashboard.css',import.meta.url),'utf8');
const js=readFileSync(new URL('../doweo-bills-mobile-dashboard.js',import.meta.url),'utf8');
const markup=html.slice(html.indexOf('<section id="sq-bills-page"'),html.indexOf('<div id="trackers-gallery"'));
assert.match(markup,/<section id="sq-bills-page"/);

test('preserves original billing actions without depending on a JavaScript styling class',()=>{
 for(const id of ['sq-bills-tracker','sq-bill-mobile-toggle','sq-bills-create','sq-bill-paid-by','sq-bill-split-mode','sq-premium-monthly','sq-premium-active','sq-premium-prev','sq-premium-next','sq-bills-bill-list','sq-bills-sub-list','sq-bills-back']){
  assert.match(markup,new RegExp('id="'+id+'"'),'preserve '+id);
 }
 assert.match(html,/src="\\/doweo-bills-mobile-dashboard\\.js"/);
 assert.match(html,/href="\\/doweo-bills-mobile-dashboard\\.css"/);
 assert.doesNotMatch(css,/#sq-bills-page\\.dw-bills-compact/,'styling must not depend on JS-added class');
 assert.match(js,/overview\\.insertBefore\\(calendar,create\\)/,'desktop calendar restoration');
});

test('visible mobile Bills layout works even when calendar JavaScript does not run',async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844}});
  await page.setContent('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body class="sq-bills-open"><section id="trackers-page">'+markup+'</section></body></html>');
  await page.evaluate(()=>{
   const bills=document.getElementById('sq-bills-page');
   bills.removeAttribute('hidden');
   bills.classList.remove('hidden');
   bills.style.removeProperty('display');
  });
  await page.addStyleTag({content:`
   *{box-sizing:border-box}
   body{margin:0}
   #sq-bills-page{width:100%}
   #sq-bills-page .sq-premium-overview{display:grid;grid-template-columns:1fr 1fr}
   #sq-bills-page .sq-premium-metrics{display:contents}
   #sq-bills-page .sq-bills-columns{display:grid;grid-template-columns:1fr 1fr}
   #sq-bills-page .sq-bills-workspace-tabs{display:grid;grid-template-columns:repeat(4,1fr)}
  `});
  await page.addStyleTag({content:css});
  const inspect=()=>page.evaluate(()=>{
   const box=selector=>document.querySelector(selector).getBoundingClientRect();
   const b=box('#sq-bills-page'),tabs=box('.sq-bills-workspace-tabs'),back=box('.sq-bills-back'),title=box('.sq-bills-title');
   const a=box('.sq-premium-metrics article:first-child'),c=box('.sq-premium-metrics article:nth-child(2)');
   return {pageWidth:b.width,pageHeight:b.height,tabsBottom:tabs.bottom,backTop:back.top,backBottom:back.bottom,titleTop:title.top,titleBottom:title.bottom,statsTop:a.top,statsSideBySide:Math.abs(a.top-c.top)<4,scrollWidth:document.documentElement.scrollWidth,viewport:innerWidth,display:getComputedStyle(document.getElementById('sq-bills-page')).display};
  });
  for(const width of [320,390,430,760]){
   await page.setViewportSize({width,height:844});
   const state=await inspect();
   assert.ok(state.pageHeight>200&&state.display==='flex','page actually visible at '+width+': '+JSON.stringify(state));
   assert.ok(state.tabsBottom<=state.backTop+3,'tabs must precede back control at '+width+': '+JSON.stringify(state));
   assert.ok(state.backBottom<=state.titleTop+3,'back control must precede title at '+width+': '+JSON.stringify(state));
   assert.ok(state.statsTop>=state.titleBottom-3,'metrics must follow title at '+width+': '+JSON.stringify(state));
   assert.ok(state.statsSideBySide,'metrics side by side at '+width+': '+JSON.stringify(state));
   assert.ok(state.pageWidth<=width+2&&state.scrollWidth<=width+2,'no horizontal overflow at '+width+': '+JSON.stringify(state));
  }
  // Progressive enhancement: calendar folding works when JS is present.
  await page.setViewportSize({width:390,height:844});
  await page.addScriptTag({content:js});
  assert.equal(await page.locator('.dw-bills-calendar-fold').count(),1,'calendar fold created');
  assert.equal(await page.locator('.dw-bills-calendar-fold').evaluate(el=>el.open),false,'collapsed by default');
  const calendar=page.locator('.dw-bills-calendar-fold');
  assert.ok((await calendar.boundingBox()).y>=(await page.locator('.sq-bills-columns').boundingBox()).y,'calendar appears after lists');
  await page.locator('.dw-bills-calendar-fold > summary').click();
  assert.equal(await calendar.evaluate(el=>el.open),true,'calendar can expand');
  await page.setViewportSize({width:1000,height:844});
  assert.equal(await page.locator('.sq-premium-calendar').evaluate(el=>el.parentElement.classList.contains('sq-premium-overview')),true,'desktop calendar restored');
  await page.setViewportSize({width:390,height:844});
  assert.equal(await page.locator('.sq-premium-calendar').evaluate(el=>el.parentElement.classList.contains('dw-bills-calendar-fold')),true,'mobile calendar restored');
  for(const id of ['sq-bills-create','sq-bills-tracker','sq-premium-monthly','sq-premium-active','sq-bills-sub-list','sq-bills-bill-list']){
   assert.equal(await page.locator('#'+id).count(),1,'billing control preserved: '+id);
  }
 } finally{await browser.close()}
});
