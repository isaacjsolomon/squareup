import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync,existsSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {chromium} from 'playwright';
test('mobile More destinations are isolated full pages with intact navigation',{timeout:120000},async()=>{
 const root=resolve(new URL('..',import.meta.url).pathname);
 const server=createServer((req,res)=>{
  const path=resolve(root,'.'+new URL(req.url,'http://localhost').pathname.replace(/\/$/,'/index.html'));
  if(!path.startsWith(root+'/')||!existsSync(path)){res.writeHead(404);res.end();return}
  const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.png':'image/png'};
  res.setHeader('Content-Type',types[extname(path)]||'application/octet-stream');
  const bytes=readFileSync(path);
  if(path.endsWith('/index.html')){
    const html=bytes.toString('utf8')
      .replace('</head>','<link rel="stylesheet" href="/doweo-mobile-more-pages.css"></head>')
      .replace('</body>','<script defer src="/doweo-mobile-more-pages.js"></script></body>');
    res.end(html);
  }else res.end(bytes);
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
  await page.waitForFunction(()=>Boolean(document.getElementById('dw-mobile-legal-page')));
  assert.equal(await page.locator('#sq-mobile-more-sheet [data-sq-destination="sq-finance-nav"]').count(),0,
    'retired Financial Hub is not a More destination');
  const more=page.locator('#sq-mobile-more');
  const visit=async(id)=>{
    await page.evaluate(()=>document.getElementById('nav-home')?.click());
    await more.click();
    await page.locator('#sq-mobile-more-sheet [data-sq-destination="'+id+'"]').evaluate(el=>el.click());
    await page.waitForTimeout(180);
  };
  for(const [id,section] of [
    ['nav-profile','#settings-page'],
    ['nav-about','#about-page'],
    ['nav-analytics','#analytics-page'],
    ['sq-mobile-notifications','#notifications-page'],
    ['sqev-nav','#sqev-view']
  ]){
    await visit(id);
    const debug=await page.locator('#tracker-dashboard').evaluate(el=>({
      classes:document.body.className,
      style:el.getAttribute('style'),
      display:getComputedStyle(el).display,
      matchingMedia:matchMedia('(max-width:900px)').matches,
      loaded:[...document.styleSheets].map(s=>s.href).filter(Boolean).filter(x=>x.includes('mobile-more')),
      cssRules:[...document.styleSheets].filter(s=>s.href?.includes('mobile-more')).flatMap(s=>{try{return [...s.cssRules].map(r=>r.cssText.slice(0,350))}catch{return []}}).slice(0,4)
    }));
    console.log('MORE_VISIBILITY_DEBUG',id,JSON.stringify(debug));
    assert.equal(await page.locator('#tracker-dashboard').isVisible(),false,id+' must not show Home above the page');
    assert.ok(await page.locator(section).isVisible(),id+' destination is visible');
    const top=await page.locator(section).evaluate(el=>el.getBoundingClientRect().top);
    assert.ok(top>=-2&&top<300,id+' starts as an actual page, not below Home: '+top);
    const footer=await page.locator('.sq-mobile-nav').evaluate(el=>el.getBoundingClientRect().bottom);
    assert.ok(Math.abs(footer-844)<2,'mobile bottom bar stays anchored');
  }
  await visit('nav-privacy-terms');
  assert.ok(await page.locator('#dw-mobile-legal-page').isVisible(),'Privacy and Terms has its own page');
  assert.equal(await page.locator('#tracker-dashboard').isVisible(),false,'Privacy and Terms replaces Home');
  assert.equal(await page.locator('#dw-legal-links-dialog').isVisible(),false,'old overlay is not used');
  assert.equal(await page.locator('#dw-mobile-legal-page a[href="/privacy/"]').count(),1);
  assert.equal(await page.locator('#dw-mobile-legal-page a[href="/terms/"]').count(),1);
  await page.locator('#dw-mobile-legal-page .dw-mobile-more-back').click();
  assert.ok(await page.locator('#sq-mobile-more-sheet').isVisible(),'Back from Privacy and Terms returns to More');
  await page.locator('#sq-mobile-more-sheet [data-sq-close]').first().click();
  await page.evaluate(()=>document.getElementById('nav-home')?.click());
  await more.click();
  await page.locator('#sq-mobile-more-sheet [data-sq-social-open]').evaluate(el=>el.click());
  assert.ok(await page.locator('#dw-mobile-social-page').isVisible(),'Social gets a standalone page');
  assert.equal(await page.locator('#tracker-dashboard').isVisible(),false,'Social does not reveal Home');
  assert.ok(await page.locator('#dw-mobile-social-page button').count()>=3,'Social retains Friends and Chat');
  await page.locator('#dw-mobile-social-page .dw-mobile-more-back').click();
  assert.ok(await page.locator('#sq-mobile-more-sheet').isVisible(),'Back from Social returns to More');
  await page.locator('#sq-mobile-more-sheet [data-sq-close]').first().click();
  await page.evaluate(()=>document.getElementById('nav-home')?.click());
  assert.equal(await page.locator('#tracker-dashboard').isVisible(),true,'Home still works after leaving More');

 }finally{await browser.close();await new Promise(resolve=>server.close(resolve))}
});
