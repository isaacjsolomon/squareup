import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script} from 'node:vm';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const financeScript=html.match(/<script id="sq-nextgen-script">([\s\S]*?)<\/script>/)?.[1];
const wallet=financeScript?.match(/async function drawWallet\(\)\{([\s\S]*?)\n\}\nasync function drawWorkspace\(\)/)?.[1];
const mobileCss=html.match(/<style id="sq-wallet-mobile-refresh-20261107">([\s\S]*?)<\/style>/)?.[1];

test('Finance Hub JavaScript parses after wallet redesign',()=>{
 assert.ok(financeScript);
 assert.doesNotThrow(()=>new Script(financeScript));
});

test('Wallet has mobile overview, responsive card grid, and currency-separated totals',()=>{
 assert.ok(wallet&&mobileCss);
 assert.match(wallet,/sq-wallet-mobile-head/);
 assert.match(wallet,/sq-wallet-stats/);
 assert.match(wallet,/Owed to you/);
 assert.match(wallet,/You owe/);
 assert.match(wallet,/sq-wallet-currencies/);
 assert.match(wallet,/Object\.entries\(groups\)/);
 assert.match(wallet,/currencySummary/);
 assert.match(mobileCss,/@media \(max-width:900px\)/);
 assert.match(mobileCss,/grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
 assert.match(mobileCss,/sq-wallet-currency>span/);
 assert.doesNotMatch(wallet,/reduce\(.*currencySummary/);
});

test('Mobile quick filters sync to the same existing Show filter',()=>{
 assert.match(wallet,/data-wallet-quick-filter="all"/);
 assert.match(wallet,/data-wallet-quick-filter="owed"/);
 assert.match(wallet,/data-wallet-quick-filter="owe"/);
 assert.match(wallet,/data-wallet-quick-filter="settled"/);
 assert.match(wallet,/filter\.value=chip\.dataset\.walletQuickFilter/);
 assert.match(wallet,/quickFilters\.forEach\(chip=>chip\.setAttribute\('aria-pressed'/);
 assert.match(wallet,/rows\.filter\(r=>r\.name\.toLowerCase\(\)\.includes\(q\)/);
 assert.match(mobileCss,/sq-wallet-mobile-filters button\[aria-pressed=true\]/);
});

test('Existing settlement actions and CSV export remain accessible',()=>{
 assert.match(wallet,/data-open-tracker/);
 assert.match(wallet,/Manage payments/);
 assert.match(wallet,/openTracker/);
 assert.match(wallet,/sq-wallet-export/);
 assert.match(wallet,/sq-wallet-mobile-export/);
 assert.match(wallet,/doweo-wallet-balances\.csv/);
 assert.match(wallet,/sq-wallet-mobile-export'\)\?\.addEventListener/);
 assert.match(wallet,/type:'text\/csv;charset=utf-8'/);
});

test('Mobile-only styles do not replace original desktop wallet layout',()=>{
 assert.match(mobileCss,/#sq-nextgen \.sq-wallet-mobile-head,#sq-nextgen \.sq-wallet-mobile-filters\{display:none\}/);
 assert.match(mobileCss,/@media \(max-width:900px\)/);
 assert.match(html,/<style id="sq-wallet-condensed-2026">/);
});
