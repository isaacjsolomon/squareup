import {readFileSync} from 'node:fs';
import {join, resolve} from 'node:path';

// Check the actual Cloudflare Pages output, not a stale source snapshot.
const root=resolve(process.argv[2]||'.pages-output');
const html=readFileSync(join(root,'index.html'),'utf8');
const css=readFileSync(join(root,'styles.css'),'utf8');
const desktopCss=readFileSync(join(root,'doweo-desktop-standalone.css'),'utf8');
const server=readFileSync('functions/api/[[path]].js','utf8');
const assert=(condition,message)=>{if(!condition)throw Error(message);};
const section=html.match(/var PRESETS = \{[\s\S]*?\n\};/)?.[0];
assert(section,'Backdrop PRESETS missing');
const required={
 indigo:['#1e1b4b','#312e81'],
 sunset:['#7c2d12','#be185d'],
 ocean:['#0c4a6e','#0e7490'],
 forest:['#14532d','#115e59'],
 night:['#020617','#334155'],
 berry:['#4a044e','#6b21a8']
};
for(const [name,[start,end]] of Object.entries(required)){
 const line=section.split('\n').find(s=>s.trimStart().startsWith(name+':'));
 assert(line&&line.includes(start)&&line.includes(end),name+' lost its original gradient');
}
assert(html.includes('restored-original-backdrops-20261122-v1'),'Missing original backdrop compatibility marker');
assert(html.includes('expanded-gallery-18-presets-20261123-v1'),'Missing expanded gallery release marker');
assert(html.includes('expanded-gallery-28-presets-20261123-v2'),'Missing 28-preset gallery marker');
assert(html.includes('doweo-desktop-standalone.css?v=20261123-tracker-workspace-wallpaper-v1'),'New desktop gallery CSS not cache-busted');
assert(html.includes('styles.css?v=20261123-backdrop-gallery-v1'),'Backdrop gallery stylesheet not cache-busted');
assert(/function sqBannerPalette\(\)\{\s*return SQ_BANNER_PRESETS;\s*\}/.test(html),'Mobile banner preset lock still active');
assert(!/\bMOBILE_PRESETS\b|\bSQ_MOBILE_BANNER_PRESETS\b|dw-mobile-theme-authoritative-v7|seven-color-source-palette/.test(html),'Legacy palette lock still active');
assert(html.includes('setBackdropSwatchArtwork(swatch, previewImage, config.label)'),'Every preset category must render the actual image or gradient in its own thumbnail layer');
assert(html.includes('setBackdropSwatchArtwork(custom, photoPreview, "Your photo")'),'Uploaded photo thumbnail must also be visible on mobile');
assert(html.includes('art.style.setProperty("background-image", image, "important")'),'Preview artwork must not be overridden by mobile button backgrounds');
assert(html.includes('swatch.style.setProperty("background-image", previewImage, "important")'),'Original swatch background must remain as a compatible fallback');
assert(html.includes('#backdrop-swatches .swatch > .dw-backdrop-preview-art'),'Preview art layer style is missing');
assert(html.includes('#backdrop-swatches .swatch > .dw-backdrop-preview-title'),'Preview captions must remain readable');
for (const tab of ['gradients', 'nature', 'sky']) {
 assert(html.includes('id: "' + tab + '"'),'Missing mobile picker category: '+tab);
}
assert(html.includes('id="backdrop-categories"'),'Backdrop category controls missing');
for (const key of ['mountainMist','tropicalCoast','alpineLake','desertDunes','evergreen','snowfall','cottonCandy','northernLights','stargazing','aquaFlow','topographic','midnightBlue']) {
 assert(section.includes(key+':'),'Missing new backdrop '+key);
}
const newIds=['mountainSummit','forestTrail','oceanWaves','goldenValley','sunriseSkies','starryNight','blueMoon','glacierGlass','mintLagoon','violetHorizon'];
const keys=[...section.matchAll(/^  ([A-Za-z]\w*):/gm)].map(m=>m[1]);
assert(keys.length===28&&new Set(keys).size===28,'Gallery must offer exactly 28 unique options');
for(const key of newIds){
 assert(section.includes(key+':'),'New backdrop missing from picker: '+key);
 assert(server.includes("'"+key+"'"),'New backdrop rejected by tracker API: '+key);
}
assert(desktopCss.includes('#backdrop-modal.dw-desktop-standalone'),'Backdrop workspace layout rules missing');
assert(desktopCss.includes('var(--dw-selected-tracker-wallpaper'),'Backdrop page must use selected tracker wallpaper');
assert(desktopCss.includes('max-width:1220px!important'),'Backdrop picker did not expand');
assert(html.includes('el.style.setProperty("background-image", chosenImage, "important")'),'Selected wallpaper should win over old CSS');
assert(!html.includes('el.style.setProperty("background-blend-mode", url ? "multiply"'),'Mobile photo tint still active');
assert(!css.includes('#backdrop.photo::after'),'Photo recoloring overlay still active');
assert(css.includes('--accent: #60F1AD;'),'Mint action accent lost');
console.log('All 28 presets, all three mobile thumbnail tabs, uploaded-photo previews, and desktop gallery verified');
