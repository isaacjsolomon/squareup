import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import i18n from '../doweo-i18n.js';
import {CORE_UI_TRANSLATIONS,CORE_UI_SOURCE_KEYS} from '../doweo-core-locales.mjs';
import {UI_PHRASES} from '../doweo-ui-catalog.mjs';
import {validateTranslationRequest} from '../functions/api/ui-translate.js';

const incoming=['ru','tr','vi','nl','pl','sv','bn'];
const names=['Русский','Türkçe','Tiếng Việt','Nederlands','Polski','Svenska','বাংলা'];
const flags=['🇷🇺','🇹🇷','🇻🇳','🇳🇱','🇵🇱','🇸🇪','🇧🇩'];
const all=['en','es','fr','he','zh-Hans','pt','de','it','ja','ar','ko','hi',...incoming];
const script=fs.readFileSync(new URL('../doweo-translations.js',import.meta.url),'utf8');
const ui=fs.readFileSync(new URL('../doweo-localize-ui.js',import.meta.url),'utf8');
const i18nScript=fs.readFileSync(new URL('../doweo-i18n.js',import.meta.url),'utf8');
const api=fs.readFileSync(new URL('../functions/api/ai-chat.js',import.meta.url),'utf8');
const translateApi=fs.readFileSync(new URL('../functions/api/ui-translate.js',import.meta.url),'utf8');
const langs=JSON.parse(script.slice(script.indexOf('const languages=')+'const languages='.length,script.indexOf(';\n  const english=')));
const warning='Permanently delete your DoWeo account, profile, payment usernames, profile photo, and your saved tracker data. Trackers you own will also be deleted for their members. This cannot be undone.';

test('all 19 languages are selectable with stable native names and flags',()=>{
 assert.deepEqual(i18n.SUPPORTED,all);
 const choices=i18n.LANGUAGE_CHOICES;
 assert.equal(choices.length,19);
 for(const [i,code] of incoming.entries()){
   const option=choices.find(o=>o.code===code);
   assert.ok(option,code+' missing from modal');
   assert.equal(option.name,names[i]);
   assert.equal(option.flag,flags[i]);
   assert.ok(option.subtitle);
 }
 assert.match(i18nScript,/modal\.setAttribute\('role','dialog'\)/);
 assert.match(i18nScript,/close\.addEventListener\('click',dismiss\)/);
});

test('browser language detection handles regional variants and manual reset',()=>{
 const expected={'ru-RU':'ru','tr-CY':'tr','vi-VN':'vi','nl-BE':'nl','pl-PL':'pl','sv-FI':'sv','bn-IN':'bn'};
 for(const [source,result] of Object.entries(expected)){
   assert.equal(i18n.normalize(source),result);
   assert.equal(i18n.detect(['xx-ZZ',source,'en-US']),result);
 }
 const store=new Map(),events=[];
 const win={navigator:{languages:['bn-BD','en-US']},document:{documentElement:{},querySelectorAll:()=>[],dispatchEvent:e=>events.push(e.type)},Event:class{constructor(type){this.type=type}},localStorage:{getItem:key=>store.get(key)||null,setItem:(key,val)=>store.set(key,val)}};
 for(const code of incoming){
   assert.equal(i18n.set(win,code),code);
   assert.equal(i18n.resolve(win),code);
   assert.equal(win.document.documentElement.lang,code);
   assert.equal(store.get(i18n.KEY),code);
 }
 assert.equal(i18n.set(win,'auto'),'bn');
 assert.equal(i18n.set(win,'en'),'en');
 assert.ok(events.length>=9);
});

test('baseline and high-priority offline strings are complete for all seven languages',()=>{
 for(const code of incoming){
   assert.equal(langs[code]?.length,langs.en.length,code+' baseline mismatch');
   assert.ok(langs[code].every(x=>typeof x==='string'&&x.trim()),code+' blank baseline');
   assert.equal(Object.keys(CORE_UI_TRANSLATIONS[code]||{}).length,CORE_UI_SOURCE_KEYS.length,code+' incomplete core dictionary');
   for(const key of CORE_UI_SOURCE_KEYS){
     const value=CORE_UI_TRANSLATIONS[code][key];
     assert.ok(value&&value.trim(),code+' empty core translation for '+key);
     assert.ok(UI_PHRASES.includes(key),key+' is not in approved catalog');
   }
   for(const key of ['Create new tracker','Create new trip','Create new household','Create new event','Open tracker','Pay the full amount','Record payment','Quick Split Calculator','Split equally','Shares','Who owes money?','Permanently delete your DoWeo account, profile, payment usernames, profile photo, and your saved tracker data. Trackers you own will also be deleted for their members. This cannot be undone.']){
     assert.notEqual(CORE_UI_TRANSLATIONS[code][key],key,code+' contains English for '+key);
   }
   assert.ok(CORE_UI_TRANSLATIONS[code][warning].includes('DoWeo'));
 }
});

test('the translation endpoint accepts 7 new locales and rejects unapproved user content',()=>{
 for(const code of incoming){
   assert.deepEqual(validateTranslationRequest({locale:code,texts:['Home','Settings','Home']}),{locale:code,texts:['Home','Settings']});
   assert.equal(validateTranslationRequest({locale:code,texts:['private chat from user']}),null);
 }
 assert.match(translateApi,/source-controlled UI strings only/);
 assert.match(ui,/#tracker-chat-messages/);
 assert.match(ui,/\.expense-description/);
});

test('Weo AI accepts all new language codes and does not silently respond in English',()=>{
 const sandbox={};
 new vm.Script(api.replace('export async function onRequest','async function onRequest')+'\nglobalThis.normalizeTest=normalizeWeoLocale;globalThis.langsTest=WEO_RESPONSE_LANGUAGES;').runInNewContext(sandbox);
 for(const code of incoming){
   assert.ok(sandbox.langsTest[code],code+' missing Weo language');
   assert.equal(sandbox.normalizeTest(code+'-ZZ'),code);
 }
});

test('dynamically rebuilt Create actions use the selected-language core translations',()=>{
 const start=ui.indexOf(' const actionLocales='),end=ui.indexOf(' function render(){',start);
 assert.ok(start>0&&end>start);
 for(const code of incoming)assert.match(ui,new RegExp('\\n   '+code+':\\['));
 const block=ui.slice(start,end)+'\n globalThis.translateActions=translateCreateActions;';
 for(const code of incoming){
   const button={textContent:'＋ Create new tracker',children:[],dataset:{}};
   const ctx={root:{document:{querySelectorAll:()=>[button]}},language:code,coreTranslations:CORE_UI_TRANSLATIONS};
   vm.runInNewContext(block,ctx);
   ctx.translateActions();
   assert.equal(button.textContent,'＋ '+CORE_UI_TRANSLATIONS[code]['Create new tracker']);
   button.textContent='＋ Create new tracker';
   ctx.translateActions();
   assert.equal(button.textContent,'＋ '+CORE_UI_TRANSLATIONS[code]['Create new tracker']);
   ctx.language='en';
   ctx.translateActions();
   assert.equal(button.textContent,'＋ Create new tracker');
 }
});

test('all full-site approved strings are eligible for AI fallback; private text is not',()=>{
 assert.ok(UI_PHRASES.length>2000);
 assert.ok(UI_PHRASES.every(x=>x.length<=600));
 for(const code of incoming){
   assert.ok(validateTranslationRequest({locale:code,texts:[UI_PHRASES[0],UI_PHRASES[1]]}));
 }
 assert.match(ui,/new MutationObserver\(schedule\)/);
 assert.match(ui,/addEventListener\('doweo:languagechange',schedule\)/);
});

test('Russian member counts use correct one, few and many plural forms',()=>{
 const from=ui.indexOf(' function translateDynamic(');
 const to=ui.indexOf(' function hideDecorativeDescriptions(',from);
 const sandbox={cache:CORE_UI_TRANSLATIONS.ru,language:'ru',approved:new Set(UI_PHRASES),pending:new Set(),requested:new Set(),retries:new Map(),MAX_ATTEMPTS:4,Intl,Date};
 vm.runInNewContext(ui.slice(from,to)+'\n globalThis.translateForTest=translate;',sandbox);
 for(const [english,expected] of [['1 members','1 участник'],['2 members','2 участника'],['3 members','3 участника'],['5 members','5 участников'],['11 members','11 участников'],['21 members','21 участник'],['22 members','22 участника'],['25 members','25 участников']]){
   assert.equal(sandbox.translateForTest(english),expected,english);
 }
});
