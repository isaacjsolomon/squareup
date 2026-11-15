// Public invitation preview. Never exposes balances, member identities, or entries.
// The invitation token is a capability: only recipients with a valid unrevoked link
// can learn the tracker name. Rotation is enforced by looking up the current token.
const BASE = 'https://pajrdqarszbnrlstoyly.supabase.co';
const tokenPattern = /^[a-f0-9]{36}$/i;
const headers = {
  'Cache-Control': 'no-store, private',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff'
};
const answer = (data, status = 200) =>
  new Response(JSON.stringify(data), {status, headers:{...headers,'Content-Type':'application/json; charset=utf-8'}});
export async function onRequestGet({params,env}) {
  const token = String(params.token || '');
  if (!tokenPattern.test(token)) return answer({error:'Invitation unavailable.'},404);
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return answer({error:'Invitation preview unavailable.'},503);
  const uri=new URL(BASE+'/rest/v1/trackers');
  uri.searchParams.set('select','name');
  uri.searchParams.set('invite_token','eq.'+token);
  uri.searchParams.set('limit','1');
  try{
    const response=await fetch(uri,{headers:{apikey:key,Authorization:'Bearer '+key,Accept:'application/json'},cache:'no-store'});
    if(!response.ok)return answer({error:'Invitation preview unavailable.'},503);
    const rows=await response.json();
    const tracker=Array.isArray(rows)?rows[0]:null;
    if(!tracker)return answer({error:'Invitation unavailable.'},404);
    return answer({name:String(tracker.name||'Shared tracker').slice(0,100)});
  }catch{
    return answer({error:'Invitation preview unavailable.'},503);
  }
}
