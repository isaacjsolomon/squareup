import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
function section(kind,id){
  const expr=new RegExp('<'+kind+' id="'+id+'">([\\s\\S]*?)<\\/'+kind+'>');
  const found=html.match(expr);
  assert.ok(found,'Missing '+id);
  return found[1];
}
const css=section('style','dw-mobile-overview-clean-end-20261110');
const script=section('script','dw-mobile-overview-scroll-guard-20261110');

function runScrollGuard({height=800,scrollHeight=720,overview=true,bodyClasses=[]}={}){
  const classes=new Set(bodyClasses);
  const htmlClasses=new Set();
  const body={
    classList:{
      contains:name=>classes.has(name),
      add:name=>classes.add(name),
      remove:name=>classes.delete(name),
      [Symbol.iterator]:()=>classes.values(),
    },
  };
  const docElement={scrollHeight,classList:{add:name=>htmlClasses.add(name),remove:name=>htmlClasses.delete(name)}};
  const dashboard={classList:{contains:name=>name==='sq-tab-overview'&&overview}};
  const summary={};
  const listeners={};
  const document={
    body,documentElement:docElement,
    getElementById:id=>id==='tracker-dashboard'?dashboard:id==='sq-return-summary'?summary:null,
    addEventListener(name,fn){listeners[name]=fn},
  };
  const window={
    innerHeight:height,scrollY:0,
    matchMedia:()=>({matches:true}),
    requestAnimationFrame:fn=>fn(),
    addEventListener(name,fn){listeners[name]=fn},
    scrollTo(){this.scrollY=0},
  };
  const context={
    document,window,
    getComputedStyle:()=>({display:'block'}),
    MutationObserver:class{observe(){}},
  };
  vm.runInNewContext(script,context);
  return {classes,htmlClasses,document,window};
}

test('mobile Overview hides only the circled settlement card and clear-all footer',()=>{
  assert.match(css,/@media\\s*\\(max-width:900px\\)/);
  assert.match(css,/#tracker-dashboard\\.sq-tab-overview #sq-return-summary \\.sq-return-smart-panel\\s*\\{\\s*display:none!important;/);
  assert.match(css,/#tracker-dashboard\\.sq-tab-overview > footer/);
  assert.match(css,/#tracker-dashboard\\.sq-tab-overview > footer #clear/);
  assert.match(css,/#tracker-dashboard\\.sq-tab-overview\\s*\\{\\s*padding-bottom:0!important;/);
});

test('original settle-up logic, clear action, payment cards, and bottom Add remain available',()=>{
  assert.match(html,/id="smart-settle-card"/);
  assert.match(html,/id="clear"/);
  assert.match(html,/id="quick-pay-now"/);
  assert.match(html,/id="quick-payment"/);
  assert.match(html,/data-sq-action="quick-split"/);
  assert.match(html,/data-sq-action="quick-expense"/);
});

test('fitting mobile Overview does not scroll',()=>{
  const x=runScrollGuard();
  assert.ok(x.classes.has('dw-mobile-overview-no-scroll'));
  assert.ok(x.htmlClasses.has('dw-mobile-overview-no-scroll'));
});

test('smaller phones can still scroll to reach any content',()=>{
  const x=runScrollGuard({scrollHeight:1200,height:650});
  assert.ok(!x.classes.has('dw-mobile-overview-no-scroll'));
});

test('other tabs and pages are never locked',()=>{
  for(const options of [{overview:false},{bodyClasses:['trackers-view']},{bodyClasses:['settings-view']}]) {
    const x=runScrollGuard(options);
    assert.ok(!x.classes.has('dw-mobile-overview-no-scroll'),JSON.stringify(options));
  }
});

test('scroll guard ignores its own lock class when watching route changes',()=>{
  assert.match(script,/filter\\(name=>name!==lockClass\\)\\.sort\\(\\)\\.join\\(' '\)/);
});
