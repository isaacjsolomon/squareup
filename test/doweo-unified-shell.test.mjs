import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SHELL_KEYS,SHELL_TRANSLATIONS,SHELL_SUPPORTED} from '../doweo-unified-locales.mjs';
import {UI_PHRASES} from '../doweo-ui-catalog.mjs';

const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const html=read('index.html'),css=read('doweo-unified-shell.css');
const shell=read('doweo-unified-shell.js'),lang=read('doweo-unified-localize.js');
const dashboard=read('doweo-reference-home.js');
const deploy=read('.github/workflows/deploy-doweo-pages.yml');

test('all 20 advertised languages have complete reviewed labels, no fallback to English',()=>{
 const expected=['en','es','fr','he','he-script','zh-Hans','pt','de','it','ja','ar','ko',
  'hi','ru','tr','vi','nl','pl','sv','bn'];
 assert.deepEqual([...SHELL_SUPPORTED].sort(),expected.sort());
 assert.equal(SHELL_KEYS.length,33,'the new shell includes every static interface string');
 assert.equal(Object.keys(SHELL_TRANSLATIONS).length,19,'Hebrew script uses the Hebrew dictionary');
 for(const locale of expected){
  const data=SHELL_TRANSLATIONS[locale==='he-script'?'he':locale];
  assert.ok(data,'missing translation for '+locale);
  for(const key of SHELL_KEYS){
   assert.equal(typeof data[key],'string',locale+' missing '+key);
   assert.ok(data[key].trim().length>0,locale+' has blank '+key);
  }
  assert.ok(data.hello.includes('{name}'),locale+' greeting must preserve the actual name');
  assert.ok(data.chartUnavailable.length>20,locale+' error status is untranslated');
 }
 for(const locale of expected.filter(code=>!['en','he-script'].includes(code))){
  assert.notEqual(SHELL_TRANSLATIONS[locale].intro,SHELL_TRANSLATIONS.en.intro,
   locale+' introductory sentence must be localized');
  assert.notEqual(SHELL_TRANSLATIONS[locale].cashflowEmptyHint,SHELL_TRANSLATIONS.en.cashflowEmptyHint,
   locale+' empty-state sentence must be localized');
 }
 assert.match(lang,/doweo:languagechange/);
 assert.match(lang,/doweo:uiupdated/);
 assert.match(lang,/DoWeoI18n\?\.resolve/);
 assert.match(lang,/dwGreetingName/);
 assert.match(lang,/node\.hasAttribute\('data-dw-all-tool'\)/,'never erase toolbar icons to translate');
});

test('every secondary app page uses a shared real desktop header without replacing router actions',()=>{
 const states=['trackers-view','analytics-view','settings-view','about-view','friends-view',
  'notifications-view','split-view','sq-help-view','sq-finance-open','sq-bills-open',
  'dw-polls-open','dw-chats-open'];
 for(const state of states)assert.ok(shell.includes("'"+state+"'"),'missing view '+state);
 for(const section of ['overview','expenses','bills','members'])
  assert.match(shell,new RegExp("'"+section+"'"));
 assert.match(shell,/sidebar\.after\(bar\)/,'global header must live outside hidden dashboard');
 assert.match(shell,/home\?\.click\(\)/,'original navigation remains authoritative');
 assert.match(shell,/originalTab\(section\)\?\.click\(\)/);
 assert.match(shell,/body\.classList\.toggle\('dw-all-secondary-view'/);
 assert.match(css,/#dw-all-topbar/);
 assert.match(css,/#dw-all-top-tabs/);
 assert.match(css,/#dw-all-top-tools/);
 for(const id of ['#trackers-page','#analytics-page','#settings-page','#about-page',
  '#friends-page','#notifications-page','#split-page','#sq-bills-page','#sq-nextgen',
  '#dw-polls-page'])
  assert.ok(css.includes(id),id+' not included in shared styling');
 assert.match(css,/@media\(min-width:901px\)/);
 assert.match(css, /@media\(max-width:900px\)/);
 assert.match(css,/#dw-all-topbar\{display:none!important\}/,'mobile retains its own header');
 assert.doesNotMatch(css,/\.sq-mobile-nav\s*\{[^}]*position:/,'mobile bottom nav position must not change');
});

test('sidebar icons and text are consistent across original destinations',()=>{
 assert.match(shell,/function repairSidebar\(\)/);
 assert.match(shell,/\.dw-all-nav-icon/);
 assert.match(shell,/sidebarNav\.querySelectorAll\(':scope > button\.sq-nav-link'\)/);
 assert.match(shell,/\.dw-nav-social-trigger/);
 assert.match(shell,/\.dw-nav-group > summary/);
 assert.match(css,/height:53px!important;min-height:53px!important;max-height:53px!important/);
 assert.match(css,/font-family:inherit!important;font-size:16px!important/);
 assert.match(css,/\.dw-all-nav-icon svg/);
 assert.match(css,/#dw-beta-launch/);
});

test('sparse finance data uses real grouped monthly bars, not a fabricated zero-month line',()=>{
 assert.match(dashboard,/window\.squareUpApi\('finance\/transactions'\)/);
 assert.match(dashboard,/chartBody\.replaceChildren\(\)/);
 assert.match(dashboard,/\.dw-ref-chart-months/);
 assert.match(dashboard,/dw-ref-bar-income/);
 assert.match(dashboard,/dw-ref-bar-expense/);
 assert.match(dashboard,/const stepCandidates=\[1,2,2\.5,5,10\]/);
 assert.match(dashboard,/m\.count\?\x27\x27: \x27·\x27/);
 assert.doesNotMatch(dashboard,/chartSvg\.append\(svg\('path'/,'old misleading net trend line must be gone');
 assert.match(dashboard,/chartLocale\(\)/);
 assert.match(css,/\.dw-ref-chart-gridline/);
});

test('production HTML and Cloudflare copy all scripts, CSS and complete locales with fresh versions',()=>{
 for(const filename of ['doweo-unified-shell.css','doweo-unified-shell.js',
  'doweo-unified-localize.js','doweo-unified-locales.mjs']){
  assert.ok(deploy.includes(filename),'Cloudflare build missing '+filename);
 }
 for(const filename of ['doweo-unified-shell.css','doweo-unified-shell.js','doweo-unified-localize.js'])
  assert.ok(html.includes('/'+filename+'?v=20261121-'),filename+' not linked in live HTML');
 assert.ok(html.includes('/doweo-reference-home.js?v=20261121-reference-layout-v2'));
 assert.match(lang,/import\('\/doweo-unified-locales\.mjs'\)/);
 assert.match(deploy,/node --check \.pages-output\/doweo-unified-shell\.js/);
 assert.match(deploy,/node --test test\/doweo-unified-shell\.test\.mjs/);
 for(const phrase of ['Net Balance','Current tracker balance','Total Income','Total Spending',
  'Smart Settle-Up','From your private personal transactions','Here’s your overview for today.'])
  assert.ok(UI_PHRASES.includes(phrase),'new approved English phrase missing: '+phrase);
});
