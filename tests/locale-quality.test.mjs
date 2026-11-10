import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';

const require=createRequire(import.meta.url);
const i18n=require('../doweo-i18n.js');

function fakeWindow(initial='en',navigatorLanguage='en-US'){
  const storage=new Map([[i18n.KEY,initial]]);
  const events={};
  const attrs=new Map();
  const win={
    navigator:{languages:[navigatorLanguage]},
    localStorage:{getItem(k){return storage.get(k)||null;},setItem(k,v){storage.set(k,v);}},
    Event:class Event{constructor(type){this.type=type;}},
    document:{
      documentElement:{lang:'en',setAttribute(k,v){attrs.set(k,v);},removeAttribute(k){attrs.delete(k);},getAttribute(k){return attrs.get(k)||null;}},
      querySelectorAll(){return [];},dispatchEvent(){}
    },
    addEventListener(type,callback){events[type]=callback;},
    _emitStorage(){events.storage?.({key:i18n.KEY});}
  };
  return win;
}

test('display formatters respect selected language without mutating amounts',()=>{
  const win=fakeWindow('fr');
  const amount=1234.5;
  assert.equal(i18n.formatNumber(win,amount,{minimumFractionDigits:2,maximumFractionDigits:2}),new Intl.NumberFormat('fr',{minimumFractionDigits:2,maximumFractionDigits:2}).format(amount));
  assert.equal(i18n.formatCurrency(win,amount,'USD'),new Intl.NumberFormat('fr',{style:'currency',currency:'USD'}).format(amount));
  assert.equal(amount,1234.5);
  const date=new Date(Date.UTC(2026,10,10,12));
  assert.equal(i18n.formatDate(win,date,{month:'long',year:'numeric',timeZone:'UTC'}),new Intl.DateTimeFormat('fr',{month:'long',year:'numeric',timeZone:'UTC'}).format(date));
});

test('currency formatting does not infer or convert currency from language',()=>{
  const win=fakeWindow('ja');
  const number=42.75;
  assert.equal(i18n.formatCurrency(win,number,'USD'),new Intl.NumberFormat('ja',{style:'currency',currency:'USD'}).format(number));
  assert.throws(()=>i18n.formatCurrency(win,number,'not-a-currency'),RangeError);
  assert.throws(()=>i18n.formatDate(win,'invalid date'),RangeError);
});

test('Hebrew Script uses Hebrew locale for dates and numbers',()=>{
  const win=fakeWindow('he-script');
  assert.equal(i18n.resolve(win),'he');
  assert.equal(i18n.formatNumber(win,1234.5),new Intl.NumberFormat('he').format(1234.5));
});

test('report translation control has local-language labels for all supported locales',()=>{
  for(const code of i18n.SUPPORTED){
    if(code==='he-script')continue;
    const label=i18n.reportTranslationLabel(code);
    assert.ok(typeof label==='string'&&label.trim(),code);
    if(code!=='en')assert.notEqual(label,i18n.reportTranslationLabel('en'),code);
  }
});

test('caption queue sends prioritized captions even when regular queue is empty',()=>{
  const source=readFileSync(new URL('../doweo-localize-ui.js',import.meta.url),'utf8');
  assert.ok(source.includes('while(running<1&&(pending.size||captionPending.size))'));
  assert.ok(source.includes('for(const source of [captionPending,pending])'));
});

test('language preference sync only reacts to language storage key',()=>{
  const source=readFileSync(new URL('../doweo-i18n.js',import.meta.url),'utf8');
  assert.ok(source.includes("win.addEventListener('storage',event=>"));
  assert.ok(source.includes('if(event.key===KEY)apply(win)'));
  assert.ok(source.includes('dw-language-feedback-link'));
  assert.ok(source.includes('mailto:help.doweo@gmail.com'));
});

test('first-of-month UTC dates stay in the intended month',()=>{
 const win=fakeWindow('fr');
 const start=new Date(Date.UTC(2026,10,1));
 const month=i18n.formatDate(win,start,{month:'long',year:'numeric',timeZone:'UTC'});
 assert.match(month,/novembre 2026/);
 const source=readFileSync(new URL('../doweo-localize-ui.js',import.meta.url),'utf8');
 assert.ok(source.includes("timeZone:'UTC'"));
});
test('translation cache saving captures the locale before debounce',()=>{
 const source=readFileSync(new URL('../doweo-localize-ui.js',import.meta.url),'utf8');
 assert.ok(source.includes('const forLocale=language, snapshot={...cache}'));
 assert.ok(source.includes('storageKey(forLocale)'));
});
