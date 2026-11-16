import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
test('trackers empty state shows a real create action',()=>{
 for(const marker of ['No trackers yet','Create your first tracker','dw-guided-empty','gallery.querySelector(\'#tracker-gallery-new\')?.click()'])
  assert.ok(html.includes(marker),'missing '+marker);
});
test('Friends shows distinct states and find friends action',()=>{
 for(const marker of ['No friends yet','No pending requests','No matching people', 'Find friends',
 'list.setAttribute(\'aria-busy\',\'true\')', 'finally{list.removeAttribute(\'aria-busy\');}'])
  assert.ok(html.includes(marker),'missing '+marker);
});
test('notification empty filter includes working reset',()=>{
 for(const marker of ['All caught up','Nothing matches this filter','Show all notifications',
 "notificationFilter.value='all';filterRows();"])
  assert.ok(html.includes(marker),'missing '+marker);
});
test('safety and existing navigation handlers remain',()=>{
 for(const marker of ['function renderTrackerGallery()', 'function squareUpLoadFriends()',
 'function filterRows()', "notificationFilter?.addEventListener('change'",
 'function placeTrackerMenu()', 'DoWeo never transfers funds'])
  assert.ok(html.includes(marker),'missing '+marker);
});
