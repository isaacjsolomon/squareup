import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chromium} from 'playwright';

// Exercise the real More sheet extracted from production index.html, not a fake
// stand-in DOM that can pass even when the actual button is missing.
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const start=html.indexOf('<div class="sq-balanced-overlay" id="sq-mobile-more-sheet"');
const end=html.indexOf('<script id="sq-balanced-mobile-script">',start);
assert.ok(start>=0 && end>start,'real mobile More markup exists');
const realMoreMarkup=html.slice(start,end);

test('mobile More HTML permanently includes a working Home Screen button',{timeout:60000},async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  for(const [name,userAgent] of [
   ['iPhone Safari','Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1'],
   ['other iPhone browser','Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/125.0 Mobile/15E148 Safari/604.1']
  ]){
   const context=await browser.newContext({viewport:{width:390,height:844},userAgent});
   try{
    const page=await context.newPage();
    await page.setContent('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>'+realMoreMarkup+'</body></html>');
    await page.evaluate(()=>document.getElementById('sq-mobile-more-sheet').hidden=false);
    const install=page.locator('#dw-mobile-home-screen-install-native');
    assert.equal(await install.count(),1,name+' native install button exists');
    assert.ok(await install.isVisible(),name+' displays native install button');
    const grid=page.locator('#sq-mobile-more-sheet > .sq-balanced-sheet > .sq-balanced-more-grid');
    assert.equal(await grid.locator(':scope > button').count(),8,name+' retains original 8 More tiles');
    assert.ok(await install.evaluate(el=>el.compareDocumentPosition(el.parentElement.querySelector(':scope > .sq-balanced-more-grid'))&Node.DOCUMENT_POSITION_FOLLOWING),name+' button is above tiles');
    await install.click();
    assert.equal(await page.locator('#dw-mobile-home-screen-help').evaluate(el=>el.open),true,name+' opens real native dialog');
    await page.locator('#dw-mobile-home-screen-help form button').click();
    assert.equal(await page.locator('#dw-mobile-home-screen-help').evaluate(el=>el.open),false,name+' closes real native dialog');
   }finally{await context.close()}
  }
  const desktop=await browser.newContext({viewport:{width:1280,height:800}});
  try{
   const page=await desktop.newPage();
   await page.setContent('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>'+realMoreMarkup+'</body></html>');
   await page.evaluate(()=>document.getElementById('sq-mobile-more-sheet').hidden=false);
   assert.equal(await page.locator('#dw-mobile-home-screen-install-native').isVisible(),false,'desktop is untouched');
  }finally{await desktop.close()}
 }finally{await browser.close()}
});
