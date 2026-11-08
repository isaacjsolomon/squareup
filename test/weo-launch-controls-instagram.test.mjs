import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script} from 'node:vm';

const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const actions=read('weo-actions.js');
const html=read('index.html');
const css=read('weo-actions.css');

test('Weo opens without scanning every page mutation for Instagram text',()=>{
  assert.doesNotThrow(()=>new Script(actions));
  assert.doesNotMatch(actions,/centerInstagramPopup/);
  assert.doesNotMatch(actions,/observe\(document\.body,\{childList:true,subtree:true\}\)/);
  assert.match(actions,/document\.body\.style\.position==='fixed'/);
});
test('Weo tracker actions reuse the authenticated app navigation',()=>{
  assert.match(html,/window\.sqOpenTrackerForWeo = async function\(id\)/);
  assert.match(actions,/await window\.sqOpenTrackerForWeo\(id\)/);
  assert.match(actions,/await window\.squareUpApi\('trackers'\)/);
  assert.match(actions,/if\(area\.parentElement!==form\)form\.appendChild\(area\)/);
});
test('Weo desktop tools and starter prompts remain interactive',()=>{
  assert.match(css,/\.weo-quick-actions\.weo-menu-open\{[\s\S]*?visibility:visible!important/);
  assert.match(css,/pointer-events:auto!important/);
  assert.match(actions,/observe\(stream,\{childList:true\}\)/);
});
test('Instagram invite centers all text in its actual popup',()=>{
  assert.match(html,/#sq-instagram-invite \.sq-ig-card #sq-ig-title/);
  assert.match(html,/#sq-instagram-invite \.sq-ig-card #sq-ig-description/);
  assert.match(html,/text-align-last:center!important/);
});
