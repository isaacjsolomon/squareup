import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const html=read('index.html');
const css=read('doweo-desktop-standalone.css');
const js=read('doweo-desktop-standalone.js');
const workflow=read('.github/workflows/deploy-doweo-pages.yml');

test('desktop-only full-page workspace assets deploy and preserve mobile dialogs',()=>{
 assert.match(html,/doweo-desktop-standalone\.css\?v=20261122-notifications-slate-v11/);
 assert.match(html,/doweo-desktop-standalone\.js\?v=20261122-wallpaper-mirror-v3/);
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

test('Cash Flow matches Spending Analytics white panels, KPIs and visual charts',()=>{
 assert.match(css,/Desktop Cash Flow exactly reuses the Spending Analytics visual system/);
 assert.match(css,/\.dw-cash-recap-grid/);
 assert.match(css,/\.dw-cash-kpis/);
 assert.match(css,/\.dw-cash-charts/);
 assert.match(css,/\.dw-cash-donut/);
 assert.match(css,/\.dw-cash-panel/);
 assert.match(css,/\.dw-cash-comparison \.dw-cash-table-wrap :is\(th,td\)/);
 assert.match(css,/-webkit-text-fill-color:#ffffff!important/);
 assert.match(css,/rgba\(9,27,48,\.35\)/);
 assert.match(css,/top:0!important;bottom:0!important/);
 assert.match(css,/padding:calc\(var\(--dw-report-top,96px\) \+ 20px\)/);
 assert.match(css,/#dw-all-topbar\{/);
 assert.match(html,/dwCashFlowAnalyticsRender/);
 assert.match(html,/doweo-cashflow-analytics\.js\?v=20261122-analytics-match-v1/);
 assert.doesNotMatch(html,/select\(hub,'\.sq-ng-card'/);
 assert.doesNotMatch(html,/paint\(hub,/);
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
 assert.match(js,/classList\.toggle\('doweo-close-control',!desktop\.matches\)/);
});

test('Notification Center applies the muted slate-blue reference tint only on desktop',()=>{
 assert.match(css,/#7788a0!important/);
 assert.match(css,/rgba\(94,114,143,\.78\)/);
 assert.match(css,/body\.notifications-view:not\(\.sq-auth-guest\)/);
 assert.match(css,/var\(--dw-selected-tracker-wallpaper\)!important/);
});

test('desktop tracker pages reuse the live saved wallpaper without touching mobile',()=>{
 assert.match(js,/Mirror the tracker backdrop selected by DoWeo/);
 assert.match(js,/backdrop\.style\.backgroundImage/);
 assert.match(js,/MutationObserver\(syncWallpaper\)/);
 assert.match(css,/--dw-selected-tracker-wallpaper/);
 for(const route of ['notifications-view','friends-view','dw-polls-open','sq-finance-open']){
  assert.ok(css.includes(route),'missing wallpaper support for '+route);
 }
 assert.match(html,/paint\(page,\{background:'transparent'/);
 assert.doesNotMatch(html,/const navy=\{background:'#0b1f38'/);
 assert.match(css,/var\(--dw-selected-tracker-wallpaper/);
});
test('desktop contrast fixes cover analytics amounts, names and KPI labels',()=>{
 assert.match(css,/sq-person-donut-hole > strong/);
 assert.match(css,/sq-analytics-friends \.friend-card/);
 assert.match(css,/analytics-stats \.analytics-stat \.sq-stat-label/);
 assert.match(css,/dw-polls-page \.dw-poll-card/);
 assert.match(css,/#sq-instagram-invite \.sq-ig-card > button\.sq-ig-x/);
});

test('Cash Flow closes on newer desktop navigation and restores normal viewport state',()=>{
 assert.match(html,/const outsideNavigation=\(event\)=>/);
 assert.match(html,/window\.squareUpCloseFinanceHub=close/);
 assert.match(html,/#dw-all-topbar,#dw-all-top-tabs/);
 assert.match(html,/root\.style\.setProperty\('display','none','important'\)/);
 assert.match(html,/root\.style\.removeProperty\('display'\)/);
 assert.match(css,/html body #sq-nextgen\[hidden\]/);
 assert.match(css,/html body:not\(\.sq-finance-open\) #sq-nextgen/);
 assert.match(css,/Desktop Cash Flow exactly reuses the Spending Analytics visual system/);
 assert.match(css,/\.dw-cash-header/);
 assert.match(css,/\.dw-section-tabs:not\(\[data-current-group\]\)/);
 assert.match(html,/const ticket=\+\+renderToken/);
});

test('Instagram popup renders the recognizable SVG camera logo',()=>{
 assert.match(html,/class="sq-ig-mark" aria-hidden="true"><svg viewBox="0 0 24 24"/);
 assert.match(html,/<rect x="2\.5" y="2\.5" width="19" height="19" rx="5\.5"\/>/);
 assert.match(html,/<circle cx="12" cy="12" r="4\.25"\/>/);
});

test('private Cash Flow controls and month filtering remain functional',()=>{
 const cash=read('doweo-cashflow-analytics.js');
 assert.match(cash,/window\.dwCashFlowAnalyticsRender=function/);
 assert.match(cash,/dw-cash-range/);
 assert.match(cash,/dw-cash-month/);
 assert.match(cash,/dw-cash-export/);
 assert.match(cash,/sq-ng-open-transaction/);
 assert.match(cash,/data-delete/);
 assert.match(cash,/conic-gradient/);
 assert.match(workflow,/doweo-cashflow-analytics\.js/);
 assert.match(workflow,/node --check \.pages-output\/doweo-cashflow-analytics\.js/);
});
