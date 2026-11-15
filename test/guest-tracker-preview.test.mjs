import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const source=readFileSync(new URL('../functions/api/invite-preview/[token].js',import.meta.url),'utf8');
test('guest invitation preview exists in authentication and keeps member details private',()=>{
 assert.match(html,/id="dw-guest-invite-preview"/);
 assert.match(html,/id="dw-guest-invite-name"/);
 assert.match(html,/\/api\/invite-preview\//);
 assert.match(html,/if\(token\)showGuestInvitation\(\)/);
 assert.match(html,/setAuthMode\('signup'\)/);
 assert.match(html,/setAuthMode\('login'\)/);
 assert.match(html,/joinPending\(\)/);
});
test('backend queries only tracker name and does not return member identities or entries',()=>{
 assert.match(source,/searchParams\.set\('select','name'\)/);
 assert.match(source,/searchParams\.set\('invite_token','eq\.'\+token\)/);
 assert.match(source,/Cache-Control': 'no-store, private'/);
 assert.doesNotMatch(source,/select','\*'/);
});
test('invalid invite token is rejected before any backend read',async()=>{
 const moduleURL=pathToFileURL(new URL('../functions/api/invite-preview/[token].js',import.meta.url).pathname).href;
 const api=await import(moduleURL);
 let called=0;
 const saved=globalThis.fetch;
 globalThis.fetch=async()=>{called++;throw Error('Unexpected request')};
 try{
   const result=await api.onRequestGet({params:{token:'not-a-token'},env:{SUPABASE_SERVICE_ROLE_KEY:'private'}});
   assert.equal(result.status,404);
   assert.equal(called,0);
 }finally{globalThis.fetch=saved;}
});
test('public preview returns only a name and honors revoked tokens',async()=>{
 const moduleURL=pathToFileURL(new URL('../functions/api/invite-preview/[token].js',import.meta.url).pathname).href;
 const api=await import(moduleURL);
 const saved=globalThis.fetch;
 const token='a'.repeat(36);
 const calls=[];
 globalThis.fetch=async(uri,opts)=>{
   calls.push({url:String(uri),opts});
   return Response.json([{name:'Weekend Trip',owner_id:'secret-owner',invite_token:'secret-token'}]);
 };
 try{
   const res=await api.onRequestGet({params:{token},env:{SUPABASE_SERVICE_ROLE_KEY:'private'}});
   assert.equal(res.status,200);
   assert.deepEqual(await res.json(),{name:'Weekend Trip'});
   assert.equal(calls.length,1);
   assert.match(calls[0].url,/select=name/);
   assert.equal(calls[0].opts.headers.Authorization,'Bearer private');
   assert.equal(res.headers.get('Cache-Control'),'no-store, private');
   globalThis.fetch=async()=>Response.json([]);
   const revoked=await api.onRequestGet({params:{token},env:{SUPABASE_SERVICE_ROLE_KEY:'private'}});
   assert.equal(revoked.status,404);
 }finally{globalThis.fetch=saved;}
});
