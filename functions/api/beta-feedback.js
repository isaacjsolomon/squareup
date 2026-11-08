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
  // Never accept feedback silently when notification delivery isn't configured.
  // Both values are Cloudflare Pages encrypted environment secrets, not frontend keys.
  if (!env.RESEND_API_KEY || !env.BETA_FEEDBACK_FROM_EMAIL) {
    return reply({error:'Feedback email delivery is not configured yet. Please try again later.'},503);
  }
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
  const feedbackId=data?.[0]?.id;
  if (!feedbackId) {
    console.error('Feedback saved but missing ID for email delivery');
    return reply({error:'Feedback was saved, but notification status could not be confirmed.'},202);
  }

  // Plain-text email avoids interpreting any user-supplied text as HTML.
  // The idempotency key prevents duplicate notifications for the same entry.
  const cleanSubject=title.replace(/[\r\n]+/g,' ').slice(0,100);
  const emailText=[
    'New DoWeo beta feedback',
    'Category: '+category,
    'Subject: '+title,
    'Rating: '+(rating===null?'Not applicable':rating+'/5'),
    'User: '+(user.email||'No email available'),
    'User ID: '+user.id,
    'Page: '+path,
    'Device: '+payload.device_info,
    'Feedback ID: '+feedbackId,
    '---',
    details
  ].join('\n');
  let emailSent=false;
  let providerId=null;
  let emailError='delivery_failed';
  try {
    const emailResponse=await fetch('https://api.resend.com/emails',{
      method:'POST',
      headers:{
        Authorization:'Bearer '+env.RESEND_API_KEY,
        'Content-Type':'application/json',
        'Idempotency-Key':'doweo-feedback-'+feedbackId
      },
      body:JSON.stringify({
        from:env.BETA_FEEDBACK_FROM_EMAIL,
        to:['help.doweo@gmail.com'],
        subject:'[DoWeo Beta '+category+'] '+cleanSubject,
        text:emailText
      })
    });
    if (emailResponse.ok) {
      const emailResult=await emailResponse.json().catch(()=>({}));
      emailSent=true;
      providerId=emailResult?.id||null;
      emailError=null;
    } else {
      emailError='provider_http_'+emailResponse.status;
      console.error('Beta feedback email provider rejected delivery:',emailResponse.status);
    }
  } catch(err) {
    console.error('Beta feedback email request failed:',err?.message||'unknown error');
    emailError='transport_error';
  }
  // Feedback was already saved: never tell a user it failed to save if
  // only the notification email failed.
  const recordUrl=new URL(PROJECT_URL+'/rest/v1/doweo_beta_feedback');
  recordUrl.searchParams.set('id','eq.'+feedbackId);
  const update=await fetch(recordUrl,{
    method:'PATCH',
    headers:{...headers,Prefer:'return=minimal'},
    body:JSON.stringify({
      email_status:emailSent?'sent':'failed',
      email_provider_id:providerId,
      email_error:emailError,
      emailed_at:emailSent?new Date().toISOString():null
    })
  }).catch(()=>null);
  if (!update?.ok) console.error('Beta feedback email status update failed');
  return reply({
    ok:true,id:feedbackId,
    email_sent:emailSent,
    notice:emailSent
      ? 'Thanks! Your feedback was saved and emailed to DoWeo support.'
      : 'Your feedback was saved, but the email notification could not be delivered. It is marked for follow-up.'
  },emailSent?201:202);
}
