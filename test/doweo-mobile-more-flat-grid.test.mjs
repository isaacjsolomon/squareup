import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const start=html.indexOf('<!--',html.indexOf('id="sq-mobile-more-sheet"'));
const section=html.slice(html.indexOf('id="sq-mobile-more-sheet"'),html.indexOf('<script id="sq-balanced-mobile-script"'));
const grouped=html.slice(html.indexOf('<script id="doweo-grouped-navigation-init-20261108"'),html.indexOf('</script>',html.indexOf('<script id="doweo-grouped-navigation-init-20261108"')));
test('mobile More displays a flat two-column grid with no category headers',()=>{
 assert.match(html,/#sq-mobile-more-sheet \.sq-balanced-more-grid\{display:grid!important;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)!important/);
 assert.doesNotMatch(grouped,/const sections=\[/);
 assert.doesNotMatch(grouped,/heading\.textContent=item\.name/);
 assert.match(grouped,/const destinations=\['sqev-nav','sq-finance-nav','nav-analytics','sq-mobile-notifications','nav-profile','nav-about','nav-privacy-terms'\]/);
 assert.match(grouped,/moreGrid\.appendChild\(button\)/);
});
test('all nine mobile destinations remain unique and use existing route click handlers',()=>{
 const ids=['sqev-nav','sq-finance-nav','nav-analytics','nav-chat','nav-friends','sq-mobile-notifications','nav-profile','nav-about','nav-privacy-terms'];
 for(const id of ids){
   assert.equal((section.match(new RegExp('data-sq-destination="'+id+'"','g'))||[]).length,1,'destination '+id+' must exist once');
 }
 assert.match(html,/const link=e\.target\.closest\('\[data-sq-destination\]'\)/);
 assert.match(html,/target\.click\(\)/);
});
test('logout remains full-width below the grid and beta feedback stays available',()=>{
 assert.ok(section.indexOf('id="sq-mobile-more-logout"')>section.indexOf('sq-balanced-more-grid'));
 assert.match(html,/#sq-mobile-more-sheet \.sq-balanced-logout\{width:100%/);
 assert.match(html,/Beta Feedback/);
});
