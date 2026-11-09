import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const workflow=readFileSync(resolve(root,'.github/workflows/deploy-doweo-pages.yml'),'utf8');
const translator=readFileSync(resolve(root,'doweo-localize-ui.js'),'utf8');
const i18n=readFileSync(resolve(root,'doweo-i18n.js'),'utf8');
test('every local JavaScript module imported by the translator is copied to Pages output',()=>{
 const required=[...translator.matchAll(/import\(['"]\/(.+?\.mjs)['"]\)/g)].map(m=>m[1]);
 assert.ok(required.includes('doweo-ui-catalog.mjs'));
 assert.ok(required.includes('doweo-core-locales.mjs'));
 const cp=workflow.match(/cp index\.html ([^\n]+) \.pages-output\//);
 assert.ok(cp,'production deploy must include an explicit static assets manifest');
 const deployed=new Set(cp[1].trim().split(/\s+/));
 for(const file of required){
   assert.ok(existsSync(resolve(root,file)),file+' must exist in repo');
   assert.ok(deployed.has(file),'deployment is missing runtime dependency: '+file);
 }
});
test('missing optional locale bundles cannot prevent translator initialization',()=>{
 const index=translator.indexOf('async function init()');
 assert.ok(index>=0);
 const body=translator.slice(index);
 assert.match(body,/const module=await import\('\/doweo-ui-catalog\.mjs'\)/);
 assert.match(body,/try\{[\s\S]*?import\('\/doweo-core-locales\.mjs'\)[\s\S]*?\}catch\(error\)\{/);
 assert.match(body,/coreTranslations=null/);
 assert.match(body,/new MutationObserver\(schedule\)/);
 assert.match(body,/addEventListener\('doweo:languagechange',schedule\)/);
});
test('language preference dispatches a translation refresh for all supported languages',()=>{
 assert.match(i18n,/win\.document\.dispatchEvent\(new win\.Event\('doweo:languagechange'/);
 assert.match(i18n,/input\.addEventListener\('change',\(\)=>\{if\(input\.checked\)\{set\(win,input\.value\);grid\.hidden=true/);
 assert.match(i18n,/syncLanguageGrids\(win\)/);
});
