import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync} from 'node:fs';
import {chromium} from 'playwright';

const source=readFileSync(new URL('../doweo-beta-nudge.js',import.meta.url),'utf8');
const style=readFileSync(new URL('../doweo-beta-nudge.css',import.meta.url),'utf8');
function fixture(){
 return '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">'
 +'<style>'+style+'</style></head><body>'
 +'<button id="dw-beta-launch" style="display:inline-flex" type="button">Beta Feedback</button>'
 +'<div id="sq-mobile-more-sheet"><button id="dw-beta-more-action" style="display:flex" type="button">Beta Feedback</button></div>'
 +'<div id="dw-beta-modal" hidden><div role="dialog"><button data-kind="bug">Bug</button><button data-kind="idea">Idea</button><button data-kind="rating">Rating</button></div></div>'
 +'<script>window.feedbackType="";for(const e of document.querySelectorAll("[data-kind]"))e.addEventListener("click",()=>window.feedbackType=e.dataset.kind);'
 +'for(const id of ["dw-beta-launch","dw-beta-more-action"])document.getElementById(id).addEventListener("click",()=>document.getElementById("dw-beta-modal").hidden=false);</script>'
 +'<script src="/doweo-beta-nudge.js"></script></body></html>';
}
test('the invitation waits seven minutes and opens the existing feedback form',{timeout:30000},async()=>{
 const server=createServer((req,res)=>{
  res.setHeader('Content-Type','text/html; charset=utf-8');
  if(req.url==='/doweo-beta-nudge.js'){res.setHeader('Content-Type','text/javascript');res.end(source);}
  else res.end(fixture());
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const url='http://127.0.0.1:'+server.address().port+'/';
 const browser=await chromium.launch({headless:true});
 try{
  for(const mobile of [false,true]){
   const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1250,height:820}});
   await context.addInitScript(()=>sessionStorage.setItem('dw-beta-nudge-active-v1',String(7*60*1000)));
   try{
    const page=await context.newPage();
    await page.goto(url,{waitUntil:'load'});
    await page.locator('#dw-beta-nudge:not([hidden])').waitFor();
    assert.ok(await page.locator('#dw-beta-nudge .dw-beta-nudge-panel').isVisible());
    await page.locator('[data-dw-beta-topic="bug"]').click();
    await page.locator('.dw-beta-nudge-give').click();
    assert.equal(await page.locator('#dw-beta-modal').evaluate(el=>el.hidden),false);
    assert.equal(await page.evaluate(()=>window.feedbackType),'bug');
    assert.equal(await page.evaluate(()=>sessionStorage.getItem('dw-beta-nudge-seen-v1')),'1');
    await page.reload({waitUntil:'load'});
    assert.equal(await page.locator('#dw-beta-nudge').evaluate(el=>el.hidden),true,'must not show again in session');
   }finally{await context.close()}
  }
  const fresh=await browser.newContext({viewport:{width:1250,height:820}});
  try{
   const page=await fresh.newPage();await page.goto(url,{waitUntil:'load'});
   assert.equal(await page.locator('#dw-beta-nudge').evaluate(el=>el.hidden),true,'initial view must not show a prompt');
   assert.equal(await page.evaluate(()=>Number(sessionStorage.getItem('dw-beta-nudge-active-v1'))<7*60*1000),true);
  }finally{await fresh.close()}
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve))}
});
