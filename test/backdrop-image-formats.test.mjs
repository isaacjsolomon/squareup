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
   const gif=Uint8Array.from(atob('R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs='),c=>c.charCodeAt(0));
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
