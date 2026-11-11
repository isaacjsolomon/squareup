import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import i18n from '../doweo-i18n.js';

const script=readFileSync(new URL('../doweo-i18n.js',import.meta.url),'utf8');
const localize=readFileSync(new URL('../doweo-localize-ui.js',import.meta.url),'utf8');
test('flag picker includes 20 choices for 19 translation languages and their representative flags',()=>{
 const expected=['🇺🇸','🇪🇸','🇫🇷','🇨🇳','🇧🇷','🇩🇪','🇮🇹','🇯🇵','🇸🇦','🇮🇱','🇮🇳','🇰🇷','🇹🇷','🇷🇺','🇳🇱','🇻🇳','🇸🇪','🇵🇱','🇮🇱','🇧🇩'];
 assert.deepEqual([...i18n.LANGUAGE_CHOICES.map(item=>item.code)].sort(),[...i18n.SUPPORTED].sort());
 assert.deepEqual(i18n.LANGUAGE_CHOICES.map(item=>item.flag),expected);
 assert.equal(new Set(i18n.LANGUAGE_CHOICES.map(item=>item.code)).size,20);
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
 const doc={documentElement:{setAttribute(k,v){this[k]=v},removeAttribute(k){delete this[k]}},querySelectorAll:()=>[],dispatchEvent:()=>{}};
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
 assert.ok(script.includes("native.dir=(option.code==='he'||option.code==='he-script'||option.code==='ar')?'rtl':'auto'"));
 assert.match(script,/aria-hidden','true'/);
});
test('language selector no longer promises upcoming translations',()=>{
 assert.doesNotMatch(script,/More translations are coming soon|Pronto habrá más traducciones/);
});

test('Hebrew and Arabic labels align left visually and retain RTL reading order',()=>{
 assert.match(script,/dw-language-info\{[^}]*direction:ltr;text-align:left;align-items:flex-start/);
 assert.match(script,/dw-language-native\{[^}]*text-align:left;unicode-bidi:isolate/);
 assert.ok(script.includes("native.dir=(option.code==='he'||option.code==='he-script'||option.code==='ar')?'rtl':'auto'"));
 assert.deepEqual(i18n.LANGUAGE_CHOICES.filter(x=>['he','ar'].includes(x.code)).map(x=>x.name),['עברית','العربية']);
});

test('language tile grid is collapsed initially and shows the selected language summary',()=>{
 assert.match(script,/modal\.hidden=true/);
 assert.match(script,/toggle\.setAttribute\('aria-expanded','false'\)/);
 assert.match(script,/toggle\.setAttribute\('aria-controls',modalId\)/);
 assert.match(script,/modal\.hidden=false/);
 assert.match(script,/input\.addEventListener\('change',\(\)=>\{if\(input\.checked\)\{set\(win,input\.value\);dismiss\(\)/);
 assert.match(script,/const choice=LANGUAGE_CHOICES\.find\(option=>option\.code===selected\)/);
 assert.match(script,/name\.textContent=auto\?t\(resolve\(win\),'auto'\):\(choice\?\.name/);
 assert.match(script,/dw-language-picker-flag/);
 assert.match(script,/\.dw-language-modal\[hidden\]\{display:none!important\}/);
});

test('language choices appear in a centered accessible popup with a visible close button',()=>{
 assert.match(script,/modal\.setAttribute\('role','dialog'\)/);
 assert.match(script,/modal\.setAttribute\('aria-modal','true'\)/);
 assert.match(script,/modal\.setAttribute\('aria-labelledby',title\.id\)/);
 assert.match(script,/close\.textContent='×'/);
 assert.match(script,/close\.addEventListener\('click',dismiss\)/);
 assert.match(script,/backdrop\.addEventListener\('click',dismiss\)/);
 assert.match(script,/event\.key==='Escape'/);
 assert.match(script,/modal\.hidden=true/);
 assert.match(script,/modal\.hidden=false/);
 assert.match(script,/doc\.body\.appendChild\(modal\)/);
 assert.match(script,/toggle\.focus\(\)/);
 assert.match(script,/set\(win,input\.value\);dismiss\(\)/);
 assert.match(script,/dw-language-modal-card\{[^}]*max-height:min\(88dvh,820px\)/);
 assert.match(script,/dw-language-modal-scroll\{[^}]*overflow-y:auto/);
});
