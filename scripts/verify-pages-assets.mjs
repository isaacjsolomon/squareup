import {readFileSync, existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

// Check the deploy directory, not the source tree: Pages returns index.html for
// missing assets, which can make a successful upload ship a broken application.
export function verifyPagesAssets(directory) {
 const root=resolve(directory), queue=['index.html'], checked=new Set();
 while(queue.length) {
  const file=queue.shift();
  if(checked.has(file))continue;
  checked.add(file);
  const path=resolve(root,file);
  if(!path.startsWith(root+'/')||!existsSync(path))throw Error('Missing published asset: '+file);
  const source=readFileSync(path,'utf8');
  if(/\.(?:css|m?js)$/.test(file)&&/^\s*(?:<!doctype|<html)/i.test(source))throw Error('HTML returned for asset: '+file);
  const refs=file.endsWith('.html')
   ? [...source.matchAll(/<(?:script|link)\b[^>]*(?:src|href)=["']([^"']+)["']/gi)].map(m=>m[1])
   : [...source.matchAll(/import\s*(?:\(\s*)?["'](\/[^"']+)["']/g)].map(m=>m[1]);
  for(const ref of refs) {
   if(/^(?:https?:|\/\/|data:)/.test(ref))continue;
   const name=ref.split(/[?#]/)[0].replace(/^\//,'');
   if(/\.(?:css|m?js|webmanifest)$/.test(name))queue.push(name);
  }
 }
 return [...checked];
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
 console.log('Verified published assets:',verifyPagesAssets(process.argv[2]||'.pages-output').join(', '));
}
