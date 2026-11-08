import test from 'node:test';
import assert from 'node:assert/strict';
import {onRequest} from '../functions/api/beta-feedback.js';

const emailEnv={
  SUPABASE_SERVICE_ROLE_KEY:'test-service-role-key',
  RESEND_API_KEY:'test-resend-key',
  BETA_FEEDBACK_FROM_EMAIL:'DoWeo Beta <onboarding@resend.dev>'
};
const submit={
  category:'bug',
  title:'Test feedback',
  details:'A button did not open.',
  page_path:'/trackers',
  device_info:'Test browser'
};
const makeRequest=(body=submit,token='valid')=>new Request('https://doweo.pages.dev/api/beta-feedback',{
  method:'POST',
  headers:{
    Origin:'https://doweo.pages.dev',
    Authorization:'Bearer '+token,
    'Content-Type':'application/json'
  },
  body:JSON.stringify(body)
});

function mockBackend({recent=0,emailOk=true}={}){
  const calls=[];
  const old=globalThis.fetch;
  globalThis.fetch=async (url,init={})=>{
    const address=String(url),method=init.method||'GET';
    calls.push({address,method,body:init.body,headers:init.headers});
    if(address.includes('/auth/v1/user')) return Response.json({id:'11111111-1111-4111-8111-111111111111',email:'tester@example.com'});
    if(address.includes('/rest/v1/doweo_beta_feedback')&&method==='GET')
      return Response.json(Array.from({length:recent},()=>({id:'fake'})));
    if(address.includes('/rest/v1/doweo_beta_feedback')&&method==='POST')
      return Response.json([{id:'22222222-2222-4222-8222-222222222222'}],{status:201});
    if(address.includes('/rest/v1/doweo_beta_feedback')&&method==='PATCH')
      return new Response(null,{status:204});
    if(address.includes('api.resend.com/emails'))
      return emailOk
        ?Response.json({id:'33333333-3333-4333-8333-333333333333'})
        :Response.json({error:'not verified'},{status:403});
    throw Error('Unexpected mocked request: '+address);
  };
  return {calls,restore:()=>{globalThis.fetch=old;}};
}

test('GET only returns readiness, without credentials',async()=>{
  const request=new Request('https://doweo.pages.dev/api/beta-feedback');
  const inactive=await onRequest({request,env:{}});
  assert.equal((await inactive.json()).ready,false);
  const active=await onRequest({request,env:emailEnv});
  assert.deepEqual(await active.json(),{ready:true});
});

test('unauthenticated POST is rejected',async()=>{
  const request=new Request('https://doweo.pages.dev/api/beta-feedback',{
    method:'POST',body:JSON.stringify(submit)
  });
  const response=await onRequest({request,env:emailEnv});
  assert.equal(response.status,401);
});

test('POST without email configuration is rejected before storing data',async()=>{
  const mock=mockBackend();
  try {
    const response=await onRequest({
      request:makeRequest(),
      env:{SUPABASE_SERVICE_ROLE_KEY:'test-service-role-key'}
    });
    assert.equal(response.status,503);
    assert.equal(mock.calls.some(x=>x.method==='POST'),false);
  } finally { mock.restore(); }
});

test('valid feedback is saved, emailed, and recorded as delivered',async()=>{
  const mock=mockBackend();
  try {
    const response=await onRequest({request:makeRequest(),env:emailEnv});
    assert.equal(response.status,201);
    const json=await response.json();
    assert.equal(json.ok,true);
    assert.equal(json.email_sent,true);
    const send=mock.calls.find(x=>x.address.includes('api.resend.com/emails'));
    assert.ok(send);
    const sent=JSON.parse(send.body);
    assert.deepEqual(sent.to,['help.doweo@gmail.com']);
    assert.match(sent.text,/A button did not open/);
    assert.match(sent.text,/tester@example.com/);
    assert.match(sent.subject,/DoWeo feedback \| Bug report: Test feedback/);
    assert.match(sent.html,/<html lang='en'>/);
    assert.match(sent.html,/DoWeo/);
    assert.match(sent.html,/A button did not open/);
    assert.doesNotMatch(sent.text,/User ID:|Device:|Feedback ID:/);
    assert.doesNotMatch(sent.html,/11111111-1111-4111-8111-111111111111|Test browser/);
    assert.equal(sent.from,emailEnv.BETA_FEEDBACK_FROM_EMAIL);
    const patch=mock.calls.find(x=>x.method==='PATCH');
    assert.ok(patch);
    assert.equal(JSON.parse(patch.body).email_status,'sent');
  } finally { mock.restore(); }
});

test('provider failure is retained and accurately reported',async()=>{
  const mock=mockBackend({emailOk:false});
  try {
    const response=await onRequest({request:makeRequest(),env:emailEnv});
    assert.equal(response.status,202);
    const result=await response.json();
    assert.equal(result.ok,true);
    assert.equal(result.email_sent,false);
    const patch=mock.calls.find(x=>x.method==='PATCH');
    assert.equal(JSON.parse(patch.body).email_status,'failed');
  } finally { mock.restore(); }
});

test('limits signed-in accounts to five submissions in 24 hours',async()=>{
  const mock=mockBackend({recent:5});
  try {
    const response=await onRequest({request:makeRequest(),env:emailEnv});
    assert.equal(response.status,429);
    assert.equal(mock.calls.some(x=>x.method==='POST'),false);
  } finally { mock.restore(); }
});

test('rating must be an integer in range',async()=>{
  const mock=mockBackend();
  try {
    const response=await onRequest({
      request:makeRequest({...submit,category:'rating',rating:6}),
      env:emailEnv
    });
    assert.equal(response.status,400);
    assert.equal(mock.calls.some(x=>x.method==='POST'),false);
  } finally { mock.restore(); }
});

test('blocks mismatched origin before hitting authentication',async()=>{
  const request=new Request('https://doweo.pages.dev/api/beta-feedback',{
    method:'POST',
    headers:{Origin:'https://malicious.example',Authorization:'Bearer valid'},
    body:JSON.stringify(submit)
  });
  const response=await onRequest({request,env:emailEnv});
  assert.equal(response.status,403);
});


test('feature feedback safely escapes HTML, while retaining readable plain text',async()=>{
  const mock=mockBackend();
  try {
    const response=await onRequest({
      request:makeRequest({
        ...submit,
        category:'idea',
        title:'Better <nav> & "buttons"',
        details:'Please add <script>alert(1)</script> & easier transitions.'
      }),
      env:emailEnv
    });
    assert.equal(response.status,201);
    const send=mock.calls.find(x=>x.address.includes('api.resend.com/emails'));
    const sent=JSON.parse(send.body);
    assert.match(sent.subject,/Feature suggestion/);
    assert.match(sent.html,/Better &lt;nav&gt; &amp; &quot;buttons&quot;/);
    assert.match(sent.html,/&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
    assert.doesNotMatch(sent.html,/<script>/);
    assert.match(sent.text,/Please add <script>alert\(1\)<\/script>/);
    assert.doesNotMatch(sent.text,/Rating:/);
  } finally { mock.restore(); }
});

test('rating feedback includes a rating in the email without raw tracking metadata',async()=>{
  const mock=mockBackend();
  try {
    const response=await onRequest({
      request:makeRequest({...submit,category:'rating',rating:4}),
      env:emailEnv
    });
    assert.equal(response.status,201);
    const sent=JSON.parse(mock.calls.find(x=>x.address.includes('api.resend.com/emails')).body);
    assert.match(sent.subject,/App rating/);
    assert.match(sent.text,/Rating: 4 out of 5 stars/);
    assert.match(sent.html,/4\/5/);
    assert.doesNotMatch(sent.html,/Feedback ID|User ID|Device:/);
  } finally { mock.restore(); }
});
