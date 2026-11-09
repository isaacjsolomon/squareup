import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {UI_PHRASES} from '../doweo-ui-catalog.mjs';
const source=readFileSync(new URL('../doweo-localize-ui.js',import.meta.url),'utf8');
const dictionaryMatch=source.match(/const screenshotSpanish=(\{.*?\});\n function seedStaticTranslations/s);
assert.ok(dictionaryMatch,'Spanish fallback dictionary exists');
const spanish=JSON.parse(dictionaryMatch[1]);

test('Spanish screenshot phrases are approved and have translations',()=>{
 for(const item of ['Events','Total events','Tracker members','People sharing this tracker','Billing calendar','Subscriptions & Bills','Current balances','Smart settle-up','Open tracker →','Search expenses...','Financial Hub','Recent Activity']){
  assert.ok(UI_PHRASES.includes(item),item+' not in approved catalog');
  assert.ok(spanish[item],item+' has no Spanish fallback');
 }
});
test('runtime translator handles dynamic labels without changing user names or amounts',()=>{
 const start=source.indexOf(' function translateDynamic(');
 const end=source.indexOf(' function render(){',start);
 assert.ok(start>0&&end>start);
 const names=new Set(['members','Welcome back','Archived trackers','owes','Settings','Last activity','saved']);
 const context={approved:names,cache:{members:'miembros','Welcome back':'Bienvenido de nuevo','Archived trackers':'Grupos archivados',owes:'debe',Settings:'Configuración','Last activity':'Última actividad',saved:'guardados'},language:'es',pending:new Set(),requested:new Set(),retries:new Map(),MAX_ATTEMPTS:4};
 vm.runInNewContext(source.slice(start,end)+';globalThis.test={translate,eligible,approvedKey};',context);
 const {translate,eligible,approvedKey}=context.test;
 assert.equal(translate('2 members'),'2 miembros');
 assert.equal(translate('Welcome back, Isaac'),'Bienvenido de nuevo, Isaac');
 assert.equal(translate('Archived trackers (0)'),'Grupos archivados (0)');
 assert.equal(translate('Sasha owes Isaac $21.24'),'Sasha debe Isaac $21.24');
 assert.equal(translate('Last activity · 11/7/2026'),'Última actividad · 11/7/2026');
 assert.equal(translate('Settings:'),'Configuración:');
 assert.equal(approvedKey('   Settings  '),'Settings');
 assert.equal(eligible('Private custom tracker name'),false);
 assert.equal(translate('Private custom tracker name'),'Private custom tracker name');
});
test('other languages still use approved text and preserve private fields',()=>{
 assert.match(source,/approved\.has\(text\)|approvedKey\(text\)/);
 assert.match(source,/#tracker-chat-messages/);
 assert.match(source,/\.expense-description/);
 assert.match(source,/SEND_INTERVAL=3100/);
 assert.match(source,/MAX_ATTEMPTS=4/);
 assert.match(source,/input\[type="submit"\]/);
});
