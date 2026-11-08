const SUPABASE='https://pajrdqarszbnrlstoyly.supabase.co';
const response=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
const uuid=/^[a-f\d]{8}-[a-f\d]{4}-[1-8][a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i;
export async function onRequest({request,env}){
  if(!['GET','DELETE','PATCH'].includes(request.method))return response({error:'Method not allowed.'},405);
  const origin=request.headers.get('Origin');
  if(origin&&origin!==new URL(request.url).origin)return response({error:'Origin not allowed.'},403);
  const token=request.headers.get('Authorization')||'';
  const key=env.SUPABASE_SERVICE_ROLE_KEY;
  if(!token.startsWith('Bearer ')||!key)return response({error:'Sign in to view Weo history.'},401);
  let user;
  try{
    const auth=await fetch(SUPABASE+'/auth/v1/user',{headers:{apikey:key,Authorization:token},signal:AbortSignal.timeout(10000)});
    if(!auth.ok)return response({error:'Session expired. Please sign in.'},401);
    user=await auth.json();
    if(!uuid.test(user.id||''))return response({error:'Invalid account.'},401);
  }catch{return response({error:'Unable to verify your account.'},503)}
  const url=new URL(request.url),id=url.searchParams.get('id');
  if(id&&!uuid.test(id))return response({error:'Invalid conversation ID.'},400);
  if(request.method!=='GET'&&!id)return response({error:'Choose a conversation.'},400);
  const path=new URL(SUPABASE+'/rest/v1/doweo_ai_conversations');
  path.searchParams.set('user_id','eq.'+user.id);
  if(id)path.searchParams.set('id','eq.'+id);
  let method=request.method,body;
  if(method==='GET'){
    path.searchParams.set('select',id?'id,title,messages,created_at,updated_at':'id,title,created_at,updated_at');
    path.searchParams.set('order','updated_at.desc');
    path.searchParams.set('limit',id?'1':'100');
  }else if(method==='PATCH'){
    let data;
    try{data=await request.json()}catch{return response({error:'Invalid request.'},400)}
    if(typeof data?.title!=='string'||!data.title.trim()||data.title.length>80)return response({error:'Choose a title under 80 characters.'},400);
    body=JSON.stringify({title:data.title.trim()});
  }
  try{
    const db=await fetch(path,{method,headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json',Prefer:'return=representation'},body,signal:AbortSignal.timeout(12000)});
    if(!db.ok){
      const error=await db.json().catch(()=>({}));
      console.error('Weo history database request failed',db.status,error.code||'unknown');
      return response({error:'Chat history is temporarily unavailable.'},503);
    }
    const rows=await db.json().catch(()=>[]);
    if(method==='GET')return response(id?{conversation:rows[0]||null}:{conversations:rows});
    return response({success:Array.isArray(rows)&&rows.length>0});
  }catch{return response({error:'Unable to load chat history. Please try again.'},503)}
}