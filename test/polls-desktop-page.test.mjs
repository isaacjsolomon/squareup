import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync,existsSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {chromium} from 'playwright';

// Load the complete application, including every inline script/style and its
// external runtime assets. Only authentication and network data are simulated.
// No production accounts or writes; the browser uses normal UI event handlers.
test('desktop Group polls moves out of Chat into Social and preserves create/vote controls', {timeout:120000}, async()=>{
 const root=resolve(new URL('..',import.meta.url).pathname);
 const server=createServer((req,res)=>{
  const path=resolve(root,'.'+new URL(req.url,'http://localhost').pathname.replace(/\/$/,'/index.html'));
  if(!path.startsWith(root+'/')||!existsSync(path)){res.writeHead(404);res.end();return;}
  const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css'};
  res.setHeader('Content-Type',types[extname(path)]||'application/octet-stream');res.end(readFileSync(path));
 });
 await new Promise(done=>server.listen(0,'127.0.0.1',done));
 const origin=process.env.BILLS_BASE_URL||'http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 const tracker='11111111-1111-4111-8111-111111111111',user='22222222-2222-4222-8222-222222222222',friend='33333333-3333-4333-8333-333333333333';
 const detail={id:tracker,name:'Weekend apartment',role:'owner',members:[{id:user,name:'Alex',isYou:true},{id:friend,name:'Jordan'}],entries:[],currency:'USD'};
 let bills=[{id:'44444444-4444-4444-8444-444444444444',name:'Electricity',amount:68,due:'2026-12-01',frequency:'monthly',kind:'bill',active:true,recurring_enabled:true},{id:'55555555-5555-4555-8555-555555555555',name:'Netflix',amount:20,due:'2026-12-05',frequency:'monthly',kind:'subscription',active:true,recurring_enabled:true}];
 let polls=[];
 const writes=[],errors=[];
 try{
  const context=await browser.newContext({viewport:{width:1440,height:1000}});
  await context.addInitScript(()=>{sessionStorage.setItem('squareup_instagram_invite_shown_session_v2','yes');});
  // A local fake auth SDK exercises the app's existing signed-in startup path.
  await context.route('https://esm.sh/**',route=>route.fulfill({contentType:'text/javascript',body:`export function createClient(){const user={id:'${user}',email:'alex@example.test',email_confirmed_at:'2025-01-01',created_at:'2025-01-01',user_metadata:{full_name:'Alex'},app_metadata:{provider:'email'}};return {auth:{getUser:async()=>({data:{user}}),getSession:async()=>({data:{session:{user,access_token:'test-only'}}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})},rpc:async()=>({data:[]})}}`}));
  await context.route(origin+'/api/**',async route=>{
   const req=route.request(),path=new URL(req.url()).pathname.slice(5),method=req.method();let data=[];
   if(path==='trackers')data=[detail];
   else if(path==='trackers/'+tracker)data=detail;
   else if(path==='trackers/'+tracker+'/polls'){
    if(method==='POST'){const body=req.postDataJSON();writes.push({method,body});polls=[{id:'poll-test',question:body.question,options:body.options.map((label,i)=>({id:'option-'+i,label,votes:0,mine:false})),totalVotes:0,canClose:true,closed:false}];data=polls[0];}else data=polls;
   }else if(path==='trackers/'+tracker+'/polls/poll-test'&&method==='PATCH'){
    const body=req.postDataJSON();writes.push({method,body});
    if(body.action==='vote'){polls[0].options.forEach(o=>{o.mine=o.id===body.optionId;o.votes=o.mine?1:0});polls[0].totalVotes=1;}
    if(body.action==='close')polls[0].closed=true;data=polls[0];
   }
   else if(path==='profile')data={id:user,username:'alex_test',displayName:'Alex'};
   else if(path==='trackers/'+tracker+'/bills'){
    if(method==='POST'){const body=req.postDataJSON();writes.push({method,body});const bill={...body,id:'66666666-6666-4666-8666-666666666666',active:true};bills.push(bill);data=bill;}else data=bills;
   }else if(path.startsWith('trackers/'+tracker+'/bills/')&&method==='PATCH'){
    const body=req.postDataJSON(),id=path.split('/').at(-1);writes.push({method,body});const bill=bills.find(x=>x.id===id);Object.assign(bill,body);data=bill;
   }
   await route.fulfill({json:data});
  });
  await context.route('https://**',route=>(new URL(route.request().url()).hostname==='esm.sh'||new URL(route.request().url()).origin===origin)?route.fallback():route.abort());
  const page=await context.newPage();page.on('pageerror',error=>errors.push(error.stack));
  await page.goto(origin,{waitUntil:'networkidle'});
  await page.waitForFunction(()=>typeof window.squareUpApi==='function');
  await page.locator('#auth-modal.open').waitFor({state:'hidden'});


  await page.evaluate(id=>window.openTracker(id),tracker);
  await page.locator('.dw-nav-social-trigger').click();
  await page.locator('#nav-group-polls').click();
  await page.locator('#dw-polls-page').waitFor();
  assert.equal(await page.locator('#chat-card #sq-chat-polls').count(),0,'polls removed from desktop Chat');
  assert.equal(await page.locator('#dw-polls-page #sq-chat-polls').count(),1,'original controls moved to own page');
  assert.equal(await page.locator('#tracker-dashboard').isVisible(),false,'polls is a separate page');
  await page.locator('#sq-poll-toggle').click();
  await page.getByLabel('Poll question',{exact:true}).fill('Where should we eat?');
  await page.getByLabel('First option',{exact:true}).fill('Pizza');
  await page.getByLabel('Second option',{exact:true}).fill('Sushi');
  await page.getByRole('button',{name:'Create poll',exact:true}).click();
  await page.locator('[data-poll-card-id="poll-test"]').waitFor();
  await page.locator('[data-option="option-0"]').click();
  await page.waitForFunction(()=>document.querySelector('[data-option="option-0"]').getAttribute('aria-pressed')==='true');
  assert.equal(writes.filter(w=>w.method==='POST').length,1);
  assert.ok(writes.some(w=>w.body.action==='vote'),'original vote handler saves');
  mkdirSync(resolve(root,'test-results/bills'),{recursive:true});
  await page.screenshot({path:resolve(root,'test-results/bills/group-polls-page.png'),fullPage:true});
  await page.getByRole('button',{name:'Close poll',exact:true}).click();
  await page.waitForFunction(()=>document.getElementById('sq-poll-list').textContent.includes('Closed'));
  await page.locator('.dw-nav-social-trigger').click();
  await page.locator('#nav-chat').click();
  assert.equal(await page.locator('#dw-polls-page').isVisible(),false,'Chat closes polls page');
  assert.equal(await page.locator('#chat-card #sq-chat-polls').count(),0);
  await page.screenshot({path:resolve(root,'test-results/bills/chat-without-polls.png'),fullPage:true});
  await page.locator('#nav-home').click();
  assert.ok(await page.locator('#sq-return-summary').isVisible(),'Home restores');
  await page.setViewportSize({width:390,height:844});
  await page.waitForFunction(()=>!!document.querySelector('#chat-card #sq-chat-polls'));
  assert.equal(await page.locator('#nav-group-polls').count(),0,'mobile navigation unchanged');
  console.log('POLLS_PAGE_ERRORS',JSON.stringify(errors));
 }finally{await browser.close();await new Promise(done=>server.close(done));}
});
