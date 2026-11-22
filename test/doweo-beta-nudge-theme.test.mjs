import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const css=readFileSync(new URL('../doweo-mint-dashboard.css',import.meta.url),'utf8');
const nudge=readFileSync(new URL('../doweo-beta-nudge.js',import.meta.url),'utf8');
const nudgeCss=readFileSync(new URL('../doweo-beta-nudge.css',import.meta.url),'utf8');
const feedback=readFileSync(new URL('../beta-feedback.js',import.meta.url),'utf8');
const deploy=readFileSync(new URL('../.github/workflows/deploy-doweo-pages.yml',import.meta.url),'utf8');

test('a seven-minute active-session invitation reuses the existing feedback form',()=>{
 assert.match(nudge,/7\s*\*\s*60\s*\*\s*1000/);
 assert.match(nudge,/document\.visibilityState/);
 assert.match(nudge,/performance\.now\(\)/);
 assert.match(nudge,/sessionStorage\.setItem\(SEEN_KEY/);
 assert.match(nudge,/sessionStorage\.setItem\(ACTIVE_KEY/);
 assert.match(nudge,/feedbackAction\(\)/);
 assert.match(nudge,/target\.click\(\)/);
 assert.match(nudge,/\[data-kind/);
 for(const label of ['Beta Feedback','Give Feedback','Maybe Later','Tell us what you like','Share ideas for new features','Report any issues'])
  assert.ok(nudge.includes(label),'missing approved invitation copy: '+label);
 assert.match(feedback,/export function initBetaFeedback/);
 assert.match(feedback,/id='dw-beta-modal'/);
 assert.match(feedback,/api\('beta-feedback','POST'/);
 assert.match(nudge,/otherDialogOpen\(\)/);
 assert.match(nudge,/window\.addEventListener\('pagehide'/);
 assert.match(nudge, /nudge\.addEventListener\('keydown'/);
 assert.match(nudgeCss,/#dw-beta-nudge\[hidden\]/);
 assert.match(nudgeCss, /@media\(max-width:600px\)/);
});

test('approved dashboard style reaches all main desktop app destinations without replacing data',()=>{
 for(const dest of ['#tracker-dashboard','#trackers-page','#friends-page','#notifications-page','#analytics-page','#settings-page','#about-page','#sq-bills-page'])
  assert.ok(css.includes(dest),'missing theme coverage: '+dest);
 assert.match(css, /@media\(min-width:901px\)/);
 assert.match(css, /#dw-home-columns/);
 assert.match(css, /sq-workspace-tabs/);
 assert.match(css, /#sq-nextgen/);
 assert.match(css, /@media\(max-width:900px\)/);
 assert.doesNotMatch(css, /display:none!important.*#tracker-dashboard/s);
 assert.match(css, /--dw-view-mint:/);
 assert.match(css, /--dw-view-canvas:/);
});

test('live HTML and Pages bundle include every new file with cache-busted URLs',()=>{
 for(const asset of ['doweo-mint-dashboard.css?v=20261122-approved-seven-palette-v3','doweo-beta-nudge.css?v=20261122-approved-seven-palette-v3','doweo-beta-nudge.js?v=20261122-approved-seven-palette-v3'])
  assert.ok(html.includes(asset),'index missing '+asset);
 for(const asset of ['doweo-mint-dashboard.css','doweo-beta-nudge.css','doweo-beta-nudge.js'])
  assert.ok(deploy.includes(asset+'.pages-output/') || deploy.includes(asset+' '),'deploy missing '+asset);
 assert.match(deploy,/node --check \.pages-output\/doweo-beta-nudge\.js/);
});
