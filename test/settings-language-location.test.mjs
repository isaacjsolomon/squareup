import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const accountStart=html.indexOf('id="settings-content-account"');
const accountEnd=html.indexOf('<!-- Only shown after a NEW account',accountStart);
const account=html.slice(accountStart,accountEnd);
const profile=html.slice(html.indexOf('id="settings-content-profile"'),accountStart);

test('sidebar More navigation displays Settings and retains route ID',()=>{
  assert.match(html,/id="nav-profile"[^>]*>[\s\S]*?<span class="sq-nav-label">Settings<\/span><\/button>/);
});
test('Account tab has language control alongside delete account',()=>{
  assert.ok(accountStart>0);
  assert.match(account,/id="settings-language-panel"/);
  assert.match(account,/id="settings-language-preference"/);
  assert.match(account,/id="delete-account-panel"/);
  assert.ok(account.indexOf('id="settings-language-panel"')<account.indexOf('id="delete-account-panel"'));
});
test('language selector is relocated, not duplicated or moved into Profile',()=>{
  assert.doesNotMatch(profile,/id="settings-language-preference"/);
  assert.equal((html.match(/id="settings-language-preference"/g)||[]).length,1);
  assert.match(account,/data-dw-language-select/);
  assert.match(account,/<option value="auto">Automatic \(browser language\)<\/option>/);
});
test('12 language options and onboarding language choice remain',()=>{
  assert.match(html,/id="onboard-language-preference"/);
  const select=account.match(/<select id="settings-language-preference"[\s\S]*?<\/select>/)?.[0];
  assert.ok(select);
  for(const code of ['en','es','fr','he','zh-Hans','pt','de','it','ja','ar','ko','hi'])
    assert.ok(select.includes('value="'+code+'"'),code);
});
