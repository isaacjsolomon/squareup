import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script} from 'node:vm';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const inline=html.match(/<script id="sq-ai-script">([\\s\\S]*?)<\\/script>/)?.[1];
test('mobile Weo launcher opens in place, without URL reload',()=>{
 assert.ok(inline);
 assert.doesNotThrow(()=>new Script(inline));
 const handler=inline.slice(inline.indexOf("launch.addEventListener('click',event=>"),inline.indexOf(' // Bind directly to the actual X button;'));
 assert.match(handler,/event\\.preventDefault\\(\\)/);
 assert.match(handler,/setOpen\\(true\\)/);
 assert.doesNotMatch(handler,/if\\(mobile\\(\\)\\)return/);
 assert.match(html,/id="sq-ai-launch" href="\\/\\?view=weo"/);
});
