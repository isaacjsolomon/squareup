import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import i18n from '../doweo-i18n.js';

const script=readFileSync(new URL('../doweo-i18n.js',import.meta.url),'utf8');
const localize=readFileSync(new URL('../doweo-localize-ui.js',import.meta.url),'utf8');
test('flag picker includes all 12 supported languages and their representative flags',()=>{
 const expected=['🇺🇸','🇪🇸','🇫🇷','🇮🇱','🇨🇳','🇧🇷','🇩🇪','🇮🇹','🇯🇵','🇸🇦','🇰🇷','🇮🇳'];
 assert.deepEqual(i18n.LANGUAGE_CHOICES.map(item=>item.code),i18n.SUPPORTED);
 assert.deepEqual(i18n.LANGUAGE_CHOICES.map(item=>item.flag),expected);
 assert.equal(new Set(i18n.LANGUAGE_CHOICES.map(item=>item.code)).size,12);
 assert.ok(i18n.LANGUAGE_CHOICES.every(item=>item.name&&item.subtitle));
});
test('the flag grid replaces visual dropdown but retains settings and onboarding compatibility',()=>{
 assert.match(script,/createLanguageGrid\(win,el\)/);
 assert.match(script,/data-dw-language-grid/);
 assert.match(script,/dw-language-grid-mode \[data-dw-language-select\]\{display:none!important\}/);
 assert.match(script,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(script,/input\.type='radio'/);
 assert.match(script,/set\(win,input\.value\)/);
 assert.match(script,/input\.checked=input\.value===selected/);
 assert.match(script,/code:'auto'/);
 assert.match(script,/input\.setAttribute\('aria-label'/);
});
test('selected-language detection and instant override remain intact',()=>{
 const storage=new Map();
 const doc={documentElement:{},querySelectorAll:()=>[],dispatchEvent:()=>{}};
 const win={document:doc,navigator:{languages:['es-ES']},Event:class{},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)}};
 assert.equal(i18n.resolve(win),'es');
 assert.equal(i18n.set(win,'ja'),'ja');
 assert.equal(storage.get(i18n.KEY),'ja');
 assert.equal(i18n.set(win,'auto'),'es');
 assert.equal(storage.get(i18n.KEY),'auto');
});
test('language names stay native even when a page is translated',()=>{
 assert.match(localize,/\[data-dw-language-select\],\[data-dw-language-grid\]/);
 assert.match(script,/data-dw-language-grid/);
 assert.match(script,/native\.dir='auto'/);
 assert.match(script,/aria-hidden','true'/);
});
test('language selector no longer promises upcoming translations',()=>{
 assert.doesNotMatch(script,/More translations are coming soon|Pronto habrá más traducciones/);
});

test('Hebrew and Arabic labels align left visually and retain RTL reading order',()=>{
 assert.match(script,/dw-language-info\{[^}]*direction:ltr;text-align:left;align-items:flex-start/);
 assert.match(script,/dw-language-native\{[^}]*text-align:left;unicode-bidi:isolate/);
 assert.match(script,/native\.dir=\(option\.code==='he'\|\|option\.code==='ar'\)\?'rtl':'auto'/);
 assert.deepEqual(i18n.LANGUAGE_CHOICES.filter(x=>['he','ar'].includes(x.code)).map(x=>x.name),['עברית','العربية']);
});
