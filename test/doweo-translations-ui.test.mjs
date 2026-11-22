import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../styles.css',import.meta.url),'utf8');
const script=fs.readFileSync(new URL('../doweo-translations.js',import.meta.url),'utf8');
const dep=fs.readFileSync(new URL('../.github/workflows/deploy-doweo-pages.yml',import.meta.url),'utf8');
test('Account tab uses two-column responsive layout and no three-column override',()=>{
  assert.match(css,/#settings-content-account > \.settings-tab-grid\{[\s\S]*?grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css,/#settings-content-account > \.settings-tab-grid > div:nth-child\(2\)\{[\s\S]*?grid-column:1/);
  assert.match(css,/#settings-content-account > \.settings-tab-grid > div:nth-child\(3\)\{[\s\S]*?grid-column:2/);
});
test('translation assets ship to Cloudflare',()=>{
  assert.match(html,/<script src="doweo-translations\.js" defer><\/script>/);
  assert.match(dep,/cp index\.html styles\.css doweo-page-repairs\.css doweo-i18n\.js doweo-translations\.js manifest\.webmanifest/);
  assert.match(html,/doweo-page-repairs\.css\?v=20261121-navy-pages-v4/);
});
test('all nineteen languages have matching translated UI labels',()=>{
  const win={document:{readyState:'loading',addEventListener(){},},DoWeoI18n:{}};
  vm.runInNewContext(script,{globalThis:win});
  const languages=win.DoWeoTranslations.languages;
  assert.equal(Object.keys(languages).length,19);
  for(const [locale,labels] of Object.entries(languages)){
    assert.equal(labels.length,languages.en.length,locale);
    assert.ok(labels.every(Boolean),locale);
  }
  assert.equal(win.DoWeoTranslations.translateText('  Home ','es'),'  Inicio ');
  assert.equal(win.DoWeoTranslations.translateText('  Home ','ar'),'  الرئيسية ');
  assert.equal(win.DoWeoTranslations.translateText('User-defined tracker','es'),'User-defined tracker');
});
