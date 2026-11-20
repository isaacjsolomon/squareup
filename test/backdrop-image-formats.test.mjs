import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync,existsSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {chromium} from 'playwright';

const root=resolve(new URL('..',import.meta.url).pathname);
const converter=readFileSync(resolve(root,'doweo-backdrop-images.js'),'utf8');
const workflow=readFileSync(resolve(root,'.github/workflows/deploy-doweo-pages.yml'),'utf8');
const app=readFileSync(resolve(root,'index.html'),'utf8');

test('the existing Backdrop flow uses the converter and keeps the server JPEG contract',()=>{
 assert.match(app,/id="backdrop-file" accept="image\/\*,\.heic/);
 assert.match(app,/window\.DoWeoBackdropImages\.prepareBackdrop/);
 assert.match(app,/headers:\s*await authHeaders\(\{\s*"Content-Type":\s*"image\/jpeg"/);
});
test('the deployment bundles both local decoders, and conversion runs before upload',()=>{
 for(const path of ['doweo-backdrop-images.js','third_party/UTIF.js','third_party/heic2any.min.js'])
  assert.ok(existsSync(resolve(root,path)),path+' must exist');
 assert.match(workflow,/\.pages-output\/third_party/);
 assert.match(workflow,/\/doweo-backdrop-images\.js\?v=/);
 assert.match(converter,/toJpeg\(canvas,quality\)/);
 assert.match(converter,/MAX_JPEG_BYTES/);
});

function tiff1x1(){
 const bytes=new Uint8Array(136),v=new DataView(bytes.buffer);
 const u16=(offset,n)=>v.setUint16(offset,n,true),u32=(offset,n)=>v.setUint32(offset,n,true);
 bytes[0]=73;bytes[1]=73;u16(2,42);u32(4,8);u16(8,9);
 const e=(i,tag,type,count,value)=>{const p=10+i*12;u16(p,tag);u16(p+2,type);u32(p+4,count);if(type===3&&count===1){u16(p+8,value);u16(p+10,0)}else u32(p+8,value)};
 e(0,256,4,1,1);e(1,257,4,1,1);e(2,258,3,3,122);
 e(3,259,3,1,1);e(4,262,3,1,2);e(5,273,4,1,128);
 e(6,277,3,1,3);e(7,278,4,1,1);e(8,279,4,1,3);
 u32(118,0);
 u16(122,8);u16(124,8);u16(126,8);
 bytes[128]=12;bytes[129]=130;bytes[130]=230;
 return bytes;
}
test('real Chromium converts PNG, GIF, SVG, TIFF and HEIC fallback to safe JPEG',{timeout:85000},async()=>{
 const server=createServer((req,res)=>{
  const url=new URL(req.url,'http://local');
  if(url.pathname==='/'){res.end('<!doctype html><title>Image decoder test</title><script defer src="/doweo-backdrop-images.js"></script>');return}
  const path=resolve(root,'.'+url.pathname);
  if(!path.startsWith(root+'/')||!existsSync(path)){res.writeHead(404);res.end();return}
  res.setHeader('Content-Type',extname(path)==='.js'?'text/javascript':'text/plain');
  res.end(readFileSync(path));
 });
 await new Promise(done=>server.listen(0,'127.0.0.1',done));
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 try{
  const page=await browser.newPage();
  await page.goto('http://127.0.0.1:'+server.address().port,{waitUntil:'load'});
  await page.waitForFunction(()=>typeof window.DoWeoBackdropImages?.prepareBackdrop==='function');
  const formats=await page.evaluate(async(tiff)=>{
   const photoCanvas=document.createElement('canvas');
   photoCanvas.width=32;photoCanvas.height=16;
   const ctx=photoCanvas.getContext('2d');
   ctx.fillStyle='#00aaff';ctx.fillRect(0,0,32,16);
   const png=await new Promise(done=>photoCanvas.toBlob(done,'image/png'));
   const gif=Uint8Array.from(atob('R0lGODdhAgACAIEAAACA/wAAAAAAAAAAACwAAAAAAgACAAAIBgABCAQQEAA7'),c=>c.charCodeAt(0));
   const svg=new Blob(['<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10" fill="red"/></svg>'],{type:'image/svg+xml'});
   const formats=[
    new File([png],'test.png',{type:'image/png'}),
    new File([gif],'test.gif',{type:'image/gif'}),
    new File([svg],'test.svg',{type:'image/svg+xml'}),
    new File([new Uint8Array(tiff)],'test.tiff',{type:'image/tiff'})
   ];
   const outputs=[];
   for(const file of formats){
    const result=await window.DoWeoBackdropImages.prepareBackdrop(file);
    const bytes=new Uint8Array(await result.slice(0,3).arrayBuffer());
    outputs.push({name:file.name,type:result.type,size:result.size,header:Array.from(bytes),converted:result.size<4.6*1024*1024});
   }
   // Assert the HEIC fallback with the exact decoder signature, even on browsers
   // without native HEIF support. The bundled heic2any decoder is tested for load below.
   const original=window.heic2any;
   window.heic2any=async({toType})=>{if(toType!=='image/jpeg')throw Error('wrong output');return png};
   try{
    const heic=new File([new Uint8Array([1,2,3,4])],'iphone.HEIC',{type:'image/heic'});
    const result=await window.DoWeoBackdropImages.prepareBackdrop(heic);
    outputs.push({name:'iphone.HEIC',type:result.type,size:result.size,header:Array.from(new Uint8Array(await result.slice(0,3).arrayBuffer())),converted:true});
   }finally{if(original)window.heic2any=original;else delete window.heic2any}
   let bad='';
   try{await window.DoWeoBackdropImages.prepareBackdrop(new File([new Uint8Array([4,6,8])],'bad.jpg',{type:'image/jpeg'}))}
   catch(err){bad=err.message}
   return {outputs,bad};
  },Array.from(tiff1x1()));
  for(const image of formats.outputs){
   assert.equal(image.type,'image/jpeg',image.name);
   assert.deepEqual(image.header,[255,216,255],image.name+' JPEG magic');
   assert.ok(image.converted&&image.size>0,image.name+' is upload-sized');
  }
  assert.equal(formats.outputs.length,5);
  assert.match(formats.bad,/cannot be opened|could not be decoded/i);
  // The actual minified HEIC decoder must load locally (no external CDN).
  await page.addScriptTag({url:'http://127.0.0.1:'+server.address().port+'/third_party/heic2any.min.js'});
  assert.equal(await page.evaluate(()=>typeof window.heic2any),'function');
  await page.close();
 }finally{await browser.close();await new Promise(done=>server.close(done))}
});


test('existing Backdrop picker converts uploaded GIF to JPEG before saving to the tracker',{timeout:90000},async()=>{
 const trackerId='11111111-1111-4111-8111-111111111111';
 const userId='22222222-2222-4222-8222-222222222222';
 const tracker={id:trackerId,name:'Photo Tracker',role:'owner',currency:'USD',memberCount:1,
  members:[{id:userId,name:'Alex',ledgerName:'Alex',isYou:true,role:'owner'}],
  entries:[],backdrop:{preset:'indigo',photo:null}};
 const writes=[];
 const server=createServer((req,res)=>{
  const url=new URL(req.url,'http://local');
  const path=resolve(root,'.'+url.pathname.replace(/\/$/,'/index.html'));
  if(!path.startsWith(root+'/')||!existsSync(path)){res.writeHead(404);res.end();return}
  res.setHeader('Content-Type',({'.html':'text/html','.css':'text/css','.js':'text/javascript','.mjs':'text/javascript'})[extname(path)]||'application/octet-stream');
  const raw=readFileSync(path);
  if(path.endsWith('/index.html')){
   res.end(raw.toString('utf8').replace('</body>','<script defer src="/doweo-backdrop-images.js"></script></body>'));
  }else res.end(raw);
 });
 await new Promise(done=>server.listen(0,'127.0.0.1',done));
 const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 try{
  const context=await browser.newContext({viewport:{width:1440,height:900}});
  await context.addInitScript(()=>sessionStorage.setItem('squareup_instagram_invite_shown_session_v2','yes'));
  await context.route('https://esm.sh/**',route=>route.fulfill({contentType:'text/javascript',body:
   'export function createClient(){const user={id:"'+userId+'",email:"alex@example.test",email_confirmed_at:"2025-01-01",created_at:"2025-01-01",user_metadata:{full_name:"Alex"},app_metadata:{provider:"email"}};return {auth:{getUser:async()=>({data:{user}}),getSession:async()=>({data:{session:{user,access_token:"test"}}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})},rpc:async()=>({data:[]})}}'}));
  await context.route(origin+'/api/**',async route=>{
   const request=route.request(),url=new URL(request.url()),path=url.pathname.slice(5);
   if(request.method()==='PUT'&&path==='trackers/'+trackerId+'/backdrop'){
    const bytes=await request.body();
    writes.push({contentType:request.headers()['content-type'],body:bytes});
    await route.fulfill({json:tracker});return;
   }
   let data=[];
   if(path==='trackers')data=[tracker];
   else if(path==='trackers/'+trackerId)data=tracker;
   else if(path==='profile')data={id:userId,displayName:'Alex',username:'alex'};
   await route.fulfill({json:data});
  });
  await context.route('https://**',route=>{
   const url=new URL(route.request().url());
   return url.hostname==='esm.sh'||url.origin===origin?route.fallback():route.abort();
  });
  const page=await context.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>typeof window.squareUpApi==='function',{timeout:30000});
  await page.locator('#auth-modal.open').waitFor({state:'hidden',timeout:30000});
  await page.evaluate(id=>window.sqOpenTrackerForWeo(id),trackerId);
  await page.evaluate(()=>document.getElementById('btn-backdrop').click());
  await page.locator('#backdrop-modal.open').waitFor({state:'visible'});
  const gif=Buffer.from('R0lGODdhAgACAIEAAACA/wAAAAAAAAAAACwAAAAAAgACAAAIBgABCAQQEAA7','base64');
  await page.locator('#backdrop-file').setInputFiles({name:'favorite.gif',mimeType:'image/gif',buffer:gif});
  await page.waitForFunction(()=>document.querySelector('#backdrop-msg')?.textContent?.includes('Backdrop updated'),{timeout:30000});
  assert.equal(writes.length,1,'exactly one upload');
  assert.equal(writes[0].contentType,'image/jpeg');
  assert.ok(writes[0].body.length<5*1024*1024);
  assert.deepEqual([...writes[0].body.subarray(0,3)],[255,216,255],'server receives actual JPEG bytes');
  assert.ok(!errors.some(e=>/backdrop|photo|decoder/i.test(e)),errors.join('\n'));
  await page.close();
 }finally{await browser.close();await new Promise(done=>server.close(done))}
});
