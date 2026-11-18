import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chromium} from 'playwright';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const scripts=['doweo-finance-planning.js','doweo-trips-activity.js','doweo-paylinks-currency.js'].map(name=>readFileSync(new URL('../'+name,import.meta.url),'utf8'));
test('mobile Finance Hub keeps original tabs and keeps the retired launcher row hidden',async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844}});
  await page.route('**/*',route=>route.abort());
  await page.setContent(html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,''));
  await page.evaluate(()=>{
   const root=document.getElementById('sq-nextgen');
   root.hidden=false;
   // Production boot scripts normally dismiss this overlay; they are deliberately removed in this isolated test.
   document.getElementById('sq-startup-overlay')?.remove();
   document.getElementById('auth-modal')?.remove();
   document.body.classList.add('sq-finance-open');
   window.squareUpApi=async(path)=>{
    if(path==='trackers')return [{id:'22222222-2222-4222-8222-222222222222',name:'Shared tracker',currency:'USD'}];
    if(path.startsWith('finance-plus/goals'))return [];
    if(path.startsWith('finance-plus/trips'))return [];
    if(path.startsWith('finance-plus/payment-requests'))return [];
    if(path.startsWith('finance-plus/budgets'))return {budgets:[],month:'2026-11'};
    if(path.startsWith('finance-plus/activity'))return {timeline:[]};
    return [];
   };
  });
  const originalTabs=await page.locator('#sq-nextgen .sq-ng-tabs > button').count();
  for(const code of scripts)await page.addScriptTag({content:code});
  assert.equal(await page.locator('#sq-nextgen .sq-ng-tabs > button').count(),originalTabs,'existing mobile Finance tabs unchanged');
  assert.equal(await page.locator('#dw-finance-extras > button').count(),3,'all three launchers grouped');
  assert.equal(await page.locator('#dw-weo-financial-context').isChecked(),false,'Weo financial context must default off');
  assert.equal(await page.locator('#dw-finance-extras').isVisible(),false,'retired launchers stay hidden');
  // Exercise the existing handlers independently of launcher visibility.
  await page.locator('#dw-planning-launch').evaluate(button=>button.click());
  assert.equal(await page.locator('#dw-planning-pane').isVisible(),true);
  await page.locator('#dw-trip-plus-launch').evaluate(button=>button.click());
  assert.equal(await page.locator('#dw-trip-plus').isVisible(),true);
  assert.equal(await page.locator('#dw-planning-pane').isVisible(),false);
  await page.locator('#dw-paylink-launch').evaluate(button=>button.click());
  assert.equal(await page.locator('#dw-paylink-pane').isVisible(),true);
  assert.equal(await page.locator('#dw-trip-plus').isVisible(),false);
 }finally{await browser.close()}
});
