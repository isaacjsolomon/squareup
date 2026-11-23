import assert from 'node:assert/strict';
import { chromium } from 'playwright';

// Verify the actual published mobile picker, not a copied mockup.
const base=(process.env.HOME_BASE_URL||'https://doweo.app').replace(/\/$/,'');
const browser=await chromium.launch({headless:true});
try {
  const page=await browser.newPage({
    viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true
  });
  await page.goto(base+'/?verify=mobile-backdrop-previews-v1',{waitUntil:'domcontentloaded',timeout:45000});
  await page.waitForFunction(()=>typeof document.getElementById('btn-backdrop')?.onclick==='function',null,{timeout:45000});
  // The original picker is initialized even without a signed-in tracker.
  await page.evaluate(()=>document.getElementById('btn-backdrop').click());
  const groups=[
    {id:'gradients',expected:9},
    {id:'nature',expected:10},
    {id:'sky',expected:9}
  ];
  for(const group of groups){
    await page.evaluate(id=>{
      const tab=document.querySelector('#backdrop-categories [data-backdrop-category="'+id+'"]');
      if(!tab)throw Error('Missing category '+id);
      tab.click();
    },group.id);
    await page.waitForFunction(({id,count})=>{
      return document.querySelector('#backdrop-categories [data-backdrop-category="'+id+'"].active') &&
        document.querySelectorAll('#backdrop-swatches .swatch').length===count;
    },{id:group.id,count:group.expected},{timeout:10000});
    const info=await page.evaluate(()=>{
      const buttons=[...document.querySelectorAll('#backdrop-swatches .swatch')];
      return buttons.map(button=>{
        const art=button.querySelector(':scope > .dw-backdrop-preview-art');
        const caption=button.querySelector(':scope > .dw-backdrop-preview-title');
        const style=art&&getComputedStyle(art);
        return {
          preset:button.dataset.preset,
          name:caption?.textContent||'',
          backgroundImage:style?.backgroundImage||'none',
          display:style?.display||'none',
          position:style?.position||'static',
          priority:art?.style.getPropertyPriority('background-image')||'',
          caption:!!caption
        };
      });
    });
    assert.equal(info.length,group.expected,'Wrong number of mobile previews for '+group.id);
    for(const card of info){
      assert.ok(card.preset&&card.name,'Missing named preset in '+group.id);
      assert.equal(card.priority,'important','Thumbnail image must override global mobile button background');
      assert.ok(card.backgroundImage!=='none'&&/gradient|url\(/.test(card.backgroundImage),'Missing visible preview for '+card.name);
      assert.equal(card.display,'block','Preview artwork should render as its own layer');
      assert.equal(card.position,'absolute','Preview artwork should cover the navy button');
      assert.ok(card.caption,'Keep the preview name readable');
    }
    console.log('Mobile '+group.id+': '+info.length+' populated preview thumbnails');
  }
} finally {
  await browser.close();
}
