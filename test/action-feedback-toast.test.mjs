import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
test('feedback component supports success, error, dismiss and accessibility',()=>{
 for(const fragment of ['id="dw-action-feedback-style"','id="dw-action-feedback-script"',
   'window.dwNotify=notify','role',"'alert':'status'",'Dismiss notification',
   "stack.children.length>=3",'kind===\'error\'?8000:4500'])
   assert.ok(html.includes(fragment),'missing: '+fragment);
});
test('expense saves and tracker changes show feedback only after success',()=>{
 for(const phrase of ['Payment recorded.','Expense saved.','Tracker renamed.',
   'Tracker archived on this device.','Expense approval setting saved.',
   'Tracker deleted.','You left the tracker.'])
   assert.ok(html.includes(phrase),phrase);
 assert.ok(html.includes('if (saved === false) return;'));
 assert.ok(html.includes('await api('));
});
test('destructive confirmation and form validation stay blocking',()=>{
 for(const phrase of ['Delete "','All its entries will be gone',
   'Choose two different tracker members.',
   'Approve this expense?', 'Archive '+String.raw`'+t.name+'`])
   assert.ok(html.includes(phrase),'missing confirmation: '+phrase);
});
test('feedback uses textContent, not unsanitized message markup',()=>{
 assert.ok(html.includes('copy.textContent=String(message)'));
 assert.ok(html.includes('@media(max-width:700px)'));
 assert.ok(html.includes('env(safe-area-inset-bottom,0px)'));
});
