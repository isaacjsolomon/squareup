import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../functions/api/[[path]].js',import.meta.url),'utf8');
const {onRequest}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const owner='22222222-2222-4222-8222-222222222222',member='33333333-3333-4333-8333-333333333333',tracker='11111111-1111-4111-8111-111111111111',entryId='88888888-8888-4888-8888-888888888888';
test('expense edits enforce creator/owner permissions, validate money/dates, preserve identity and request approval',async()=>{
 const original=globalThis.fetch;let actor=owner;const writes=[];
 const entry={id:entryId,tracker_id:tracker,type:'debt',created_by:owner,from_name:'Jordan',to_name:'Alex',amount:12,note:'Lunch',date_label:'2026-11-17',payment_status:'confirmed',original_amount:10,original_currency:'EUR',exchange_rate:1.2};
 const members=[{user_id:owner,name:'Alex',role:'owner'},{user_id:member,name:'Jordan',role:'editor'}];
 globalThis.fetch=async(input,options={})=>{
  const u=new URL(input),table=u.pathname.split('/').at(-1),method=options.method||'GET';let data=[];
  if(u.pathname==='/auth/v1/user')data={id:actor,email:'test@example.test',user_metadata:{}};
  else if(table==='trackers')data=[{id:tracker,owner_id:owner,currency:'USD',name:'Test'}];
  else if(table==='tracker_members')data=members.filter(m=>!u.searchParams.has('user_id')||u.searchParams.get('user_id')==='eq.'+m.user_id);
  else if(table==='squareup_tracker_settings')data=[{require_expense_approval:true}];
  else if(table==='tracker_entries'){
   if(method==='PATCH'){const change=JSON.parse(options.body);writes.push({change,filters:Object.fromEntries(u.searchParams)});Object.assign(entry,change);}
   data=!u.searchParams.has('id')||u.searchParams.get('id')==='eq.'+entryId?[entry]:[];
  }
  else if(!['squareup_tracker_permissions','profiles'].includes(table))throw Error('Unexpected '+u.href);
  return new Response(JSON.stringify(data),{headers:{'content-type':'application/json'}});
 };
 const patch=(body,id=entryId)=>onRequest({request:new Request('https://doweo.app/api/trackers/'+tracker+'/entries/'+id,{method:'PATCH',headers:{authorization:'Bearer fake','content-type':'application/json'},body:JSON.stringify(body)}),env:{SUPABASE_SERVICE_ROLE_KEY:'test-server-only'},params:{path:['trackers',tracker,'entries',id]}});
 const body={amount:18.50,note:'Updated',date:'2026-11-17',dueDate:'2026-12-01'};
 try{
  actor=member;assert.equal((await patch(body)).status,403);assert.equal(writes.length,0);
  actor=owner;assert.equal((await patch({...body,amount:-2})).status,400);assert.equal((await patch({...body,dueDate:'2026-02-30'})).status,400);
  assert.equal((await patch(body,'99999999-9999-4999-8999-999999999999')).status,404);
  const result=await patch(body);assert.equal(result.status,200);const detail=await result.json();
  assert.equal(writes.length,1);assert.equal(writes[0].filters.id,'eq.'+entryId);assert.equal(writes[0].filters.tracker_id,'eq.'+tracker);
  assert.equal(entry.id,entryId);assert.equal(entry.created_by,owner);assert.equal(entry.from_name,'Jordan');assert.equal(entry.payment_status,'pending');
  assert.equal(entry.original_currency,'USD');assert.equal(entry.original_amount,18.5);assert.equal(entry.exchange_rate,1);
  assert.equal(detail.entries[0].canEdit,true);assert.equal(detail.entries[0].amount,18.5);
 }finally{globalThis.fetch=original;}
});
