import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chromium} from 'playwright';

const css=readFileSync(new URL('../doweo-mobile-backdrop-navy.css',import.meta.url),'utf8');

test('navy tint applies only to mobile uploaded-photo backdrops',{timeout:30000},async()=>{
  assert.match(css,/@media\s*\(max-width:\s*900px\)/);
  assert.match(css,/#backdrop\.photo::after/);
  assert.doesNotMatch(css,/background-image\s*:/i,'never replace a user-selected image');
  const browser=await chromium.launch({headless:true});
  try{
    const page=await browser.newPage({viewport:{width:390,height:844}});
    await page.setContent(`<!doctype html><html><head>
      <style>
        body {background:#081c2e;}
        #backdrop {position:fixed;inset:0;background-image:linear-gradient(45deg,#76899e,#4c6378);}
        #backdrop.photo::after {content:"";position:absolute;inset:0;background:rgba(15,12,40,.35);}
        #tracker-dashboard {position:relative;z-index:1;}
      </style>
    </head><body><div id="backdrop" class="photo"></div>
      <main id="tracker-dashboard"><article>Tracker card</article></main></body></html>`);
    await page.addStyleTag({content:css});
    const info=async()=>page.evaluate(()=>{
      const b=document.querySelector('#backdrop');
      return {
        overlay:getComputedStyle(b,'::after').backgroundColor,
        image:getComputedStyle(b).backgroundImage,
        body:getComputedStyle(document.body).backgroundColor,
        dashboard:getComputedStyle(document.querySelector('#tracker-dashboard')).display
      };
    });
    const mobile=await info();
    assert.equal(mobile.overlay,'rgba(6, 24, 43, 0.78)','mobile photo backdrop becomes deep navy');
    assert.match(mobile.image,/linear-gradient/,'retain the user-selected photo or preset');
    assert.equal(mobile.dashboard,'block','dashboard cards remain visible');
    await page.setViewportSize({width:1280,height:900});
    const desktop=await info();
    assert.equal(desktop.overlay,'rgba(15, 12, 40, 0.35)','desktop photo tint remains unchanged');
    await page.setViewportSize({width:390,height:844});
    await page.locator('#backdrop').evaluate(el=>el.classList.remove('photo'));
    const preset=await page.evaluate(()=>getComputedStyle(document.querySelector('#backdrop'),'::after').content);
    assert.equal(preset,'none','non-photo presets get no new overlay');
  }finally{await browser.close();}
});
