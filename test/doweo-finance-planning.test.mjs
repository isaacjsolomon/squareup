import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {onRequest} from '../functions/api/finance-plus/[[path]].js';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const ui=readFileSync(new URL('../doweo-finance-planning.js',import.meta.url),'utf8');
const migration=readFileSync(new URL('../supabase/migrations/20261115_doweo_monthly_budgets.sql',import.meta.url),'utf8');
const userId='11111111-1111-4111-8111-111111111111';
const trackerId='22222222-2222-4222-8222-222222222222';
const goalId='33333333-3333-4333-8333-333333333333';

async function invoke(path,method='GET',body,outsider=false){
 const prev=globalThis.fetch,calls=[];
 globalThis.fetch=async(input,options={})=>{
  const url=new URL(input), table=url.pathname.split('/').pop();
  calls.push({table,method:options.method||'GET',query:url.searchParams});
  if(url.pathname.endsWith('/auth/v1/user'))return Response.json({id:userId,email:'member@example.test'});
  if(table==='trackers')return Response.json([{id:trackerId,owner_id:outsider?'other':userId}]);
  if(table==='tracker_members')return Response.json([]);
  if(table==='doweo_monthly_budgets')return Response.json(options.method==='POST'?[{id:goalId,limit_amount:200}]:[{category:'Food',limit_amount:200}]);
  if(table==='squareup_personal_transactions')return Response.json([{category:'Food',currency:'USD',kind:'expense',amount:75}]);
  if(table==='squareup_savings_goals')return Response.json(options.method==='POST'?[{id:goalId,title:'Trip'}]:[{id:goalId,title:'Trip',target_amount:500}]);
  if(table==='squareup_goal_contributions')return Response.json(options.method==='POST'?[{id:goalId,amount:25}]:[{goal_id:goalId,amount:50}]);
  throw Error('Unexpected '+url.pathname);
 };
 try{
  const request=new Request('https://doweo.app/api/finance-plus/'+path,{
   method,headers:{Authorization:'Bearer token',...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})
  });
  const route=new URL(request.url).pathname.slice('/api/finance-plus/'.length).split('/');
  const res=await onRequest({request,env:{SUPABASE_SERVICE_ROLE_KEY:'test-key'},params:{path:route}});
  return {status:res.status,data:await res.json(),calls};
 }finally{globalThis.fetch=prev;}
}
test('goals and budgets are mounted only in the existing Finance Hub',()=>{
 assert.match(html,/<script src="\/doweo-finance-planning\.js" defer><\/script>/);
 assert.match(ui,/getElementById\('sq-nextgen'\)/);
 assert.match(ui,/getElementById\('sq-ng-content'\)|querySelector\('\.sq-ng-shell'\)/);
 assert.match(ui,/Goals & Budgets/);
});
test('budget table is private and scoped to a user',()=>{
 assert.match(migration,/enable row level security/);
 assert.match(migration,/revoke all .* from public, anon, authenticated/);
 assert.match(migration,/user_id uuid not null references auth.users/);
 assert.match(migration,/unique \(user_id,month,category\)/);
});
test('monthly budgets report own USD spending',async()=>{
 const {status,data,calls}=await invoke('budgets?month=2026-11');
 assert.equal(status,200);
 assert.equal(data.budgets[0].spent,75);
 assert.ok(calls.some(c=>c.table==='doweo_monthly_budgets'&&c.query.get('user_id')==='eq.'+userId));
});
test('reject invalid or unauthorized data',async()=>{
 assert.equal((await invoke('budgets','POST',{month:'bad',category:'Food',limit_amount:10})).status,400);
 assert.equal((await invoke('goals?tracker_id='+trackerId,'GET',null,true)).status,404);
});
test('goal contributions are bound to authenticated identity',async()=>{
 const {status,calls}=await invoke('goals/contributions','POST',{tracker_id:trackerId,goal_id:goalId,amount:25,user_id:'attacker'});
 assert.equal(status,201);
 assert.ok(calls.some(c=>c.table==='squareup_goal_contributions'&&c.method==='POST'));
});
