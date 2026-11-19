import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script} from 'node:vm';

const js=readFileSync(new URL('../doweo-trips-activity.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const finance=html.match(/<script id="sq-nextgen-script">([\s\S]*?)<\/script>/)?.[1];

test('desktop Trackers mounts the existing full Finance workspaces without duplicating them',()=>{
 assert.doesNotThrow(()=>new Script(js));
 assert.ok(finance,'existing Finance workspace renderer is retained');
 assert.match(html,/data-dw-section="trackers"[^>]*>All Trackers/);
 assert.match(js,/const openFinance=window\.squareUpOpenFinanceHub/);
 assert.match(js,/host\.append\(hub\)/);
 assert.match(js,/openFinance\(type==='trip'\?'trip':'home'\)/);
 assert.match(js,/homeMarker\.after\(hub\)/);
 assert.match(js,/document\.body\.classList\.remove\('sq-finance-open'\)/);
});
test('Trip and Household content retain original directory, create/link, plans and editing APIs',()=>{
 assert.match(finance,/const type=tab==='trip'\?'trip':'household'/);
 assert.match(finance,/id="sq-ng-workspace-create-form"/);
 assert.match(finance,/id="sq-ng-workspace-link-form"/);
 assert.match(finance,/api\('finance\/workspace-links'/);
 assert.match(finance,/api\('finance\/workspace','POST'/);
 assert.match(finance,/api\('finance\/workspace\/'\+id,'DELETE'/);
 assert.match(finance,/Trip budget/);
 assert.match(finance,/Household budget/);
 assert.match(js,/id='dw-trip-plus-launch'/);
 assert.match(js,/id='dw-trip-add-item'/);
});
test('original All Trackers actions and mobile navigation are not rewritten',()=>{
 assert.match(js,/@media\(min-width:901px\)/);
 assert.match(js,/@media\(max-width:900px\)/);
 assert.match(js,/desktop\.addEventListener\('change'/);
 assert.match(js,/gallery\.hidden=false/);
 assert.match(js,/gallery\.hidden=true/);
 assert.doesNotMatch(js,/removeChild\(card\)|DELETE.*tracker/);
});
