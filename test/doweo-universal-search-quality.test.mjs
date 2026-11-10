import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const start=html.indexOf('<script id="sq-global-search-script">');
const end=html.indexOf('</script>',start);
const script=html.slice(start,end);
test('global search provides discovery for major existing DoWeo sections',()=>{
  assert.ok(start>=0);
  const routes={
    'Events':'sqev-nav',
    'Finance Hub':'sq-finance-nav',
    'Wallet':'sq-finance-nav',
    'Subscriptions & Bills':'sq-finance-nav',
    'Trips':'sq-finance-nav',
    'Households':'sq-finance-nav',
    'Currency converter':'sq-finance-nav'
  };
  for(const [name,id] of Object.entries(routes)){
    assert.ok(script.includes("['"+name+"'"),name+' search option missing');
    assert.ok(script.includes("document.getElementById('"+id+"')?.click()"),id+' route missing');
    assert.ok(html.includes('id="'+id+'"'),id+' destination missing');
  }
  assert.doesNotMatch(script,/\['Budget','Budget planner'/);
});
test('global search preserves scoped access to only the active tracker detail',()=>{
  assert.match(script,/const active=typeof current!=='undefined'\?current:null/);
  assert.match(script,/const expenseHits=\(active&&Array\.isArray\(active\.entries\)\?active\.entries:\[\]\)/);
  assert.match(script,/const memberHits=\(active&&Array\.isArray\(active\.members\)\?active\.members:\[\]\)/);
  assert.match(script,/trackers\?trackers:\[\]/);
});
test('search can be closed by Escape and focuses only controls in its dialog',()=>{
  assert.match(script,/overlay\.addEventListener\('keydown',e=>\{/);
  assert.match(script,/if\(e\.key!=='Tab'/);
  assert.match(script,/e\.shiftKey&&document\.activeElement===first/);
  assert.match(script,/document\.activeElement===last/);
  assert.match(script,/if\(returnFocus&&returnFocus\.focus\)returnFocus\.focus\(\)/);
});
test('closing cancels pending user searches to prevent stale results',()=>{
  assert.match(script,/function close\(\)\{\s*friendSearchSerial\+\+;clearTimeout\(friendSearchTimer\)/);
  assert.match(script,/results\.replaceChildren\(\)/);
  assert.match(script,/if\(serial!==friendSearchSerial\|\|!overlay\.classList\.contains\('open'\)\)return/);
  assert.match(script,/if\(q\.length>=3\)/);
});
