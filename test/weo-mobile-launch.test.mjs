import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script} from 'node:vm';

const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const html=read('index.html');
const actions=read('weo-actions.js');
const history=read('weo-history.js');
const css=read('weo-actions.css');
const inline=html.match(/<script id="sq-ai-script">([\s\S]*?)<\/script>/)?.[1];

test('native Weo launcher sends an immediate open event',()=>{
 assert.ok(inline);
 assert.doesNotThrow(()=>new Script(inline));
 assert.doesNotThrow(()=>new Script(actions));
 assert.match(inline,/panel\.dispatchEvent\(new CustomEvent\('weo:opened'\)\)/);
 assert.match(inline,/open:\(\)=>setOpen\(true\)/);
 assert.match(actions,/panel\.addEventListener\('weo:opened'/);
 assert.doesNotMatch(actions,/getClientRects\(\)/);
 assert.doesNotMatch(actions,/requestAnimationFrame\(updatePageState\)/);
});
test('fresh Weo routes and browser history open real chat content',()=>{
 assert.match(actions,/if\(panel\.hidden\)window\.WeoChat\?\.open\?\.\(\)/);
 assert.match(actions,/activatePage\(false\)/);
 assert.match(actions,/addEventListener\('popstate'/);
});
test('mobile users can always navigate Home without the removed X',()=>{
 assert.doesNotThrow(()=>new Script(history));
 assert.match(history,/mobileBack\.href='\/'/);
 assert.match(history,/head\.insertBefore\(mobileBack,head\.firstChild\)/);
 assert.match(css,/#sq-ai-window\.weo-full-page \.weo-mobile-back-home/);
 assert.match(css,/#sq-ai-window #sq-ai-close\{display:none!important\}/);
});
