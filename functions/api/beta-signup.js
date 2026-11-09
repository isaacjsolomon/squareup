// Public beta application intake: server side only, never expose service key.
const PROJECT='https://pajrdqarszbnrlstoyly.supabase.co';
const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export async function onRequest({request,env}) {
 if(request.method==='GET') {
  const oneCaptchaKey=Boolean(env.TURNSTILE_SECRET_KEY)!==Boolean(env.TURNSTILE_SITE_KEY);
  return json({
    ready:Boolean(env.SUPABASE_SERVICE_ROLE_KEY)&&!oneCaptchaKey,
    email_ready:Boolean(env.RESEND_API_KEY&&env.BETA_FEEDBACK_FROM_EMAIL),
    turnstile_required:Boolean(env.TURNSTILE_SECRET_KEY)&&Boolean(env.TURNSTILE_SITE_KEY),
    turnstile_site_key:env.TURNSTILE_SITE_KEY&&env.TURNSTILE_SECRET_KEY?env.TURNSTILE_SITE_KEY:null,
    ...(oneCaptchaKey?{error:'Beta verification is not fully configured yet.'}:{})
  });
 }
 if(request.method!=='POST') return json({error:'Method not allowed'},405);
 const origin=request.headers.get('Origin');
 if(origin&&origin!==new URL(request.url).origin) return json({error:'Origin not allowed'},403);
 if(!env.SUPABASE_SERVICE_ROLE_KEY) return json({error:'Applications are temporarily unavailable.'},503);
 if(Number(request.headers.get('content-length')||0)>3500) return json({error:'Request too large'},413);
 const raw=await request.text(); if(raw.length>3500) return json({error:'Request too large'},413);
 let b;try{b=JSON.parse(raw);}catch{return json({error:'Invalid request'},400);}
 if(!b||typeof b!=='object'||Array.isArray(b)) return json({error:'Invalid request'},400);
 // Honeypot: respond as successful to silent bots without saving.
 if(b.website) return json({ok:true});
 const clean=(v,n)=>typeof v==='string'?v.trim().slice(0,n):'';
 const display_name=clean(b.display_name,81),email=clean(b.email,255).toLowerCase();
 const device=clean(b.device,20),use_case=clean(b.use_case,20),note=clean(b.note,601);
 const consent=b.consent===true;
 if(display_name.length<2||display_name.length>80||!/^\S+@\S+\.\S+$/.test(email)||email.length>254||
 !['iphone','android','desktop','multiple'].includes(device)||
 !['friends','trips','households','personal','other'].includes(use_case)||
 note.length>600||!consent) return json({error:'Please complete the required fields.'},400);
 // Configurable Turnstile protection; enable before public promotion.
 if(env.TURNSTILE_SECRET_KEY){
  const token=clean(b.turnstile_token,2048);
  if(!token) return json({error:'Please complete the verification.'},400);
  const response=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{
   method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},
   body:new URLSearchParams({secret:env.TURNSTILE_SECRET_KEY,response:token})
  });
  const check=await response.json().catch(()=>({success:false}));
  if(!check.success) return json({error:'Verification failed. Please try again.'},403);
 }

 // Applications remain saved even if email delivery temporarily fails.
 const key=env.SUPABASE_SERVICE_ROLE_KEY;
 const result=await fetch(PROJECT+'/rest/v1/doweo_beta_applications',{
  method:'POST',headers:{
   apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json',
   'Prefer':'resolution=ignore-duplicates,return=representation'
  },
  body:JSON.stringify({display_name,email,device,use_case,note})
 });
 if(!result.ok){
  console.error('Beta signup storage failure',result.status);
  return json({error:'Could not submit your application right now.'},503);
 }
 const stored=await result.json().catch(()=>null);
 if(!Array.isArray(stored))return json({error:'Unable to confirm application storage. Please contact support.'},503);
 // The unique lower(email) index prevents duplicate rows and notifications.
 if(stored.length===0)return json({ok:true,duplicate:true,message:'An application for this email address is already on file. Thank you!'},200);
 const applicationId=stored[0]?.id;
 if(!applicationId)return json({ok:true,email_sent:false,message:'Your application was saved, but we could not confirm the email notification. Please contact support if needed.'},202);
 if(!env.RESEND_API_KEY||!env.BETA_FEEDBACK_FROM_EMAIL){
  console.error('Beta application email not configured');
  return json({ok:true,email_sent:false,message:'Your application was saved, but the support email notification is not configured yet.'},202);
 }
 const labels={
  iphone:'iPhone',android:'Android',desktop:'Desktop / laptop',multiple:'Multiple devices',
  friends:'Splitting expenses with friends',trips:'Trips and events',
  households:'Household expenses',personal:'Personal finances',other:'Something else'
 };
 const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const subject='DoWeo Beta Signup — New Application';
 const bodyText=[
  'NEW DOWEO BETA APPLICATION','',
  'Name: '+display_name,
  'Email: '+email,
  'Device: '+labels[device],
  'Use case: '+labels[use_case],
  'Additional note: '+(note||'None'),
  '',
  'Review privately in the Supabase doweo_beta_applications table.',
  'Application ID: '+applicationId
 ].join('\n');
 const html='<div style="font:15px/1.6 Arial,sans-serif;color:#142942;max-width:580px">'
  +'<div style="background:#071a36;color:#fff;padding:22px;border-radius:12px 12px 0 0"><h2 style="margin:0">DoWeo Beta</h2><p style="margin:7px 0 0;color:#96f5dc">New tester application</p></div>'
  +'<div style="padding:22px;border:1px solid #dbe7ee;border-top:none;border-radius:0 0 12px 12px">'
  +'<p><b>Name:</b> '+escapeHtml(display_name)+'</p>'
  +'<p><b>Email:</b> '+escapeHtml(email)+'</p>'
  +'<p><b>Device:</b> '+escapeHtml(labels[device])+'</p>'
  +'<p><b>Use case:</b> '+escapeHtml(labels[use_case])+'</p>'
  +'<p><b>Additional note:</b></p><p style="white-space:pre-wrap;overflow-wrap:anywhere">'+escapeHtml(note||'None')+'</p>'
  +'<p style="color:#6b7e90;font-size:12px">Review this application privately in the DoWeo Supabase dashboard. ID: '+escapeHtml(applicationId)+'</p>'
  +'</div></div>';
 try{
  const sent=await fetch('https://api.resend.com/emails',{
   method:'POST',
   headers:{
    Authorization:'Bearer '+env.RESEND_API_KEY,
    'Content-Type':'application/json',
    'Idempotency-Key':'doweo-beta-signup-'+applicationId
   },
   body:JSON.stringify({
    from:env.BETA_FEEDBACK_FROM_EMAIL,
    to:['help.doweo@gmail.com'],
    subject,
    text:bodyText,
    html
   })
  });
  if(!sent.ok){
   console.error('Beta signup email rejected',sent.status);
   return json({ok:true,email_sent:false,message:'Application received and saved, but the email notification could not be delivered. DoWeo support can still review it.'},202);
  }
  return json({ok:true,email_sent:true,message:'Application received! DoWeo support has been notified.'},201);
 }catch(error){
  console.error('Beta signup email request failed');
  return json({ok:true,email_sent:false,message:'Application received and saved, but the email notification could not be delivered. DoWeo support can still review it.'},202);
 }
}
