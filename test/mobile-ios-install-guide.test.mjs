import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {UI_PHRASES} from '../doweo-ui-catalog.mjs';

const script=readFileSync(new URL('../doweo-mobile-more-pages.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../doweo-mobile-more-pages.css',import.meta.url),'utf8');
const manifest=JSON.parse(readFileSync(new URL('../manifest.webmanifest',import.meta.url),'utf8'));
const workflow=readFileSync(new URL('../.github/workflows/deploy-doweo-pages.yml',import.meta.url),'utf8');

test('iPhone Safari gets a manual Add to Home Screen button without altering the 4x2 More grid',()=>{
 assert.match(script,/const iosDevice=\(\)=>/);
 assert.match(script,/iPad\|iPhone\|iPod/);
 assert.match(script,/navigator\.maxTouchPoints>1/);
 assert.doesNotMatch(script,/const iosSafari=/,'browser tokens must not hide the action');
 assert.match(script,/installCTA\.hidden=!small\(\)\|\|installed\(\)/);
 assert.match(script,/grid\.before\(installCTA\)/,'install button must appear before the eight destination tiles');
 assert.match(script,/ensureInstallButton\(\)/);
 assert.doesNotMatch(script,/navigator\.share\(/,'the Web Share API cannot expose Safari Add to Home Screen');
 assert.equal(manifest.display,'standalone');
 assert.ok(manifest.icons.some(icon=>icon.sizes==='192x192'));
});

test('install guide explains Apple-required interaction and can be dismissed',()=>{
 for(const text of [
  'Add to Home Screen',
  'Keep DoWeo one tap away',
  'Add DoWeo to Home Screen',
  'Safari needs a few taps to install DoWeo as an app.',
  'Tap Safari’s Share button. If it is inside the page menu, open that menu and tap Share.',
  'Scroll down and select Add to Home Screen.',
  'Keep Open as Web App turned on, if shown, then tap Add.',
  'Apple requires these steps; websites cannot install themselves automatically.',
  'Got it'
 ]){
  assert.ok(script.includes(text),'missing UI string: '+text);
  assert.ok(UI_PHRASES.includes(text),'not approved for interface translation: '+text);
 }
 assert.match(script,/installDone\.addEventListener\('click',closeInstallGuide\)/);
 assert.match(script,/installClose\.addEventListener\('click',closeInstallGuide\)/);
 assert.match(script,/event\.key==='Escape'/);
 assert.match(script,/doweo:uiupdated/);
 assert.match(css,/#dw-ios-install-guide\[hidden\]\{display:none!important\}/);
 assert.match(css,/@media\(min-width:901px\)/);
 assert.match(workflow,/doweo-mobile-more-pages\.js\?v=20261121-ios-safari-install-v1/);
 assert.match(workflow,/doweo-mobile-more-pages\.css\?v=20261121-ios-safari-install-v1/);
});
