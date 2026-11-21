import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chromium} from 'playwright';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const css=readFileSync(new URL('../doweo-mobile-home-navy-cards.css',import.meta.url),'utf8');
const original=html.match(/<style id="dw-mobile-home-layered-style">([\s\S]*?)<\/style>/)?.[1];
assert.ok(original,'must test the actual existing mobile Home card styles');

test('mobile Home information boxes use navy, preserve backdrop and desktop appearance',{timeout:30000},async()=>{
  const browser=await chromium.launch({headless:true});
  try{
    const page=await browser.newPage({viewport:{width:390,height:844}});
    await page.setContent('<!doctype html><html><head><style>'+
      '#backdrop.photo::after{content:"";position:absolute;inset:0;background:rgba(15,12,40,.35)}' +
      '</style><style>'+css+'</style><style>'+original+
      '</style></head><body><div id="backdrop" class="photo"></div>'+
      '<main id="tracker-dashboard" class="sq-tab-overview dw-mobile-layered-home">'+
      '<section id="dw-mobile-home-layered">'+
      '<section class="dw-mh-hero">Balance</section>'+
      '<div class="dw-mh-grid"><button class="dw-mh-small">Members</button>'+
      '<button class="dw-mh-small">Upcoming</button></div>'+
      '<section class="dw-mh-activity">Recent activity</section>'+
      '</section></main></body></html>');
    const props=async()=>page.evaluate(()=>{
      const get=selector=>getComputedStyle(document.querySelector(selector));
      return {
        hero:get('.dw-mh-hero').backgroundImage,
        members:get('.dw-mh-small').backgroundImage,
        upcoming:get('.dw-mh-small:nth-child(2)').backgroundImage,
        activity:get('.dw-mh-activity').backgroundImage,
        photoTint:getComputedStyle(document.querySelector('#backdrop'),'::after').backgroundColor,
        buttonSize:get('.dw-mh-small').minHeight
      };
    });
    const mobile=await props();
    for(const [name,background] of Object.entries({
      hero:mobile.hero,members:mobile.members,upcoming:mobile.upcoming,activity:mobile.activity
    })){
      assert.match(background,/rgb\(\s*(1[0-9]|[2-4][0-9]),\s*[2-9][0-9],\s*[3-9][0-9]/,
        name+' should have a navy surface, not gray/teal: '+background);
      assert.doesNotMatch(background,/rgb\(13, 71, 87\)|rgb\(7, 80, 91\)/,
        name+' must not retain the old teal gradient');
    }
    assert.equal(mobile.photoTint,'rgba(15, 12, 40, 0.35)',
      'user-selected whale image overlay remains at original strength');
    assert.equal(mobile.buttonSize,'102px','preserve info card dimensions');
    await page.setViewportSize({width:1280,height:900});
    const desktop=await props();
    assert.notEqual(desktop.members,mobile.members,'desktop must not receive new navy card rules');
    assert.equal(desktop.photoTint,'rgba(15, 12, 40, 0.35)');
  }finally{await browser.close()}
});

test('Pages deploy references only the new card stylesheet, not the photo tint',()=>{
  const deploy=readFileSync(new URL('../.github/workflows/deploy-doweo-pages.yml',import.meta.url),'utf8');
  const copied=deploy.split('\n').find(l=>l.trim().startsWith('cp index.html '));
  assert.ok(copied?.includes('doweo-mobile-home-navy-cards.css'));
  assert.ok(!deploy.includes('doweo-mobile-backdrop-navy.css'),'remove the mistaken image tint');
  assert.ok(deploy.includes('/doweo-mobile-home-navy-cards.css?v=20261121-home-cards-v1'));
  assert.ok(!css.includes('#backdrop'),'card fix must not affect tracker backdrop image');
});
