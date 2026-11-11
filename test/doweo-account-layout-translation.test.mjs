import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {UI_PHRASES} from '../doweo-ui-catalog.mjs';
const ui=readFileSync(new URL('../doweo-localize-ui.js',import.meta.url),'utf8');
const picker=readFileSync(new URL('../doweo-i18n.js',import.meta.url),'utf8');
const es=JSON.parse(ui.match(/const screenshotSpanish=(\{.*?\});\n function seedStaticTranslations/s)[1]);
const approved=new Set(UI_PHRASES);
function translator(){
 const start=ui.indexOf(' function translateDynamic(');
 const end=ui.indexOf(' const actionLocales=',start);
 const ctx={cache:es,approved,language:'es',pending:new Set(),requested:new Set(),retries:new Map(),MAX_ATTEMPTS:4,Intl,Date,i18n:{formatDate(_win,date,options){return new Intl.DateTimeFormat('es',options).format(date);}},root:{}};
 vm.runInNewContext(ui.slice(start,end)+'\n globalThis.helpers={translate,eligible};',ctx);
 return ctx.helpers;
}
test('fullwidth + create buttons translate and retain the icon',()=>{
 const {translate,eligible}=translator();
 for(const [english,spanish] of [
  ['＋ Create new tracker','＋ Crear nuevo grupo'],
  ['＋ Create new trip','＋ Crear nuevo viaje'],
  ['＋ Create new household','＋ Crear nuevo hogar'],
  ['+ Create new tracker','+ Crear nuevo grupo']
 ]){
  assert.equal(eligible(english),true,english+' should be scanned');
  assert.equal(translate(english),spanish);
 }
});
test('account deletion warning is translated without softening its consequences',()=>{
 const english='Permanently delete your DoWeo account, profile, payment usernames, profile photo, and your saved tracker data. Trackers you own will also be deleted for their members. This cannot be undone.';
 assert.ok(approved.has(english));
 const translated=translator().translate(english);
 assert.match(translated,/permanentemente/);
 assert.match(translated,/también se eliminarán/);
 assert.match(translated,/no se puede deshacer/);
});
test('account settings places equal height cards above a full width language grid',()=>{
 assert.match(picker,/html body #settings-content-account > \.settings-tab-grid/);
 assert.match(picker,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)!important/);
 assert.match(picker,/div:first-child\{[\s\S]*?grid-column:1!important;grid-row:1!important;display:flex/);
 assert.match(picker,/div:nth-child\(3\)\{[\s\S]*?grid-column:2!important;grid-row:1!important;display:flex/);
 assert.match(picker,/div:nth-child\(2\)\{[\s\S]*?grid-column:1 \/ -1!important;grid-row:2!important/);
 assert.match(picker,/flex:1 1 auto;box-sizing:border-box/);
 assert.match(picker,/\.dw-language-modal \.dw-language-grid\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)!important\}/);
 assert.match(picker,/@media\(max-width:780px\)/);
});
