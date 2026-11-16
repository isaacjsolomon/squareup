import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const origin=process.env.BILLS_BASE_URL||'https://doweo.app';
const hash=s=>createHash('sha256').update(s).digest('hex');
const localIndex=readFileSync('index.html','utf8');
for(let attempt=0;attempt<12;attempt++){
 try{
  const index=await fetch(origin+'/',{cache:'no-store'}).then(r=>r.text());
  for(const file of ['doweo-bills-mobile-dashboard.css','doweo-bills-mobile-dashboard.js','doweo-navigation.css','doweo-navigation.js']){
   const ref=localIndex.match(new RegExp(file.replaceAll('.','\\.')+'\\?v=[^"\\s]+'))[0];
   if(!index.includes(ref))throw Error('Production index is not the new version: '+ref);
   const response=await fetch(new URL('/'+ref,origin),{cache:'no-store'});
   if(!response.ok)throw Error('Asset HTTP '+response.status+': '+file);
   const type=response.headers.get('content-type')||'';
   if(!/(?:javascript|text\/css)/i.test(type))throw Error('Wrong asset content type: '+file+' '+type);
   if(hash(await response.text())!==hash(readFileSync(file,'utf8')))throw Error('Production asset differs from this commit: '+file);
  }
  console.log('Production Bills index and both runtime assets match this checkout.');process.exit(0);
 }catch(error){
  if(attempt===11)throw error;
  console.log(error.message+'; checking again shortly');
  await new Promise(done=>setTimeout(done,10000));
 }
}
