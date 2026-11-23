import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {readFileSync} from 'node:fs';

const script=readFileSync(new URL('../doweo-global-search.js',import.meta.url),'utf8');

test('global search finds authorized cross-tracker data and opens poll results on desktop and mobile',{timeout:60000},async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  for(const width of [1440,390]){
   const page=await browser.newPage({viewport:{width,height:850}});
   await page.setContent('<div class="tracker-heading"></div><button id="sq-mobile-search">Mobile search</button><button id="nav-home">Home</button><div id="sq-global-search" aria-hidden="true"><input id="sq-global-query"><button id="sq-search-close">Close</button><div id="sq-search-results"></div></div>');
   await page.evaluate(()=>{
    window.__searchCalls=[];window.__opened=null;window.__pollsOpen=false;
    const trackers=[{id:'t1',name:'Beach House'},{id:'t2',name:'School Trip'}];
    window.dwSearchAccess={
     snapshot:()=>({userId:'me',trackers,active:{id:'t1',name:'Beach House',members:[],entries:[]},notifications:[]}),
     findProfiles:async q=>q.toLowerCase().includes('beach')?[{username:'beachuser',display_name:'Beach User'}]:[],
     listFriends:async()=>[{username:'beachfriend',display_name:'Beach Friend',status:'accepted'}],
     openFriends:()=>{window.__friendsOpened=true;},
     openNotification:async id=>{window.__notificationOpened=id;}
    };
    window.squareUpApi=async path=>{
     window.__searchCalls.push(path);
     if(path==='notifications')return [{id:'n1',title:'Beach trip update',message:'Beach details ready'}];
     if(path==='social/notifications')return [];
     if(path==='trackers/t1')return {id:'t1',name:'Beach House',members:[{id:'m1',name:'Alice'}],entries:[{id:'e1',note:'Beach groceries',amount:20,type:'debt',from:'Alice',to:'Isaac'}]};
     if(path==='trackers/t2')return {id:'t2',name:'School Trip',members:[{id:'m2',name:'Beach Buddy'}],entries:[]};
     if(path==='trackers/t1/polls')return [{id:'p1',question:'Beach picnic?',options:[{label:'Sunday'}]}];
     if(path==='trackers/t1/bills')return [{id:'b1',name:'Beach electricity',amount:30}];
     if(path==='trackers/t1/chat')return [{id:'c1',message:'Beach packing list',senderName:'Alice'}];
     if(path==='trackers/t1/wishlist')return [{id:'w1',title:'Beach towels'}];
     if(/\/(polls|bills|chat|wishlist)$/.test(path))return [];
     throw Error('Unexpected or unauthorized path '+path);
    };
    window.sqOpenTrackerForWeo=async id=>{window.__opened=id;};
    window.dwOpenPollsPage=()=>{window.__pollsOpen=true;};
   });
   await page.addScriptTag({content:script});
   const launch=width===390?'#sq-mobile-search':'.sq-search-launch';
   await page.locator(launch).click();
   await page.locator('#sq-global-query').fill('beach');
   await page.waitForFunction(()=>{
    const result=document.getElementById('sq-search-results').textContent;
    return result.includes('Beach picnic?')&&result.includes('Beach Buddy')&&result.includes('Beach trip update')&&result.includes('Beach User');
   },{timeout:12000});
   const body=await page.locator('#sq-search-results').textContent();
   for(const item of ['Beach House','Beach Buddy','Beach User','Beach Friend','Beach groceries','Beach picnic?','Beach electricity','Beach trip update','Beach packing list','Beach towels']){
    assert.ok(body.includes(item),'Missing search result: '+item+' at '+width+'px');
   }
   const calls=await page.evaluate(()=>window.__searchCalls);
   assert.ok(calls.includes('trackers/t2'),'Search must include other authorized trackers');
   assert.ok(!calls.some(x=>x.includes('t3')),'Search must not query unshared tracker data');
   await page.locator('.sq-search-hit').filter({hasText:'Beach picnic?'}).click();
   assert.deepEqual(await page.evaluate(()=>({opened:window.__opened,polls:window.__pollsOpen})),{opened:'t1',polls:true});
   await page.close();
  }
 } finally {await browser.close();}
});
