// Authenticated beta feedback endpoint. More-specific route than /api/[[path]].
const PROJECT_URL = 'https://pajrdqarszbnrlstoyly.supabase.co';
const reply = (body, status = 200) => Response.json(body, {status, headers:{'Cache-Control':'no-store'}});
const trim = (value, max) => typeof value === 'string' ? value.trim().slice(0,max) : '';
export async function onRequest({request, env}) {
  if (request.method !== 'POST') return reply({error:'Method not allowed'},405);
  const origin = request.headers.get('Origin');
  if (origin && origin !== new URL(request.url).origin) return reply({error:'Origin not allowed'},403);
  const secret = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) return reply({error:'Feedback is not configured yet'},503);
  const bearer = request.headers.get('Authorization') || '';
  if (!/^Bearer\s+\S+$/i.test(bearer)) return reply({error:'Sign in to send feedback'},401);
  const session = await fetch(PROJECT_URL + '/auth/v1/user', {
    headers:{apikey:secret,Authorization:bearer}
  });
  if (!session.ok) return reply({error:'Please sign in again'},401);
  const user = await session.json();
  if (!user?.id) return reply({error:'Invalid session'},401);
  const raw = await request.text();
  if (raw.length > 12000) return reply({error:'Feedback is too large'},413);
  let body;
  try { body=JSON.parse(raw); } catch { return reply({error:'Invalid feedback'},400); }
  const category = trim(body.category,20);
  const title = trim(body.title,120);
  const details = trim(body.details,2000);
  const rating = category === 'rating' ? Number(body.rating) : null;
  if (!['bug','idea','rating'].includes(category) || title.length < 3 ||
      details.length < 3 || (category === 'rating' && (!Number.isInteger(rating) || rating < 1 || rating > 5))) {
    return reply({error:'Please complete all required fields'},400);
  }
  const headers = {apikey:secret,Authorization:'Bearer '+secret,'Content-Type':'application/json'};
  const lookup = new URL(PROJECT_URL+'/rest/v1/doweo_beta_feedback');
  lookup.searchParams.set('select','id');
  lookup.searchParams.set('user_id','eq.'+user.id);
  lookup.searchParams.set('created_at','gte.'+new Date(Date.now()-86400000).toISOString());
  lookup.searchParams.set('limit','6');
  const recent = await fetch(lookup,{headers});
  if (!recent.ok) return reply({error:'Feedback is temporarily unavailable'},503);
  const rows = await recent.json();
  if (rows.length >= 5) return reply({error:'You have reached the daily feedback limit. Please try tomorrow.'},429);
  const page = trim(body.page_path,200);
  const path = page.startsWith('/') && !page.startsWith('//') ? page : '/';
  const payload = {
    user_id:user.id,category,title,details,rating,page_path:path,
    device_info:trim(body.device_info,160)
  };
  const saved = await fetch(PROJECT_URL+'/rest/v1/doweo_beta_feedback',{
    method:'POST',
    headers:{...headers,Prefer:'return=representation'},
    body:JSON.stringify(payload)
  });
  if (!saved.ok) {
    console.error('Beta feedback insert failed',saved.status);
    return reply({error:'Could not save feedback. Please try again later.'},503);
  }
  const data=await saved.json();
  return reply({ok:true,id:data?.[0]?.id || null},201);
}
