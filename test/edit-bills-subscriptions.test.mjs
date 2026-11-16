import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const ui=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const api=readFileSync(new URL('../functions/api/[[path]].js',import.meta.url),'utf8');
test('bill edit controls exist in both list and details modal',()=>{
 assert.match(ui,/edit\.textContent='Edit';edit\.addEventListener\('click',\(\)=>window\.sqPremiumEdit/);
 assert.match(ui,/edit\\.textContent=item\\.kind==='subscription'\\?'Edit subscription':'Edit bill'/);
 assert.match(ui,/window\.sqPremiumEdit=function\(item,trackerId\)/);
 assert.match(ui,/if\(!name\.value\.trim\(\)\)/);
 assert.match(ui,/squareUpApi\('trackers\/'\+trackerId\+'\/bills\/'\+item\.id,'PATCH'/);
});
test('backend verifies tracker scope and edit permissions before patch',()=>{
 const start=api.indexOf("if (sub === 'bills' && method === 'PATCH' && recordId)");
 assert.ok(start>0);
 const code=api.slice(start,api.indexOf('// DELETE: Remove existing record',start));
 assert.match(code,/tracker_id: 'eq\.' \+ id, id: 'eq\.' \+ recordId/);
 assert.match(code,/!owner && String\(existing\.created_by\)/);
 assert.match(code,/can\('edit_all_expenses'\)/);
 assert.match(code,/\['weekly','monthly','yearly'\]/);
 assert.match(code,/\['bill','subscription'\]/);
 assert.match(code,/shares = previous\.map/);
 assert.doesNotMatch(code,/method:\s*'DELETE'/);
});
