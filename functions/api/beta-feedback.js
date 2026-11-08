// Authenticated beta feedback endpoint. More-specific route than /api/[[path]].
const PROJECT_URL = 'https://pajrdqarszbnrlstoyly.supabase.co';
const reply = (body, status = 200) => Response.json(body, {status, headers:{'Cache-Control':'no-store'}});
const trim = (value, max) => typeof value === 'string' ? value.trim().slice(0,max) : '';
export async function onRequest({request, env}) {
  // Safe status check lets the UI hide its submit button until outbound email
  // credentials are configured. No provider keys or sender details are exposed.
  if (request.method === 'GET') return reply({
    ready:Boolean(env.SUPABASE_SERVICE_ROLE_KEY && env.RESEND_API_KEY && env.BETA_FEEDBACK_FROM_EMAIL)
  });
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

  // A cohesive, mobile-friendly support notification. User content is HTML-escaped.
  // Keep technical metadata in Supabase for troubleshooting, not in every email.
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
  })[character]);
  const categoryLabel = {
    bug:'Bug report',
    idea:'Feature suggestion',
    rating:'App rating'
  }[category];
  const cleanSubject=title.replace(/[\r\n]+/g,' ').slice(0,100);
  const senderEmail=user.email||'Unknown account';
  const emailSubject='DoWeo feedback | '+categoryLabel+': '+cleanSubject;
  const emailText=[
    'DOWEO  /  BETA FEEDBACK',
    '',
    categoryLabel.toUpperCase(),
    title,
    '',
    details,
    ...(rating===null?[]:['','Rating: '+rating+' out of 5 stars']),
    '',
    'Submitted by: '+senderEmail,
    '',
    '— DoWeo Beta Feedback'
  ].join('\n');
  const escapedDetails=escapeHtml(details).replace(/\r?\n/g,'<br>');
  const ratingSection=rating===null?'':[
    "<div style='margin-top:22px;padding-top:18px;border-top:1px solid #e5ecf3'>",
    "<span style='font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#62758b'>Rating</span>",
    "<div style='font-size:24px;letter-spacing:3px;color:#108e94;margin-top:5px'>",
    '★'.repeat(rating)+'<span style="color:#cbd5e1">'+ '☆'.repeat(5-rating)+'</span>',
    "<span style='font-size:13px;font-weight:600;letter-spacing:0;color:#53677e;margin-left:10px'>"+rating+"/5</span></div></div>"
  ].join('');
  const emailHtml=[
    "<!doctype html><html lang='en'><head><meta charset='utf-8'>",
    "<meta name='viewport' content='width=device-width, initial-scale=1'></head>",
    "<body style='margin:0;padding:28px 12px;background:#eff3f8;font-family:Arial,Helvetica,sans-serif;color:#132b46'>",
    "<div style='max-width:600px;margin:0 auto;border:1px solid #dce6ef;border-radius:16px;overflow:hidden;background:#ffffff'>",
    "<div style='padding:28px 30px;background:#0b203d;color:#ffffff'>",
    "<div style='font-size:28px;line-height:1.1;font-weight:800;letter-spacing:-1px'>DoWeo</div>",
    "<div style='font-size:11px;font-weight:700;letter-spacing:2px;color:#a4d8e3;margin-top:9px'>BETA FEEDBACK</div>",
    "</div>",
    "<div style='padding:30px'>",
    "<div style='font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:1.4px;color:#147e86'>"+escapeHtml(categoryLabel)+"</div>",
    "<h1 style='font-size:25px;line-height:1.25;margin:10px 0 20px;color:#102b49;font-weight:750'>"+escapeHtml(title)+"</h1>",
    "<div style='background:#f4f8fb;border-left:4px solid #21c7bc;border-radius:8px;padding:19px 20px;font-size:16px;line-height:1.65;color:#253f58;overflow-wrap:anywhere'>",
    escapedDetails,
    "</div>",
    ratingSection,
    "<div style='border-top:1px solid #e5ecf3;margin-top:26px;padding-top:18px;font-size:13px;color:#61758a'>",
    "Submitted by <span style='font-weight:700;color:#243d59;overflow-wrap:anywhere'>"+escapeHtml(senderEmail)+"</span>",
    "</div>",
    "</div>",
    "<div style='background:#f7f9fc;border-top:1px solid #e5ecf3;padding:16px 30px;font-size:12px;color:#74869a'>",
    "DoWeo · Feedback sent from the beta app",
    "</div></div></body></html>"
  ].join('');
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
        subject:emailSubject,
        text:emailText,
        html:emailHtml
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
