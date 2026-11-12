import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const html = readFileSync(new URL('../index.html',import.meta.url),'utf8');

function extractHandler(startText, endText, required) {
  const start=html.indexOf(startText);
  const end=html.indexOf(endText,start);
  assert.ok(start>0&&end>start,required+' handler present');
  return html.slice(start,end);
}

const expenseCode=extractHandler('var sqEntrySaveInFlight = false;', '\nfunction setMode(m)', 'expense');
const settlementCode=extractHandler('var sqSettlementSaveInFlight = false;', '\ndocument.getElementById("clear").onclick', 'settlement');

function deferred(){
 let resolve;
 const promise=new Promise(r=>{resolve=r;});
 return {promise,resolve};
}

function harness(code,formId){
 const handlers={}, alerts=[],calls=[],values={
  person1:{value:'Alex'},person2:{value:'Blair'},amount:{value:'25.00'},
  note:{value:'Dinner'},'settle-amount':{value:'25.00'},
  'settle-msg':{textContent:''},'entry-card':{classList:{remove:()=>calls.push('closed-entry')}},
  'quick-expense':{setAttribute:()=>{}},'quick-payment':{setAttribute:()=>{}}
 };
 const button={disabled:false,setAttribute:()=>{},removeAttribute:()=>{}};
 const form={reset:()=>calls.push('reset'),querySelector:()=>button};
 const sandbox={
  document:{getElementById(id){if(id===formId)return {addEventListener(_event,fn){handlers.submit=fn;}};
    return values[id]||{};}},
  alert:message=>alerts.push(message),norm:s=>String(s).toLowerCase(),
  cloud:null,mode:'debt',settling:{owed:25,from:'Alex',to:'Blair'},
  addEntry:()=>{throw Error('Set addEntry for test');},render:()=>{},closeSettle:()=>calls.push('closed-settle'),
  Math,parseFloat
 };
 vm.runInNewContext(code,sandbox);
 const event={preventDefault:()=>{},currentTarget:form};
 return {sandbox,handlers,form,button,calls,alerts,event,values};
}

test('expense stays open until successful save and prevents repeat submissions',async()=>{
 const t=harness(expenseCode,'form'),d=deferred();
 let count=0;t.sandbox.addEntry=()=>{count++;return d.promise;};
 const pending=t.handlers.submit(t.event);
 await t.handlers.submit(t.event);
 assert.equal(count,1);
 assert.equal(t.button.disabled,true);
 assert.deepEqual(t.calls,[]);
 d.resolve(true);await pending;
 assert.deepEqual(t.calls,['reset','closed-entry']);
 assert.equal(t.button.disabled,false);
});

test('failed expense save preserves entered form contents and leaves popup open',async()=>{
 const t=harness(expenseCode,'form');
 t.sandbox.addEntry=async()=>false;
 await t.handlers.submit(t.event);
 assert.deepEqual(t.calls,[]);
 assert.equal(t.values.amount.value,'25.00');
 assert.equal(t.button.disabled,false);
});

test('settle form stays open until save and keeps amount if saving fails',async()=>{
 const t=harness(settlementCode,'settle-form'),d=deferred();
 let count=0;t.sandbox.addEntry=()=>{count++;return d.promise;};
 const pending=t.handlers.submit(t.event);
 await t.handlers.submit(t.event);
 assert.equal(count,1);
 assert.equal(t.button.disabled,true);
 assert.deepEqual(t.calls,[]);
 d.resolve(false);await pending;
 assert.deepEqual(t.calls,[]);
 assert.match(t.values['settle-msg'].textContent,/not saved/i);
 assert.equal(t.button.disabled,false);
});

test('successful settlement closes after save confirmation',async()=>{
 const t=harness(settlementCode,'settle-form');
 t.sandbox.addEntry=async()=>true;
 await t.handlers.submit(t.event);
 assert.deepEqual(t.calls,['closed-settle']);
});

test('cloud mutation returns success and failure explicitly',()=>{
 const start=html.indexOf('async function mutate(path, method, body) {');
 const end=html.indexOf('\nfunction applyDetail(detail)',start);
 assert.ok(start>0&&end>start);
 const source=html.slice(start,end);
 assert.match(source,/return true;/);
 assert.match(source,/return false;/);
 assert.match(source,/if \(status\) status\.textContent = "Not saved"/);
});
