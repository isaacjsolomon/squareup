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
 const tracker2='77777777-7777-4777-8777-777777777777';
 const detail2={...detail,id:tracker2,name:'Second group'};
 const otherPoll={id:'other-poll',question:'A different group decision',options:[{id:'a',label:'Yes',votes:0},{id:'b',label:'No',votes:0}],totalVotes:0,totalMembers:2,closed:false,canManage:true};
 let polls=[];
 const writes=[],errors=[];
 try{
  const context=await browser.newContext({viewport:{width:1440,height:1000}});
  await context.addInitScript(()=>{sessionStorage.setItem('squareup_instagram_invite_shown_session_v2','yes');});
  // A local fake auth SDK exercises the app's existing signed-in startup path.
  await context.route('https://esm.sh/**',route=>route.fulfill({contentType:'text/javascript',body:`export function createClient(){const user={id:'${user}',email:'alex@example.test',email_confirmed_at:'2025-01-01',created_at:'2025-01-01',user_metadata:{full_name:'Alex'},app_metadata:{provider:'email'}};return {auth:{getUser:async()=>({data:{user}}),getSession:async()=>({data:{session:{user,access_token:'test-only'}}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})},rpc:async()=>({data:[]})}}`}));
  await context.route(origin+'/api/**',async route=>{
   const req=route.request(),path=new URL(req.url()).pathname.slice(5),method=req.method();let data=[];
   if(path==='trackers')data=[detail,detail2];
   else if(path==='trackers/'+tracker2)data=detail2;
   else if(path==='trackers/'+tracker2+'/polls')data=[otherPoll];
   else if(path==='trackers/'+tracker)data=detail;
   else if(path==='trackers/'+tracker+'/polls'){
    if(method==='POST'){
     const body=req.postDataJSON();writes.push({method,body});
     const item={id:'poll-'+(polls.length+1),question:body.question,endsAt:body.endsAt,createdAt:new Date().toISOString(),creatorName:'Alex',options:body.options.map((label,i)=>({id:'option-'+i,label,votes:0,mine:false})),totalVotes:0,totalMembers:2,votedMembers:0,pendingNames:['Alex','Jordan'],canClose:true,canManage:true,closed:false,archived:false};polls.push(item);data=item;
    }else data=polls;
   }else if(path.startsWith('trackers/'+tracker+'/polls/')&&method==='PATCH'){
    const body=req.postDataJSON(),item=polls.find(p=>p.id===path.split('/').at(-1));writes.push({method,body});
    if(body.action==='vote'){item.options.forEach(o=>{o.mine=o.id===body.optionId;o.votes=o.mine?1:0});item.totalVotes=1;item.votedMembers=1;item.pendingNames=['Jordan'];}
    if(body.action==='close')item.closed=true;
    if(body.action==='reopen')item.closed=false;
    if(body.action==='archive')item.archived=true;
    if(body.action==='restore')item.archived=false;
    if(body.action==='edit'){item.question=body.question;item.endsAt=body.endsAt;item.options=body.options.map((label,i)=>({id:'option-'+i,label,votes:0,mine:false}));}
    data={success:true};
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


  await page.evaluate(()=>document.getElementById('nav-trackers').click());
  await page.locator('#trackers-gallery .tile-open').first().click();
  await page.waitForFunction(()=>Boolean(window.sqLastOpenedTrackerDetail?.id));
  await page.locator('.dw-nav-social-trigger').click();
  await page.locator('#nav-group-polls').click();
  await page.locator('#dw-polls-page').waitFor();
  assert.equal(await page.locator('#chat-card #sq-chat-polls').count(),0,'polls removed from desktop Chat');
  assert.equal(await page.locator('#dw-polls-page #sq-chat-polls').count(),1,'original controls moved to own page');
  assert.equal(await page.locator('#tracker-dashboard').isVisible(),false,'polls is a separate page');
  await page.locator('#dw-poll-new').click();
  const editor=page.locator('#dw-poll-editor');
  await editor.getByLabel('Question',{exact:true}).fill('Where should we eat?');
  await editor.getByLabel('Option 1',{exact:true}).fill('Pizza');
  await editor.getByLabel('Option 2',{exact:true}).fill('Sushi');
  const future=new Date(Date.now()+86400000);const local=new Date(future.getTime()-future.getTimezoneOffset()*60000).toISOString().slice(0,16);
  await editor.getByLabel('Voting deadline (optional)',{exact:true}).fill(local);
  await editor.getByRole('button',{name:'Create poll',exact:true}).click();
  const first=page.locator('#dw-poll-cards [data-poll-card-id="poll-1"]');
  await first.waitFor();assert.ok(await first.getByText('0 of 2 members voted',{exact:true}).isVisible());
  assert.ok(writes[0].body.endsAt,'deadline sent to backend');
  await first.locator('.dw-poll-menu summary').click();
  await first.getByRole('button',{name:'Edit poll',exact:true}).click();
  await editor.getByLabel('Question',{exact:true}).fill('Where should we eat tonight?');
  await editor.getByRole('button',{name:'Save changes',exact:true}).click();
  await first.getByText('Where should we eat tonight?',{exact:true}).waitFor();
  await first.locator('[data-option="option-0"]').click();
  await page.waitForFunction(()=>document.querySelector('#dw-poll-cards [data-option="option-0"]').getAttribute('aria-pressed')==='true');
  assert.ok(await first.getByText('1 of 2 members voted',{exact:true}).isVisible());
  assert.ok(await first.getByText('100% · 1 vote',{exact:true}).isVisible());
  await first.locator('.dw-poll-pending summary').click();assert.ok(await first.getByText('Jordan',{exact:true}).isVisible());
  await first.locator('.dw-poll-menu summary').click();
  assert.ok(await first.getByRole('button',{name:'Edit poll',exact:true}).isDisabled());
  await first.getByRole('button',{name:'Close poll',exact:true}).click();
  await first.getByText('Winner: Pizza',{exact:true}).waitFor();
  assert.ok(await first.locator('[data-option="option-0"]').isDisabled());
  await page.locator('[data-poll-filter="open"]').click();assert.equal(await first.count(),0);
  await page.locator('[data-poll-filter="closed"]').click();await first.waitFor();
  await first.locator('.dw-poll-menu summary').click();
  await first.getByRole('button',{name:'Reopen poll',exact:true}).click();
  await page.locator('[data-poll-filter="all"]').click();await first.waitFor();
  await first.locator('.dw-poll-menu summary').click();
  await first.getByRole('button',{name:'Duplicate poll',exact:true}).click();
  assert.equal(await editor.getByLabel('Question',{exact:true}).inputValue(),'Where should we eat tonight?');
  await editor.getByLabel('Question',{exact:true}).fill('Next meal?');
  await editor.getByRole('button',{name:'Create poll',exact:true}).click();
  await page.locator('#dw-poll-cards [data-poll-card-id="poll-2"]').waitFor();
  await first.locator('.dw-poll-menu summary').click();
  await first.getByRole('button',{name:'Archive poll',exact:true}).click();
  await first.waitFor({state:'detached'});
  await page.locator('[data-poll-filter="archived"]').click();await first.waitFor();
  await first.locator('.dw-poll-menu summary').click();await first.getByRole('button',{name:'Restore poll',exact:true}).click();
  await first.waitFor({state:'detached'});await page.locator('[data-poll-filter="all"]').click();
  polls[1].endsAt='2020-01-01T00:00:00Z';
  await page.evaluate(()=>window.sqLoadChatPolls());
  const expired=page.locator('#dw-poll-cards [data-poll-card-id="poll-2"]');
  assert.ok(await expired.locator('[data-option="option-0"]').isDisabled(),'expired poll disables voting without a reload');
  mkdirSync(resolve(root,'test-results/bills'),{recursive:true});
  await page.screenshot({path:resolve(root,'test-results/bills/group-polls-upgraded.png'),fullPage:true});
  const selector=page.getByRole('combobox',{name:'Switch polls tracker',exact:true});
  assert.ok(await selector.isVisible());
  await selector.selectOption(tracker2);
  await page.waitForFunction(()=>document.getElementById('dw-polls-tracker').textContent==='Second group');
  await page.locator('#dw-poll-cards [data-poll-card-id="other-poll"]').waitFor();
  assert.equal(await first.count(),0,'previous tracker polls cleared');
  assert.ok(await page.locator('#dw-polls-page').isVisible(),'switch keeps polls page open');
  assert.equal(await page.locator('#dw-inline-tracker-picker').isVisible(),false,'top header remains unchanged');
  await selector.selectOption(tracker);
  await first.waitFor();
  assert.equal(await page.locator('#dw-poll-cards [data-poll-card-id="other-poll"]').count(),0);
  assert.equal(await page.locator('#dw-polls-tracker').textContent(),'Weekend apartment');
  const placement=await selector.evaluate(select=>{
   const box=e=>{const r=e.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom}};
   return {picker:box(select),title:box(document.querySelector('.dw-polls-heading>div:first-child')),create:box(document.getElementById('dw-poll-new'))};
  });
  assert.ok(placement.picker.left>=placement.title.right,'switcher is centered after title');
  assert.ok(placement.picker.right<=placement.create.left,'switcher does not overlap New poll');
  await page.screenshot({path:resolve(root,'test-results/bills/group-polls-tracker-switcher.png'),fullPage:true});

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
