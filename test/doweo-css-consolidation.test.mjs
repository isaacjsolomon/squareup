import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const read=path=>readFileSync(resolve(root,path),'utf8');
const css=read('styles.css');
const html=read('index.html');
const deploy=read('.github/workflows/deploy-doweo-pages.yml');

const compatibilityIds=[
 'dw-home-full-width-activity',
 'dw-home-two-halves-style',
 'dw-home-activity-across-columns',
 'dw-compact-overview-style',
 'dw-overview-consistent-type',
 'dw-home-heading-alignment'
];
// Recent page repairs retain two separately scoped production-only overrides.
const scopedRepairIds=[
 'doweo-desktop-v5-navy-analytics',
 'dw-bills-exact-reference-v9',
 'dw-mobile-theme-authoritative-v7'
];

test('design system has exactly the requested global theme tokens',()=>{
 const prefix=css.slice(0,1500);
 const vars={
  bg:'#0A1B2E','surface-1':'#102B40','surface-2':'#173750',
  'surface-3':'#204158',border:'#355E72','border-strong':'#355E72',
  text:'#F3F8FC','text-muted':'#ABC6D7',accent:'#ABC6D7',
  'accent-hover':'#F3F8FC','on-accent':'#0A1B2E',danger:'#ABC6D7',
  'danger-soft':'#102B40','success-soft':'#102B40',info:'#ABC6D7',
  'radius-sm':'8px','radius-md':'12px','radius-lg':'20px'
 };
 for(const [k,v] of Object.entries(vars)){
  assert.match(prefix,new RegExp('--'+k+':\\s*'+v.replace('#','\\#').replace('(','\\(')+';'),
   'Missing canonical token '+k);
 }
 assert.match(prefix,/--shadow-card:\s*0 12px 30px color-mix\(in srgb, #0A1B2E 25%, transparent\)/);
 assert.match(prefix,/--shadow-dialog:\s*0 20px 50px color-mix\(in srgb, #0A1B2E 45%, transparent\)/);
});

test('270 inline blocks migrated, six template styles and three scoped page repairs retained',()=>{
 const styles=[...html.matchAll(/<style\b([^>]*)>([\s\S]*?)<\/style>/gi)];
 const expectedIds=[...compatibilityIds,...scopedRepairIds];
 assert.equal(styles.length,expectedIds.length);
 assert.deepEqual(styles.map(x=>x[1].match(/\bid="([^"]+)"/)?.[1]).sort(),expectedIds.sort());
 assert.equal([...css.matchAll(/\/\* Original style \d+\/276:/g)].length,270);
 const guard=html.match(/<script id="dw-template-home-layout-guard">([\s\S]*?)<\/script>/)?.[1];
 assert.ok(guard?.includes("sheet.disabled=template"),'Keep original sheet toggle logic');
 for(const id of compatibilityIds)assert.ok(guard.includes(id),'Missing template sheet reference '+id);
});

test('HTML links Inter, stylesheet, and all existing application scripts',()=>{
 const head=html.slice(0,html.indexOf('</head>'));
 assert.match(head,/fonts\.googleapis\.com\/css2\?family=Inter:wght@400;500;600;700;800&display=swap/);
 assert.match(head,/rel="stylesheet" href="\/styles\.css\?v=20261122-approved-seven-palette-v2"/);
 assert.match(html,/<script[^>]+(?:doweo-unified-shell\.js|doweo-unified-localize\.js)/);
 assert.match(html,/<section id="friends-page"/);
 assert.match(html,/id="tracker-dashboard"/);
});

test('Cloudflare copy manifest carries stylesheet, and injects component CSS before it',()=>{
 // Check the actual static copy command without relying on neighboring filenames.
 const copyLine=deploy.split('\n').find(line=>line.trimStart().startsWith('cp index.html styles.css '));
 assert.ok(copyLine,'Cloudflare must copy index.html and styles.css');
 for(const file of ['doweo-i18n.js','doweo-page-repairs.css','doweo-reference-home.css','doweo-reference-home.js'])
  assert.ok(copyLine.split(/\s+/).includes(file),'Missing deploy asset '+file);
 assert.match(deploy,/test -s \.pages-output\/styles\.css/);
 assert.match(deploy,/html = html\.replace\(marker, css \+ marker, 1\)/);
});

test('stylesheet braces stay balanced outside strings and comments',()=>{
 let depth=0,min=0,parens=0,comment=false,quote=null,escaped=false;
 for(let i=0;i<css.length;i++){
  const c=css[i],next=css[i+1];
  if(comment){if(c==='*'&&next==='/'){comment=false;i++;}continue;}
  if(quote){
   if(escaped){escaped=false;continue;}
   if(c==='\\'){escaped=true;continue;}
   if(c===quote)quote=null;
   continue;
  }
  if(c==='/'&&next==='*'){comment=true;i++;continue;}
  if(c==='"'||c==="'"){quote=c;continue;}
  if(c==='(')parens++;
  else if(c===')')parens--;
  if(parens===0){
   if(c==='{')depth++;
   if(c==='}')depth--;
   min=Math.min(min,depth);
  }
 }
 assert.equal(min,0);
 assert.equal(depth,0);
 assert.equal(comment,false);
 assert.equal(quote,null);
});

test('legacy theme colors and unsupported simple font values are gone from migrated CSS',()=>{
 for(const hex of ['#6366f1','#4f46e5','#5f60ed','#eef2ff'])
  assert.equal(new RegExp(hex,'i').test(css),false,'Indigo left in stylesheet: '+hex);
 const badWeight=[...css.matchAll(/font-weight\s*:\s*(\d+)(?:\s*!important)?(?=[;}])/gi)]
  .map(x=>Number(x[1])).filter(w=>![400,500,600,700,800].includes(w));
 assert.equal(badWeight.length,0,'Invalid remaining font weights');
 const tinySizes=[...css.matchAll(/font-size\s*:\s*(\d+(?:\.\d+)?)px(?:\s*!important)?(?=[;}])/gi)]
  .filter(x=>Number(x[1])<12);
 assert.equal(tinySizes.length,0,'Font sizes below 12px remain in CSS');
});
