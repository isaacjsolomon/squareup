import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');

test('portalled mobile tracker settings keep their own visible styling',()=>{
  assert.match(html,/body\.trackers-view \.tracker-tile-menu-panel:has\(\.tracker-settings-view:not\(\[hidden\]\)\)/);
  assert.match(html,/max-width:calc\(100vw - 24px\)/);
  assert.match(html,/\.tracker-settings-back\{position:sticky;top:0/);
});

test('tracker settings changes trigger menu repositioning',()=>{
  assert.match(html,/settingsHeader\.onclick=function\(\)\{settingsView\.hidden=true;mainView\.hidden=false;placeTrackerMenu\(\)/);
  assert.match(html,/mainView\.hidden=true;settingsView\.hidden=false;placeTrackerMenu\(\)/);
});

test('mobile settings are wider than the regular action menu and fit the viewport',()=>{
  assert.match(html,/var width=Math\.min\(showingSettings \? 430 : 310,window\.innerWidth-24\)/);
  assert.match(html,/var isMobile=window\.matchMedia\('\(max-width: 600px\)'\)\.matches/);
  assert.match(html,/var viewportHeight=window\.visualViewport \? window\.visualViewport\.height : window\.innerHeight/);
  assert.match(html,/menuPanel\.style\.maxHeight=\(showingSettings \? Math\.min\(680,viewportHeight-24\)/);
});

test('settings actions still invoke their existing handlers without deleting controls',()=>{
  for(const text of ['Change banner','Change tracker backdrop','Rename tracker','Archive tracker','Manage permissions','Expense approval']){
    assert.ok(html.includes("settingsAction(") && html.includes("'"+text+"'"),'missing settings action: '+text);
  }
  assert.match(html,/if\(event\.key==='Escape'&&menu\.open\)closeTrackerMenu\(\)/);
});
