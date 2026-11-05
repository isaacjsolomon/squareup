const base='https://pajrdqarszbnrlstoyly.supabase.co';
const out=(v,s=200)=>Response.json(v,{status:s});
export async function onRequest({request,env,params}){
 const key=env.SUPABASE_SERVICE_ROLE_KEY;
 if(!key)return out({error:'Not configured'},503);
 const h=request.headers.get('authorization')||'';
 if(!h.startsWith('Bearer '))return out({error:'Sign in required'},401);
 const auth=await fetch(base+'/auth/v1/user',{headers:{apikey:key,authorization:h}});
 if(!auth.ok)return out({error:'Session expired'},401);
 const me=await auth.json();
 const db=async(t,m='GET',f={},b)=>{
  const u=new URL(base+'/rest/v1/'+t);
  u.searchParams.set('select','*');
  for(const [k,v] of Object.entries(f))u.searchParams.set(k,v);
  const r=await fetch(u,{method:m,headers:{apikey:key,authorization:'Bearer '+key,Prefer:'return=representation','Content-Type':'application/json'},body:b?JSON.stringify(b):undefined});
  const d=await r.json().catch(()=>[]);
  if(!r.ok)throw Error(d.message||'Database error');
  return d;
 };
 const access=async id=>{
  if(!/^[0-9a-f-]{36}$/i.test(id||''))return false;
  const t=(await db('trackers','GET',{id:'eq.'+id}))[0];
  if(!t)return false;
  return t.owner_id===me.id || (await db('tracker_members','GET',{tracker_id:'eq.'+id,user_id:'eq.'+me.id})).length>0;
 };
 const p=params.path||[],m=request.method,b=['POST','PATCH'].includes(m)?await request.json().catch(()=>({})):{};
 try{
  if(!p.length){
   if(m==='GET'){
    const id=new URL(request.url).searchParams.get('tracker_id');
    if(!await access(id))return out({error:'Access denied'},403);
    return out(await db('squareup_events','GET',{tracker_id:'eq.'+id}));
   }
   if(m==='POST'){
    if(!await access(b.tracker_id))return out({error:'Access denied'},403);
    if(!String(b.title||'').trim()||!Date.parse(b.starts_at)||!Date.parse(b.ends_at)||Date.parse(b.starts_at)>=Date.parse(b.ends_at))return out({error:'Invalid event'},400);
    const e=(await db('squareup_events','POST',{},{
     tracker_id:b.tracker_id,created_by:me.id,title:String(b.title).trim().slice(0,120),
     description:String(b.description||'').slice(0,2000),location:String(b.location||'').slice(0,300),
     starts_at:b.starts_at,ends_at:b.ends_at
    }))[0];
    return out(e,201);
   }
  }
  const e=(await db('squareup_events','GET',{id:'eq.'+p[0]}))[0];
  if(!e||!await access(e.tracker_id))return out({error:'Event not found'},404);
  if(p.length===1&&m==='GET'){
   const [rsvps,schedule,links]=await Promise.all([
    db('squareup_event_rsvps','GET',{event_id:'eq.'+e.id}),
    db('squareup_event_schedule','GET',{event_id:'eq.'+e.id}),
    db('squareup_event_expenses','GET',{event_id:'eq.'+e.id})
   ]);
   const expenses=links.length?await db('tracker_entries','GET',{tracker_id:'eq.'+e.tracker_id,id:'in.('+links.map(x=>x.entry_id).join(',')+')'}):[];
   return out({event:e,rsvps,schedule,expenses});
  }
  if(p[1]==='rsvp'&&m==='POST'){
   if(!['going','maybe','declined'].includes(b.status))return out({error:'Invalid RSVP'},400);
   const f={event_id:'eq.'+e.id,user_id:'eq.'+me.id};
   const exists=await db('squareup_event_rsvps','GET',f);
   const rows=await db('squareup_event_rsvps',exists.length?'PATCH':'POST',exists.length?f:{},exists.length?{status:b.status,updated_at:new Date().toISOString()}:{event_id:e.id,user_id:me.id,status:b.status});
   return out(rows[0]);
  }
  if(p[1]==='schedule'&&m==='POST'){
   if(e.created_by!==me.id)return out({error:'Organizer only'},403);
   if(!String(b.title||'').trim()||!Date.parse(b.starts_at))return out({error:'Invalid schedule item'},400);
   const rows=await db('squareup_event_schedule','POST',{},{
    event_id:e.id,title:String(b.title).slice(0,120),starts_at:b.starts_at,
    ends_at:b.ends_at||null,location:String(b.location||'').slice(0,300),notes:String(b.notes||'').slice(0,1000)
   });
   return out(rows[0],201);
  }
  return out({error:'Not found'},404);
 }catch(error){return out({error:'Event request failed'},500)}
}