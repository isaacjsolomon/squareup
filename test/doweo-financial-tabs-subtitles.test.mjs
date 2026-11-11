import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {UI_PHRASES} from '../doweo-ui-catalog.mjs';
const ui=readFileSync(new URL('../doweo-localize-ui.js',import.meta.url),'utf8');
const match=ui.match(/const screenshotSpanish=(\{.*?\});\n function seedStaticTranslations/s);
assert.ok(match);
const spanish=JSON.parse(match[1]);
test('Financial Hub tabs translate into Spanish',()=>{
 for(const [english,expected] of Object.entries({Personal:'Personal',Wallet:'Cartera',Trips:'Viajes',Household:'Hogar',Bills:'Facturas',Currencies:'Divisas',Insights:'Análisis'})){
  assert.equal(spanish[english],expected);
  assert.ok(UI_PHRASES.includes(english));
 }
});
test('create-new buttons have approved Spanish fallback labels',()=>{
 for(const english of ['Create new tracker','Create new household','Create new trip','Create new event','New event']){
  assert.ok(UI_PHRASES.includes(english));
  assert.ok(spanish[english]&&spanish[english]!==english);
 }
});
test('descriptive captions remain visible and are prioritized for translation',()=>{
 // Untranslated captions must remain visible until their translation arrives.
 assert.doesNotMatch(ui,/function hideDecorativeDescriptions\(\)/);
 assert.match(ui,/function isFeatureCaption\(el\)/);
 assert.match(ui,/function queueCaptions\(\)/);
 assert.match(ui,/queueCaptions\(\);/);
 assert.match(ui,/for\(const source of \[captionPending,pending\]\)/);
 assert.match(ui,/while\(running<1&&\(pending.size\|\|captionPending.size\)\)/);
 assert.match(ui,/\[data-user-content\],#tracker-chat-messages,\[contenteditable\]/);
});
