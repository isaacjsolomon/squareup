import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {onRequest} from '../functions/api/finance-plus/[[path]].js';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const ui=readFileSync(new URL('../doweo-trips-activity.js',import.meta.url),'utf8');
const sql=readFileSync(new URL('../supabase/migrations/20261115_doweo_trip_item_details.sql',import.meta.url),'utf8');
const me='11111111-1111-4111-8111-111111111111',tracker='22222222-2222-4222-8222-222222222222';
const trip='33333333-3333-4333-8333-333333333333';
async function invoke(path,method='GET',body,outsider=false){
 const previous=globalThis.fetch,operations=[];
 globalThis.fetch=async(input,options={})=>{
  const url=new URL(input),table=url.pathname.split('/').pop();operations.push({table,method:options.method||'GET',query:url.searchParams,body:options.body&&JSON.parse(options.body)});
  if(url.pathname.endsWith('/auth/v1/user'))return Response.json({id:me});
  if(table==='trackers')return Response.json([{id:tracker,owner_id:outsider?'another-user':me,currency:'EUR'}]);
  if(table==='tracker_members')return Response.json([]);
  if(table==='squareup_trips')return Response.json([{id:trip,tracker_id:tracker,name:'Conference'}]);
  if(table==='squareup_trip_items')return Response.json([{id:'44444444-4444-4444-8444-444444444444',tracker_id:tracker,title:'Flight',type:'travel',date:'2026-12-01',done:false}]);
  if(table==='tracker_entries')return Response.json([{id:'1',type:'payment',amount:20,currency:'USD',created_at:'2026-11-01T00:00:00Z',note:'Payback'}]);
  if(table==='squareup_personal_transactions')return Response.json([{id:'2',kind:'expense',amount:30,currency:'USD',created_at:'2026-11-02T00:00:00Z',description:'Lunch'}]);
  throw Error('Unexpected '+url.pathname);
 };
 try{
  const request=new Request('https://doweo.app/api/finance-plus/'+path,{method,headers:{Authorization:'Bearer test',...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
  const res=await onRequest({request,env:{SUPABASE_SERVICE_ROLE_KEY:'test'},params:{path:new URL(request.url).pathname.slice('/api/finance-plus/'.length).split('/')}});
  return {status:res.status,result:await res.json(),operations};
 }finally{globalThis.fetch=previous}
}
test('trip planning UI integrates with Finance Hub and retains existing scripts',()=>{
 assert.match(html,/<script src="\/doweo-trips-activity\.js(?:\?v=[^"]+)?" defer><\/script>/);
 assert.match(html,/<script src="\/doweo-finance-planning\.js(?:\?v=[^"]+)?" defer><\/script>/);
 assert.match(ui,/querySelector\('\.sq-ng-tabs'\)/);
 assert.match(ui,/financial activity/i);
 assert.match(sql,/add column if not exists/);
});
test('trip item creation rejects invalid HTTPS destinations',async()=>{
 const data=await invoke('trips/items','POST',{tracker_id:tracker,trip_id:trip,title:'Flight',type:'travel',link_url:'javascript:alert(1)'});
 assert.equal(data.status,400);
 assert.ok(!data.operations.some(x=>x.table==='squareup_trip_items'));
});
test('trip scope blocks outsiders before reading plans',async()=>{
 const data=await invoke('trips?tracker_id='+tracker,'GET',null,true);
 assert.equal(data.status,404);
 assert.ok(!data.operations.some(x=>x.table==='squareup_trips'));
});
test('activity history combines only member tracker entries and personal transactions',async()=>{
 const data=await invoke('activity?tracker_id='+tracker);
 assert.equal(data.status,200);
 assert.deepEqual(data.result.timeline.map(x=>x.id),['2','1']);
 assert.equal(data.result.timeline.find(x=>x.source==='tracker').currency,'EUR','Tracker balance must show the base currency');
 assert.equal(data.result.timeline.find(x=>x.source==='personal').currency,'USD','Personal transaction currency must remain intact');
 assert.ok(data.operations.some(x=>x.table==='trackers'&&x.query.get('id')==='eq.'+tracker));
 assert.ok(data.operations.some(x=>x.table==='tracker_entries'&&x.query.get('tracker_id')==='eq.'+tracker));
 assert.ok(data.operations.some(x=>x.table==='squareup_personal_transactions'&&x.query.get('user_id')==='eq.'+me));
});
test('trip item writes retain authenticated creator identity',async()=>{
 const data=await invoke('trips/items','POST',{tracker_id:tracker,trip_id:trip,title:'Flight',type:'travel',created_by:'attacker'});
 assert.equal(data.status,201);
 const write=data.operations.find(x=>x.table==='squareup_trip_items'&&x.method==='POST');
 assert.equal(write.body.created_by,me);
});
