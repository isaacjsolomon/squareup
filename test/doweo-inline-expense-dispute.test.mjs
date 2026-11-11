import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const backend=readFileSync(new URL('../functions/api/[[path]].js',import.meta.url),'utf8');
const first=html.indexOf('function sqCanReviewPendingExpense(e)');
const last=html.indexOf('function render() {',first);
assert.ok(first>0&&last>first,'expense review permission helper exists');
const helper=html.slice(first,last);

function eligible(entry, members, cloudEnabled=true){
 const context={
   cloud:cloudEnabled?{}:null,
   window:{squareUpApprovalTracker:()=>({members})},
   norm:value=>String(value||'').trim().toLowerCase()
 };
 vm.runInNewContext(helper,context);
 return context.sqCanReviewPendingExpense(entry);
}

test('only the debtor sees controls for a pending charge',()=>{
 const charge={type:'debt',paymentStatus:'pending',from:'Testing',to:'Isaac'};
 assert.equal(eligible(charge,[{isYou:true,name:'Testing'}]),true);
 assert.equal(eligible(charge,[{isYou:true,name:'Isaac'}]),false);
 assert.equal(eligible(charge,[{isYou:false,name:'Testing'},{isYou:true,name:'Isaac'}]),false);
});

test('review buttons cannot appear for confirmed or disputed entries, payments or local records',()=>{
 const mine=[{isYou:true,name:'Testing'}];
 for(const status of ['confirmed','disputed'])assert.equal(eligible({type:'debt',paymentStatus:status,from:'Testing'},mine),false);
 assert.equal(eligible({type:'payment',paymentStatus:'pending',from:'Testing'},mine),false);
 assert.equal(eligible({type:'debt',paymentStatus:'pending',from:'Testing'},mine,false),false);
});

test('activity cards expose functional approval and dispute handlers',()=>{
 assert.match(html,/data-sq-approve="' \+ esc\(String\(e\.id\)\)/);
 assert.match(html,/data-sq-dispute="' \+ esc\(String\(e\.id\)\)/);
 assert.match(html,/document\.getElementById\('history'\)\.addEventListener\('click',sqHandleExpenseReview\)/);
 assert.match(html,/window\.squareUpAskPaymentDispute\(tracker\.id,id,'expense'\)/);
 assert.match(html,/await window\.squareUpReviewExpense\(id,action,action==='dispute'\?disputeChoice\.reason:''\)/);
});

test('the backend enforces debtor authorization and pending-only state changes',()=>{
 const start=backend.indexOf('// EXPENSE APPROVALS');
 const end=backend.indexOf('// PIN AND UNPIN EXPENSES',start);
 assert.ok(start>=0&&end>start);
 const section=backend.slice(start,end);
 assert.match(section,/debtor\.user_id !== me\.id/);
 assert.match(section,/entry\.payment_status !== 'pending'/);
 assert.match(section,/payment_status: 'eq.pending'/);
 assert.match(section,/action === 'dispute' && !disputeReason/);
 assert.match(section,/action === 'approve' \? 'confirmed' : 'disputed'/);
 assert.match(section,/Reason: ' \+ disputeReason/);
});
