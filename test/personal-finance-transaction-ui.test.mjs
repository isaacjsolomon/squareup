import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script} from 'node:vm';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const source=html.match(/<script id="sq-nextgen-script">([\s\S]*?)<\/script>/)?.[1];
const css=readFileSync(new URL('../styles.css',import.meta.url),'utf8');

test('Finance Hub inline script has valid JavaScript syntax',()=>{
  assert.ok(source,'Finance Hub script should exist');
  assert.doesNotThrow(()=>new Script(source));
});

test('mobile Personal Finance overview contains left stacked metrics and a right add action',()=>{
  assert.ok(css,'Redesign stylesheet should exist');
  assert.match(source,/class="sq-ng-finance-overview"/);
  assert.match(source,/class="sq-ng-grid sq-ng-summary-stack"/);
  assert.match(source,/card\('Personal cash flow'/);
  assert.match(source,/card\('Total income'/);
  assert.match(source,/card\('Total spending'/);
  assert.match(source,/id="sq-ng-open-transaction"/);
  assert.match(css,/@media\(max-width:800px\)/);
  assert.match(css,/sq-ng-finance-overview>\.sq-ng-summary-stack/);
  assert.match(css,/grid-template-columns:minmax\(0,1fr\)!important/);
  assert.match(css,/sq-ng-add-action/);
});

test('Expense and Income tabs replace the Type dropdown in popup',()=>{
  assert.match(source,/id="sq-ng-txn-overlay"/);
  assert.match(source,/role="dialog" aria-modal="true"/);
  assert.match(source,/data-txn-kind="expense"/);
  assert.match(source,/data-txn-kind="income"/);
  assert.match(source,/name="kind" value="expense"/);
  assert.doesNotMatch(source,/Type<select name="kind">/);
  assert.match(source,/setKind\(button\.dataset\.txnKind\)/);
  assert.match(source,/values\.kind==='expense'/);
});

test('Save reuses existing private transaction endpoint and maintains delete action',()=>{
  assert.match(source,/api\('finance\/transactions','POST',values\)/);
  assert.match(source,/api\('finance\/transactions\/'\+b\.dataset\.delete,'DELETE'\)/);
  assert.match(source,/render\(\)/);
});

test('Overlay has close and keyboard escape handling',()=>{
  assert.match(source,/\.sq-ng-txn-close/);
  assert.match(source,/event\.key==='Escape'/);
  assert.match(source,/form\.elements\.namedItem\('description'\)\.focus\(\)/);
});
