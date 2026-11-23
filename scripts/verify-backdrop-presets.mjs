import {readFileSync} from 'node:fs';
import {join, resolve} from 'node:path';

// Check the actual Cloudflare Pages output, not a stale source snapshot.
const root=resolve(process.argv[2]||'.pages-output');
const html=readFileSync(join(root,'index.html'),'utf8');
const css=readFileSync(join(root,'styles.css'),'utf8');
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
assert(html.includes('styles.css?v=20261123-backdrop-gallery-v1'),'Backdrop gallery stylesheet not cache-busted');
assert(/function sqBannerPalette\(\)\{\s*return SQ_BANNER_PRESETS;\s*\}/.test(html),'Mobile banner preset lock still active');
assert(!/\bMOBILE_PRESETS\b|\bSQ_MOBILE_BANNER_PRESETS\b|dw-mobile-theme-authoritative-v7|seven-color-source-palette/.test(html),'Legacy palette lock still active');
assert(html.includes('swatch.style.backgroundImage = config.preview || config.css'),'Backdrop previews must use the new preset background and avoid inline-HTML CSS injection');
assert(html.includes('id="backdrop-categories"'),'Backdrop category controls missing');
for (const key of ['mountainMist','tropicalCoast','alpineLake','desertDunes','evergreen','snowfall','cottonCandy','northernLights','stargazing','aquaFlow','topographic','midnightBlue']) {
 assert(section.includes(key+':'),'Missing new backdrop '+key);
}
assert(html.includes('el.style.setProperty("background-image", chosenImage, "important")'),'Selected wallpaper should win over old CSS');
assert(!html.includes('el.style.setProperty("background-blend-mode", url ? "multiply"'),'Mobile photo tint still active');
assert(!css.includes('#backdrop.photo::after'),'Photo recoloring overlay still active');
assert(css.includes('--accent: #60F1AD;'),'Mint action accent lost');
console.log('Six original gradients, twelve additional backdrops, and responsive gallery verified');
