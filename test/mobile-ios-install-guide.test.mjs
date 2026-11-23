import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {UI_PHRASES} from '../doweo-ui-catalog.mjs';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const moreScript=readFileSync(new URL('../doweo-mobile-more-pages.js',import.meta.url),'utf8');
const styles=readFileSync(new URL('../styles.css',import.meta.url),'utf8');
const workflow=readFileSync(new URL('../.github/workflows/deploy-doweo-pages.yml',import.meta.url),'utf8');
const manifest=JSON.parse(readFileSync(new URL('../manifest.webmanifest',import.meta.url),'utf8'));
const sectionStart=html.indexOf('<div class="sq-balanced-overlay" id="sq-mobile-more-sheet"');
const sectionEnd=html.indexOf('<!-- Native Safari-friendly installation guide;',sectionStart);
const more=html.slice(sectionStart,sectionEnd);

test('the real HTML contains a visible mobile Home Screen action above the actual More grid',()=>{
 assert.ok(sectionStart>0&&sectionEnd>sectionStart,'find the production More section');
 assert.equal((html.match(/id="dw-mobile-home-screen-install-native"/g)||[]).length,1,'button occurs exactly once');
 assert.equal((html.match(/id="dw-mobile-home-screen-help"/g)||[]).length,1,'native dialog occurs exactly once');
 assert.ok(more.indexOf('id="dw-mobile-home-screen-install-native"')>more.indexOf('All your DoWeo tools in one place.'),'button follows More introduction');
 assert.ok(more.indexOf('id="dw-mobile-home-screen-install-native"')<more.indexOf('sq-balanced-actions sq-balanced-more-grid'),'button precedes the eight tiles');
 assert.match(more,/onclick="document.getElementById\('dw-mobile-home-screen-help'\).showModal\(\)"/,'button opens modal directly');
 assert.match(html,/<form method="dialog"><button type="submit">Got it<\/button><\/form>/,'close works natively');
 assert.match(styles, /@media\(max-width:900px\)/,'mobile styling is retained in the consolidated CSS');
 assert.match(styles, /#sq-mobile-more-sheet #dw-mobile-home-screen-install-native\{/);
 assert.match(styles, /display:flex!important/);
 assert.match(styles, /@media\(min-width:901px\)\{#dw-mobile-home-screen-install-native\{display:none!important\}\}/,'desktop is unaffected');
 assert.doesNotMatch(moreScript,/ensureInstallButton|iosDevice\(/,'no device detection or runtime injection may hide the button');
 assert.equal(manifest.display,'standalone');
 assert.ok(manifest.icons.some(icon=>icon.sizes==='192x192'));
});

test('the Safari guide copy is approved for interface localization and packaged for production',()=>{
 for(const phrase of [
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
  assert.ok(html.includes(phrase),'missing copy in the production HTML: '+phrase);
  assert.ok(UI_PHRASES.includes(phrase),'not approved for translation: '+phrase);
 }
 assert.match(workflow,/cp index.html/);
 assert.match(workflow,/doweo-mobile-more-pages\.js\?v=20261122-backdrop-colors-v1/);
 assert.match(workflow,/doweo-mobile-more-pages\.css\?v=20261122-backdrop-colors-v1/);
});
