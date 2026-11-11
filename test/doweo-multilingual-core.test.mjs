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
 'Settings','Account','Bills','Home','Members','Last activity','Select a tracker',
 'Permanently delete your DoWeo account, profile, payment usernames, profile photo, and your saved tracker data. Trackers you own will also be deleted for their members. This cannot be undone.'
];
test('all DoWeo languages share the same common UI translation keys',()=>{
 const nonEnglish=I18n.SUPPORTED.filter(code=>code!=='en'&&code!=='es'&&code!=='he-script');
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
 for(const locale of [...I18n.SUPPORTED.filter(code=>code!=='en'&&code!=='es'&&code!=='he-script'),'es']){
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

test('irreversible account deletion warning is complete in every language',()=>{
 const warning="Permanently delete your DoWeo account, profile, payment usernames, profile photo, and your saved tracker data. Trackers you own will also be deleted for their members. This cannot be undone.";
 const checks={
  es:[/permanentemente/i,/eliminarán/i,/no se puede deshacer/i],
  fr:[/définitivement/i,/membres/i,/irréversible/i],
  he:[/לצמיתות/,/החברים/,/לא ניתן לבטל/],
  'zh-Hans':[/永久/,/成员/,/无法撤销/],
  pt:[/permanentemente/i,/membros/i,/não pode ser desfeita/i],
  de:[/dauerhaft/i,/Mitglieder/i,/nicht rückgängig/i],
  it:[/definitivamente/i,/membri/i,/non può essere annullata/i],
  ja:[/完全に削除/,/メンバー/,/取り消せません/],
  ar:[/نهائيًا/,/أعضائها/,/لا يمكن التراجع/],
  ko:[/영구적으로/,/모든 구성원/,/취소할 수 없습니다/],
  hi:[/स्थायी रूप से/,/सभी सदस्यों/,/वापस नहीं की जा सकती/],
  ru:[/Безвозвратно/,/участников/,/невозможно отменить/],
  tr:[/kalıcı/,/üyeleri/,/geri alınamaz/],
  vi:[/vĩnh viễn/,/tất cả thành viên/,/Không thể hoàn tác/],
  nl:[/definitief/,/alle leden/,/niet ongedaan/],
  pl:[/Trwale/,/wszystkich/,/nie można cofnąć/],
  sv:[/permanent/,/alla deras medlemmar/,/kan inte ångras/],
  bn:[/স্থায়ীভাবে/,/সব সদস্যের/,/ফিরিয়ে আনা যাবে না/]
 };
 for(const [locale,patterns] of Object.entries(checks)){
  const translated=locale==='es'?es[warning]:CORE_UI_TRANSLATIONS[locale]?.[warning];
  assert.ok(translated,locale+' warning not translated');
  assert.notEqual(translated,warning,locale+' falls back to English');
  for(const pattern of patterns)assert.match(translated,pattern,locale+' missing essential warning');
  assert.match(translated,/DoWeo/);
 }
 assert.ok(UI_PHRASES.includes(warning));
});
