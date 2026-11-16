import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
test('mobile Home has no visible View balance breakdown disclosure',()=>{
  assert.ok(!html.includes("summary.textContent='View balance breakdown'"));
  assert.ok(html.includes("tools.style.display='none'"));
  assert.ok(html.includes('#tracker-dashboard #sq-mobile-extra-balances{display:none!important}'));
});
test('existing overview data is still restored to its original desktop location',()=>{
  assert.ok(html.includes("marker.parentNode.insertBefore(stats,marker)"));
  assert.ok(html.includes("if(stats.parentNode!==tools)tools.append(stats)"));
  assert.ok(html.includes("const stats=document.getElementById('sq-overview-stats')"));
  assert.ok(html.includes("const actions=dashboard&&dashboard.querySelector('.dashboard-actions')"));
});
test('mobile navigation and balance actions remain untouched',()=>{
  for(const id of ['sq-clean-settle','sq-clean-remind','quick-pay-now','quick-payment','sq-mobile-extra-balances'])
    assert.ok(html.includes(id),'Missing '+id);
});
