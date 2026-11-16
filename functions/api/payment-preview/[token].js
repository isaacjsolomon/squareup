// Public capability URL: exposes only the deliberately shareable amount and note.
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const respond=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});
export async function onRequestGet({env,params}){
 const token=params.token;
 if(!UUID.test(token||''))return respond({error:'Not found.'},404);
 if(!env.SUPABASE_SERVICE_ROLE_KEY)return respond({error:'Payment requests unavailable.'},503);
 const url=new URL('https://pajrdqarszbnrlstoyly.supabase.co/rest/v1/doweo_payment_requests');
 url.searchParams.set('select','amount,currency,public_note,expires_at');
 url.searchParams.set('token','eq.'+token);
 url.searchParams.set('revoked_at','is.null');
 url.searchParams.set('expires_at','gt.'+new Date().toISOString());
 url.searchParams.set('limit','1');
 try{
  const key=env.SUPABASE_SERVICE_ROLE_KEY;
  const result=await fetch(url,{headers:{apikey:key,Authorization:'Bearer '+key}});
  if(!result.ok)return respond({error:'Request unavailable.'},503);
  const rows=await result.json();
  if(!Array.isArray(rows)||!rows.length)return respond({error:'Request expired, revoked, or unavailable.'},404);
  const r=rows[0];
  return respond({amount:r.amount,currency:r.currency,note:r.public_note,expires_at:r.expires_at,disclaimer:'This page does not process or confirm payments.'});
 }catch{return respond({error:'Request unavailable.'},503)}
}
