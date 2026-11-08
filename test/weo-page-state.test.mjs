import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script} from 'node:vm';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const html=read('index.html');
const external=read('weo-actions.js');
const css=read('weo-actions.css');
const inline=html.match(/<script id="sq-ai-script">([\s\S]*?)<\/script>/)?.[1];

test('Weo has one authoritative native open and close implementation',()=>{
 assert.ok(inline);
 assert.doesNotThrow(()=>new Script(inline));
 assert.doesNotThrow(()=>new Script(external));
 assert.match(inline,/window\.WeoPage\?\.sync\(open\)/);
 assert.match(inline,/close\.addEventListener\('click',\(\)=>\{setOpen\(false\);window\.location\.replace\('\/'\);\}\)/);
 assert.match(inline,/open:\(\)=>setOpen\(true\)/);
 assert.match(external,/window\.WeoPage=Object\.freeze\(/);
 assert.doesNotMatch(external,/const pageObserver=new MutationObserver/);
 assert.doesNotMatch(external,/closeButton\?\.addEventListener\('click'/);
});

test('Closing explicitly hides the panel, removes route and restores original parent',()=>{
 assert.match(external,/const closePage=\(\)=>\{/);
 assert.match(external,/panel\.hidden=true/);
 assert.match(external,/panel\.classList\.remove\('weo-full-page','weo-keyboard-open','weo-typing','weo-sidebar-open'\)/);
 assert.match(external,/restorePanel\(\)/);
 assert.match(external,/history\.replaceState\(/);
});

test('Hidden state takes precedence over full-screen display important styles',()=>{
 assert.match(css,/html body #sq-ai-window\.weo-full-page\[hidden\]/);
 assert.match(css,/display:none!important/);
 assert.match(css,/pointer-events:none!important/);
});
