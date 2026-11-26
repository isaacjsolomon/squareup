import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const css=readFileSync(new URL('../weo-actions.css',import.meta.url),'utf8');
const appCss=readFileSync(new URL('../styles.css',import.meta.url),'utf8');
test('settings uses the top layer and clears the mobile navigation',()=>{
 assert.match(html,/menuPanel\.showPopover\(\)/);
 assert.match(html,/dockClearance=dockTop>0&&dockTop<innerHeight\?innerHeight-dockTop\+30:0/);
 assert.match(html,/menuPanel\.style\.setProperty\('--dw-ts-bottom'/);
});
test('compact drawer removes large cards and keeps all actions',()=>{
 assert.match(appCss,/Original style 45\/276: dw-tracker-settings-redesign/);
 assert.match(appCss,/\.sq-tracker-settings-group\{/);
 assert.match(appCss,/border:0!important;border-radius:0!important;background:none!important/);
 for(const label of ['Change banner','Change tracker backdrop','Rename tracker','Archive tracker','Manage permissions','Expense approval'])
   assert.ok(html.includes("'"+label+"'"),label);
 assert.match(html,/settingsView\.hidden=false;menuPanel\.scrollTop=0/);
 assert.match(html,/if\(event\.key==='Escape'&&menu\.open\)\{closeTrackerMenu\(\)/);
});
test('old stylesheet no longer forces settings position',()=>{
 assert.doesNotMatch(css,/(?:^|[;{\s])left\s*:\s*max\(280px/m);
 assert.doesNotMatch(css,/left:calc\(50vw \+ 120px\)/);
 assert.doesNotMatch(css,/width:min\(420px,calc\(100vw - 304px\)\)/);
});
