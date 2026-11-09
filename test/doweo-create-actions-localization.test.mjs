import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../doweo-localize-ui.js',import.meta.url),'utf8');
const start=source.indexOf(' const actionLocales=');
const end=source.indexOf(' function render(){',start);
assert.ok(start>0&&end>start,'direct action translation code exists');
const run=source.slice(start,end)+'\n globalThis.run=translateCreateActions;globalThis.locales=actionLocales;';
function makeButton(text){
 return {textContent:text,children:[],dataset:{}};
}
function initialize(buttons,lang='es'){
 const root={document:{querySelectorAll:()=>buttons}};
 const context={root,language:lang};
 vm.runInNewContext(run,context);
 return context;
}
test('every supported non-English locale translates the create actions',()=>{
 const all=['tracker','trip','household','event'];
 const first=initialize([]);
 for(const lang of Object.keys(first.locales)){
  const buttons=all.map(key=>makeButton('＋ Create new '+key));
  const ctx=initialize(buttons,lang);
  ctx.run();
  buttons.forEach((button,i)=>{
   assert.notEqual(button.textContent,'＋ Create new '+all[i],lang+' '+all[i]);
   assert.ok(button.textContent.startsWith('＋ '),lang+' icon');
  });
 }
 assert.equal(Object.keys(first.locales).length,11);
});
test('Spanish gallery buttons and tracker action translate after re-render',()=>{
 const gallery=makeButton('＋ Create new tracker');
 const open=makeButton('Open tracker  →');
 const trip=makeButton('＋ Create new trip');
 const ctx=initialize([gallery,open,trip]);
 ctx.run();
 assert.equal(gallery.textContent,'＋ Crear nuevo grupo');
 assert.equal(open.textContent,'Abrir grupo →');
 assert.equal(trip.textContent,'＋ Crear nuevo viaje');
 // React to the app replacing the same text with English later.
 gallery.textContent='＋ Create new tracker';
 open.textContent='Open tracker  →';
 ctx.run();
 assert.equal(gallery.textContent,'＋ Crear nuevo grupo');
 assert.equal(open.textContent,'Abrir grupo →');
 // Switching the account language should also retranslate existing cards.
 ctx.language='fr';ctx.run();
 assert.equal(gallery.textContent,'＋ Créer un groupe');
 assert.equal(open.textContent,'Ouvrir le groupe →');
 ctx.language='en';ctx.run();
 assert.equal(gallery.textContent,'＋ Create new tracker');
 assert.equal(open.textContent,'Open tracker →');
});
test('unrelated buttons, user-provided names and interactive child elements stay untouched',()=>{
 const privateButton=makeButton('Create new invoice for Sasha');
 const complexButton=makeButton('＋ Create new trip');complexButton.children=[{}];
 const ctx=initialize([privateButton,complexButton]);
 ctx.run();
 assert.equal(privateButton.textContent,'Create new invoice for Sasha');
 assert.equal(complexButton.textContent,'＋ Create new trip');
});
test('action translator runs before and after general UI translation',()=>{
 const render=source.slice(end,source.indexOf(' function save(){',end));
 assert.match(render,/hideDecorativeDescriptions\(\);\n   translateCreateActions\(\);/);
 assert.match(render,/translateCreateActions\(\);\n   pump\(\);/);
});
