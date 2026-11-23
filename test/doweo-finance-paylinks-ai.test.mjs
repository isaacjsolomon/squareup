import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {onRequest} from '../functions/api/finance-plus/[[path]].js';
import {onRequestGet as publicPreview} from '../functions/api/payment-preview/[token].js';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const ai=readFileSync(new URL('../functions/api/ai-chat.js',import.meta.url),'utf8');
const ui=readFileSync(new URL('../doweo-paylinks-currency.js',import.meta.url),'utf8');
const migration=readFileSync(new URL('../supabase/migrations/20261115_doweo_payment_requests.sql',import.meta.url),'utf8');
const user='11111111-1111-4111-8111-111111111111';
const tracker='22222222-2222-4222-8222-222222222222';
const token='33333333-3333-4333-8333-333333333333';
async function invoke(path,method='GET',body,outsider=false){
 const before=globalThis.fetch,calls=[];
 globalThis.fetch=async(input,options={})=>{
  const u=new URL(input),table=u.pathname.split('/').pop();
  calls.push({url:u,table,method:options.method||'GET',body:options.body&&JSON.parse(options.body)});
  if(u.pathname.endsWith('/auth/v1/user'))return Response.json({id:user});
  if(table==='trackers')return Response.json([{owner_id:outsider?'attacker':user,currency:'USD'}]);
  if(table==='tracker_members')return Response.json([]);
  if(table==='doweo_payment_requests')return Response.json(options.method==='POST'?[{id:token,token,expires_at:'2026-12-01T00:00:00Z'}]:[]);
  if(u.hostname==='open.er-api.com')return Response.json({result:'success',rates:{EUR:.9},time_last_update_utc:'Sun, 15 Nov 2026 00:00:00 +0000'});
  throw Error('Unexpected '+u.pathname);
 };
 try{
  const request=new Request('https://doweo.app/api/finance-plus/'+path,{method,headers:{Authorization:'Bearer test',...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
  const res=await onRequest({request,env:{SUPABASE_SERVICE_ROLE_KEY:'test'},params:{path:new URL(request.url).pathname.slice('/api/finance-plus/'.length).split('/')}});
  return {status:res.status,data:await res.json(),calls};
 }finally{globalThis.fetch=before}
}
test('opt-in Weo financial summary is off by default and never injected automatically',()=>{
 assert.match(ui,/input\.checked=false/);
 assert.match(html,/payload\.financial_context=Boolean\(document\.getElementById\('dw-weo-financial-context'\)\?\.checked\)/);
 assert.match(ai,/if\(raw\.financial_context===true\)/);
 assert.match(ai,/u\.searchParams\.set\('user_id','eq\.'\+user\.id\)/);
 assert.match(ai,/financialContextDirective/);
 assert.doesNotMatch(ai,/messages\.push\(\{role:'system',content:financialContextDirective/);
});
test('payment links are noncustodial, private by default and expire',()=>{
 assert.match(migration,/enable row level security/);
 assert.match(migration,/revoke all .* from public, anon, authenticated/);
 assert.match(migration,/expires_at timestamptz not null/);
 assert.match(migration,/token uuid not null unique/);
 assert.match(html,/<script src="\/doweo-paylinks-currency\.js(?:\?v=[^"]+)?" defer><\/script>/);
});
test('payment request denies other tracker members',async()=>{
 const result=await invoke('payment-requests','POST',{tracker_id:tracker,amount:24},true);
 assert.equal(result.status,404);
 assert.ok(!result.calls.some(x=>x.table==='doweo_payment_requests'));
});
test('payment request returns capability URL without marking an expense paid',async()=>{
 const result=await invoke('payment-requests','POST',{tracker_id:tracker,amount:24,public_note:'Dinner'});
 assert.equal(result.status,201);
 assert.equal(result.data.url,'https://doweo.app/pay/?token='+token);
 assert.equal(result.data.tracking_only,true);
 const post=result.calls.find(c=>c.table==='doweo_payment_requests'&&c.method==='POST');
 assert.equal(post.body.created_by,user);
 assert.equal(post.body.amount,24);
});
test('currency endpoint quotes without touching financial records',async()=>{
 const result=await invoke('currency-quote?from=USD&to=EUR&amount=100');
 assert.equal(result.status,200);
 assert.equal(result.data.converted,90);
 assert.equal(result.data.estimate,true);
 assert.ok(!result.calls.some(x=>x.table==='tracker_entries'));
});
test('public preview only reads whitelisted columns and validates tokens',async()=>{
 const before=globalThis.fetch,calls=[];
 globalThis.fetch=async(input)=>{
  const u=new URL(input);calls.push(u);
  return Response.json([{amount:20,currency:'USD',public_note:'Dinner',expires_at:'2026-12-01T00:00:00Z'}]);
 };
 try{
  const data=await publicPreview({env:{SUPABASE_SERVICE_ROLE_KEY:'test'},params:{token}});
  assert.equal(data.status,200);
  const body=await data.json();
  assert.deepEqual(Object.keys(body).sort(),['amount','currency','disclaimer','expires_at','note']);
  assert.equal(calls[0].searchParams.get('select'),'amount,currency,public_note,expires_at');
  assert.equal((await publicPreview({env:{SUPABASE_SERVICE_ROLE_KEY:'test'},params:{token:'bad'}})).status,404);
 }finally{globalThis.fetch=before}
});
