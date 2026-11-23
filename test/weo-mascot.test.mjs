import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script,runInNewContext} from 'node:vm';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const html=read('index.html');
const mascot=read('weo-mascot.js');
const css=read('weo-mascot.css');
const server=read('functions/api/ai-chat.js');
const workflow=read('.github/workflows/deploy-doweo-pages.yml');
const chat=html.match(/<script id="sq-ai-script">([\s\S]*?)<\/script>/)?.[1];

test('Mascot and chat JavaScript parse and required assets are deployed',()=>{
 assert.doesNotThrow(()=>new Script(mascot));
 assert.ok(chat);
 assert.doesNotThrow(()=>new Script(chat));
 assert.doesNotThrow(()=>new Script(server.replace(/\bexport\s+(?=async\s+function\b)/g,'')));
 assert.match(html,/<link rel="stylesheet" href="\/weo-mascot\.css(?:\?v=[^"]+)?">/);
 assert.match(html,/<script src="\/weo-mascot\.js(?:\?v=[^"]+)?" defer><\/script>/);
 assert.match(workflow,/cp index\.html[^\n]*weo-mascot\.js weo-mascot\.css/);
});

test('All AI surfaces use Weo while preserving the original chat endpoint',()=>{
 assert.match(html,/id="sq-ai-launch"[^>]*aria-label="Ask Weo/);
 assert.match(html,/class="sq-ai-label">Ask Weo/);
 assert.match(html,/<strong>Weo<\/strong><small>Your DoWeo AI assistant<\/small>/);
 assert.match(chat,/Hi, I’m Weo!/);
 assert.match(chat,/window\.WeoMascot\?\.refresh\(\)/);
 assert.match(chat,/window\.WeoMascot\?\.decorateBubble\(el\)/);
 assert.match(chat,/window\.squareUpApi\('ai-chat','POST',/);
 assert.match(server,/You are Weo, the built-in AI assistant for DoWeo/);
 assert.match(server,/You cannot directly inspect the user's private records, trackers, payments/);
});

test('Thinking, success, helping and welcome moods are called from actual AI interactions',()=>{
 assert.match(chat,/window\.WeoMascot\?\.setMood\('thinking'\)/);
 assert.match(chat,/window\.WeoMascot\?\.setMood\('success'\)/);
 assert.match(chat,/window\.WeoMascot\?\.setMood\('helping'\)/);
 assert.match(chat,/setMood\(open\?'hello':'idle'\)/);
 assert.match(css,/data-weo-mood="thinking"/);
 assert.match(css,/data-weo-mood="success"/);
 assert.match(css,/prefers-reduced-motion:reduce/);
});

test('Mascot mounts safely, changes expressions and adds an assistant-only badge',()=>{
 const elements=new Map();
 function element(className=''){
   const classes=new Set(className.split(' ').filter(Boolean));
   const attrs=new Map();
   const el={
     className,
     classList:{add:(name)=>classes.add(name),contains:(name)=>classes.has(name)},
     setAttribute:(key,value)=>attrs.set(key,String(value)),
     getAttribute:key=>attrs.get(key),
     child:null,
     get firstElementChild(){return this._svg||null;},
     set innerHTML(value){this._svg={className:'weo-svg',markup:value};},
     appendChild(child){this.child=child;return child;},
     prepend(child){this.prepended=child;return child;},
     querySelector(selector){if(selector==='.weo-svg')return this.child?.className==='weo-svg'?this.child:null;return null;}
   };
   return el;
 }
 const mark=element('sq-ai-mark'),avatar=element('sq-ai-avatar'),welcome=element('sq-ai-welcome-mark');
 const launch={querySelector:key=>key==='.sq-ai-mark'?mark:null};
 const panel={
   querySelector:key=>key==='.sq-ai-avatar'?avatar:key==='.sq-ai-welcome-mark'?welcome:null,
   querySelectorAll:key=>key==='.weo-mascot'?[avatar,welcome]:[]
 };
 const timers=[];
 const context={
   document:{getElementById:id=>id==='sq-ai-launch'?launch:id==='sq-ai-window'?panel:null,createElement:()=>element()},
   window:{},
   setTimeout:fn=>{timers.push(fn);return timers.length;},
   clearTimeout:()=>{}
 };
 runInNewContext(mascot,context);
 assert.ok(mark.child?.markup.includes('weo-eyes-normal'));
 assert.ok(avatar.child?.markup.includes('weo-mouth-happy'));
 assert.equal(mark.getAttribute('data-weo-mood'),'idle');
 context.window.WeoMascot.setMood('thinking');
 assert.equal(mark.getAttribute('data-weo-mood'),'thinking');
 assert.equal(avatar.getAttribute('data-weo-mood'),'thinking');
 context.window.WeoMascot.setMood('success');
 assert.equal(welcome.getAttribute('data-weo-mood'),'success');
 assert.equal(typeof timers.at(-1),'function');
 timers.at(-1)();
 assert.equal(welcome.getAttribute('data-weo-mood'),'idle');

 const bot=element('sq-ai-message');
 context.window.WeoMascot.decorateBubble(bot);
 assert.ok(bot.prepended);
 assert.ok(bot.prepended.child?.markup.includes('weo-color-'));
 assert.ok(bot.classList.contains('weo-has-avatar'));
 const user=element('sq-ai-message user');
 context.window.WeoMascot.decorateBubble(user);
 assert.equal(user.prepended,undefined);
});

test('AI mascot does not alter personal finances or add external graphics dependencies',()=>{
 assert.doesNotMatch(mascot,/fetch\(|XMLHttpRequest|WebSocket|localStorage|sessionStorage/);
 assert.doesNotMatch(mascot,/innerHTML\s*=\s*[^;]*user/i);
 assert.doesNotMatch(css,/@import|url\(/);
 assert.match(css,/\.weo-mascot/);
});
