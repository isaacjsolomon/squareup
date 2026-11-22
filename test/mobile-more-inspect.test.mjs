import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const js=readFileSync(new URL('../doweo-mobile-more-pages.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../doweo-mobile-more-pages.css',import.meta.url),'utf8');
const workflow=readFileSync(new URL('../.github/workflows/deploy-doweo-pages.yml',import.meta.url),'utf8');

test('More destinations keep their existing event handlers and page containers',()=>{
 for(const id of ['sq-mobile-more-sheet','nav-profile','nav-about','nav-analytics','sq-mobile-notifications','sqev-nav','settings-page','about-page','analytics-page','notifications-page','tracker-dashboard'])
   assert.ok(html.includes('id="'+id+'"'),id+' missing from app');
 assert.match(js,/removeFinance\(\)/);
 assert.match(js,/\[data-sq-destination="sq-finance-nav"\]/);
 assert.match(js,/event|e\.stopImmediatePropagation\(\)/);
 assert.ok(!js.includes('innerHTML='),'the page extension does not replace existing app markup');
});

test('mobile routes hide the original Home and leave desktop unaffected',()=>{
 for(const name of ['settings-view','about-view','analytics-view','notifications-view','sqev-page-open'])
   assert.ok(css.includes('.'+name),'missing isolation for '+name);
 assert.ok(css.includes('#tracker-dashboard'));
 assert.ok(css.includes('@media (max-width:900px)'));
 assert.ok(css.includes('#dw-mobile-legal-page'));
 assert.ok(css.includes('#dw-mobile-social-page'));
 assert.match(js,/\['Privacy Policy','\/privacy\/']|\['Privacy Policy','\/privacy\/']\]/);
 assert.match(js,/\['Terms of Service','\/terms\/']\]/);
});

test('mobile navigation assets are included and cache-versioned in Pages deployment',()=>{
 const copied=workflow.split('\n').find(line=>line.trim().startsWith('cp index.html '));
 assert.ok(copied?.includes('doweo-mobile-more-pages.js'));
 assert.ok(copied?.includes('doweo-mobile-more-pages.css'));
 assert.ok(workflow.includes('/doweo-mobile-more-pages.css?v=20261122-approved-seven-palette-v3'));
 assert.ok(workflow.includes('/doweo-mobile-more-pages.js?v=20261122-approved-seven-palette-v3'));
});
