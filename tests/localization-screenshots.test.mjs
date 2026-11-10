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

test('all screenshot-reported navigation and tool labels have offline translations in every core locale',()=>{
 const keys=["Payments and confirmations","Mentions in group chat","Venmo username","Save payment accounts","Find a message in this conversation","Send","Clear","Pending Requests","Find Friends","View profile","Quick add options","Scan receipt","Split a bill","Personal","Connected trackers","Settlement overview","Recent settlement activity","Balances by tracker","Sent","Received","No trips linked yet","Link existing tracker","Open household","Manage your bills and subscriptions","Open Bills & Subscriptions","Manage currencies","Convert","Monthly cash flow","Last six months","This month's spending categories","Monthly spending recap","Expenses by person","Recent expenses","How This Website Was Made","Site tutorial","Welcome to DoWeo"];
 const approved=new Set(UI_PHRASES);
 for(const key of keys){
   assert.ok(approved.has(key),'Key is not in the approved UI catalog: '+key);
   for(const lang of locales){
     assert.ok(CORE_UI_TRANSLATIONS[lang]?.[key]?.trim(),lang+' is missing: '+key);
   }
 }
});

test('feature captions are localized offline across all supported core locales',()=>{
 const keys=["Assign items to friends","Divide an expense with friends","Send via Venmo or Cash App","Keep all your shared expenses in one place.","See who owes who with up-to-date balances.","Upload a receipt and assign items to friends.","Add due dates, get notifications, and settle up easily.","Make decisions together in chat."];
 const approved=new Set(UI_PHRASES);
 for(const key of keys){
  assert.ok(approved.has(key),'caption not approved: '+key);
  for(const locale of locales){
   const translated=CORE_UI_TRANSLATIONS[locale]?.[key];
   assert.ok(typeof translated==='string'&&translated.trim()&&translated!==key,locale+': missing caption '+key);
  }
 }
});

test('all tutorial titles have offline translations in every core locale',()=>{
 const titles=["Welcome to DoWeo","Home and balances","Trackers and invitations","Expenses and receipt splitting","Payments and settlements","Bills and subscriptions","Open your Finance Hub","Personal Finance","Trips and travel spending","Household tools","Currency converter and favorites","Chat, notifications, and friends","Account, help, and settings","You’re ready!"];
 for(const key of titles)for(const code of locales)assert.ok(CORE_UI_TRANSLATIONS[code]?.[key],code+' missing tutorial title: '+key);
});
test('About headline fragments can be translated without leaving English words',()=>{
 assert.ok(UI_PHRASES.includes('Keeping money'));
 assert.ok(UI_PHRASES.includes('between friends '));
 assert.ok(UI_PHRASES.includes('simple.'));
 for(const key of ['Keeping money','between friends ','simple.'])assert.ok(CORE_UI_TRANSLATIONS.he[key], 'Hebrew headline fragment missing: '+key);
});
