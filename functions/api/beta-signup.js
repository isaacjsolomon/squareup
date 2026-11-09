// Public beta application intake: server side only, never expose service key.
const PROJECT='https://pajrdqarszbnrlstoyly.supabase.co';
const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export async function onRequest({request,env}) {
 if(request.method==='GET') return json({ready:Boolean(env.SUPABASE_SERVICE_ROLE_KEY)});
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
 const key=env.SUPABASE_SERVICE_ROLE_KEY;
 const result=await fetch(PROJECT+'/rest/v1/doweo_beta_applications',{
  method:'POST',headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json','Prefer':'resolution=ignore-duplicates,return=minimal'},
  body:JSON.stringify({display_name,email,device,use_case,note})
 });
 if(!result.ok){console.error('Beta signup storage failure',result.status);return json({error:'Could not submit your application right now.'},503);}
 return json({ok:true,message:'Application received. We will review it and contact you by email if selected.'},201);
}