import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const css=readFileSync(new URL('../doweo-reference-home.css',import.meta.url),'utf8');
const js=readFileSync(new URL('../doweo-reference-home.js',import.meta.url),'utf8');
const flow=readFileSync(new URL('../.github/workflows/deploy-doweo-pages.yml',import.meta.url),'utf8');

test('the screenshot layout ships as a real, connected piece of production HTML',()=>{
 for(const p of ['doweo-reference-home.css?v=20261122-approved-seven-palette-v2','doweo-reference-home.js?v=20261122-approved-seven-palette-v2'])
  assert.ok(html.includes(p),p+' is missing from index.html');
 assert.match(flow,/doweo-reference-home\.css doweo-reference-home\.js/);
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
