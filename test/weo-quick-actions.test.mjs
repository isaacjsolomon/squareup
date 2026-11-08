import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script} from 'node:vm';
import {onRequest} from '../functions/api/ai-chat.js';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const html=read('index.html');
const actions=read('weo-actions.js');
const css=read('weo-actions.css');
const workflow=read('.github/workflows/deploy-doweo-pages.yml');
const aiScript=html.match(/<script id="sq-ai-script">([\s\S]*?)<\/script>/)?.[1];

test('Weo actions and existing AI script parse and are included in Pages deployment',()=>{
 assert.ok(aiScript);
 assert.doesNotThrow(()=>new Script(actions));
 assert.doesNotThrow(()=>new Script(aiScript));
 assert.match(html,/<link rel="stylesheet" href="\/weo-actions\.css"/);
 assert.match(html,/<script src="\/weo-actions\.js" defer><\/script>/);
 assert.match(workflow,/weo-actions\.js weo-actions\.css/);
});

test('Four actions are real controls, and tracker actions reuse existing navigation',()=>{
 for(const kind of ['image','poll','chat','expense'])assert.match(actions,new RegExp("'"+kind+"'"));
 assert.match(actions,/fileInput\.click\(\)/);
 assert.match(actions,/window\.squareUpApi\('trackers'\)/);
 assert.match(actions,/window\.openTracker\(id\)/);
 assert.match(actions,/document\.getElementById\('nav-chat'\)/);
 assert.match(actions,/document\.getElementById\('quick-expense'\)/);
 assert.match(actions,/document\.getElementById\('sq-poll-toggle'\)/);
 assert.match(actions,/document\.getElementById\('sq-poll-compose'\)/);
 assert.match(actions,/if\(compose&&!compose\.classList\.contains\('open'\)\)/);
 assert.match(actions,/No expense or poll is posted automatically/);
});

test('Image attachments remain temporary and are attached to actual chat POST',()=>{
 assert.match(actions,/file\.size>8\*1024\*1024/);
 assert.match(actions,/canvas\.toBlob\(resolve,'image\/jpeg',quality\)/);
 assert.match(actions,/blob\.size<=900000/);
 assert.match(actions,/URL\.revokeObjectURL\(src\)/);
 assert.match(actions,/pendingImage=null/);
 assert.match(html,/window\.WeoActions\?\.takeImage\?\.\(\)/);
 assert.match(html,/imageData\?\{messages,image:imageData\}:\{messages\}/);
 assert.match(html,/ask\(q,true,imageData\)/);
 assert.match(html,/weo-attached-image/);
 assert.doesNotMatch(actions,/localStorage|sessionStorage|chat-photo|supabase\.co/);
});

test('Mobile keyboard hides quick actions, while tracker selection supports Escape',()=>{
 assert.match(css,/#sq-ai-window\.weo-typing \.weo-quick-actions\{display:none!important\}/);
 assert.match(css,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(actions,/event\.key==='Escape'/);
 assert.match(actions,/event\.key==='Tab'/);
 assert.match(actions,/prompt\.addEventListener\('focus',hideWhenTyping\)/);
 assert.match(actions,/aria-modal="true"/);
});

const env=(run)=>({SUPABASE_SERVICE_ROLE_KEY:'test-key',AI:{run}});
const build=(data,user='test-user')=>new Request('https://doweo.pages.dev/api/ai-chat',{
 method:'POST',
 headers:{'Authorization':'Bearer '+user,'Origin':'https://doweo.pages.dev','Content-Type':'application/json'},
 body:JSON.stringify(data)
});
const sample={messages:[{role:'user',content:'Please help with this image.'}]};
const tinyImage='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAOZgGFcAAAAASUVORK5CYII=';
function fakeAuth(){
 const before=globalThis.fetch;
 globalThis.fetch=async url=>{
  if(String(url).includes('/auth/v1/user'))return Response.json({id:'00000000-0000-4000-8000-000000000001'});
  throw Error('Unexpected HTTP fetch: '+String(url));
 };
 return ()=>{globalThis.fetch=before;};
}

test('Text-only chat keeps existing model and simple message contents',async()=>{
 const restore=fakeAuth();let called;
 try{
  const result=await onRequest({
   request:build(sample),
   env:env(async (model,opts)=>{called={model,opts};return {response:'Hello from Weo'};})
  });
  assert.equal(result.status,200);
  assert.equal((await result.json()).reply,'Hello from Weo');
  assert.equal(called.model,'@cf/meta/llama-3.3-70b-instruct-fp8-fast');
  assert.equal(called.opts.messages.at(-1).content,'Please help with this image.');
 }finally{restore();}
});

test('Image chat uses a multimodal model and includes one trusted data URL',async()=>{
 const restore=fakeAuth();let called;
 try{
  const result=await onRequest({
   request:build({...sample,image:tinyImage}),
   env:env(async (model,opts)=>{called={model,opts};return {response:'I see an image.'};})
  });
  assert.equal(result.status,200);
  assert.equal((await result.json()).reply,'I see an image.');
  assert.equal(called.model,'@cf/meta/llama-4-scout-17b-16e-instruct');
  const content=called.opts.messages.at(-1).content;
  assert.equal(content[0].type,'text');
  assert.equal(content[1].type,'image_url');
  assert.equal(content[1].image_url.url,tinyImage);
  assert.equal(called.opts.messages.length,2);
 }finally{restore();}
});

test('Invalid file formats and oversized images are rejected before AI runs',async()=>{
 const restore=fakeAuth();let calls=0;
 try{
  const runtime=env(async()=>{calls++;return {response:'should never happen'};});
  const svg=await onRequest({request:build({...sample,image:'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4='}),env:runtime});
  assert.equal(svg.status,400);
  const huge=await onRequest({request:build({...sample,image:'data:image/jpeg;base64,'+'A'.repeat(1550000)}),env:runtime});
  assert.equal(huge.status,413);
  assert.equal(calls,0);
 }finally{restore();}
});

test('Vision inference failures are reported rather than claiming success',async()=>{
 const restore=fakeAuth();
 try{
  const result=await onRequest({
   request:build({...sample,image:tinyImage}),
   env:env(async()=>{throw new Error('model unavailable')})
  });
  assert.equal(result.status,503);
  assert.match((await result.json()).error,/could not analyze that image/i);
 }finally{restore();}
});
