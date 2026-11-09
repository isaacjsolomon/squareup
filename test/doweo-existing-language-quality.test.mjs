import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import I18n from '../doweo-i18n.js';
import {CORE_UI_SOURCE_KEYS,CORE_UI_TRANSLATIONS} from '../doweo-core-locales.mjs';
import {UI_PHRASES} from '../doweo-ui-catalog.mjs';

const source=readFileSync(new URL('../doweo-localize-ui.js',import.meta.url),'utf8');
const base=readFileSync(new URL('../doweo-translations.js',import.meta.url),'utf8');
const baseline=JSON.parse(base.slice(base.indexOf('const languages=')+'const languages='.length,base.indexOf(';\n  const english=')));
const spanish=JSON.parse(source.match(/const screenshotSpanish=(\{.*?\});\n function seedStaticTranslations/s)[1]);
const warning='Permanently delete your DoWeo account, profile, payment usernames, profile photo, and your saved tracker data. Trackers you own will also be deleted for their members. This cannot be undone.';
const supported=['en','es','fr','he','zh-Hans','pt','de','it','ja','ar','ko','hi'];

test('all twelve established languages have complete aligned base dictionaries',()=>{
 assert.deepEqual(I18n.SUPPORTED,supported);
 for(const locale of supported){
   assert.ok(Array.isArray(baseline[locale]),locale+' missing base dictionary');
   assert.equal(baseline[locale].length,baseline.en.length,locale+' base labels misaligned');
   assert.ok(baseline[locale].every(label=>typeof label==='string'&&label.trim()),locale+' blank base entry');
 }
 assert.equal(Object.keys(CORE_UI_TRANSLATIONS).length,10);
 assert.ok(Object.keys(spanish).length>=400);
 assert.equal(new Set(CORE_UI_SOURCE_KEYS).size,CORE_UI_SOURCE_KEYS.length);
 for(const label of CORE_UI_SOURCE_KEYS){
   assert.ok(UI_PHRASES.includes(label),'unapproved interface text '+label);
   for(const locale of supported.filter(x=>x!=='en'&&x!=='es'))
     assert.ok(CORE_UI_TRANSLATIONS[locale]?.[label]?.trim(),locale+' missing '+label);
 }
});

test('financial operations have consistent meanings in audited translations',()=>{
 assert.equal(CORE_UI_TRANSLATIONS.it.Settlements,'Pagamenti di saldo');
 assert.equal(CORE_UI_TRANSLATIONS.de.Settlements,'Ausgleichszahlungen');
 assert.equal(CORE_UI_TRANSLATIONS.ko.Shares,'분담 몫');
 assert.equal(spanish.Shares,'Partes');
 for(const locale of supported.filter(x=>x!=='en'&&x!=='es')){
   const localeStrings=CORE_UI_TRANSLATIONS[locale];
   for(const key of ['Pay Now','Record payment','Paid back','Owes money','Split equally','Exact amounts','Shares','Currency converter','Payment due date (optional)','Delete account','Delete my account']){
     assert.ok(localeStrings[key]&&localeStrings[key]!==key,locale+' untranslated financial command '+key);
   }
 }
});

test('East Asian member counters use classifiers and native spacing',()=>{
 assert.equal(CORE_UI_TRANSLATIONS['zh-Hans'].member,'位成员');
 assert.equal(CORE_UI_TRANSLATIONS['zh-Hans'].members,'位成员');
 assert.equal(CORE_UI_TRANSLATIONS.ja.member,'人');
 assert.equal(CORE_UI_TRANSLATIONS.ja.members,'人');
 assert.equal(CORE_UI_TRANSLATIONS.ko.member,'명');
 const start=source.indexOf(' function translateDynamic(');
 const end=source.indexOf(' function hideDecorativeDescriptions(',start);
 const snippet=source.slice(start,end)+'\n globalThis.translate=translate;';
 for(const [locale,expected] of [['zh-Hans','2位成员'],['ja','2人'],['ko','2명'],['fr','2 membres'],['es','2 miembros'],['en','2 members']]){
   const cache={...CORE_UI_TRANSLATIONS[locale]};
   if(locale==='es')Object.assign(cache,spanish);
   const ctx={cache,language:locale,approved:new Set(UI_PHRASES),pending:new Set(),requested:new Set(),retries:new Map(),MAX_ATTEMPTS:4,Intl,Date};
   vm.runInNewContext(snippet,ctx);
   assert.equal(ctx.translate('2 members'),expected,locale+' member counter');
 }
});

test('all existing language warnings retain permanent deletion and impact on other people',()=>{
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
   hi:[/स्थायी रूप से/,/सभी सदस्यों/,/वापस नहीं की जा सकती/]
 };
 for(const [locale,patterns] of Object.entries(checks)){
   const text=locale==='es'?spanish[warning]:CORE_UI_TRANSLATIONS[locale][warning];
   assert.ok(text&&text.includes('DoWeo'),'warning missing in '+locale);
   for(const pattern of patterns)assert.match(text,pattern,locale+' warning omits critical meaning');
 }
});

test('shared-home terminology is not confused with family-only membership',()=>{
 assert.equal(CORE_UI_TRANSLATIONS.it.Household,'Casa condivisa');
 assert.equal(CORE_UI_TRANSLATIONS.it.Households,'Case condivise');
 assert.equal(CORE_UI_TRANSLATIONS.pt.Household,'Moradia');
 assert.equal(CORE_UI_TRANSLATIONS.ar.Household,'الأسرة');
});
