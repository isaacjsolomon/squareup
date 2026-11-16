import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
test('six page headers share the common layout class without replacing action IDs',()=>{
 for(const cls of ['sq-notifications-header','trackers-header','sq-feature-head','sq-bills-title','split-header','sq-analytics-header'])
   assert.ok(html.includes('class="'+cls+' dw-page-header"'), 'missing '+cls);
 for(const id of ['notifications-back','sq-friends-refresh','sq-bills-tracker','split-currency','analytics-range'])
   assert.ok(html.includes('id="'+id+'"'), 'missing '+id);
});
test('page header styles are scoped to real pages and mobile safe',()=>{
 assert.match(html,/id="dw-consistent-page-headers"/);
 assert.match(html,/#notifications-page \.dw-page-header/);
 assert.match(html,/#trackers-page \.dw-page-header/);
 assert.match(html,/#friends-page \.dw-page-header/);
 assert.match(html,/#sq-bills-page \.dw-page-header/);
 assert.match(html,/#split-page \.dw-page-header/);
 assert.match(html,/#analytics-page \.dw-page-header/);
 assert.match(html,/@media\(max-width:700px\)/);
 assert.match(html,/flex-wrap:wrap!important/);
});
test('does not replace tracker functionality or assistant',()=>{
 assert.match(html,/function placeTrackerMenu\(\)/);
 assert.match(html,/function openShare\(/);
 assert.match(html,/id="dw-tracker-settings-redesign"/);
});
