import { UI_PHRASES } from '../../doweo-ui-catalog.mjs';

// Static, source-controlled UI strings only. Never translate private tracker data,
// typed messages, account details, or payment information through this endpoint.
const allowed = new Set(UI_PHRASES);
const supported = new Set(['es','fr','he','zh-Hans','pt','de','it','ja','ar','ko','hi','ru','tr','vi','nl','pl','sv','bn']);
const languageNames = {'es':'Spanish','fr':'French','he':'Hebrew','zh-Hans':'Simplified Chinese','pt':'Portuguese','de':'German','it':'Italian','ja':'Japanese','ar':'Arabic','ko':'Korean','hi':'Hindi','ru':'Russian','tr':'Turkish','vi':'Vietnamese','nl':'Dutch','pl':'Polish','sv':'Swedish','bn':'Bengali'};
const recent = new Map();
const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export function validateTranslationRequest(body){
  if(!body||typeof body!=='object'||!supported.has(body.locale)||!Array.isArray(body.texts)||body.texts.length<1||body.texts.length>12)return null;
  if(body.texts.some(t=>typeof t!=='string'||t.length>600||!allowed.has(t)))return null;
  return {locale:body.locale,texts:[...new Set(body.texts)]};
}
export function parseTranslationResponse(value,count){
  if(typeof value!=='string')return null;
  let output;
  try {
    const start=value.indexOf('['),end=value.lastIndexOf(']');
    if(start<0||end<=start)return null;
    output=JSON.parse(value.slice(start,end+1));
  }catch{return null;}
  if(!Array.isArray(output)||output.length!==count||output.some(x=>typeof x!=='string'||!x.trim()||x.length>1400))return null;
  return output.map(x=>x.trim());
}
export async function onRequest({request,env}){
  if(request.method!=='POST')return json({error:'Method not allowed'},405);
  const origin=request.headers.get('Origin');
  if(origin&&origin!==new URL(request.url).origin)return json({error:'Origin not allowed'},403);
  const size=Number(request.headers.get('Content-Length')||0);
  if(size>8200)return json({error:'Request too large'},413);
  let raw;
  try{
    const body=await request.text();
    if(body.length>8200)return json({error:'Request too large'},413);
    raw=JSON.parse(body);
  }catch{return json({error:'Invalid request'},400);}
  const args=validateTranslationRequest(raw);
  if(!args)return json({error:'Unknown or unsupported interface strings'},400);
  if(!env.AI)return json({error:'Translation service unavailable'},503);
  const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(args)));
  const key=Array.from(new Uint8Array(hash)).map(n=>n.toString(16).padStart(2,'0')).join('');
  const cache=typeof caches!=='undefined'?caches.default:null;
  const cacheKey=new Request(new URL('/api/ui-translate/cache/'+key,request.url).toString());
  if(cache){
    const hit=await cache.match(cacheKey).catch(()=>null);
    if(hit)return json(await hit.json());
  }
  const ip=(request.headers.get('CF-Connecting-IP')||'unknown').slice(0,90);
  const now=Date.now();
  if(recent.size>10000)recent.clear();
  const requests=(recent.get(ip)||[]).filter(time=>now-time<60000);
  if(requests.length>=20)return json({error:'Translation temporarily rate-limited'},429);
  requests.push(now);recent.set(ip,requests);
  const prompt=[
    'Translate the following JSON array of interface text from English into '+languageNames[args.locale]+'.',
    'Return ONLY a JSON array containing exactly '+args.texts.length+' translated strings, in the same order.',
    'Preserve DoWeo, Weo, payment brand names, placeholders, symbols, numbers, URLs and punctuation as appropriate.',
    'Translate naturally and concisely for an expense-sharing and personal finance web app.',
    'No explanations, code fences, markdown, or extra fields.',
    JSON.stringify(args.texts)
  ].join('\n');
  try{
    const result=await env.AI.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast',{
      messages:[{role:'system',content:'You are a professional software-localization translator. Return accurate JSON only.'},{role:'user',content:prompt}],
      temperature:0.1,max_tokens:3000
    });
    const strings=parseTranslationResponse(result?.response,args.texts.length);
    if(!strings)return json({error:'Translation could not be verified'},502);
    const data={locale:args.locale,translations:strings};
    if(cache)await cache.put(cacheKey,new Response(JSON.stringify(data),{headers:{'Cache-Control':'public, max-age=604800','Content-Type':'application/json'}})).catch(()=>{});
    return json(data);
  }catch(e){
    console.error('UI translation service failed',String(e?.message||'unknown').slice(0,100));
    return json({error:'Translation temporarily unavailable'},503);
  }
}
