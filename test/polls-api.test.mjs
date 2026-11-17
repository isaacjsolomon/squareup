import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../functions/api/[[path]].js',import.meta.url),'utf8');
const {onRequest}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const user='22222222-2222-4222-8222-222222222222',other='33333333-3333-4333-8333-333333333333',tracker='11111111-1111-4111-8111-111111111111',poll='44444444-4444-4444-8444-444444444444';
test('poll API returns deadline and participation data, validates deadlines, and binds RPC actor to session',async()=>{
 const original=globalThis.fetch;const writes=[];let rpcResult={success:true};
 globalThis.fetch=async(input,options={})=>{
  const url=new URL(input),table=url.pathname.split('/').at(-1),method=options.method||'GET';
  const json=data=>new Response(JSON.stringify(data),{headers:{'content-type':'application/json'}});
  if(url.pathname==='/auth/v1/user')return json({id:user,email:'test@example.test',user_metadata:{full_name:'Alex'}});
  if(table==='doweo_manage_poll'){writes.push(JSON.parse(options.body));return json(rpcResult);}
  if(table==='trackers')return json([{id:tracker,owner_id:user,name:'Test'}]);
  if(table==='tracker_members')return json([{user_id:user,name:'Alex',role:'owner'},{user_id:other,name:'Jordan',role:'member'}]);
  if(table==='squareup_polls'){
   if(method==='POST'){writes.push(JSON.parse(options.body));return json([{id:poll}]);}
   return json([{id:poll,tracker_id:tracker,created_by:user,question:'Food?',closed:false,created_at:'2026-01-01T00:00:00Z',ends_at:'2020-01-01T00:00:00Z',archived_at:null}]);
  }
  if(table==='squareup_poll_options')return json([{id:'a',poll_id:poll,label:'Pizza',position:0}]);
  if(table==='squareup_poll_votes')return json([{poll_id:poll,user_id:user,option_id:'a'}]);
  throw Error('Unexpected fetch '+url.href);
 };
 const request=(method='GET',body,path='')=>onRequest({request:new Request('https://doweo.app/api/trackers/'+tracker+'/polls'+path,{method,headers:{authorization:'Bearer fake','content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{})}),env:{SUPABASE_SERVICE_ROLE_KEY:'server-only-test'},params:{path:['trackers',tracker,'polls',...(path?[poll]:[])]}});
 try{
  const response=await request();assert.equal(response.status,200);const [p]=await response.json();
  assert.equal(p.closed,true,'expired poll is closed even without a scheduler');assert.equal(p.totalMembers,2);assert.equal(p.votedMembers,1);assert.deepEqual(p.pendingNames,['Jordan']);assert.equal(p.creatorName,'Alex');
  assert.equal((await request('POST',{question:'Food?',options:['A','B'],endsAt:'not-a-date'})).status,400);
  assert.equal((await request('POST',{question:'Food?',options:['A','B'],endsAt:'2020-01-01'})).status,400);
  const deadline=new Date(Date.now()+86400000).toISOString();assert.equal((await request('POST',{question:'Food?',options:['A','B'],endsAt:deadline})).status,201);assert.equal(writes[0].ends_at,deadline);
  const patch=await request('PATCH',{action:'vote',optionId:'a',p_actor_id:other},'/'+poll);assert.equal(patch.status,200);assert.equal(writes.at(-1).p_actor_id,user);assert.equal(writes.at(-1).p_tracker_id,tracker);
  rpcResult={error:'This poll is closed.',status:409};assert.equal((await request('PATCH',{action:'vote',optionId:'a'},'/'+poll)).status,409);
 }finally{globalThis.fetch=original;}
});
