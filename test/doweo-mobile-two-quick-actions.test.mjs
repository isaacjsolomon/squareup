import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const style=html.match(/<style id="dw-mobile-home-quick-actions-two-only">([\\s\\S]*?)<\\/style>/)?.[1];

test('mobile quick action override is scoped to small screens',()=>{
 assert.ok(style,'Mobile quick action CSS must exist');
 assert.match(style,/@media\\s*\\(max-width:900px\\)/);
 assert.match(style,/grid-template-columns:repeat\\(2,minmax\\(0,1fr\\)\\)/);
});

test('mobile Home shows Pay Now and Log Payment but hides redundant action cards',()=>{
 assert.ok(style);
 for(const id of ['#quick-expense','#quick-receipt','#quick-split','#sq-quick-calc-launch']){
   assert.ok(style.includes(id),id+' must be hidden in the mobile Home cards');
 }
 assert.match(style,/:is\\(#quick-pay-now,#quick-payment\\)\\.dashboard-action:not\\(\\[hidden\\]\\)/);
 assert.match(style,/display:none!important/);
 assert.match(style,/display:flex!important/);
});

test('mobile bottom Add menu and original quick action handlers remain available',()=>{
 for(const id of ['quick-expense','quick-pay-now','quick-payment','quick-receipt','quick-split']){
   assert.match(html,new RegExp('id="'+id+'"'));
 }
 assert.match(html,/id="dw-mobile-home-quick-actions-two-only"/);
 assert.match(html,/data-sq-action="quick-expense"/);
 assert.match(html,/data-sq-action="quick-split"/);
 assert.match(html,/id="doweo-desktop-add-menu"/);
});
