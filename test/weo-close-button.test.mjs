import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script} from 'node:vm';
const actions=readFileSync(new URL('../weo-actions.js',import.meta.url),'utf8');
test('Weo close X uses one synchronous capture handler',()=>{
 assert.doesNotThrow(()=>new Script(actions));
 assert.match(actions,/querySelector\('#sq-ai-close'\)/);
 assert.match(actions,/event\.stopImmediatePropagation\(\)/);
 assert.match(actions,/window\.WeoChat\?\.close\?\.\(\)/);
 assert.match(actions,/panel\.hidden=true;\s*deactivatePage\(true\)/);
 assert.doesNotMatch(actions,/const lastHeaderButton=closeControls\.at\(-1\)/);
});
