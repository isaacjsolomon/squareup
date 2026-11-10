import test from 'node:test';
import assert from 'node:assert/strict';
import { UI_PHRASES } from '../doweo-ui-catalog.mjs';
import { CORE_UI_TRANSLATIONS } from '../doweo-core-locales.mjs';

// Regression coverage for screenshots showing English leftovers with Hebrew
// selected. Preserve all language codes and protect against missing catalog keys.
const locales=['fr','he','zh-Hans','pt','de','it','ja','ar','ko','hi','ru','tr','vi','nl','pl','sv','bn'];
const critical=[
  'Push notifications','Enable push notifications','Notification preferences',
  'Install DoWeo','Group chat messages','Wallet & Settlements',
  'Spending Analytics','Recent personal activity','Tracker group chat',
  'Favorite currencies','My Friends','Shared wishlist','Your balance'
];
test('critical labels have offline translations in every supported core locale',()=>{
  for(const locale of locales){
    const dictionary=CORE_UI_TRANSLATIONS[locale];
    assert.ok(dictionary,'Missing locale: '+locale);
    for(const key of critical)assert.ok(dictionary[key]&&dictionary[key]!==key,locale+': '+key);
  }
});
test('Hebrew screenshot labels have static catalog entries and offline translations',()=>{
  const ui=new Set(UI_PHRASES);
  for(const key of [
    'Notifications are off on this device.',
    'DoWeo is already installed and running as an app.',
    'Only shared tracker members can view this contact. Apple Cash transfers happen outside DoWeo.',
    'Payments and confirmations','Mentions in group chat','Save payment accounts',
    'Quick add options','Find a message in this conversation',
    'Recent settlement activity','Balances by tracker','Monthly spending recap',
    'Open Bills & Subscriptions','DoWeo brings shared expense tracking and personal finance tools together. This guide explains the main pages and how to use them.',
    'DoWeo started as an idea to make it easier for friends to track and settle shared expenses. Here’s how the website came together.'
  ]){
    assert.ok(ui.has(key),'Not whitelisted: '+key);
    assert.ok(CORE_UI_TRANSLATIONS.he[key],'Missing Hebrew translation: '+key);
  }
});
test('sensitive user content is not treated as a static translation key',()=>{
  const ui=new Set(UI_PHRASES);
  assert.equal(ui.has('Isaac and Sasha'),false);
  assert.equal(ui.has('Solomon Household'),false);
  assert.equal(ui.has('Sasha Levenson'),false);
});
