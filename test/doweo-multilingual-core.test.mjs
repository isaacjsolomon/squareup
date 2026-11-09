import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {UI_PHRASES} from '../doweo-ui-catalog.mjs';
import {CORE_UI_SOURCE_KEYS,CORE_UI_TRANSLATIONS} from '../doweo-core-locales.mjs';
import I18n from '../doweo-i18n.js';
const src=readFileSync(new URL('../doweo-localize-ui.js',import.meta.url),'utf8');
const es=JSON.parse(src.match(/const screenshotSpanish=(\{.*?\});\n function seedStaticTranslations/s)[1]);
const required=[
 'Create new tracker','Create new trip','Create new household','Create new event',
 'Open tracker','Pay the full amount','Record payment','Quick Split Calculator',
 'Who owes money?','Who is owed money?','Save entry','Split equally',
 'Split method','Split summary','Pay Now','Scan Receipt','Split a Bill',
 'New chat','History','Your chats','Back to Home',
 'Finance Hub','Subscription Manager','Account Settings','Beta Feedback',
 'Currency converter','Current balances','Recent Activity','Delete account',
 'Events','Your events','Archived trackers','Food & Dining','Active subscriptions',
 'Settings','Account','Bills','Home','Members','Last activity','Select a tracker'
];
test('all DoWeo languages share the same common UI translation keys',()=>{
 const nonEnglish=I18n.SUPPORTED.filter(code=>code!=='en'&&code!=='es');
 assert.deepEqual(Object.keys(CORE_UI_TRANSLATIONS).sort(),nonEnglish.sort());
 assert.equal(new Set(CORE_UI_SOURCE_KEYS).size,CORE_UI_SOURCE_KEYS.length);
 assert.ok(CORE_UI_SOURCE_KEYS.length>=130);
 for(const key of CORE_UI_SOURCE_KEYS){
   assert.ok(UI_PHRASES.includes(key),'not approved: '+key);
   for(const code of nonEnglish){
     const value=CORE_UI_TRANSLATIONS[code]?.[key];
     assert.ok(typeof value==='string'&&value.trim(),code+' missing '+key);
   }
 }
 for(const key of required){
   assert.ok(es[key], 'Spanish missing '+key);
   for(const code of nonEnglish)assert.ok(CORE_UI_TRANSLATIONS[code][key],code+' missing '+key);
 }
});
test('locale bundles take precedence over old cached AI output',()=>{
 const start=src.indexOf(' function seedStaticTranslations(){');
 const end=src.indexOf(' function scan(){',start);
 assert.ok(start>0&&end>start);
 const fn=src.slice(start,end)+'\n globalThis.seed=seedStaticTranslations;';
 for(const locale of ['fr','he','zh-Hans','pt','de','it','ja','ar','ko','hi','es']){
   const cache={'Create new trip':'STALE ENGLISH','Record payment':'STALE ENGLISH'};
   const sandbox={cache,language:locale,coreTranslations:CORE_UI_TRANSLATIONS,
     approved:new Set(UI_PHRASES),root:{DoWeoTranslations:{languages:{en:[]}}},screenshotSpanish:es};
   vm.runInNewContext(fn,sandbox);
   sandbox.seed();
   const expected=locale==='es'?es:CORE_UI_TRANSLATIONS[locale];
   assert.equal(cache['Create new trip'],expected['Create new trip'],locale);
   assert.equal(cache['Record payment'],expected['Record payment'],locale);
 }
});
test('localized create actions are separate from private user text',()=>{
 assert.match(src,/Only source-controlled interface phrases are sent/);
 assert.match(src,/#tracker-chat-messages/);
 assert.match(src,/\.expense-description/);
 assert.match(src,/import\('\/doweo-core-locales\.mjs'\)/);
 assert.match(src,/coreTranslations=core.CORE_UI_TRANSLATIONS/);
});
