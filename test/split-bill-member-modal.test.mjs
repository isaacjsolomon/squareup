import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync,mkdirSync} from 'node:fs';
import {extname,resolve} from 'node:path';
import {createServer} from 'node:http';
import {chromium} from 'playwright';

const apiSource=readFileSync(new URL('../functions/api/[[path]].js',import.meta.url),'utf8');
const modalSource=readFileSync(new URL('../doweo-split-bill-modal.js',import.meta.url),'utf8');
test('tracker detail returns backend canonical membership names for financial writes',()=>{
 assert.match(apiSource,/ledgerName:\s*m\.name/);
 assert.match(modalSource,/m\.ledgerName\|\|m\.name/);
 assert.match(modalSource,/closeOriginal\.click\(\)/);
});

test('real mobile Split Bill popup saves a 14-dollar split for members with different profile and ledger names',{timeout:120000},async()=>{
 const root=resolve(new URL('..',import.meta.url).pathname);
 const server=createServer((req,res)=>{
  const name=resolve(root,'.'+new URL(req.url,'http://localhost').pathname.replace(/\/$/,'/index.html'));
  if(!name.startsWith(root+'/')||!existsSync(name)){res.writeHead(404);res.end();return}
  res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json'})[extname(name)]||'application/octet-stream');
  const file=readFileSync(name);
  if(name.endsWith('/index.html')){
   res.end(file.toString('utf8').replace('</head>','<link rel="stylesheet" href="/doweo-split-bill-modal.css"></head>')
    .replace('</body>','<script defer src="/doweo-split-bill-modal.js"></script></body>'));
  }else res.end(file);
 });
 await new Promise(done=>server.listen(0,'127.0.0.1',done));
 const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 const userId='11111111-1111-4111-8111-111111111111',friendId='22222222-2222-4222-8222-222222222222',trackerId='33333333-3333-4333-8333-333333333333';
 const memberNames=['ledger_isaac','ledger_jordan'];
 const detail={id:trackerId,name:'Shared Dinners',role:'owner',memberCount:2,currency:'USD',
  members:[{id:userId,isYou:true,name:'Isaac Solomon',ledgerName:memberNames[0],role:'owner'},
   {id:friendId,isYou:false,name:'Jordan Friend',ledgerName:memberNames[1],role:'editor'}],
  entries:[],budget:null};
 const writes=[],errors=[];
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  await context.addInitScript(()=>sessionStorage.setItem('squareup_instagram_invite_shown_session_v2','yes'));
  await context.route('https://esm.sh/**',route=>route.fulfill({contentType:'text/javascript',body:'export function createClient(){const user={id:"'+userId+'",email:"test@example.test",email_confirmed_at:"2025-01-01",created_at:"2025-01-01",user_metadata:{full_name:"Isaac Solomon"},app_metadata:{provider:"email"}};return {auth:{getUser:async()=>({data:{user}}),getSession:async()=>({data:{session:{user,access_token:"test-only"}}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})},rpc:async()=>({data:[]})}}'}));
  await context.route(origin+'/api/**',async route=>{
   const request=route.request(),path=new URL(request.url()).pathname.slice(5),method=request.method();
   let data=[];
   if(path==='trackers'&&method==='GET')data=[detail];
   else if(path==='trackers/'+trackerId&&method==='GET')data=detail;
   else if(path==='profile'&&method==='GET')data={id:userId,username:'isaac',displayName:'Isaac Solomon'};
   else if(path==='trackers/'+trackerId+'/entries'&&method==='POST'){
    const payload=request.postDataJSON();
    writes.push(payload);
    if(!memberNames.includes(payload.from)||!memberNames.includes(payload.to)){
     await route.fulfill({status:400,json:{error:'Select tracker members.'}});return;
    }
    detail.entries.push({id:'44444444-4444-4444-8444-444444444444',...payload,paymentStatus:'confirmed'});
    data=detail;
   }
   await route.fulfill({json:data});
  });
  await context.route('https://**',route=>{
   const url=new URL(route.request().url());
   return url.hostname==='esm.sh'||url.origin===origin?route.fallback():route.abort();
  });
  const page=await context.newPage();
  page.on('pageerror',error=>errors.push(error.message));
  page.on('dialog',dialog=>dialog.accept());
  await page.goto(origin,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>typeof window.squareUpApi==='function',{timeout:30000});
  await page.locator('#auth-modal.open').waitFor({state:'hidden',timeout:30000});
  await page.evaluate(id=>window.sqOpenTrackerForWeo(id),trackerId);

  // Open using the original Split Bill button, not a test-only mock action.
  await page.evaluate(()=>document.getElementById('quick-split').click());
  const overlay=page.locator('#dw-split-modal'),form=page.locator('#split-page');
  await overlay.waitFor({state:'visible',timeout:10000});
  assert.equal(await overlay.getAttribute('role'),'dialog');
  assert.equal(await overlay.getAttribute('aria-modal'),'true');
  assert.equal(await form.evaluate(el=>el.parentElement.id),'dw-split-modal','original split workflow is mounted inside popup');
  const rect=await form.evaluate(el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,viewport:innerHeight,scroll:el.scrollHeight,css:getComputedStyle(el).position}});
  assert.ok(rect.y>=0 && rect.width<405 && rect.height<=rect.viewport,'popup is constrained to viewport rather than rendered below it');
  assert.equal(await page.locator('#dw-split-modal-close').isVisible(),true,'close button is visible');
  assert.equal(await page.locator('#dw-split-step-next').isVisible(),true,'guided mobile flow remains available');
  assert.match(await page.locator('#split-payers').textContent(),/Isaac Solomon/,'friendly profile display names remain visible');

  await page.locator('#split-description').fill('Lunch with friends');
  await page.locator('#split-total').fill('14');
  await page.locator('#split-payers input[type="radio"]').nth(1).check();
  await page.locator('#dw-split-step-next').click();
  await page.waitForFunction(()=>document.getElementById('split-page').dataset.splitStep==='2');
  await page.locator('#dw-split-step-next').click();
  await page.waitForFunction(()=>document.getElementById('split-page').dataset.splitStep==='3');
  assert.equal(await page.locator('#split-save').isVisible(),true,'Add to Tracker is visible inside popup');
  assert.equal(await page.locator('#split-save').isEnabled(),true);
  const total=await page.locator('#dw-split-total').textContent();
  assert.equal(total,'$14.00');
  mkdirSync(resolve(root,'test-results/split'),{recursive:true});
  await page.screenshot({path:resolve(root,'test-results/split/split-mobile-review.png')});
  await page.locator('#split-save').click();
  await page.waitForFunction(()=>document.getElementById('split-message').textContent.startsWith('Saved 1 expense'),{timeout:10000});
  assert.equal(writes.length,1,'one real entry is submitted, not duplicate writes');
  assert.equal(writes[0].from,memberNames[0],'debtor must use stored ledger name, never profile display name');
  assert.equal(writes[0].to,memberNames[1],'creditor must use stored ledger name, never profile display name');
  assert.equal(writes[0].amount,7,'payer and debtor shares are calculated correctly');
  await page.waitForFunction(()=>document.getElementById('dw-split-modal').hidden,{timeout:10000});
  assert.equal(await page.locator('#dw-split-modal').isVisible(),false,'popup closes after confirmed save');
  assert.ok(!errors.some(e=>/split|modal/i.test(e)),errors.join('\n'));

  // The same modal is also used at desktop widths.
  await page.setViewportSize({width:1280,height:900});
  await page.evaluate(()=>document.getElementById('quick-split').click());
  await overlay.waitFor({state:'visible'});
  assert.equal(await form.evaluate(el=>el.parentElement.id),'dw-split-modal');
  await page.locator('#dw-split-modal-close').click();
  await overlay.waitFor({state:'hidden'});
 }finally{await browser.close();await new Promise(done=>server.close(done))}
});
