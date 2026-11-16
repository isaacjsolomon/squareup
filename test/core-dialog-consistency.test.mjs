import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
test('six core dialogs share styling, while authentication remains separate',()=>{
 for(const id of ['photo-modal','settle-modal','new-modal','manage-modal','backdrop-modal','share-modal'])
   assert.ok(html.includes('class="modal-bg dw-standard-dialog-overlay" id="'+id+'"'),'missing '+id);
 assert.match(html,/class="modal-bg" id="auth-modal"/);
 assert.match(html,/id="dw-core-dialog-consistency"/);
});
test('new and share remain scrollable and retain custom size',()=>{
 assert.match(html,/#new-modal\.dw-standard-dialog-overlay > \.card\.modal/);
 assert.match(html,/#share-modal\.dw-standard-dialog-overlay > \.card\.modal/);
 assert.match(html,/max-height:calc\(100dvh - 28px\)!important/);
 assert.match(html,/overflow-y:auto!important/);
 assert.match(html,/@media\(max-width:600px\)/);
});
test('close controls and core actions remain available',()=>{
 for(const id of ['photo-close','settle-title','new-submit','manage-title','backdrop-title','share-title','invite-link'])
   assert.ok(html.includes('id="'+id+'"'), 'missing '+id);
 assert.match(html,/\.close:focus-visible/);
 assert.match(html,/outline:3px solid #65efda!important/);
});
