import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {UI_PHRASES} from '../doweo-ui-catalog.mjs';
const localizer=readFileSync(new URL('../doweo-localize-ui.js',import.meta.url),'utf8');
const dictionary=readFileSync(new URL('../doweo-translations.js',import.meta.url),'utf8');
test('a single observer owns DOM translation',()=>{
 assert.doesNotMatch(dictionary,/new MutationObserver/);
 assert.match(localizer,/new MutationObserver\(schedule\)/);
 assert.match(dictionary,/root.DoWeoTranslations=Object.freeze/);
});
test('dynamic translations preserve user data and translate only fixed interface tokens',()=>{
 assert.match(localizer,/function translateDynamic/);
 assert.match(localizer,/queueToken\('owes'\)/);
 assert.match(localizer,/approved.has\(key\)/);
 assert.match(localizer,/Welcome back/);
 assert.match(localizer,/members\?/);
});
test('reported missing interface labels are in approved catalog',()=>{
 for(const item of ['members','Favorite','Last activity','Open tracker →','Archived trackers','owes','saved','monthly','New event']){
  assert.ok(UI_PHRASES.includes(item),item);
 }
});
test('Spanish fallback covers reported problem sections',()=>{
 for(const item of ['Total events','Billing calendar','Smart settle-up','Tracker members','Subscriptions & Bills']){
  assert.ok(localizer.includes(JSON.stringify(item)+':'),item);
 }
});
