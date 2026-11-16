import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
test('redundant page captions and decorative kickers removed',()=>{
  for(const phrase of [
    'Your people, payments, and shared activity.',
    'Your shared financial spaces. Choose a tracker',
    'Find friends by username and manage friend requests.',
    'Expenses, payments, invitations, and group updates in one place.',
    'Manage your profile, payments, and preferences.',
    'Your name, username, bio, and profile picture.',
    'Divide an expense with your friends.',
    'Full breakdown for everyone in this tracker',
    'Total recorded expenses by month',
    'Share of recorded expenses',
    'Most recent recorded expense entries',
    'Filter expenses by category or person',
    'YOUR DOWEO HOME',
    'YOUR CIRCLE'
  ])assert.ok(!html.includes(phrase),'still present: '+phrase);
});
test('shortened preferences copy and essential warnings stay',()=>{
  assert.match(html,/Preferences sync across devices\./);
  assert.match(html,/Changes apply on this device\./);
  assert.match(html,/Pending charges do not affect balances\./);
  assert.match(html,/Only share this invitation with people you trust/);
  assert.match(html,/Deleting a tracker you own removes it for everyone/);
  assert.match(html,/DoWeo never transfers funds/);
  assert.match(html,/Nothing is saved until you confirm/);
});
test('critical UI IDs remain present for translations and handlers',()=>{
  for(const id of ['notifications-back','sq-return-greeting','settings-language-preference','sq-bills-tracker','sq-friends-refresh','sq-recap-export','sq-expense-category','sq-expense-member'])
    assert.ok(html.includes('id="'+id+'"'),'missing '+id);
  assert.match(html,/id="settings-accessibility-panel"/);
});
