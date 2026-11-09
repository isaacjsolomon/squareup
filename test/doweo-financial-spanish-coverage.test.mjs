import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {UI_PHRASES} from '../doweo-ui-catalog.mjs';
const source=readFileSync(new URL('../doweo-localize-ui.js',import.meta.url),'utf8');
const match=source.match(/const screenshotSpanish=(\{.*?\});\n function seedStaticTranslations/s);
assert.ok(match);
const es=JSON.parse(match[1]);
const approved=new Set(UI_PHRASES);
function setup(){
 const start=source.indexOf(' function translateDynamic(');
 const end=source.indexOf(' function hideDecorativeDescriptions(',start);
 assert.ok(start>=0&&end>start);
 const context={cache:es,approved,language:'es',pending:new Set(),requested:new Set(),retries:new Map(),MAX_ATTEMPTS:4,Intl,Date};
 vm.runInNewContext(source.slice(start,end)+'\n globalThis.test={translate,eligible,approvedKey};',context);
 return context.test;
}
test('all curated translations have an approved fixed UI phrase',()=>{
 for(const item of Object.keys(es))assert.ok(approved.has(item),'unapproved '+item);
});
test('reported Spanish payment and expense modal labels translate',()=>{
 const terms=['How much was paid back?','Pay the full amount','This squares them up completely.','Record payment',
 'Manually add an expense','Log Payment','Quick Split Calculator','Quick split calculator',
 'Calculate a share without saving an expense.','Bill total','Tip percentage','Number of people',
 'Owes money','Paid back','Who owes money?','Who is owed money?','Expense category','Save entry',
 'Payment due date (optional)','Amount ($)','Expense description','Split method','Split equally',
 'Exact amounts','Percentages','Shares','Split summary','Add to Tracker'];
 const {translate}=setup();
 for(const item of terms){
  assert.ok(approved.has(item),item+' not in catalog');
  assert.ok(es[item]&&es[item]!==item,item+' not translated');
  assert.equal(translate(item),es[item]);
 }
});
test('split-a-bill page static headings, instructions and buttons translate',()=>{
 const terms=['Bill currency','Divide an expense with your friends.','Scan a receipt with AI-assisted text recognition',
 'On mobile, take a photo of your receipt to recognize items and prices. Review everything before splitting. Recognition runs in your browser.',
 'Take or upload receipt photo (mobile)','Who paid?','Total amount ($)','Enter total bill amount',
 'Expense description','Dinner at a restaurant','Payments owed to payer',
 'This records expenses in DoWeo. No money is transferred.'];
 for(const label of terms)assert.ok(approved.has(label)&&es[label],label);
});
test('dynamic record categories translate only fixed prefixes and preserve private descriptions',()=>{
 const {translate,eligible}=setup();
 assert.equal(translate('[Category: Food & Dining] Boba'),'[Categoría: Comida y restaurantes] Boba');
 assert.equal(translate('[Category: Food & Dining] Mac n cheese at txt'),'[Categoría: Comida y restaurantes] Mac n cheese at txt');
 assert.equal(translate('$21.24 per person'),'$21.24 por persona');
 assert.equal(translate('Total including tip: $25.00'),'Total con propina: $25.00');
 assert.equal(translate('You (Isaac Solomon)'),'Tú (Isaac Solomon)');
 assert.equal(translate('Split between (2 selected)'),'Dividir entre (2 seleccionados)');
 assert.equal(eligible('My secret personal description'),false);
 assert.equal(translate('My secret personal description'),'My secret personal description');
 assert.equal(translate('Isaac owes Sasha $7.00'),'Isaac debe Sasha $7.00');
});
test('dynamic translation remains guarded by a tightly scoped approved pattern',()=>{
 assert.match(source,/Food & Dining\|Food\|Other/);
 assert.match(source,/if\(!eligible\(key\)&&!\/\(/);
 assert.match(source,/\[data-user-content\]/);
 assert.match(source,/#tracker-chat-messages/);
});
