import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {onRequest} from '../functions/api/finance-plus/[[path]].js';

const ui=readFileSync(new URL('../doweo-finance-planning.js',import.meta.url),'utf8');
const userId='11111111-1111-4111-8111-111111111111';
const trackerId='22222222-2222-4222-8222-222222222222';

async function invoke(route,{outsider=false,token=true}={}){
 const old=globalThis.fetch,calls=[];
 globalThis.fetch=async(input,options={})=>{
  const u=new URL(input),table=u.pathname.split('/').pop();
  calls.push({table,filters:Object.fromEntries(u.searchParams),method:options.method||'GET'});
  if(u.pathname.endsWith('/auth/v1/user'))return Response.json({id:userId,email:'user@example.test'});
  if(table==='trackers')return Response.json([{id:trackerId,owner_id:outsider?'99999999-9999-4999-8999-999999999999':userId,currency:'EUR'}]);
  if(table==='tracker_members')return Response.json([]);
  if(table==='squareup_personal_transactions')return Response.json([
   {id:'personal-1',kind:'expense',description:'Groceries',category:'Food',amount:42,currency:'USD',occurred_on:'2026-11-15'},
   {id:'personal-2',kind:'income',description:'Allowance',category:'Other',amount:50,currency:'USD',occurred_on:'2026-11-14'}
  ]);
  if(table==='tracker_entries')return Response.json([
   {id:'tracker-1',type:'debt',note:'Train tickets',amount:30,from_name:'A',to_name:'B',created_at:'2026-11-15T12:00:00Z'},
   {id:'tracker-2',type:'payment',note:'Paid back',amount:10,from_name:'B',to_name:'A',created_at:'2026-11-14T12:00:00Z'}
  ]);
  throw Error('Unexpected request: '+u);
 };
 try{
  const request=new Request('https://doweo.app/api/finance-plus/activity'+route,{headers:token?{Authorization:'Bearer token'}:{}});
  const res=await onRequest({request,env:{SUPABASE_SERVICE_ROLE_KEY:'test-key'},params:{path:['activity']}});
  return {status:res.status,data:await res.json(),calls};
 }finally{globalThis.fetch=old}
}

test('personal history reads only the signed-in user transactions',async()=>{
 const r=await invoke('?q=groc&kind=expense');
 assert.equal(r.status,200);
 assert.equal(r.data.scope,'personal');
 assert.deepEqual(r.data.items.map(x=>x.description),['Groceries']);
 assert.equal(r.data.items[0].currency,'USD');
 const row=r.calls.find(x=>x.table==='squareup_personal_transactions');
 assert.equal(row.filters.user_id,'eq.'+userId);
 assert.equal(r.calls.some(x=>x.table==='tracker_entries'),false);
});
test('tracker history requires authorization and keeps tracker currency',async()=>{
 const denied=await invoke('?tracker_id='+trackerId,{outsider:true});
 assert.equal(denied.status,404);
 assert.equal(denied.calls.some(x=>x.table==='tracker_entries'),false);
 const ok=await invoke('?tracker_id='+trackerId+'&kind=payment');
 assert.equal(ok.status,200);
 assert.equal(ok.data.items.length,1);
 assert.equal(ok.data.items[0].currency,'EUR');
 assert.equal(ok.data.items[0].description,'Paid back');
 assert.equal(ok.calls.find(x=>x.table==='tracker_entries').filters.tracker_id,'eq.'+trackerId);
});
test('invalid filters and missing session cannot reveal financial history',async()=>{
 assert.equal((await invoke('?tracker_id=invalid')).status,404);
 assert.equal((await invoke('?limit=1000')).status,400);
 assert.equal((await invoke('?kind=arbitrary')).status,400);
 assert.equal((await invoke('',{token:false})).status,401);
});
test('existing Finance Hub exposes compact activity search without a redesign',()=>{
 assert.match(ui,/id="dw-plan-activity-tab"/);
 assert.match(ui,/id="dw-plan-activity-source"/);
 assert.match(ui,/id="dw-plan-activity-query"/);
 assert.match(ui,/finance-plus\/activity\?/);
 assert.match(ui,/This is not a full edit audit/);
});
