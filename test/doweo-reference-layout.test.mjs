import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const css=readFileSync(new URL('../doweo-reference-home.css',import.meta.url),'utf8');
const js=readFileSync(new URL('../doweo-reference-home.js',import.meta.url),'utf8');
const flow=readFileSync(new URL('../.github/workflows/deploy-doweo-pages.yml',import.meta.url),'utf8');

test('the screenshot layout ships as a real, connected piece of production HTML',()=>{
 for(const p of ['doweo-reference-home.css?v=20261123-time-greeting-wide-v1','doweo-reference-home.js?v=20261123-time-greeting-wide-v1'])
  assert.ok(html.includes(p),p+' is missing from index.html');
 assert.match(flow,/doweo-reference-home\.css doweo-global-search\.js doweo-reference-home\.js/);
 assert.match(flow,/node --check \.pages-output\/doweo-reference-home\.js/);
 assert.match(flow,/node --test test\/doweo-reference-layout\.test\.mjs/);
 assert.doesNotMatch(js,/\$248\.50|\$660\.80|\$412\.30/,'example financial numbers may not be deployed');
});

test('the reference Overview is built from existing tracker + authenticated personal data',()=>{
 for(const id of ['sq-return-activity','sq-return-smart-host','sq-clean-net','sq-return-greeting','dw-compact-add','dw-ref-add','dw-ref-settle-action'])
  assert.ok(js.includes(id),'missing existing DoWeo data or action: '+id);
 assert.match(js,/window\.squareUpApi\('finance\/transactions'\)/);
 assert.match(js,/row\.occurred_on/);
 assert.match(js,/month\[row\.kind\]\+=Number\(row\.amount\)/);
 assert.match(js,/originalActivity\.parentNode!==activitySlot/);
 assert.match(js,/originalSmart\.parentNode!==smartSlot/);
 assert.match(js,/originalActivity\.parentNode!==activityHome/);
 assert.match(js,/originalSmart\.parentNode!==smartHome/);
 assert.match(js,/squareup:tracker-detail/);
 assert.match(js,/data-sq-tab="expenses"/);
 assert.match(css,/#dw-ref-home \.dw-ref-lower/);
 assert.match(css,/#dw-ref-home \.dw-ref-chart/);
 assert.match(css,/#dw-ref-home \.dw-ref-stat/);
 assert.match(css,/#dw-ref-home \.dw-ref-activity/);
 assert.match(css,/#dw-ref-home \.dw-ref-settle/);
});

test('wide greeting uses device-local time, real balance and preserves the Add action',()=>{
 const phases=js.match(/function phaseForHour\(hour\)\{[\s\S]*?\n \}/);
 assert.ok(phases,'time-of-day classifier missing');
 const phase=Function('return ('+phases[0]+')')();
 for(const [hour,expected] of [
  [0,'night'],[4,'night'],[5,'morning'],[11,'morning'],[12,'afternoon'],
  [16,'afternoon'],[17,'evening'],[20,'evening'],[21,'night'],[23,'night']
 ])assert.equal(phase(hour),expected,'hour '+hour);
 for(const key of ['morning','afternoon','evening','night'])
  assert.ok(js.includes(key+':'),key+' greeting icon missing');
 assert.match(js,/now\.getHours\(\)/,'greeting must use the viewer local hour');
 assert.match(js,/Intl\.DateTimeFormat\(lang,\{weekday:'long',month:'long',day:'numeric'\}\)/,'date comes from live local time and language');
 assert.match(js,/setInterval\(\(\)=>\{if\(desktop\.matches\)renderTimeGreeting\(\);\},60\*1000\)/,'greeting refreshes while page is open');
 assert.match(js,/doweo:languagechange/,'greeting updates when user changes language');
 assert.match(js,/squareup:tracker-detail/,'tracker status responds to tracker updates');
 assert.match(js,/document\.getElementById\('sq-clean-net'\)/,'tracker status is computed from real balance');
 assert.match(js,/state==='negative'/,'negative balances have separate messaging');
 assert.match(js,/state==='zero'/,'settled balances are not labeled positive');
 assert.match(js,/greet\.append\(timeIcon,greetingCopy,summaryStatus\)/,'approved greeting layout present');
 assert.match(css,/#dw-ref-home \.dw-ref-greeting\{/,'expanded greeting CSS present');
 assert.match(css,/grid-template-columns:68px minmax\(0,1fr\) minmax\(182px,auto\)/);
 assert.match(html,/doweo-reference-home\.js\?v=20261123-time-greeting-wide-v1/);
 assert.match(html,/doweo-reference-home\.css\?v=20261123-time-greeting-wide-v1/);
 assert.match(html,/doweo-unified-localize\.js\?v=20261123-time-greeting-wide-v1/);
 assert.match(js,/if\(holder\.parentElement!==add\)add\.append\(holder\)/,'real Add button remains attached');
});

test('the desktop visual shell does not override mobile navigation geometry',()=>{
 assert.match(css,/@media\(min-width:901px\)/);
 assert.match(css,/@media\(max-width:900px\)/);
 assert.match(css,/#dw-ref-home,#dw-ref-toolbar,#dw-ref-nav-notifications,.dw-ref-brand\{display:none!important\}/);
 assert.doesNotMatch(css,/\.sq-mobile-nav\s*\{[^}]*position:\s*fixed/i,'keep the original mobile bottom nav position');
 assert.ok(css.includes('.sidebar'));
 assert.ok(css.includes('.sq-workspace-tabs'));
 assert.ok(css.includes('#analytics-page'));
 assert.ok(css.includes('#sq-bills-page'));
 assert.ok(css.includes('#settings-page'));
 assert.ok(css.includes('#about-page'));
 assert.ok(css.includes('#dw-beta-modal'));
});

const addMenu=readFileSync(new URL('../doweo-home-add-menu.js',import.meta.url),'utf8');

test('Add dropdown keeps its actions without rendering a chevron',()=>{
 assert.doesNotMatch(addMenu,/dw-compact-add-caret|toggle\.append\(caret\)/);
 assert.match(addMenu,/toggle\.addEventListener\('click'/);
 assert.match(addMenu,/menu\.hidden=false/);
 assert.match(js,/querySelectorAll\('\.dw-compact-add-caret'\)/);
 assert.match(css,/\.dw-compact-add-caret,[\s\S]*?display:none!important/);
});

test('Overview mint accents, cash-flow legend, and banner preference persist',()=>{
 const chartCss=readFileSync(new URL('../doweo-unified-shell.css',import.meta.url),'utf8');
 const desktopCss=readFileSync(new URL('../doweo-desktop-standalone.css',import.meta.url),'utf8');
 assert.ok(css.includes('#dw-ref-stat-net .dw-ref-stat-amount{color:#60F1AD}'));
 assert.ok(css.includes('background:linear-gradient(120deg,#102B40,#0A1B2E)!important;\n    color:#60F1AD!important;'));
 assert.match(chartCss,/\.dw-ref-bar-income\{[\s\S]*?background:linear-gradient\(180deg,#60F1AD,#60F1AD\)!important/);
 assert.match(chartCss,/\.dw-ref-bar-expense\{[\s\S]*?background:linear-gradient\(180deg,#102B40,#102B40\)!important/);
 assert.match(chartCss,/\.dw-ref-legend-income\{\s*background:#60F1AD!important/);
 assert.match(chartCss,/\.dw-ref-legend-expense\{\s*background:#102B40!important/);
 assert.ok(html.includes("banner.style.setProperty('background-image',chosen,'important')"));
 assert.doesNotMatch(desktopCss,/\.tracker-tile:nth-child\(3n\+2\) \.tracker-tile-banner\{/);
});
