import assert from 'node:assert/strict';
import { chromium } from 'playwright';

// Verify the actual published mobile picker, not a copied mockup.
const base=(process.env.HOME_BASE_URL||'https://doweo.app').replace(/\/$/,'');
const browser=await chromium.launch({
  executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||undefined,
});
try {
  const page=await browser.newPage({
    viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true
  });
  // Run the real picker in a fresh guest session so Apply only changes guest storage.
  await page.route('https://esm.sh/@supabase/supabase-js@2',route=>route.fulfill({
    contentType:'application/javascript',
    body:`export function createClient(){return {auth:{
      onAuthStateChange(){},
      async getSession(){return {data:{session:null}}},
      async getUser(){return {data:{user:null}}}
    }}}`
  }));
  await page.goto(base+'/?verify=mobile-backdrop-previews-v1',{waitUntil:'domcontentloaded',timeout:45000});
  await page.waitForFunction(()=>typeof document.getElementById('btn-backdrop')?.onclick==='function',null,{timeout:45000});
  await page.evaluate(()=>{
    for(const id of ["auth-modal","sq-startup-overlay"])document.getElementById(id)?.style.setProperty("display","none","important");
  });
  // The original picker is initialized even without a signed-in tracker.
  await page.evaluate(()=>document.getElementById('btn-backdrop').click());
  await page.waitForFunction(() =>
    window.DoWeoBackdropCatalog && Object.keys(window.DoWeoBackdropCatalog).length===60,
    null,{timeout:25000}
  );
  const preview=page.locator('#dw-backdrop-hero');
  const apply=page.locator('#dw-backdrop-apply');
  assert.equal(await preview.innerText(),'Current Backdrop');
  assert.equal(await apply.isDisabled(),true);
  const footer=await apply.boundingBox();
  const firstChoice=page.locator('#backdrop-swatches [data-preset="ocean"]');
  await firstChoice.evaluate(button=>button.click());
  assert.equal(await preview.innerText(),'Preview · Ocean');
  assert.equal(await firstChoice.getAttribute('aria-pressed'),'true');
  assert.equal(await apply.isEnabled(),true);
  assert.deepEqual(await apply.boundingBox(),footer,'Apply stays in place while scrolling');
  await apply.evaluate(button=>button.click());
  await page.waitForFunction(()=>document.querySelector('#dw-backdrop-hero').innerText==='Current Backdrop');
  assert.equal(await apply.isDisabled(),true);
  assert.equal(await page.locator('#backdrop').getAttribute('data-preset'),'ocean');
  const layout=await page.locator('#backdrop-modal').evaluate(modal=>{
    const box=modal.getBoundingClientRect();
    const tabs=[...modal.querySelectorAll('#backdrop-categories button')];
    return {
      bottom:box.bottom,
      height:innerHeight,
      rows:new Set(tabs.map(tab=>tab.offsetTop)).size
    };
  });
  assert.ok(layout.bottom<=layout.height-70,'Picker leaves space for mobile navigation');
  assert.equal(layout.rows,3,'Categories use three rows');
  assert.equal(await page.locator("#backdrop-modal .dw-backdrop-back").isVisible(),true);

  // Legacy 28 + new 60 are available on mobile as separate searchable groups.
  const groups=[
    {id:'gradients',expected:15},
    {id:'nature',expected:19},
    {id:'sky',expected:9},
    {id:'cities',expected:6},
    {id:'textures',expected:9},
    {id:'animals',expected:30},
    {id:'all',expected:88}
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
  await page.getByRole("button",{name:"Close",exact:true}).and(page.locator("#backdrop-modal button")).evaluate(button=>button.click());
  await page.locator("#backdrop-modal").waitFor({state:"hidden"});
} finally {
  await browser.close();
}
