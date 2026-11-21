import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {UI_PHRASES} from '../doweo-ui-catalog.mjs';
import {CORE_UI_TRANSLATIONS, CORE_UI_SOURCE_KEYS} from '../doweo-core-locales.mjs';
import {validateTranslationRequest} from '../functions/api/ui-translate.js';
import I18n from '../doweo-i18n.js';

const source=readFileSync(new URL('../doweo-localize-ui.js',import.meta.url),'utf8');
const match=source.match(/const screenshotSpanish=(\{.*?\});\n function seedStaticTranslations/s);
assert.ok(match,'Spanish offline dictionary is available');
const spanish=JSON.parse(match[1]);
const coreCodes=I18n.SUPPORTED.filter(code=>!['en','es','he-script'].includes(code));
const mustTranslate=[
  'Privacy and Terms','Privacy Policy','Terms of Service',
  '← Back','Back','Back to More','No households linked yet',
  'See all','All your DoWeo tools in one place.',
  'YOUR DOWEO SPACES','Your tracker balance'
];
const dynamicPhrases=[
  'Your trips','Your households','No trips linked yet','No households linked yet',
  'Open a trip to see its plans, spending categories, and linked tracker. You can manage more than one.',
  'Open a household to see its plans, spending categories, and linked tracker. You can manage more than one.',
  'If you already have a trip tracker, choose Link existing tracker above. Otherwise, create your first trip here.',
  'If you already have a household tracker, choose Link existing tracker above. Otherwise, create your first household here.',
  'Each space uses an existing DoWeo tracker. Opening a tracker here does not change the balances or expenses in other trackers.',
  'Name your new trip','Name your new household',
  'Choose the existing tracker you want to use for this trip',
  'Choose the existing tracker you want to use for this household'
];

test('new mobile More labels are reviewed and available without network calls in every locale',()=>{
  for(const key of mustTranslate){
    assert.ok(UI_PHRASES.includes(key),'not approved: '+key);
    assert.ok(CORE_UI_SOURCE_KEYS.includes(key),'not bundled offline: '+key);
    assert.ok(spanish[key]&&spanish[key]!==key,'Spanish missing '+key);
    for(const code of coreCodes){
      const value=CORE_UI_TRANSLATIONS[code]?.[key];
      assert.ok(typeof value==='string'&&value.trim(),code+' missing '+key);
      assert.notEqual(value,key,code+' still uses English: '+key);
    }
  }
});

test('every new Trip/Household instructional sentence is approved but private tracker names are not',()=>{
  for(const key of dynamicPhrases)assert.ok(UI_PHRASES.includes(key),'not approved: '+key);
  for(const key of ['Privacy and Terms','No households linked yet',dynamicPhrases[4]]){
    const validated=validateTranslationRequest({locale:'fr',texts:[key]});
    assert.ok(validated?.texts?.includes(key),'safe interface text rejected: '+key);
  }
  assert.equal(validateTranslationRequest({locale:'fr',texts:['Alex and Jordan private trip']}),null,
    'never send user data to translation service');
  for(const key of dynamicPhrases)assert.ok(spanish[key],'Spanish offline translation missing for '+key);
});

test('Hebrew Script inherits Hebrew curated labels while English stays reversible',()=>{
  assert.match(source,/language==='he-script'\?'he':language/);
  const start=source.indexOf(' function seedStaticTranslations(){');
  const end=source.indexOf(' function scan(){',start);
  const script=source.slice(start,end)+'\n globalThis.seed=seedStaticTranslations;';
  const cache={};
  const env={
    language:'he-script',cache,
    coreTranslations:CORE_UI_TRANSLATIONS,
    approved:new Set(UI_PHRASES),
    root:{DoWeoTranslations:{languages:{en:[]}}},
    screenshotSpanish:spanish
  };
  runInNewContext(script,env);
  env.seed();
  for(const key of ['Privacy and Terms','Back to More','No households linked yet'])
    assert.equal(cache[key],CORE_UI_TRANSLATIONS.he[key]);
});
