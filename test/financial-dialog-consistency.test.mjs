import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
test('financial dialog visual rules are scoped and responsive',()=>{
 assert.match(html,/id="dw-financial-dialog-consistency"/);
 for(const id of ['sq-expense-dialog','sq-receipt-dialog','sq-payment-dispute-overlay'])
   assert.match(html,new RegExp('#'+id));
 assert.match(html,/#sq-nextgen \\.sq-ng-txn-dialog/);
 assert.match(html,/@media\\(max-width:650px\\)/);
 assert.match(html,/max-height:calc\\(100dvh - 24px\\)/);
});
test('core financial forms and handlers remain present',()=>{
 for(const id of ['entry-card','receipt-card','sq-expense-dialog','sq-receipt-dialog','sq-entry-x','sq-receipt-x','sq-ng-txn-overlay','sq-payment-dispute-overlay'])
   assert.ok(html.includes(id),'missing '+id);
 assert.match(html,/function openExpense\\(mode\\)/);
 assert.match(html,/expenseModal\\.addEventListener\\('click'/);
 assert.match(html,/receiptModal\\.addEventListener\\('click'/);
});
test('visual styles do not change auth or payment logic',()=>{
 const style=html.match(/<style id="dw-financial-dialog-consistency">([\\s\\S]*?)<\\/style>/);
 assert.ok(style);
 assert.doesNotMatch(style[1],/fetch\\(|api\\(|\.onclick|\.addEventListener/);
 assert.doesNotMatch(style[1],/#auth-modal/);
});
