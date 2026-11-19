import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../doweo-trips-activity.js',import.meta.url),'utf8');
test('trip summary derives estimates from existing itinerary items without saving transactions',()=>{
 assert.match(source,/function updateTripBudget\(rows\)/);
 assert.match(source,/priced\.reduce\(/);
 assert.match(source,/priced\.filter\(x=>x\.done\)/);
 assert.match(source,/These are planned costs, not confirmed spending/);
 assert.match(source,/updateTripBudget\(rows\)/);
 assert.match(source,/trackerCurrencies\.get\(activeTracker\(\)\)/);
 assert.doesNotMatch(source,/innerHTML\s*=\s*.*estimated_cost/);
});
