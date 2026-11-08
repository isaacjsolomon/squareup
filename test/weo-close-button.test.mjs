import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script} from 'node:vm';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const html=read('index.html');
const actions=read('weo-actions.js');
const inline=html.match(/<script id="sq-ai-script">([\s\S]*?)<\/script>/)?.[1];

test('Weo X closes native chat and navigates Home, controlled by one page state',()=>{
 assert.ok(inline);
 assert.doesNotThrow(()=>new Script(inline));
 assert.doesNotThrow(()=>new Script(actions));
 assert.match(inline,/close\.addEventListener\('click',\(\)=>\{setOpen\(false\);window\.location\.replace\('\/'\);\}\)/);
 assert.match(inline,/window\.WeoPage\?\.sync\(open\)/);
 assert.match(actions,/window\.WeoPage=Object\.freeze/);
 assert.doesNotMatch(actions,/stopImmediatePropagation/);
 assert.doesNotMatch(actions,/pageObserver=new MutationObserver/);
});
