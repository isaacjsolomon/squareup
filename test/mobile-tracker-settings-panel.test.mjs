import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const css=readFileSync(new URL('../weo-actions.css',import.meta.url),'utf8');
test('settings uses sidebar-aware position instead of tracker card anchor',()=>{
 assert.match(html,/var sidebar=document\.querySelector\('\.sidebar'\)/);
 assert.match(html,/var available=vw-sidebarEdge/);
 assert.match(html,/var left=showingSettings/);
 assert.match(html,/sidebarEdge\+Math\.max\(12,\(available-width\)\/2\)/);
 assert.match(html,/Math\.min\(360,available-32\)/);
 assert.match(html,/Math\.min\(490,vh-24\)/);
});
test('compact drawer removes large cards and keeps all actions',()=>{
 assert.match(html,/id="dw-tracker-settings-redesign"/);
 assert.match(html,/\.sq-tracker-settings-group\{/);
 assert.match(html,/border:0!important;border-radius:0!important;background:none!important/);
 for(const label of ['Change banner','Change tracker backdrop','Rename tracker','Archive tracker','Manage permissions','Expense approval'])
   assert.ok(html.includes("'"+label+"'"),label);
 assert.match(html,/settingsView\.hidden=false;placeTrackerMenu\(\)/);
 assert.match(html,/if\(event\.key==='Escape'&&menu\.open\)closeTrackerMenu\(\)/);
});
test('old stylesheet no longer forces settings position',()=>{
 assert.doesNotMatch(css,/left:max\(280px/);
 assert.doesNotMatch(css,/left:calc\(50vw \+ 120px\)/);
 assert.doesNotMatch(css,/width:min\(420px,calc\(100vw - 304px\)\)/);
});
