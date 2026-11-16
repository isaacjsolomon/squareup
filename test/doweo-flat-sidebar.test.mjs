import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const begin=html.indexOf('<script id="doweo-grouped-navigation-init-20261108">');
const end=html.indexOf('</script>',begin);
const nav=html.slice(begin,end);

test('More is the only dynamically created desktop dropdown',()=>{
 assert.ok(begin>0);
 assert.match(nav,/const more=document\.createElement\('details'\)/);
 assert.equal((nav.match(/document\.createElement\('details'\)/g)||[]).length,1);
 assert.match(nav,/more\.dataset\.dwNavGroup='more'/);
 assert.doesNotMatch(nav,/name:'Groups'|name:'Finance'|name:'Social'/);
});

test('desktop destinations remain their original clickable buttons',()=>{
 for(const id of ['nav-home','nav-trackers','sqev-nav','sq-finance-nav','nav-analytics','nav-chat','nav-friends'])
  assert.match(nav,new RegExp("'"+id+"'"));
 assert.match(nav,/nav\.append\(button\)/);
 for(const id of ['nav-profile','nav-help-center','nav-about','nav-privacy-terms'])
  assert.match(nav,new RegExp("'"+id+"'"));
 assert.match(nav,/more\.append\(button\)/);
 assert.match(html,/#sq-mobile-more-sheet \.sq-balanced-more-grid/);
});
