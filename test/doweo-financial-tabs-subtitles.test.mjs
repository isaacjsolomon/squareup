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
test('hide decorative page descriptions but not financial or form instructions',()=>{
 assert.match(ui,/function hideDecorativeDescriptions\(\)/);
 assert.match(ui,/h1 \+ p, h2 \+ p, h3 \+ p/);
 assert.match(ui,/\.sqev-toolbar \.sqev-subtitle/);
 assert.match(ui,/closest\('#about-page,form,dialog/);
 assert.match(ui,/password\|permanently\|cannot be undone/);
 assert.match(ui,/if\(!el\.hidden\)/);
 assert.match(ui,/hideDecorativeDescriptions\(\);/);
});
