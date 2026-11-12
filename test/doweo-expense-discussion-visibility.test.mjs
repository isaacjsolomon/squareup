import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const start=html.indexOf('<script id="sq-details-social-js">');
const end=html.indexOf('</script>',start);
assert.ok(start>=0&&end>start,'comments and reactions script exists');
const source=html.slice(start+'<script id="sq-details-social-js">'.length,end);

function harness(tracker){
  const listeners={};
  const root={hidden:false};
  const status={textContent:''};
  const field={value:'',disabled:false,addEventListener(){}};
  const send={disabled:false,addEventListener(){}};
  const reactions={hidden:false,replaceChildren(){},addEventListener(){}};
  const comments={hidden:false,replaceChildren(){}};
  const map={
    'sq-details-social':root,
    'sq-details-social-status':status,
    'sq-details-reactions':reactions,
    'sq-details-comments':comments,
    'sq-details-comment-input':field,
    'sq-details-comment-send':send
  };
  const context={
    window:{
      squareUpApprovalTracker:()=>tracker,
      addEventListener:(name,callback)=>{listeners[name]=callback;},
      squareUpApi:async()=>[]
    },
    document:{getElementById:(id)=>map[id]},
    console
  };
  vm.runInNewContext(source,context);
  return {listeners,root,status,field,send,reactions,comments};
}

test('shared tracker discussion is visible and refreshes instead of silently hiding',async()=>{
  const h=harness({id:'tracker-123'});
  h.listeners['squareup:details-open']({detail:{entry:{id:'entry-456'}}});
  assert.equal(h.root.hidden,false);
  assert.equal(h.field.disabled,false);
  assert.equal(h.reactions.hidden,false);
  assert.match(h.status.textContent,/Loading comments and reactions/);
});

test('local or unsupported tracker shows useful guidance instead of blank dropdown',()=>{
  const h=harness(null);
  h.listeners['squareup:details-open']({detail:{entry:{id:'entry-456'}}});
  assert.equal(h.root.hidden,false);
  assert.match(h.status.textContent,/shared trackers/);
  assert.equal(h.field.disabled,true);
  assert.equal(h.send.disabled,true);
});

test('details without an entry do not show stale discussion',()=>{
  const h=harness({id:'tracker-123'});
  h.listeners['squareup:details-open']({detail:{}});
  assert.equal(h.root.hidden,true);
});

test('discussion retains functional posting, reactions and error messaging',()=>{
  assert.match(source,/api\(path\('comments'\)\)/);
  assert.match(source,/api\(path\('reactions'\)\)/);
  assert.match(source,/addEventListener\('click',async/);
  assert.match(source,/Could not load comments and reactions/);
  assert.doesNotMatch(source,/typeof current!=='undefined'\?current:null/);
});
