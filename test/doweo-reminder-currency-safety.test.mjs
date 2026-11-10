import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const start=html.indexOf('window.squareUpSendReminder = function');
const end=html.indexOf('window.squareUpSplitMembers = function',start);
assert.ok(start>0&&end>start);
const source=html.slice(start,end);

function harness(currency='EUR',entries=[]){
 const opened=[],alerts=[],writes=[],dialogs=[];
 const tracker={
   id:'tracker123',name:'Holiday costs',currency,
   members:[{name:'Alex',email:'alex@example.org',isYou:false},{name:'Blair',email:'blair@example.org',isYou:true}],
   entries
 };
 const sandbox={
   current:tracker,window:{open:url=>{opened.push(url);return {};},location:{assign:url=>opened.push(url)}},
   sqFormat:(amount,code)=>new Intl.NumberFormat('en-US',{style:'currency',currency:code}).format(amount),
   sqCurrency:()=>tracker.currency,
   alert:message=>alerts.push(message),confirm:message=>{dialogs.push(message);return true;},
   localStorage:{getItem:()=>null,setItem:(...args)=>writes.push(args)},
   Date,Number,String,encodeURIComponent
 };
 vm.runInNewContext(source,sandbox);
 return {send:sandbox.window.squareUpSendReminder,tracker,opened,alerts,writes,dialogs};
}

test('email reminder displays the original tracker currency instead of USD',()=>{
 const t=harness('EUR',[{from:'Alex',to:'Blair',type:'debt',amount:25}]);
 t.send('Alex','Blair',999);
 assert.equal(t.opened.length,1);
 const u=new URL(t.opened[0]);
 assert.ok(u.searchParams.get('su').includes('€25.00'));
 assert.ok(u.searchParams.get('body').includes('€25.00'));
 assert.ok(!u.searchParams.get('body').includes('$25.00'));
 assert.equal(u.searchParams.get('to'),'alex@example.org');
 assert.equal(t.writes.length,1);
});

test('pending payments do not reduce balance and disputes are excluded',()=>{
 const t=harness('GBP',[
   {from:'Alex',to:'Blair',type:'debt',amount:35,paymentStatus:'confirmed'},
   {from:'Alex',to:'Blair',type:'payment',amount:15,paymentStatus:'pending'},
   {from:'Alex',to:'Blair',type:'payment',amount:5,paymentStatus:'confirmed'},
   {from:'Alex',to:'Blair',type:'payment',amount:10,paymentStatus:'disputed'},
   {from:'Alex',to:'Blair',type:'bogus',amount:999}
 ]);
 t.send('Alex','Blair',1);
 assert.equal(t.opened.length,1);
 const body=new URL(t.opened[0]).searchParams.get('body');
 assert.ok(body.includes('£30.00'),body);
 assert.ok(!body.includes('£15.00'));
});

test('only the person owed can open a reminder draft',()=>{
 const t=harness('USD',[{from:'Alex',to:'Blair',type:'debt',amount:7}]);
 t.send('Blair','Alex',7);
 assert.equal(t.opened.length,0);
 assert.equal(t.writes.length,0);
 assert.ok(t.alerts.length>0);
});

test('no reminder is composed when confirmed balance is zero',()=>{
 const t=harness('USD',[
   {from:'Alex',to:'Blair',type:'debt',amount:7},
   {from:'Alex',to:'Blair',type:'payment',amount:7,paymentStatus:'confirmed'}
 ]);
 t.send('Alex','Blair',9999);
 assert.equal(t.opened.length,0);
 assert.equal(t.writes.length,0);
});

test('draft-only reminder keeps user confirmation requirement and local cooldown',()=>{
 assert.match(source,/Compose a reminder/);
 assert.match(source,/lastDraft&&Date\.now\(\)-lastDraft<24\*60\*60\*1000/);
 assert.match(source,/window\.open\(composeUrl,'_blank'\)/);
 assert.doesNotMatch(source,/sendEmail|sendReminderApi\(/);
});
