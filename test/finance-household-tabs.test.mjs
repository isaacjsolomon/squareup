import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script} from 'node:vm';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const api=readFileSync(new URL('../functions/api/[[path]].js',import.meta.url),'utf8');
const sql=readFileSync(new URL('../supabase/migrations/20261107_finance_workspace_links.sql',import.meta.url),'utf8');
const finance=html.match(/<script id="sq-nextgen-script">([\s\S]*?)<\/script>/)?.[1];
const shuffle=html.match(/<script id="sq-finance-mobile-shuffle-script">([\s\S]*?)<\/script>/)?.[1];

test('Finance Hub and mobile shuffle JavaScript still parse',()=>{
 assert.ok(finance&&shuffle);
 assert.doesNotThrow(()=>new Script(finance));
 assert.doesNotThrow(()=>new Script(shuffle));
 assert.doesNotThrow(()=>new Script(api.replace(/\bexport\s+(?=(?:async\s+)?function\b)/g,'')));
});

test('Bills action appears before the subscription summary, still using existing billing launcher',()=>{
 const start=finance.indexOf("if(tab==='subscriptions')");
 const snippet=finance.slice(start,finance.indexOf("if(tab==='currencies')",start));
 const action=snippet.indexOf('id="sq-ng-bills"');
 const summary=snippet.indexOf("card('Billing records','Existing subscriptions'");
 assert.ok(action>0&&summary>action);
 assert.match(snippet,/document\.getElementById\('sq-bills-open'\)\?\.click\(\)/);
});

test('Mobile navigation has previous and next arrows, both rotate across all 7 tabs',()=>{
 assert.match(html,/id="sq-ng-prev-tabs"/);
 assert.match(html,/id="sq-ng-next-tabs"/);
 assert.match(shuffle,/first=\(first-1\+tabs\.length\)%tabs\.length/);
 assert.match(shuffle,/first=\(first\+1\)%tabs\.length/);
 assert.match(html,/grid-template-columns:42px repeat\(3,minmax\(0,1fr\)\) 42px!important/);
});

test('Household recognizes local templates, clear names, saved workspace items, and account links',()=>{
 assert.match(finance,/api\('finance\/workspace-links\?type='\+type\)/);
 assert.match(finance,/linkedIds\.has\(t\.id\)/);
 assert.match(finance,/household\|roommates\?/);
 assert.match(finance,/hasPlans\?4:templateMatches\?3/);
 assert.match(finance,/id="sq-ng-workspace-link-form"/);
 assert.match(finance,/data-ng-workspace-open/);
});

test('Link existing tracker uses account-scoped server endpoint without changing debts',()=>{
 assert.match(finance,/api\('finance\/workspace-links','POST',\{workspace_type:type,tracker_id:trackerId\}\)/);
 assert.match(finance,/api\('finance\/workspace-links','POST',\{workspace_type:type,tracker_id:detail\.id\}\)/);
 assert.match(api,/if \(parts\[0\] === 'finance' && parts\[1\] === 'workspace-links'\)/);
 assert.match(api,/if \(!\(await member\(trackerId\)\)\) return fail\('Tracker not found',404\)/);
 assert.match(api,/filters: \{ user_id: 'eq\.' \+ me\.id, workspace_type: 'eq\.' \+ kind \}/);
 assert.match(sql,/alter table public\.squareup_finance_workspace_links enable row level security/);
 assert.match(sql,/revoke all on public\.squareup_finance_workspace_links from anon, authenticated/);
 assert.match(sql,/grant select, insert, delete on public\.squareup_finance_workspace_links to service_role/);
});

test('Existing workspace item editing and tracker navigation are untouched',()=>{
 assert.match(finance,/api\('finance\/workspace','POST'/);
 assert.match(finance,/api\('finance\/workspace\/'\+id,'DELETE'/);
 assert.match(finance,/id="sq-ng-workspace-tracker"/);
});
