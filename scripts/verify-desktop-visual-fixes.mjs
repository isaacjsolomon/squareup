import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const base=(process.env.HOME_BASE_URL||'https://doweo.app').replace(/\/$/,'');
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
 await page.goto(base+'/?visual-check=original-instagram-v3',{waitUntil:'domcontentloaded',timeout:45000});
 await page.locator('#sq-instagram-invite').waitFor({state:'attached',timeout:20000});
 await page.waitForFunction(()=>{
  return !!Array.from(document.styleSheets).find(s=>s.href?.includes('doweo-desktop-standalone.css?v=20261122-wallpaper-instagram-final-v3'));
 },null,{timeout:25000});

 const result=await page.evaluate(async()=>{
  const invite=document.getElementById('sq-instagram-invite');
  invite.hidden=false;
  await new Promise(resolve=>requestAnimationFrame(resolve));
  const card=invite.querySelector('.sq-ig-card');
  const close=invite.querySelector('.sq-ig-x');
  const logo=invite.querySelector('.sq-ig-mark');
  const title=invite.querySelector('#sq-ig-title');
  const css=el=>getComputedStyle(el);
  return {
   visible:css(invite).display!=='none',
   cardWidth:card.getBoundingClientRect().width,
   closeWidth:close.getBoundingClientRect().width,
   closeHeight:close.getBoundingClientRect().height,
   closeRounded:css(close).borderRadius,
   titleFont:css(title).fontSize,
   markBackground:css(logo).backgroundImage,
   inheritedCloseClass:close.classList.contains('doweo-close-control'),
  };
 });
 console.log('Live Instagram popup geometry:',JSON.stringify(result));
 assert.ok(result.visible,'Instagram invite should be visible');
 assert.ok(result.cardWidth>=300&&result.cardWidth<=422,'Original popup must be compact (max 420px)');
 assert.ok(Math.abs(result.closeWidth-36)<2&&Math.abs(result.closeHeight-36)<2,'Close button must be 36px round');
 assert.ok(result.closeRounded==='50%','Close button must be circular');
 assert.equal(result.titleFont,'22px');
 assert.ok(result.markBackground.includes('gradient'),'Instagram mark must keep its colorful gradient');
 assert.equal(result.inheritedCloseClass,false,'Desktop popup must opt out of the global large close style');

 const mirrored=await page.evaluate(async()=>{
  const backdrop=document.getElementById('backdrop');
  backdrop.style.backgroundImage='linear-gradient(123deg, rgb(1, 2, 3), rgb(4, 5, 6))';
  await new Promise(resolve=>setTimeout(resolve,100));
  return document.documentElement.style.getPropertyValue('--dw-selected-tracker-wallpaper');
 });
 assert.ok(mirrored.includes('123deg'),'Tracker wallpaper must propagate to desktop page styles');

 await page.setViewportSize({width:390,height:844});
 await page.waitForTimeout(100);
 assert.equal(await page.locator('#sq-instagram-invite .sq-ig-x').evaluate(el=>el.classList.contains('doweo-close-control')),true,'Mobile original close control remains unchanged');
 console.log('Original Instagram desktop popup and wallpaper mirroring verified; mobile close control unchanged');
}finally{
 await browser.close();
}
