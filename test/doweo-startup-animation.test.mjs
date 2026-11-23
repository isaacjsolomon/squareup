import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const css=readFileSync(new URL('../styles.css',import.meta.url),'utf8');

test('first paint draws the real mint/cyan/white SVG logo on both screen sizes',()=>{
  const screen=html.match(/<div id="sq-startup-overlay"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/)?.[1]||'';
  assert.match(screen,/<svg class="doweo-loading-logo"/);
  assert.doesNotMatch(screen,/<img class="doweo-loading-logo"/);
  for(const part of ['doweo-logo-left','doweo-logo-right','doweo-logo-front','doweo-logo-d'])
    assert.ok(screen.includes('doweo-logo-trace '+part),part+' missing from animated paths');
  for(const color of ['#60F1AD','#F3F8FC','#00D8F5'])
    assert.ok(screen.includes(color),color+' must survive theme changes');
  assert.match(html,/@keyframes dw-startup-logo-draw/);
  assert.match(html,/stroke-dasharray:1;stroke-dashoffset:1/);
  assert.match(css,/#sq-startup-overlay \.doweo-logo-trace\{\s*stroke-dasharray:1;stroke-dashoffset:1;opacity:1;/);
  assert.doesNotMatch(css,/#sq-startup-overlay \.doweo-logo-trace\{[^}]*animation:none/);
  assert.match(css,/html body #sq-startup-overlay \.sq-startup-content \{\s*background:transparent!important;border:0!important/);
  assert.match(html,/prefers-reduced-motion:reduce/);
});

test('startup timing shows the logo on fast launches without slowing later tracker navigation',()=>{
  const source=html.match(/<script id="dw-startup-logo-controller">([\s\S]*?)<\/script>/)?.[1];
  assert.ok(source,'startup overlay controller must run before the main application');
  assert.match(html,/window\.dwSetStartupScreen\(loading\)/,'tracker loads must use startup lifecycle');

  function setup(reduced){
    const screen={hidden:false};
    const timers=new Map();
    let time=0,id=0;
    const window={matchMedia:()=>({matches:reduced})};
    runInNewContext(source,{window,document:{getElementById:()=>screen},
      performance:{now:()=>time},
      setTimeout:(callback,delay)=>{const key=++id;timers.set(key,{callback,delay});return key;},
      clearTimeout:key=>timers.delete(key)
    });
    return {screen,window,timers,advance(value){time=value;},
      fire(){for(const [key,job] of [...timers]){timers.delete(key);job.callback();}}};
  }

  const app=setup(false);
  app.window.dwSetStartupScreen(false);
  assert.equal(app.screen.hidden,false,'cached load must not skip logo animation');
  assert.equal([...app.timers.values()][0]?.delay,1650);
  app.advance(1650);app.fire();
  assert.equal(app.screen.hidden,true,'logo must clear when first-load animation completes');
  app.window.dwSetStartupScreen(true);
  assert.equal(app.screen.hidden,false);
  app.window.dwSetStartupScreen(false);
  assert.equal(app.screen.hidden,true,'later tracker fetches should not add a 1.65s delay');

  const raced=setup(false);
  raced.window.dwSetStartupScreen(false);
  raced.advance(450);
  raced.window.dwSetStartupScreen(true);
  assert.equal(raced.timers.size,0,'new load should cancel an earlier scheduled dismissal');
  raced.fire();
  assert.equal(raced.screen.hidden,false);
  raced.window.dwSetStartupScreen(false);
  assert.equal([...raced.timers.values()][0]?.delay,1200);
  raced.advance(1650);raced.fire();
  assert.equal(raced.screen.hidden,true);

  const accessible=setup(true);
  accessible.window.dwSetStartupScreen(false);
  assert.equal(accessible.screen.hidden,true,'reduced motion must not incur artificial loading delay');
  assert.equal(accessible.timers.size,0);
});
