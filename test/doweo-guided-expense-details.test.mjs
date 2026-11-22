import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const css=readFileSync(new URL('../styles.css',import.meta.url),'utf8');
const start=html.indexOf('<div id="sq-details-overlay"');
const end=html.indexOf('<script id="sq-four-features-script">',start);
assert.ok(start>0&&end>start);
const markup=html.slice(start,end);
const codeStart=html.indexOf('function show(entry, justSaved){',end);
const codeEnd=html.indexOf('// Show the saved expense in the existing Details dialog',codeStart);
assert.ok(codeStart>0&&codeEnd>codeStart,'details function retained');
const show=html.slice(codeStart,codeEnd);

test('expense details prioritizes one amount, description, parties and status',()=>{
 for(const id of ['sq-details-title','sq-details-description','sq-details-amount','sq-details-category','sq-details-parties','sq-details-status','sq-details-next-step']) {
   assert.match(markup,new RegExp('id="'+id+'"'),id);
 }
 assert.equal((markup.match(/id="sq-details-amount"/g)||[]).length,1);
 assert.match(markup,/aria-label="Expense status"/);
});

test('extra metadata and discussion are collapsed until the user asks',()=>{
 assert.match(markup,/<details class="sq-details-more">/);
 assert.match(markup,/<details class="sq-details-discussion">/);
 assert.match(markup,/id="sq-details-grid"/);
 assert.match(markup,/id="sq-details-social"/);
 assert.match(show,/more\.open=false/);
 assert.match(show,/discussion\.open=false/);
});

test('status guidance distinguishes confirmed, disputed and pending financial entries',()=>{
 for(const status of ['pending','disputed','confirmed']) assert.ok(show.includes("status==='"+status+"'"),status);
 assert.match(show,/Waiting for the person charged to review this expense/);
 assert.match(show,/Waiting for the recipient to confirm this payment/);
 assert.match(show,/excluded from confirmed balances/);
 assert.match(show,/reflected in the tracker balance/);
});

test('existing interactive actions and events remain connected to the saved entry',()=>{
 assert.match(html,/squareup:details-open/);
 assert.match(html,/squareup:expense-saved/);
 assert.match(html,/if\(latest\)show\(latest,true\)/);
 assert.match(html,/actions\.append\(duplicate,share\)/);
 assert.match(html,/const actionAnchor=discussion\|\|social/);
 assert.match(markup,/id="sq-details-x"/);
 assert.match(markup,/id="sq-details-close"/);
});

test('modal stays within mobile viewport and supports reduced detail density',()=>{
 assert.match(css,/max-height:calc\(100dvh - 20px\)!important/);
 assert.match(css,/\.sq-details-guidance/);
 assert.match(css,/\.sq-details-more/);
 assert.match(css,/\.sq-details-discussion/);
});
