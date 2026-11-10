import test from 'node:test';
import assert from 'node:assert/strict';
import i18n from '../doweo-i18n.js';

test('all nineteen languages supported',()=>assert.equal(i18n.SUPPORTED.length,19));
test('browser locale normalization and fallback',()=>{
  assert.equal(i18n.normalize('zh-CN'),'zh-Hans');
  assert.equal(i18n.normalize('he-IL'),'he');
  assert.equal(i18n.normalize('pt-BR'),'pt');
  assert.equal(i18n.normalize('iw-IL'),'he');
  for(const [tag,locale] of Object.entries({'ru-RU':'ru','tr-TR':'tr','vi-VN':'vi','nl-BE':'nl','pl-PL':'pl','sv-SE':'sv','bn-BD':'bn'}))assert.equal(i18n.normalize(tag),locale);
  assert.equal(i18n.normalize('xx-XX'),null);
  assert.equal(i18n.detect(['xx-XX','ar-EG','en-US']),'ar');
  assert.equal(i18n.detect(['xx-XX']),'en');
});
function windowMock(browser,stored=null){
  let preference=stored;
  const attrs={};
  const doc={documentElement:attrs,querySelectorAll:()=>[],dispatchEvent:()=>{},readyState:'complete'};
  return {navigator:{languages:browser},document:doc,Event:class{},localStorage:{
    getItem:()=>preference,setItem:(k,v)=>{assert.equal(k,i18n.KEY);preference=v;}
  }};
}
test('automatic selection, override, and reset',()=>{
  const win=windowMock(['fr-CA','en-US']);
  assert.equal(i18n.resolve(win),'fr');
  assert.equal(i18n.set(win,'ja'),'ja');
  assert.equal(i18n.resolve(win),'ja');
  assert.equal(win.document.documentElement.lang,'ja');
  assert.equal(i18n.set(win,'auto'),'fr');
  assert.throws(()=>i18n.set(win,'unsupported'),RangeError);
});
test('missing translation falls back to English',()=>{
  assert.equal(i18n.t('ja','language'),'Language');
  assert.equal(i18n.t('es','language'),'Idioma');
});
test('storage unavailable still detects browser locale',()=>{
  const win=windowMock(['ko-KR']);
  win.localStorage.getItem=()=>{throw Error('blocked');};
  win.localStorage.setItem=()=>{throw Error('blocked');};
  assert.equal(i18n.resolve(win),'ko');
  assert.equal(i18n.set(win,'ko'),'ko');
});

test('new language selection survives refresh and switches to English',()=>{
 const win=windowMock(['bn-BD']);
 for(const code of ['ru','tr','vi','nl','pl','sv','bn']){
  assert.equal(i18n.set(win,code),code);
  assert.equal(i18n.resolve(win),code);
 }
 assert.equal(i18n.set(win,'en'),'en');
 assert.equal(i18n.set(win,'auto'),'bn');
});
