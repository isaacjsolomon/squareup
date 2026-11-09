import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {UI_PHRASES} from '../doweo-ui-catalog.mjs';
import {validateTranslationRequest} from '../functions/api/ui-translate.js';

const code=readFileSync(new URL('../doweo-localize-ui.js',import.meta.url),'utf8');
const match=code.match(/const screenshotSpanish=(\{.*?\});\n function seedStaticTranslations/s);
assert.ok(match);
const es=JSON.parse(match[1]);

test('About page retains all descriptions and its static interface is localized',()=>{
 assert.match(code,/querySelectorAll\('#about-page \[data-dw-decorative-description\]'\)/);
 assert.match(code,/closest\('#about-page,form,dialog/);
 for(const phrase of [
   'DoWeo makes it easy to track shared expenses, split bills, and settle up with friends. No awkward conversations, no spreadsheets — just a simple way to stay even.',
   'Keep all your shared expenses in one place.',
   'DoWeo started as an idea to make it easier for friends to track and settle shared expenses. Here’s how the website came together.',
   'The first working version of DoWeo was created with Netlify’s AI website builder.',
   'DoWeo was built to make managing shared money effortless, so you can focus on what actually matters — your friends, experiences, and memories.'
 ])assert.ok(es[phrase]&&UI_PHRASES.includes(phrase),'Missing public About translation: '+phrase);
});

test('Weo and group chat controls have translations without touching conversation text',()=>{
 for(const phrase of ['History','New chat','Your chats','Private conversations saved to your account','Add attachment','Connect group poll','Connect expense','Search messages...','P i n n e d'.replace(/ /g,''),'Social','Chat']){
   assert.ok(es[phrase]&&UI_PHRASES.includes(phrase),'missing '+phrase);
 }
 assert.equal(es.Social,'Comunidad');
 assert.equal(es.Chat,'Mensajes');
 assert.match(code,/#sq-ai-stream/);
 assert.match(code,/#tracker-chat-messages/);
});

test('complete tutorial step texts are translatable and approved',()=>{
 for(const phrase of [
  'Welcome to DoWeo','Home and balances','Trackers and invitations','Currency converter and favorites','You’re ready!',
  'DoWeo brings shared expense tracking and personal finance tools together. This guide explains the main pages and how to use them.',
  'Finance Hub → Currencies converts amounts using the latest available exchange rates. Codes are shown with currency names; tap a star to favorite a currency and move it to the top of the selectors. Favorites are saved on this device. Conversions are estimates and do not change balances.'
 ])assert.ok(es[phrase]&&UI_PHRASES.includes(phrase),'missing tutorial string '+phrase);
 assert.ok(validateTranslationRequest({locale:'es',texts:[
  'Finance Hub → Currencies converts amounts using the latest available exchange rates. Codes are shown with currency names; tap a star to favorite a currency and move it to the top of the selectors. Favorites are saved on this device. Conversions are estimates and do not change balances.'
 ]}));
});

test('runtime localizes icon-prefixed chat actions and tutorial progression',()=>{
 const start=code.indexOf(' function translateDynamic(');
 const end=code.indexOf(' function hideDecorativeDescriptions(',start);
 assert.ok(start>0&&end>start);
 const sandbox={cache:es,approved:new Set(UI_PHRASES),language:'es',pending:new Set(),requested:new Set(),retries:new Map(),MAX_ATTEMPTS:4,Intl,Date};
 vm.runInNewContext(code.slice(start,end)+'\n globalThis.test={translate,eligible};',sandbox);
 const {translate,eligible}=sandbox.test;
 assert.equal(translate('📎 Add attachment'),'📎 Añadir archivo adjunto');
 assert.equal(translate('▤ Connect group poll'),'▤ Vincular encuesta del grupo');
 assert.equal(translate('▣ Connect expense'),'▣ Vincular gasto');
 assert.equal(translate('DOWEO GUIDE · 2 OF 14'),'GUÍA DE DOWEO · 2 DE 14');
 assert.equal(translate('History'),'Historial');
 assert.equal(translate('New chat'),'Nuevo chat');
 assert.equal(translate('Private personal chat message'),'Private personal chat message');
 assert.equal(eligible('Private personal chat message'),false);
});
