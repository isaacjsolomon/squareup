import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const html=read('index.html');
const css=read('doweo-desktop-standalone.css');
const js=read('doweo-desktop-standalone.js');
const workflow=read('.github/workflows/deploy-doweo-pages.yml');

test('desktop-only full-page workspace assets deploy and preserve mobile dialogs',()=>{
 assert.match(html,/doweo-desktop-standalone\.css\?v=20261122-restore-original-instagram-v2/);
 assert.match(html,/doweo-desktop-standalone\.js\?v=20261122-full-pages-v1/);
 assert.match(workflow,/doweo-desktop-standalone\.css doweo-desktop-standalone\.js/);
 assert.match(css,/@media\(min-width:901px\)/);
 assert.doesNotMatch(css,/@media\(max-width:900px\)/);
 assert.match(js,/const desktop=window\.matchMedia\('\(min-width:901px\)'\)/);
 assert.match(js,/desktop\.matches/);
});

test('the existing tracker and finance handlers remain attached to full-page screens',()=>{
 for(const id of ['new-modal','manage-modal','share-modal','backdrop-modal',
  'settle-modal','photo-modal','sq-quick-calculator','sq-social-modal',
  'sq-features-overlay','sq-pay-now-modal','sq-ng-txn-overlay']){
  assert.ok(js.includes("'"+id+"'"),id+' is not routed to a desktop page');
 }
 assert.match(js,/closeViaOriginal\(el,selector\)/);
 assert.match(js,/history\.pushState/);
 assert.match(js,/popstate/);
 assert.match(css,/\.dw-standalone-back/);
 assert.match(css,/\.dw-desktop-standalone\[hidden\]/);
});

test('Cash Flow uses navy data cards rather than old white boxes in CSS and runtime',()=>{
 assert.match(html,/Cash Flow uses the same airy canvas/);
 assert.match(html,/background:#102139!important;background-image:linear-gradient/);
 assert.match(html,/\.sq-ng-card',\{background:'#102139'/);
 assert.match(html,/\.sq-ng-summary-stack/);
 assert.match(html,/grid-template-areas:"summary summary" "trend categories" "activity comparison"/);
 assert.doesNotMatch(html,/\.sq-ng-card',\{background:'#f7faff'/);
});

test('Instagram invitation uses legacy compact desktop dimensions without changing other modals',()=>{
 const scoped=css.slice(css.indexOf('Restore the original compact Instagram invitation'));
 assert.ok(scoped.length>1000,'legacy Instagram style overrides are included');
 assert.match(scoped,/width:min\(100%,420px\)!important/);
 assert.match(scoped,/width:36px!important;height:36px!important/);
 assert.match(scoped,/border-radius:50%!important/);
 assert.match(scoped,/font-size:22px!important/);
 assert.match(scoped,/font-size:14px!important/);
 assert.match(scoped,/#sq-instagram-invite\[hidden\]\{display:none!important\}/);
 assert.match(scoped,/@media\(min-width:901px\)/);
 assert.match(html,/class="doweo-close-control sq-ig-x"/);
});
