import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const search=readFileSync(new URL('../doweo-global-search.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../doweo-reference-home.css',import.meta.url),'utf8');
const home=readFileSync(new URL('../doweo-reference-home.js',import.meta.url),'utf8');
const workflow=readFileSync(new URL('../.github/workflows/deploy-doweo-pages.yml',import.meta.url),'utf8');

test('search is a real browser script loaded by DoWeo and bundled for Cloudflare',()=>{
  assert.match(html,/<script id="sq-global-search-script" defer src="\/doweo-global-search\.js\?v=20261123-search-all-v2"><\/script>/);
  assert.match(workflow,/cp index\.html [^\n]*doweo-global-search\.js/);
  assert.match(workflow,/test -s \.pages-output\/doweo-global-search\.js/);
  assert.match(search,/window\.dwGlobalSearchReady=true/);
  assert.match(search,/document\.getElementById\('sq-mobile-search'\)/);
  assert.match(search,/window\.dwOpenGlobalSearch=open/);
});

test('search uses authenticated account-scoped access instead of unscoped site-wide scraping',()=>{
  assert.match(html,/window\.dwSearchAccess = \{/);
  assert.match(html,/snapshot: \(\) => \(\{/);
  assert.match(html,/userId: currentUser\?\.id \|\| null/);
  assert.match(html,/trackers: Array\.isArray\(trackers\)/);
  assert.match(html,/notifications: Array\.isArray\(inbox\)/);
  assert.match(html,/supabase\.rpc\('sq_find_users'/);
  assert.match(html,/supabase\.rpc\('sq_list_friends'/);
  assert.match(search,/Only use tracker IDs returned by this account's authenticated tracker list/);
  assert.match(search,/window\.squareUpApi\(path\)/);
  assert.match(search,/activeOwner\(\)===owner/);
  assert.doesNotMatch(search,/service.role|SERVICE_ROLE_KEY|anon.*select\('\*'\)/i);
});

test('all requested searchable collections are indexed across authorized trackers',()=>{
  for(const endpoint of ["'/polls'","'/bills'","'/chat'","'/wishlist'"])
    assert.ok(search.includes("base+"+endpoint),'missing scoped '+endpoint+' lookup');
  for(const endpoint of ["'notifications'","'social/notifications'","'trackers'"])
    assert.ok(search.includes("api("+endpoint+")"),'missing scoped '+endpoint+' lookup');
  for(const name of [
    'Trackers','Shared tracker members','Friends','Friend profiles',
    'Expenses & payments','Group polls','Bills & subscriptions','Notifications','Messages','Wishlist ideas'
  ])assert.ok(search.includes("'"+name+"'"),name+' section missing');
  assert.match(search,/for\(const tracker of all\)/);
  assert.match(search,/for\(const member of asList\(tracker\.members\)\)/);
  assert.match(search,/for\(const entry of asList\(tracker\.entries\)\)/);
  assert.match(search,/const trackerById=new Map/);
  assert.match(search,/cache\.trackers=list\.filter/);
});

test('matching results navigate to the relevant existing application area',()=>{
  assert.match(search,/await window\.sqOpenTrackerForWeo\(tracker\.id\)/);
  assert.match(search,/async function goExpense\(tracker,entry\)/);
  assert.match(search,/async function goPoll\(tracker,pollId\)/);
  assert.match(search,/window\.dwOpenPollsPage/);
  assert.match(search,/data-poll-card-id/);
  assert.match(search,/const button=buttons\.find\(b=>b\.dataset\.sqTab===tab\)/);
  assert.match(html,/openNotification: async \(id, social\)/);
  assert.match(html,/await refreshInbox\(\)/);
  assert.match(html,/openFriends: \(mode, username\)/);
});

test('responsive search supports keyboard navigation and avoids stale user/profile results',()=>{
  assert.match(search,/event\.metaKey\|\|event\.ctrlKey/);
  assert.match(search,/event\.key==='Escape'/);
  assert.match(search,/if\(event\.key!=='Tab'/);
  assert.match(search,/event\.shiftKey&&document\.activeElement===first/);
  assert.match(search,/document\.activeElement===last/);
  assert.match(search,/if\(returnFocus&&returnFocus\.focus\)returnFocus\.focus\(\)/);
  assert.match(search,/if\(serial!==querySerial\|\|!overlay\.classList\.contains\('open'\)\|\|currentQuery\(\)!==q\)return/);
  assert.match(search,/const owner=activeOwner\(\)/);
  assert.match(search,/cache\.loadedAt<120000/);
  assert.match(search,/const workers=Math\.min\(3,list\.length\)/);
  assert.match(search,/textContent=text\(item\.title\)/);
});

test('Recent Activity rows have no internal colored dividers, retaining layout and labels',()=>{
  assert.match(css,/#sq-return-activity>\.sq-return-row\{[\s\S]*?border:0!important;border-top:0!important;border-bottom:0!important/);
  assert.match(css,/\.sq-return-row \.dw-activity-name/);
  assert.match(css,/\.sq-return-row \.dw-activity-value/);
  assert.match(home,/activitySlot\.id='dw-ref-activity-slot'/);
});
