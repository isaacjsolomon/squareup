import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
import {chromium} from 'playwright';

const base=(process.env.HOME_BASE_URL||'https://doweo.app').replace(/\/$/,'');
const version='20261126-tracker-settings-sheet-v1';
const browser=await chromium.launch({
  executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||undefined,
});
mkdirSync('test-results/tracker-settings',{recursive:true});

try{
  for(const [width,height] of [[390,844],[320,568],[1280,900]]){
    const mobile=width<=900;
    const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
    await page.goto(base+'/?verify='+version,{waitUntil:'domcontentloaded',timeout:45000});
    await page.waitForFunction(version=>[...document.styleSheets].some(sheet=>
      sheet.href?.includes('doweo-tracker-settings-hub.css?v='+version)
    ),version,{timeout:25000});

    // Exercise the deployed renderer with a local tracker and stubbed side effects.
    const start="var menu=document.createElement('details');menu.className='tracker-tile-menu';";
    const end='banner.append(menu);';
    const scripts=await page.locator('script[type=module]').allTextContents();
    const source=scripts.find(code=>code.includes(start));
    const offset=source?.indexOf(start);
    const stop=source?.indexOf(end,offset);
    assert.ok(stop>offset,'Tracker settings renderer missing');
    const renderer=source.slice(offset,stop+end.length);
    await page.evaluate(renderer=>{
      const mount=document.createElement('div');
      document.body.append(mount);
      const dock=document.querySelector('.sq-mobile-nav');
      if(dock) dock.style.setProperty('visibility','visible','important');
      new Function('mount',`
        const t={id:'fixture',name:'Baja Trip 🌴',role:'owner'},d={members:Array(6)},i=0;
        const banner=document.createElement('div');mount.append(banner);
        const sqBannerGet=async()=>null;
        const sqBannerApply=thumb=>{thumb.style.backgroundImage='linear-gradient(#204158,#173750)';};
        const sqBannerEdit=()=>{mount.dataset.action='banner';};
        const sqManagePermissions=()=>{mount.dataset.action='permissions';};
        const removeTracker=()=>{mount.dataset.action='delete';return false;};
        let current;
        const openTracker=id=>{current={id};};
        const settingsRoute=route=>{mount.dataset.route=route;};
        ${renderer}
        mount.id='tracker-settings-fixture';
        menu.open=true;
      `)(mount);
    },renderer);
    const entry=page.locator('body > .tracker-tile-menu-panel .tracker-settings-entry');
    await entry.evaluate(button=>button.click());
    const popup=page.getByRole('dialog',{name:'Tracker settings',exact:true});
    const geometry=await popup.evaluate(panel=>{
      const rect=panel.getBoundingClientRect(),css=getComputedStyle(panel);
      return {left:rect.left,right:rect.right,top:rect.top,bottom:rect.bottom,width:rect.width,
        dy:rect.top+rect.height/2-innerHeight/2,filter:css.filter,backdrop:css.backdropFilter,
        topLayer:panel.matches(':popover-open'),scrollable:panel.scrollHeight>panel.clientHeight,
        dockTop:document.querySelector('.sq-mobile-nav').getBoundingClientRect().top};
    });
    assert.equal(geometry.filter,'none');
    assert.equal(geometry.backdrop,'none');
    assert.ok(geometry.topLayer);
    if(mobile){
      assert.ok(geometry.left>=0&&geometry.right<=width&&geometry.top>=0,JSON.stringify(geometry));
      assert.ok(geometry.dockTop>0&&geometry.bottom<geometry.dockTop,JSON.stringify(geometry));
      assert.equal(await popup.getByText('Baja Trip 🌴',{exact:true}).isVisible(),true);
      assert.equal(await popup.getByText('6 members',{exact:true}).isVisible(),true);
      const rows=await popup.locator('.sq-tracker-settings-action:visible').evaluateAll(buttons=>
        buttons.map(button=>button.querySelector('.tracker-menu-words').innerText.trim()));
      assert.deepEqual(rows,['Banner','Background','Rename tracker','Archive tracker','Delete tracker','View members']);
      if(height===568)assert.ok(geometry.scrollable,'Short sheet must scroll');
    }else{
      assert.ok(Math.abs(geometry.dy)<=1,JSON.stringify(geometry));
      assert.equal(geometry.width,360);
      assert.equal(await popup.getByRole('button',{name:'Manage permissions',exact:true}).isVisible(),true);
    }
    await page.screenshot({path:'test-results/tracker-settings/'+width+'.png'});
    await popup.getByRole('button',{name:'Close tracker settings'}).click();
    await popup.waitFor({state:'hidden'});
    if(mobile){
      const fixture=page.locator('#tracker-settings-fixture');
      await fixture.locator('details').evaluate(menu=>{menu.open=true;});
      await entry.evaluate(button=>button.click());
      await popup.getByRole('button',{name:'View members',exact:true}).click();
      await popup.waitFor({state:'hidden'});
      assert.equal(await fixture.getAttribute('data-route'),'dashboard');
    }
    console.log('Tracker Settings verified at '+width+' × '+height,geometry);
    await page.close();
  }
}finally{await browser.close();}
