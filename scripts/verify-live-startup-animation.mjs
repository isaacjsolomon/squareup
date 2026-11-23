import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const base=(process.env.HOME_BASE_URL||'https://doweo.app').replace(/\/$/,'');
const browser=await chromium.launch({headless:true});

try {
  for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
    const page=await browser.newPage({viewport});
    const url=base+'/?startup-animation-check='+viewport.width;
    await page.goto(url,{waitUntil:'commit',timeout:45000});
    await page.locator('#sq-startup-overlay svg.doweo-loading-logo').waitFor({state:'attached',timeout:25000});
    const state=await page.evaluate(()=>{
      const screen=document.getElementById('sq-startup-overlay');
      const svg=screen.querySelector('svg.doweo-loading-logo');
      const traces=[...svg.querySelectorAll('path.doweo-logo-trace')];
      return {
        initiallyHidden:screen.hidden,
        pathCount:traces.length,
        colors:[...svg.querySelectorAll('stop')].map(stop=>stop.getAttribute('stop-color')),
        animation:traces.map(path=>getComputedStyle(path).animationName),
        duration:traces.map(path=>getComputedStyle(path).animationDuration),
        controller:typeof window.dwSetStartupScreen
      };
    });
    assert.equal(state.pathCount,4,'DoWeo SVG must contain all four logo strokes');
    assert.ok(state.colors.includes('#60F1AD'),'the animated logo must retain mint');
    assert.ok(state.colors.includes('#1EDFFF'),'the animated logo must retain cyan');
    assert.ok(state.animation.every(x=>x.includes('dw-startup-logo-draw')),
      'all SVG paths must animate on '+viewport.width+'px: '+JSON.stringify(state));
    assert.equal(state.controller,'function','startup dismissal controller must be installed');
    assert.equal(state.initiallyHidden,false,'logo must remain visible at first paint on '+viewport.width+'px');
    await page.waitForFunction(()=>document.getElementById('sq-startup-overlay')?.hidden===true,
      null,{timeout:25000});
    console.log('Live animated startup verified:',viewport.width,JSON.stringify(state));
    await page.close();
  }
  const reduced=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
  await reduced.goto(base+'/?startup-animation-check=reduced',{waitUntil:'commit',timeout:45000});
  await reduced.locator('#sq-startup-overlay svg.doweo-loading-logo').waitFor({state:'attached',timeout:25000});
  const motion=await reduced.locator('#sq-startup-overlay .doweo-logo-trace').first()
    .evaluate(path=>getComputedStyle(path).animationName);
  assert.equal(motion,'none','reduced-motion browsers should see the finished logo without motion');
  await reduced.close();
} finally {
  await browser.close();
}
