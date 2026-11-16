import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chromium} from 'playwright';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const css=readFileSync(new URL('../doweo-bills-mobile-dashboard.css',import.meta.url),'utf8');
const js=readFileSync(new URL('../doweo-bills-mobile-dashboard.js',import.meta.url),'utf8');
const markup=html.slice(html.indexOf('<section id="sq-bills-page"'),html.indexOf('<div id="trackers-gallery"')).replace('class="sq-bills-page" hidden','class="sq-bills-page"');
assert.match(markup,/<section id="sq-bills-page"/);

test('mobile billing dashboard preserves all original actions and data anchors',()=>{
 for(const id of ['sq-bills-tracker','sq-bill-mobile-toggle','sq-bills-create','sq-bill-paid-by','sq-bill-split-mode','sq-premium-monthly','sq-premium-active','sq-premium-prev','sq-premium-next','sq-bills-bill-list','sq-bills-sub-list','sq-bills-back']){
  assert.match(markup,new RegExp('id="'+id+'"'),'preserve '+id);
 }
 assert.match(html,/src="\/doweo-bills-mobile-dashboard\.js"/);
 assert.match(html,/href="\/doweo-bills-mobile-dashboard\.css"/);
 assert.match(js,/overview\.insertBefore\(calendar,create\)/,'desktop restores existing calendar');
});

test('responsive billing page is compact on mobile and restores desktop structure',async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 try {
  const page=await browser.newPage({viewport:{width:390,height:844}});
  await page.setContent('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body class="sq-bills-open"><section id="trackers-page">'+markup+'</section></body></html>');
  await page.addStyleTag({content:`
    #sq-bills-page{width:100%;box-sizing:border-box}
    #sq-bills-page .sq-premium-overview{display:grid;grid-template-columns:1fr 1fr}
    #sq-bills-page .sq-premium-metrics{display:contents}
    #sq-bills-page .sq-bills-columns{display:grid;grid-template-columns:1fr 1fr}
    #sq-bills-page .sq-bills-workspace-tabs{display:grid;grid-template-columns:repeat(4,1fr)}
    #sq-bills-page .sq-bills-card{padding:20px}
    #sq-bills-page[hidden]{display:none}
  `});
  await page.addStyleTag({content:css});
  await page.addScriptTag({content:js});
  const ids=['sq-bills-create','sq-bills-tracker','sq-premium-monthly','sq-premium-active','sq-bills-sub-list','sq-bills-bill-list'];
  for(const width of [320,390,430,760]){
   await page.setViewportSize({width,height:844});
   const state=await page.evaluate(()=>{
    const box=sel=>document.querySelector(sel).getBoundingClientRect();
    const p=box('#sq-bills-page'),title=box('.sq-bills-title'),nav=box('.sq-bills-workspace-tabs'),a=box('.sq-premium-metrics article:first-child'),b=box('.sq-premium-metrics article:nth-child(2)');
    return {pageWidth:p.width,titleBottom:title.bottom,navTop:nav.top,navBottom:nav.bottom,statsTop:a.top,statsColumns:Math.abs(a.top-b.top)<4,calendarHidden:!document.querySelector('.dw-bills-calendar-fold').open,calendarBelow:box('.dw-bills-calendar-fold').top>=box('.sq-bills-columns').bottom-3,scrollWidth:document.documentElement.scrollWidth,viewport:innerWidth};
   });
   assert.ok(state.pageWidth<=width+2,'page width at '+width+': '+JSON.stringify(state));
   assert.ok(state.titleBottom>=state.navBottom-3,'title must follow navigation at '+width+': '+JSON.stringify(state));
   assert.ok(state.statsTop>=state.titleBottom-3,'stats below navigation at '+width+': '+JSON.stringify(state));
   assert.ok(state.statsColumns,'metrics sit side by side at '+width);
   assert.ok(state.calendarHidden&&state.calendarBelow,'calendar collapses after lists at '+width);
   assert.ok(state.scrollWidth<=width+2,'no horizontal overflow at '+width+': '+JSON.stringify(state));
   for(const id of ids)assert.equal(await page.locator('#'+id).count(),1,'preserve '+id);
  }
  await page.locator('.dw-bills-calendar-fold > summary').click();
  assert.equal(await page.locator('.dw-bills-calendar-fold').evaluate(el=>el.open),true,'calendar can be expanded');
  await page.setViewportSize({width:1000,height:844});
  assert.equal(await page.locator('#sq-bills-page').evaluate(el=>el.classList.contains('dw-bills-compact')),false,'desktop mode off');
  assert.equal(await page.locator('.sq-premium-calendar').evaluate(el=>el.parentElement.classList.contains('sq-premium-overview')),true,'desktop calendar returns to original grid');
  await page.setViewportSize({width:390,height:844});
  assert.equal(await page.locator('.sq-premium-calendar').evaluate(el=>el.parentElement.classList.contains('dw-bills-calendar-fold')),true,'calendar moves back on resize');
 }finally{await browser.close()}
});
