import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {verifyPagesAssets} from '../scripts/verify-pages-assets.mjs';

test('deployment includes every local runtime asset referenced by the real app',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const workflow=readFileSync(new URL('../.github/workflows/deploy-doweo-pages.yml',import.meta.url),'utf8');
 const manifest=workflow.match(/cp index\.html ([^\n]+) \.pages-output\//)[1].split(/\s+/);
 const refs=[...html.matchAll(/<(?:script|link)\b[^>]*(?:src|href)=["']([^"']+)["']/gi)].map(m=>m[1]).filter(x=>!/^https?:|^\/\//.test(x)).map(x=>x.split('?')[0].replace(/^\//,''));
 for(const asset of refs.filter(x=>/\.(css|m?js|webmanifest)$/.test(x)))assert.ok(manifest.includes(asset),'missing from deployment: '+asset);
 assert.match(workflow,/node scripts\/verify-pages-assets\.mjs \.pages-output/);
});
test('packaging fails on missing CSS or HTML fallbacks masquerading as JavaScript',()=>{
 const root=mkdtempSync(join(tmpdir(),'doweo-assets-'));
 try{
  writeFileSync(join(root,'index.html'),'<link rel="stylesheet" href="/bills.css?v=2"><script src="/bills.js"></script>');
  assert.throws(()=>verifyPagesAssets(root),/Missing published asset: bills.css/);
  writeFileSync(join(root,'bills.css'),'body{}');
  writeFileSync(join(root,'bills.js'),'<!DOCTYPE html><html>');
  assert.throws(()=>verifyPagesAssets(root),/HTML returned for asset: bills.js/);
  writeFileSync(join(root,'bills.js'),'console.log("ready")');
  assert.equal(verifyPagesAssets(root).length,3);
 }finally{rmSync(root,{recursive:true,force:true})}
});
