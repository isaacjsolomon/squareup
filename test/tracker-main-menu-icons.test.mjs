import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const css=readFileSync(new URL('../weo-actions.css',import.meta.url),'utf8');
test('share, delete and leave use inline semantic SVG icons',()=>{
  for(const name of ['Share tracker','Delete tracker','Leave tracker']) assert.ok(html.includes("'"+name+"':"), name);
  assert.match(html,/glyph\.classList\.add\('tracker-menu-svg-icon'\)/);
  assert.match(html,/id="dw-tracker-main-menu-icons"/);
  assert.match(html,/actionIcon\+'<\/svg>'/);
});
test('obsolete icon overrides removed',()=>{
  assert.doesNotMatch(css,/Tracker action icon refinements/);
  assert.doesNotMatch(css,/\.tracker-menu-main > button:nth-of-type\(2\)/);
});
test('existing share and remove handlers preserved',()=>{
  assert.match(html,/if\(current&&current\.id===t\.id\)await openShare\(\)/);
  assert.match(html,/if\(await removeTracker\(t\)\)await renderTrackerGallery\(\)/);
});
