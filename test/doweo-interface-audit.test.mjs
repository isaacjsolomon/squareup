import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {UI_PHRASES} from '../doweo-ui-catalog.mjs';

const code=readFileSync(new URL('../doweo-localize-ui.js',import.meta.url),'utf8');
const match=code.match(/const screenshotSpanish=(\{.*?\});\n function seedStaticTranslations/s);
assert.ok(match,'curated translations exist');
const es=JSON.parse(match[1]);
const approved=new Set(UI_PHRASES);

test('all curated phrases are approved for the static UI translator',()=>{
 for(const phrase of Object.keys(es))assert.ok(approved.has(phrase),'missing UI catalog: '+phrase);
});

test('decorative prefixes, counts, metadata, calendar labels and safe dynamic text',()=>{
 const start=code.indexOf(' function translateDynamic(');
 const end=code.indexOf(' function render(){',start);
 assert.ok(end>start);
 const sandbox={
   cache:es,approved,language:'es',pending:new Set(),requested:new Set(),retries:new Map(),
   MAX_ATTEMPTS:4,Intl,Date,i18n:{formatDate:(_root,date,options)=>new Intl.DateTimeFormat('es-ES',options).format(date)},root:{}
 };
 vm.runInNewContext(code.slice(start,end)+'\n globalThis.test={translate,eligible,approvedKey};',sandbox);
 const {translate,eligible}=sandbox.test;
 assert.equal(translate('☆ Favorite'),'☆ Favorito');
 assert.equal(translate('+ New event'),'+ Nuevo evento');
 assert.equal(translate('← Home'),'← Inicio');
 assert.equal(translate('1 members'),'1 miembro');
 assert.equal(translate('2 members'),'2 miembros');
 assert.equal(translate('November 2026'),'noviembre de 2026');
 assert.equal(translate('Archived trackers (0)'),'Grupos archivados (0)');
 assert.equal(translate('Isaac owes Sasha $7.00'),'Isaac debe Sasha $7.00');
 assert.equal(translate('Boba · 11/7/2026 · added by Isaac · confirmed'),'Boba · 11/7/2026 · añadido por Isaac · confirmado');
 assert.equal(translate('monthly · Next due 2026-11-23 · Automatic'),'mensual · Próximo vencimiento 2026-11-23 · Automático');
 assert.equal(eligible('User-written private tracker name'),false);
 assert.equal(translate('User-written private tracker name'),'User-written private tracker name');
});

test('reported static text across the app has immediate Spanish translations',()=>{
 const screens={
   expenses:['Expenses and payments in this tracker','Status','Details','Delete','Food & Dining','Scan receipt'],
   trackers:['Favorite','Open tracker →','Create new tracker','Archived trackers'],
   bills:['Subscriptions','Billing calendar','Next due','Automatic','Remove'],
   finance:['Personal Finance Hub','Smart Insights','Settlement overview','Recent personal activity'],
   settings:['Account Settings','Notification preferences','Change password','Delete account'],
   social:['Tracker group chat','Shared wishlist','Group polls'],
   feedback:['Help improve DoWeo','Subject','Send feedback']
 };
 for(const [screen,phrases] of Object.entries(screens))
   for(const phrase of phrases)assert.ok(es[phrase]&&approved.has(phrase),screen+': '+phrase);
});

test('sidebar labels and personalized greeting translate while preserving the name',()=>{
 const start=code.indexOf(' function translateDynamic(');
 const end=code.indexOf(' function render(){',start);
 const customApproved=new Set(UI_PHRASES);
 const sandbox={cache:{'Hi,':'Hola,','Finance Hub':'Centro financiero','Beta Feedback':'Comentarios de la beta',owes:'debe','Archived trackers':'Grupos archivados'},approved:customApproved,language:'es',pending:new Set(),requested:new Set(),retries:new Map(),MAX_ATTEMPTS:4,Intl,Date,i18n:{formatDate:(_root,date,options)=>new Intl.DateTimeFormat('es-ES',options).format(date)},root:{}};
 vm.runInNewContext(code.slice(start,end)+'\n globalThis.test={translate,eligible};',sandbox);
 const {translate,eligible}=sandbox.test;
 assert.equal(translate('Hi, Isaac Solomon'),'Hola, Isaac Solomon');
 assert.equal(translate('Finance Hub'),'Centro financiero');
 assert.equal(translate('✦ Beta Feedback'),'✦ Comentarios de la beta');
 assert.equal(translate('Archived trackers (0)'),'Grupos archivados (0)');
 assert.equal(translate('Sasha owes Isaac $21.24'),'Sasha debe Isaac $21.24');
 assert.equal(eligible('Hi, Isaac Solomon'),false);
});
