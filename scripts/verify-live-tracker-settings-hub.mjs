import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
import {chromium} from 'playwright';

// Production CSS browser check. No login, tracker writes, or private data needed.
// Recreate the markup emitted by the actual tracker settings renderer on doweo.app,
// then inspect computed styles at realistic desktop/mobile viewport widths.
const base=(process.env.HOME_BASE_URL||'https://doweo.app').replace(/\/$/,'');
const browser=await chromium.launch({headless:true});
mkdirSync('test-results/tracker-settings',{recursive:true});
try{
  for(const width of [390,1280]){
    const mobile=width<700;
    const page=await browser.newPage({viewport:{width,height:mobile?844:900},deviceScaleFactor:1});
    await page.goto(base+'/?verify=tracker-settings-hub-v2',{waitUntil:'domcontentloaded',timeout:45000});
    await page.waitForFunction(() => [...document.styleSheets].some(sheet =>
      sheet.href && sheet.href.includes('doweo-tracker-settings-hub.css?v=20261124-reference-hub-v3')
    ),null,{timeout:25000});
    const state=await page.evaluate(()=>{
      const menu=document.createElement('div');
      menu.className='tracker-tile-menu-panel';
      menu.style.cssText='position:fixed;z-index:100000;box-sizing:border-box;left:12px;top:12px;right:auto;overflow-y:auto;max-height:calc(100dvh - 24px);';
      const sidebar=window.innerWidth>=900?270:0;
      const width=Math.min(880,window.innerWidth-sidebar-24);
      menu.style.width=width+'px';
      menu.style.left=(sidebar+(window.innerWidth-sidebar-width)/2)+'px';
      const view=document.createElement('div');
      view.className='tracker-settings-view dw-tracker-settings-hub';
      const top=document.createElement('header');top.className='dw-ts-top';
      top.innerHTML='<button class="tracker-settings-back" type="button">‹</button><h2>Tracker settings</h2>';
      const nav=document.createElement('nav');nav.className='dw-ts-section-links';
      nav.innerHTML='<button class="dw-ts-section-link dw-ts-section-link-active">Appearance</button><button class="dw-ts-section-link">Management</button>';
      const appearance=document.createElement('section');appearance.className='sq-tracker-settings-group dw-ts-appearance';
      appearance.innerHTML='<div class="dw-ts-appearance-heading"><span class="dw-ts-appearance-icon"></span><div class="dw-ts-appearance-heading-copy"><h3>Appearance</h3><p>Customize how your tracker looks across DoWeo.</p></div></div>';
      for(const [title,hint,type] of [
        ['Change banner',"Update the tracker's header banner.",'banner'],
        ['Change tracker backdrop','Set a new backdrop for this tracker.','backdrop']
      ]){
        const btn=document.createElement('button');btn.className='tracker-menu-action sq-tracker-settings-action dw-ts-appearance-action';
        btn.innerHTML='<span class="tracker-menu-glyph"></span><span class="tracker-menu-words"><span></span><small></small></span><span class="dw-ts-appearance-preview dw-ts-'+type+'-preview"><span class="dw-ts-preview-layer"></span></span><span class="tracker-menu-chevron">›</span>';
        btn.querySelector('.tracker-menu-words>span').textContent=title;
        btn.querySelector('small').textContent=hint;
        appearance.append(btn);
      }
      const management=document.createElement('section');management.className='sq-tracker-settings-group dw-ts-management';
      management.innerHTML='<h3 class="sq-tracker-settings-group-title dw-ts-management-heading">Management quick actions</h3><div class="dw-ts-management-actions"></div>';
      const actions=management.querySelector('.dw-ts-management-actions');
      for(const title of ['Rename tracker','Archive tracker','Manage permissions','Expense approval']){
        const btn=document.createElement('button');btn.className='tracker-menu-action sq-tracker-settings-action dw-ts-management-action';
        btn.innerHTML='<span class="tracker-menu-glyph"></span><span class="tracker-menu-words"><span></span><small>Settings</small></span><span class="tracker-menu-chevron">›</span>';
        btn.querySelector('.tracker-menu-words>span').textContent=title;actions.append(btn);
      }
      view.append(top,nav,appearance,management);menu.append(view);document.body.append(menu);
      const rect=el=>{const r=el.getBoundingClientRect();return {left:r.left,right:r.right,width:r.width,top:r.top,bottom:r.bottom,height:r.height}};
      const result={
        width:window.innerWidth,
        panel:rect(menu),
        background:getComputedStyle(menu).backgroundImage,
        appearanceDisplay:getComputedStyle(appearance).display,
        appearanceGap:getComputedStyle(appearance).gap,
        managementDisplay:getComputedStyle(actions).display,
        managementColumns:getComputedStyle(actions).gridTemplateColumns.split(' ').filter(Boolean).length,
        cards:[...view.querySelectorAll('.sq-tracker-settings-action')].map(el=>({
          label:el.querySelector('.tracker-menu-words>span')?.textContent,
          display:getComputedStyle(el).display,
          size:rect(el)
        })),
        scrollable:menu.scrollHeight>menu.clientHeight,
        scrollHeight:menu.scrollHeight,clientHeight:menu.clientHeight
      };
      return result;
    });
    console.log('Live tracker settings layout:',JSON.stringify(state));
    assert.equal(state.appearanceDisplay,'flex','Appearance should remain a visible stacked group');
    assert.equal(state.managementDisplay,'grid','Management must be a visible grid on the same page');
    assert.equal(state.managementColumns,mobile?2:4,'Wrong management card layout');
    assert.equal(state.cards.length,6,'All settings must be available in one view');
    assert.ok(state.background.includes('gradient'),'Navy and mint modal background did not apply');
    assert.ok(state.panel.left>=0&&state.panel.right<=width+1,'Tracker settings panel overflows viewport');
    assert.ok(state.cards.every(c=>c.display!=='none'),'Some settings actions are hidden');
    assert.ok(state.cards.every(c=>c.size.width>80&&c.size.height>42),'Settings action unexpectedly collapsed');
    assert.ok(Number.parseFloat(state.appearanceGap)>0,'Appearance cards lost their spacing');
    await page.screenshot({path:'test-results/tracker-settings/'+(mobile?'mobile':'desktop')+'.png'});
    await page.close();
  }
}finally{await browser.close();}
