import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script} from 'node:vm';
const css=readFileSync(new URL('../weo-actions.css',import.meta.url),'utf8');
const actions=readFileSync(new URL('../weo-actions.js',import.meta.url),'utf8');

test('Weo quick actions stay in the chat composer at every viewport width',()=>{
 assert.doesNotThrow(()=>new Script(actions));
 assert.match(actions,/if\(area\.parentElement!==form\)form\.appendChild\(area\)/);
 assert.doesNotMatch(actions,/support\.insertAdjacentElement\('afterend',area\);\s*closeActions\(\);\s*\}/);
});

test('Desktop chat content is independently scrollable with a fixed-size composer',()=>{
 assert.match(css,/#sq-ai-window\.weo-full-page #sq-ai-stream\{[\s\S]*?flex:1 1 0!important/);
 assert.match(css,/#sq-ai-window\.weo-full-page #sq-ai-form\{[\s\S]*?flex:0 0 auto!important/);
 assert.match(css,/#sq-ai-window\.weo-full-page #sq-ai-form \.weo-quick-actions\.weo-menu-open\{/);
 assert.match(css,/--weo-side-width:255px/);
});

test('Desktop sidebar offsets are symmetrical and mobile remains separately scoped',()=>{
 assert.match(css,/@media\(min-width:1000px\)\{/);
 assert.match(css,/width:calc\(100% - 255px\)!important/);
 assert.match(css,/@media\(max-width:700px\)/);
});
