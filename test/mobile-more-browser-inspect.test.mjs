import test from 'node:test';
import {createServer} from 'node:http';
import {readFileSync,existsSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {chromium} from 'playwright';
test('inspect More page routing at mobile widths',{timeout:120000},async()=>{
 const root=resolve(new URL('..',import.meta.url).pathname);
 const server=createServer((req,res)=>{
  const path=resolve(root,'.'+new URL(req.url,'http://localhost').pathname.replace(/\/$/,'/index.html'));
  if(!path.startsWith(root+'/')||!existsSync(path)){res.writeHead(404);res.end();return}
  const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.png':'image/png'};
  res.setHeader('Content-Type',types[extname(path)]||'application/octet-stream');res.end(readFileSync(path));
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true});
 const uid='22222222-2222-4222-8222-222222222222',tid='11111111-1111-4111-8111-111111111111';
 const tracker={id:tid,name:'Test expenses',role:'owner',memberCount:2,members:[{id:uid,name:'Alex',isYou:true},{id:'33333333-3333-4333-8333-333333333333',name:'Jordan'}],entries:[],currency:'USD'};
 try{
  const ctx=await browser.newContext({viewport:{width:390,height:844}});
  await ctx.addInitScript(()=>sessionStorage.setItem('squareup_instagram_invite_shown_session_v2','yes'));
  await ctx.route('https://esm.sh/**',route=>route.fulfill({contentType:'text/javascript',body:'export function createClient(){const user={id:"'+uid+'",email:"alex@example.test",email_confirmed_at:"2025-01-01",created_at:"2025-01-01",user_metadata:{full_name:"Alex"},app_metadata:{provider:"email"}};return {auth:{getUser:async()=>({data:{user}}),getSession:async()=>({data:{session:{user,access_token:"test"}}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})},rpc:async()=>({data:[]})}}'}));
  await ctx.route(origin+'/api/**',async route=>{
   let path=new URL(route.request().url()).pathname.slice(5),data=[];
   if(path==='trackers')data=[tracker];
   else if(path==='trackers/'+tid)data=tracker;
   else if(path==='profile')data={id:uid,username:'alex_test',displayName:'Alex'};
   await route.fulfill({json:data});
  });
  await ctx.route('https://**',route=>{
    const url=new URL(route.request().url());
    return url.origin===origin||url.hostname==='esm.sh'?route.fallback():route.abort();
  });
  const page=await ctx.newPage();
  await page.goto(origin,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>typeof window.squareUpApi==='function');
  await page.locator('#auth-modal.open').waitFor({state:'hidden',timeout:30000});
  const inspect=async(dest)=>{
   const info=await page.evaluate(()=>{
    const sel=['#tracker-dashboard','#settings-page','#about-page','#notifications-page','#analytics-page','#friends-page','#sq-nextgen','#sqev-page','#sqev-root','#sq-events-page','#dw-legal-links-dialog','#sq-mobile-more-sheet','#trackers-page','#sq-mobile-top','#dw-mobile-chat-screen','#sq-mobile-chat-page'];
    return {
      body:document.body.className,scrollY,hash:location.hash,search:location.search,
      visible:sel.map(selector=>{const n=document.querySelector(selector);return n?{selector,display:getComputedStyle(n).display,rects:n.getClientRects().length,hidden:n.hidden,top:Math.round(n.getBoundingClientRect().top),parent:n.parentElement?.tagName+'#'+(n.parentElement?.id||'')+'.'+(n.parentElement?.className||'')}:null}).filter(Boolean),
      mainChildren:[...document.querySelectorAll('.wrap > *')].map(n=>({tag:n.tagName,id:n.id,cls:String(n.className).slice(0,85),display:getComputedStyle(n).display,rects:n.getClientRects().length})).slice(0,25)
    };
   });
   console.log('ROUTE_INSPECT',dest,JSON.stringify(info));
  };
  await inspect('initial');
  const choices=['nav-profile','nav-about','nav-analytics','sq-mobile-notifications','sqev-nav','nav-privacy-terms','nav-friends','nav-chat'];
  for(const id of choices){
   await page.evaluate(()=>document.getElementById('nav-home')?.click());
   await page.locator('#sq-mobile-more').click();
   const target=page.locator('#sq-mobile-more-sheet [data-sq-destination="'+id+'"]');
   if(await target.count()){await target.evaluate(el=>el.click());await page.waitForTimeout(200);await inspect(id);}
  }
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve))}
});
