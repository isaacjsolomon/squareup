import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script} from 'node:vm';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const actions=readFileSync(new URL('../weo-actions.js',import.meta.url),'utf8');
const inline=html.match(/<script id="sq-ai-script">([\s\S]*?)<\/script>/)?.[1];

test('mobile Weo launcher uses a real navigable link',()=>{
 assert.match(html,/<a id="sq-ai-launch" href="\/\?view=weo"/);
 assert.doesNotMatch(html,/<button id="sq-ai-launch"/);
 assert.match(inline,/if\(mobile\(\)\)return;\s*event\.preventDefault\(\);\s*setOpen\(panel\.hidden\)/);
});
test('Weo deep link opens through original chat code before optional scripts',()=>{
 assert.ok(inline);
 assert.doesNotThrow(()=>new Script(inline));
 assert.match(inline,/new URLSearchParams\(location\.search\)\.get\('view'\)==='weo'\)setOpen\(true\)/);
 assert.doesNotThrow(()=>new Script(actions));
 assert.match(actions,/if\(isWeoRoute\(\)\)/);
});
