import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const css=readFileSync(new URL('../styles.css',import.meta.url),'utf8');
const moreExtension=readFileSync(new URL('../doweo-mobile-more-pages.js',import.meta.url),'utf8');
const moreCss=readFileSync(new URL('../doweo-mobile-more-pages.css',import.meta.url),'utf8');
const start=html.indexOf('<!--',html.indexOf('id="sq-mobile-more-sheet"'));
const section=html.slice(html.indexOf('id="sq-mobile-more-sheet"'),html.indexOf('<script id="sq-balanced-mobile-script"'));
const grouped=html.slice(html.indexOf('<script id="doweo-grouped-navigation-init-20261108"'),html.indexOf('</script>',html.indexOf('<script id="doweo-grouped-navigation-init-20261108"')));
test('mobile More displays a flat two-column grid with no category headers',()=>{
 assert.match(css,/#sq-mobile-more-sheet \.sq-balanced-more-grid\{display:grid!important;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)!important/);
 assert.doesNotMatch(grouped,/const sections=\[/);
 assert.doesNotMatch(grouped,/heading\.textContent=item\.name/);
 assert.match(grouped,/const destinations=\['sqev-nav','sq-finance-nav','nav-analytics','sq-mobile-notifications','nav-profile','nav-about','nav-privacy-terms'\]/);
 assert.match(grouped,/moreGrid\.appendChild\(button\)/);
});
test('mobile More uses four rows of two; Trips and Households replace duplicate Notifications',()=>{
 assert.match(moreExtension,/makeTile\('dw-mobile-trips','Trips'/);
 assert.match(moreExtension,/makeTile\('dw-mobile-households','Households'/);
 assert.match(moreExtension,/\[data-sq-destination="sq-mobile-notifications"\]/);
 assert.match(moreExtension,/buildMoreGrid\(\)/);
 for(const destination of ['sqev-nav','nav-analytics','nav-profile','nav-about','nav-privacy-terms']){
  assert.ok(section.includes('data-sq-destination="'+destination+'"'),destination+' retained');
 }
 const order=moreExtension.slice(moreExtension.indexOf('for(const selector of ['));
 for(const key of ['[data-sq-social-open]','sqev-nav','dw-mobile-trips','dw-mobile-households','nav-analytics','nav-profile','nav-about','nav-privacy-terms'])
  assert.ok(order.includes(key),'missing ordered destination '+key);
 assert.match(html,/const link=e\.target\.closest\('\[data-sq-destination\]'\)/);
 assert.match(moreExtension,/openHub\(which\)/);
 assert.match(moreExtension,/hub\.dataset\.dwMobileMoreWorkspace=which/);
 assert.match(moreCss,/dw-mobile-more-workspace-open/);
});
test('logout remains full-width below the grid',()=>{
 assert.ok(section.indexOf('id="sq-mobile-more-logout"')>section.indexOf('sq-balanced-more-grid'));
 assert.match(css,/#sq-mobile-more-sheet \.sq-balanced-logout\{width:100%/);
});
