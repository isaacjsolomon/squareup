import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const begin=html.indexOf('<style id="dw-consistent-standard-buttons">');
const end=html.indexOf('</style>',begin);
assert.ok(begin>=0&&end>begin,'button design style missing');
const css=html.slice(begin,end);
test('ordinary button rules are scoped to app pages',()=>{
 for(const page of ['#notifications-page','#friends-page','#settings-page','#analytics-page','#split-page','#sq-bills-page','#tracker-dashboard']){
   assert.ok(css.includes(page),'missing page '+page);
 }
 for(const token of ['min-height:42px','border-radius:var(--dw-btn-radius)','focus-visible','prefers-reduced-motion']){
   assert.ok(css.includes(token),'missing '+token);
 }
});
test('branded and destructive actions remain outside broad button restyling',()=>{
 for(const excluded of ['#settings-signout','#settings-delete-account',":not(.danger)",":not(.accent)",":not([data-friend-action='remove'])",":not([data-friend-action='decline'])"]){
   assert.ok(css.includes(excluded),'missing exclusion '+excluded);
 }
 assert.ok(!css.includes('.sq-social-instagram'),'Instagram styling altered');
 assert.ok(!css.includes('.sq-balanced-logout'),'Logout branding altered');
 assert.ok(!css.includes('.sq-balanced-feedback'),'Beta Feedback branding altered');
 assert.ok(!css.includes('#sq-mobile-more-sheet'),'Mobile More styling altered');
 assert.ok(!css.includes('#delete-account-panel'),'Delete Account styling altered');
 assert.ok(!css.includes('button:disabled{'),'global buttons affected');
});
test('main controls keep their existing identifiers and click handlers',()=>{
 for(const id of ['sq-friends-refresh','notifications-back','settings-signout','settings-delete-account','sq-mobile-more-logout'])
   assert.ok(html.includes('id="'+id+'"'),'missing '+id);
 assert.ok(html.includes('function renderTrackerGallery()'));
 assert.ok(html.includes('function openShare('));
});
