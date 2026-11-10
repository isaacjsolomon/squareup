import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require=createRequire(import.meta.url);
const i18n=require('../doweo-i18n.js');

function fakeWindow(initial='auto',navigatorLanguage='en-US'){
  const attrs=new Map();
  const store=new Map([[i18n.KEY,initial]]);
  const doc={
    documentElement:{
      lang:'en',
      setAttribute(key,value){attrs.set(key,value);},
      removeAttribute(key){attrs.delete(key);},
      getAttribute(key){return attrs.get(key)??null;}
    },
    querySelectorAll(){return [];},
    dispatchEvent(){}
  };
  const win={
    document:doc,
    navigator:{languages:[navigatorLanguage]},
    localStorage:{
      getItem(key){return store.get(key)??null;},
      setItem(key,value){store.set(key,value);}
    },
    Event:class Event{constructor(type){this.type=type;}}
  };
  return win;
}

test('Hebrew font choices are both present in language picker',()=>{
  assert.equal(i18n.SUPPORTED.includes('he-script'),true);
  assert.equal(i18n.LANGUAGE_CHOICES.filter(x=>x.code==='he').length,1);
  assert.equal(i18n.LANGUAGE_CHOICES.filter(x=>x.code==='he-script').length,1);
  assert.equal(i18n.normalize('he-script'),'he-script');
  assert.equal(i18n.normalize('he-IL'),'he');
  assert.equal(i18n.detect(['he-IL']),'he');
});
test('script preference uses Hebrew translations but script typography',()=>{
  const win=fakeWindow();
  i18n.set(win,'he-script');
  assert.equal(i18n.read(win),'he-script');
  assert.equal(i18n.resolve(win),'he');
  assert.equal(win.document.documentElement.lang,'he');
  assert.equal(win.document.documentElement.getAttribute('data-dw-hebrew-font'),'script');
  i18n.set(win,'he');
  assert.equal(i18n.resolve(win),'he');
  assert.equal(win.document.documentElement.getAttribute('data-dw-hebrew-font'),'rubik');
});
test('switching away removes Hebrew-only typography',()=>{
  const win=fakeWindow('he-script');
  i18n.apply(win);
  i18n.set(win,'fr');
  assert.equal(i18n.resolve(win),'fr');
  assert.equal(win.document.documentElement.getAttribute('data-dw-hebrew-font'),null);
});
test('automatic Hebrew detection defaults to Rubik',()=>{
  const win=fakeWindow('auto','he-IL');
  i18n.apply(win);
  assert.equal(i18n.resolve(win),'he');
  assert.equal(win.document.documentElement.getAttribute('data-dw-hebrew-font'),'rubik');
});
