import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const html=read('index.html');
const js=read('doweo-polls-dashboard.js');
const css=read('doweo-polls-dashboard.css');
const workflow=read('.github/workflows/deploy-doweo-pages.yml');
const api=read('functions/api/[[path]].js');

test('Polls dashboard JS parses and is bundled in production',()=>{
 assert.doesNotThrow(()=>new Function(js));
 assert.match(html,/doweo-polls-dashboard\.js\?v=20261122-backdrop-colors-v1/);
 assert.match(html,/doweo-polls-dashboard\.css\?v=20261122-backdrop-colors-v1/);
 assert.match(workflow,/doweo-polls-dashboard\.js doweo-polls-dashboard\.css/);
 assert.match(workflow,/node --check \.pages-output\/doweo-polls-dashboard\.js/);
});

test('Existing poll lifecycle, voting, editing, filters and tracker selection are retained',()=>{
 assert.match(html,/dwPollsDashboard\?\.render\(\{polls:rows,filter\}\)/);
 assert.match(html,/const api=\(suffix=/);
 assert.match(html,/data-poll-filter/);
 assert.match(html,/data-vote/);
 assert.match(html,/data-manage/);
 assert.match(html,/dw-polls-tracker-select/);
 assert.match(js,/cards\.before\(stats,grid\)/);
 assert.match(js,/\.dw-poll-cards-slot'\)\.append\(cards\)/);
});

test('Mockup panels are rendered from poll counts and real voter data',()=>{
 for(const id of ['dw-poll-stat-total','dw-poll-stat-pending','dw-poll-stat-percent','dw-poll-voter-list','dw-poll-recent-results','dw-poll-open-count']){
  assert.ok(js.includes(id),id+' missing from dashboard');
 }
 for(const feature of ['Total polls','Awaiting votes','Participation','Active Polls','Quick Actions','Voter Status','Recent Results']){
  assert.ok(js.includes(feature),feature+' missing');
 }
 assert.match(api,/votedNames:\[\.\.\.eligible\]/);
 assert.match(js,/poll\.votedNames/);
 assert.match(js,/poll\.pendingNames/);
 assert.match(js,/votedMembers\/totalMembers\*100/);
});

test('Quick Actions have functional handlers and prevent surprise reminders',()=>{
 for(const action of ['remind','results','settings','all-results'])assert.ok(js.includes('data-poll-dashboard-action="'+action+'"'));
 assert.match(js,/window\.confirm\(/);
 assert.ok(js.includes("window.squareUpApi('trackers/'+encodeURIComponent(tracker.id)+'/chat'"));
 assert.match(js,/lastReminder<60000/);
 assert.match(js,/selectFilter\(/);
 assert.match(js,/menu\.open=true/);
});

test('Desktop style matches approved navy and teal layout without mobile changes',()=>{
 assert.match(css,/@media \(min-width:901px\)/);
 assert.doesNotMatch(css,/@media\s*\(max-width:900px\)/);
 for(const rule of ['dw-poll-dashboard-stats','dw-poll-dashboard-grid','dw-poll-dashboard-surface','dw-poll-dashboard-stat','dw-poll-quick-panel','dw-poll-voter-row','dw-poll-recent-panel'])assert.ok(css.includes(rule));
 assert.match(css,/#355E72/);
 assert.match(css,/#F3F8FC/);
});
