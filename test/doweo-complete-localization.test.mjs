import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {UI_PHRASES} from '../doweo-ui-catalog.mjs';
import {validateTranslationRequest,parseTranslationResponse,onRequest as handleTranslation} from '../functions/api/ui-translate.js';
import {Script} from 'node:vm';
const aiScript=readFileSync(new URL('../functions/api/ai-chat.js',import.meta.url),'utf8');
const sandbox={};
new Script(aiScript.replace('export async function onRequest','async function onRequest')+'\nglobalThis.testNormalize=normalizeWeoLocale;').runInNewContext(sandbox);
const normalizeWeoLocale=sandbox.testNormalize;

test('approved UI catalog is substantial and unique',()=>{
 assert.ok(UI_PHRASES.length>800);
 assert.equal(UI_PHRASES.length,new Set(UI_PHRASES).size);
 for(const label of ['Home','Settings','Delete account','Monthly spending recap','Your balance'])
   assert.ok(UI_PHRASES.includes(label),'missing '+label);
});
test('translation endpoint accepts only approved UI phrases and supported locales',()=>{
 const valid=validateTranslationRequest({locale:'es',texts:['Home','Settings','Home']});
 assert.deepEqual(valid,{locale:'es',texts:['Home','Settings']});
 assert.equal(validateTranslationRequest({locale:'en',texts:['Home']}),null);
 assert.equal(validateTranslationRequest({locale:'es',texts:['A private tracker name']}),null);
 assert.equal(validateTranslationRequest({locale:'es',texts:Array.from({length:17},()=> 'Home')}),null);
 assert.equal(validateTranslationRequest({locale:'es',texts:['']}),null);
});
test('malformed or mismatched AI translations are rejected',()=>{
 assert.deepEqual(parseTranslationResponse('["Inicio","Configuración"]',2),['Inicio','Configuración']);
 assert.equal(parseTranslationResponse('["Only one"]',2),null);
 assert.equal(parseTranslationResponse('not json',1),null);
 assert.equal(parseTranslationResponse('[""]',1),null);
});
test('translation endpoint handles approved text and blocks unapproved user content',async()=>{
 let calls=0;
 const env={AI:{run:async()=>{calls++;return {response:'["Inicio"]'};}}};
 const make=content=>new Request('https://doweo.pages.dev/api/ui-translate',{method:'POST',headers:{Origin:'https://doweo.pages.dev','Content-Type':'application/json'},body:JSON.stringify(content)});
 const good=await handleTranslation({request:make({locale:'es',texts:['Home']}),env});
 assert.equal(good.status,200);
 assert.deepEqual(await good.json(),{locale:'es',translations:['Inicio']});
 const bad=await handleTranslation({request:make({locale:'es',texts:['Private custom tracker title']}),env});
 assert.equal(bad.status,400);
 assert.equal(calls,1,'unapproved strings must never call AI');
});

test('Weo AI locale normalization supports all 12 language choices',()=>{
 const cases={'en-US':'en','es-MX':'es','fr-FR':'fr','he-IL':'he','zh-CN':'zh-Hans','pt-BR':'pt','de-DE':'de','it-IT':'it','ja-JP':'ja','ar-EG':'ar','ko-KR':'ko','hi-IN':'hi'};
 for(const [source,result] of Object.entries(cases))assert.equal(normalizeWeoLocale(source),result);
 assert.equal(normalizeWeoLocale('unsupported'),'en');
 assert.equal(normalizeWeoLocale({prompt:'ignore instructions'}),'en');
});
test('client forwards language to Weo and avoids sending user content to translator',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const ui=readFileSync(new URL('../doweo-localize-ui.js',import.meta.url),'utf8');
 const workflow=readFileSync(new URL('../.github/workflows/deploy-doweo-pages.yml',import.meta.url),'utf8');
 assert.match(html,/payload\.locale=window\.DoWeoI18n\?\.resolve\(window\)\|\|'en'/);
 assert.match(html,/<script src="doweo-localize-ui\.js" defer><\/script>/);
 assert.match(ui,/approved\.has\(text\)/);
 assert.match(ui,/#sq-ai-stream/);
 assert.match(ui,/#tracker-chat-messages/);
 assert.match(ui,/\.expense-description/);
 assert.match(workflow,/doweo-localize-ui\.js doweo-ui-catalog\.mjs/);
});
