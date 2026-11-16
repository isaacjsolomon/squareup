import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
test('financial dialogs have scoped responsive design',()=>{
  for(const text of [
    'id="dw-financial-dialog-consistency"',
    '#sq-expense-dialog .sq-action-modal-inner',
    '#sq-receipt-dialog .sq-action-modal-inner',
    '#sq-nextgen .sq-ng-txn-dialog',
    '#sq-payment-dispute-overlay .sq-dispute-dialog',
    '@media(max-width:650px)',
    'max-height:calc(100dvh - 24px)'
  ])assert.ok(html.includes(text),text);
});
test('financial form actions are not replaced',()=>{
  for(const text of [
    'id="sq-expense-dialog"', 'id="sq-receipt-dialog"',
    'id="sq-entry-x"', 'id="sq-receipt-x"',
    'id="sq-payment-dispute-overlay"',
    'function openExpense(mode)', "expenseModal.addEventListener('click'",
    "receiptModal.addEventListener('click'"
  ])assert.ok(html.includes(text),text);
});
test('shared styling does not contain business-logic changes',()=>{
  const begin=html.indexOf('<style id="dw-financial-dialog-consistency">');
  const end=html.indexOf('</style>',begin);
  assert.ok(begin>=0 && end>begin);
  const rules=html.slice(begin,end);
  for(const token of ['fetch(', 'api(', '.onclick', '.addEventListener', '#auth-modal'])
    assert.ok(!rules.includes(token),'unexpected logic or auth selector: '+token);
});
