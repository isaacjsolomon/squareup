import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chromium} from 'playwright';

const source=readFileSync(new URL('../doweo-mobile-more-pages.js',import.meta.url),'utf8');
const styles=readFileSync(new URL('../doweo-mobile-more-pages.css',import.meta.url),'utf8');

test('iPhone browser displays the Home Screen button before all eight More tiles and opens its guide',{timeout:60000},async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const cases=[
   ['Safari','Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1'],
   ['iOS browser without Safari Version tokens','Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/125.0 Mobile/15E148 Safari/604.1']
  ];
  for(const [name,userAgent] of cases){
   const context=await browser.newContext({viewport:{width:390,height:844},userAgent});
   try{
    const page=await context.newPage();
    await page.setContent('<!DOCTYPE html><body><div class="wrap"></div><div id="sq-mobile-more-sheet"><section class="sq-balanced-sheet"><h2>More</h2><p>All your DoWeo tools in one place.</p><div class="sq-balanced-more-grid"><button data-sq-social-open>Social</button><button data-sq-destination="sqev-nav">Events</button><button data-sq-destination="sq-mobile-notifications">Notifications</button><button data-sq-destination="nav-analytics">Analytics</button><button data-sq-destination="nav-profile">Account</button><button data-sq-destination="nav-about">About</button><button data-sq-destination="nav-privacy-terms">Privacy</button><button data-sq-destination="sq-finance-nav">Finance</button></div><button id="sq-mobile-more-logout">Log out</button></section></div><button id="sq-mobile-more">More</button></body>');
    await page.addStyleTag({content:styles});
    await page.addScriptTag({content:source});
    const install=page.locator('#dw-ios-install-trigger');
    assert.ok(await install.isVisible(),name+' should display install button');
    const grid=page.locator('#sq-mobile-more-sheet > .sq-balanced-sheet > .sq-balanced-more-grid');
    assert.equal(await grid.locator(':scope > button').count(),8,name+' keeps exactly 8 tiles');
    const buttonBottom=await install.evaluate(el=>el.getBoundingClientRect().bottom);
    const gridTop=await grid.evaluate(el=>el.getBoundingClientRect().top);
    assert.ok(buttonBottom<=gridTop,name+' install button must appear above the tiles');
    await install.click();
    assert.ok(await page.locator('#dw-ios-install-guide').isVisible(),name+' guide opens');
    await page.locator('.dw-ios-install-done').click();
    assert.equal(await page.locator('#dw-ios-install-guide').isVisible(),false,name+' guide closes');
   }finally{await context.close()}
  }
 }finally{await browser.close()}
});
