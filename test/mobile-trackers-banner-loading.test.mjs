import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const css=readFileSync(new URL('../styles.css',import.meta.url),'utf8');

test('Trackers no longer has the redundant Friends & Requests button',()=>{
 assert.doesNotMatch(html,/id="sq-friends-mobile-link"/);
 assert.doesNotMatch(html,/\$\('sq-friends-mobile-link'\)\.onclick/);
 assert.match(html,/\$\('nav-friends'\)\.onclick/);
});

test('mobile banners retain the selected preset or uploaded background',()=>{
 assert.doesNotMatch(css,/@media\(max-width:760px\)\{\.tracker-tile-banner\{background-image:none!important\}\}/);
 assert.match(css,/@media\(max-width:760px\)\{\.tracker-tile-banner\{background-size:cover!important;background-position:center!important\}\}/);
 assert.match(html,/async function sqBannerEdit\(trackerId,trackerName,banner\)/);
 assert.match(html,/await sqBannerSet\(trackerId,v\);sqBannerApply\(banner,v\)/);
});

test('banner editor is above portalled tracker menu with mobile-safe scrolling',()=>{
 assert.match(html,/overlay\.style\.zIndex='2147482000'/);
 assert.match(css,/#sq-banner-editor\.tracker-banner-editor\{/);
 assert.match(css,/#sq-banner-editor \.tracker-banner-dialog\{/);
 assert.match(css,/max-height:calc\(100dvh - 42px\)!important/);
 assert.match(html,/requestAnimationFrame\(function\(\)\{close\.focus\(\);\}\)/);
});

test('trackers render the same animated DW logo during asynchronous loads',()=>{
 assert.match(html,/className='sq-gallery-loading'/);
 assert.match(html,/querySelector\('#sq-startup-overlay \.doweo-loading-logo'\)/);
 assert.match(html,/cloneNode\(true\)/);
 assert.match(html,/loadingLabel\.textContent='Loading trackers…'/);
 assert.match(css,/animation:doweo-logo-draw 3\.2s ease-in-out infinite/);
 assert.match(html,/if\(serial!==trackerGallerySerial\)return/);
 assert.match(html,/sqGalleryKeepCreateRow\(gallery\)/);
});

test('respect reduced motion and keep loading within the gallery',()=>{
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)\{\s*#trackers-gallery \.sq-gallery-loading \.doweo-logo-trace\{animation:none!important/);
 assert.match(css,/body\.trackers-view #trackers-gallery>\.sq-gallery-loading/);
 assert.doesNotMatch(css,/\.sq-gallery-loading\{position:fixed/);
});
