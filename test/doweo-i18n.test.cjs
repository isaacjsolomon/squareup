const test=require('node:test');
const assert=require('node:assert/strict');
const i18n=require('../doweo-i18n.js');
test('supports 12 distinct requested languages',()=>{
 assert.equal(i18n.LOCALES.length,12);
 assert.equal(new Set(i18n.LOCALES.map(x=>x[0])).size,12);
});
test('detects browser language and regional variants',()=>{
 assert.equal(i18n.detect(['es-MX','en-US']),'es');
 assert.equal(i18n.detect(['zh-CN']),'zh-Hans');
 assert.equal(i18n.detect(['fr-CA']),'fr');
 assert.equal(i18n.detect(['xx-XX','he-IL']),'he');
 assert.equal(i18n.detect(['xx-XX']),'en');
});
test('explicit preference overrides browser, invalid value falls back',()=>{
 const store={getItem:()=> 'ja'};
 assert.equal(i18n.choose(store,['es-ES']),'ja');
 assert.equal(i18n.choose({getItem:()=> 'unknown'},['es-ES']),'es');
 assert.equal(i18n.choose({getItem(){throw Error('blocked')}},['fr-FR']),'fr');
});
test('hebrew and arabic are right-to-left',()=>{
 assert.equal(i18n.direction('he-IL'),'rtl');
 assert.equal(i18n.direction('ar'),'rtl');
 assert.equal(i18n.direction('en'),'ltr');
});
test('translations use English fallback for not-yet-translated keys',()=>{
 assert.match(i18n.translate('es','welcome'),/Bienvenido/);
 assert.equal(i18n.translate('ja','languageHint'),i18n.translate('en','languageHint'));
 assert.equal(i18n.translate('xx','settings'),i18n.translate('en','settings'));
});
