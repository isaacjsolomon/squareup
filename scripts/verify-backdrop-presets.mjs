import {readFileSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {runInNewContext} from 'node:vm';

// Check the actual Cloudflare Pages output, not a stale source snapshot.
const root=resolve(process.argv[2]||'.pages-output');
const html=readFileSync(join(root,'index.html'),'utf8');
const css=readFileSync(join(root,'styles.css'),'utf8');
const desktopCss=readFileSync(join(root,'doweo-desktop-standalone.css'),'utf8');
const catalogJs=readFileSync(join(root,'doweo-backdrop-catalog.js'),'utf8');
const catalogCss=readFileSync(join(root,'doweo-backdrop-catalog.css'),'utf8');
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
assert(html.includes('doweo-desktop-standalone.css?v=20261124-creation-popups-v8'),'New desktop gallery CSS not cache-busted');
assert(html.includes('styles.css?v=20261123-backdrop-gallery-v1'),'Backdrop gallery stylesheet not cache-busted');
assert(html.includes('Object.keys(catalog).forEach(function(key){palette[key]=catalog[key].css;});'),'Banner picker must include all curated backdrops');
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
const libraryWindow={};
runInNewContext(catalogJs,{window:libraryWindow});
const curated=libraryWindow.DoWeoBackdropCatalog;
assert(curated&&typeof curated==='object','Curated backdrop library failed to initialize');
const entries=Object.entries(curated);
assert(entries.length===60,'Expected all 60 curated backdrop entries');
const expectedGroups={nature:9,cities:6,gradients:6,textures:9,animals:30};
for(const [group,count] of Object.entries(expectedGroups)){
 assert(entries.filter(([,v])=>v.group===group).length===count,'Wrong backdrop count for '+group);
}
assert(entries.filter(([,v])=>v.kind==='photo').length===45,'Expected 45 real-photo presets');
assert(entries.filter(([,v])=>v.kind==='design').length===15,'Expected 15 abstract/texture presets');
for(const [id,item] of entries){
 assert(item.label&&item.css&&item.preview&&Array.isArray(item.side),'Invalid catalog option '+id);
 assert(server.includes("'"+id+"'"),'Curated option missing from API allowlist: '+id);
}
for(const category of ['all','nature','cities','gradients','textures','animals']){
 assert(html.includes('id: "'+category+'"'),'Missing backdrop filter category '+category);
}
assert(html.includes('Object.assign(PRESETS, window.DoWeoBackdropCatalog || {})'),
 'Shared tracker picker does not register curated gallery');
assert(html.includes('backdropCategory !== "all" && config.group !== backdropCategory'),
 'All backdrop tab does not show presets across categories');
assert(html.includes('setBackdropSwatchArtwork(button,preview,label)'),
 'Banner chooser does not render the curated photo thumbnails');
assert(html.includes('await sqBannerSet(trackerId,value)')&&html.includes('sqBannerApply(banner,value)'),
 'Banner chooser does not persist the selected image');
assert(html.includes('/doweo-backdrop-catalog.js?v=')&&html.includes('/doweo-backdrop-catalog.css?v='),
 'Published HTML must load the new backdrop assets');
assert(catalogCss.includes('#sq-banner-editor .tracker-banner-presets'),
 'Banner picker category and preview styles missing');
assert(catalogCss.includes('#backdrop-modal #backdrop-swatches'),
 'Tracker backdrop picker category styles missing');
console.log('Verified 28 legacy presets + 60 curated options (45 photos, 15 designs), both selectors, mobile thumbnails, and all API allowlist entries');
