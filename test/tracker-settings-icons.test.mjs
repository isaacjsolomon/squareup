import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
test('tracker settings render six semantic line icons instead of character glyphs',()=>{
  for(const label of ['Change banner','Change tracker backdrop','Rename tracker','Archive tracker','Manage permissions','Expense approval']){
    assert.ok(html.includes("'"+label+"':"),'missing icon for '+label);
    assert.ok(html.includes("'"+label+"'"),'missing action '+label);
  }
  assert.match(html,/glyph\.innerHTML='<svg viewBox=/);
  assert.match(html,/aria-hidden="true" focusable="false"/);
  assert.match(html,/id="dw-tracker-settings-icons"/);
});
test('existing tracker settings handlers and compact drawer are preserved',()=>{
  assert.match(html,/function settingsAction\(icon,label,fn\)/);
  assert.match(html,/await fn\(\)/);
  assert.match(html,/function placeTrackerMenu\(\)/);
  assert.match(html,/sidebarEdge\+Math\.max\(12,\(available-width\)\/2\)/);
});
