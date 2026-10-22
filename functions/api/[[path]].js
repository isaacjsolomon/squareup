
// Cloudflare Pages Functions: server-side Supabase access.
// SUPABASE_SERVICE_ROLE_KEY must be configured as an encrypted Cloudflare secret.
const URL_BASE = 'https://pajrdqarszbnrlstoyly.supabase.co';
const json=(v,status=200)=>Response.json(v,{status});
const fail=(message,status=400)=>json({error:message},status);
const clean=(v,n)=>typeof v==='string'?v.trim().slice(0,n):'';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const presets=['indigo','sunset','ocean','forest','night','berry'];
function kind(b){return b[0]===255&&b[1]===216&&b[2]===255?'image/jpeg':b[0]===137&&b[1]===80&&b[2]===78?'image/png':String.fromCharCode(...b.slice(0,4))==='RIFF'&&String.fromCharCode(...b.slice(8,12))==='WEBP'?'image/webp':null;}
function validate(v){const type=['debt','payment'].includes(v?.type)?v.type:null,from=clean(v?.from,60),to=clean(v?.to,60),amount=Math.round(Number(v?.amount)*100)/100;if(!type||!from||!to||from.toLowerCase()===to.toLowerCase()||!(amount>0)||amount>1e9)return null;return {type,from_name:from,to_name:to,amount,note:clean(v.note,200),date_label:clean(v.date,40)};}
export async function onRequest({request,env,params}) {
 const key=env.SUPABASE_SERVICE_ROLE_KEY;
 if(!key)return fail('Backend not configured: add SUPABASE_SERVICE_ROLE_KEY in Cloudflare Pages secrets.',503);
 const origin=request.headers.get('Origin');if(origin&&origin!==new URL(request.url).origin)return fail('Origin not allowed.',403);
 const bearer=request.headers.get('Authorization')||'';if(!bearer.startsWith('Bearer '))return fail('Please log in first.',401);
 const userRes=await fetch(URL_BASE+'/auth/v1/user',{headers:{apikey:key,Authorization:bearer}});
 if(!userRes.ok)return fail('Session expired. Please log in.',401);
 const user=await userRes.json();const me={id:user.id,email:user.email||'',name:user.user_metadata?.full_name||user.email?.split('@')[0]||''};
 const baseHeaders={apikey:key,Authorization:'Bearer '+key};
 async function db(table,{select='*',filters={},method='GET',body,order,limit}={}){
  const u=new URL(URL_BASE+'/rest/v1/'+table);if(select)u.searchParams.set('select',select);for(const [k,v] of Object.entries(filters))u.searchParams.set(k,v);if(order)u.searchParams.set('order',order);if(limit)u.searchParams.set('limit',limit);
  const r=await fetch(u,{method,headers:{...baseHeaders,Prefer:'return=representation',...(method!=='GET'?{'Content-Type':'application/json'}:{})},body:body===undefined?undefined:JSON.stringify(body)});
  const data=await r.json().catch(()=>[]);if(!r.ok)throw new Error(data.message||data.error||'Database request failed');return data;
 }
 async function storage(bucket,path,method='GET',bytes,type){const u=URL_BASE+'/storage/v1/object/'+bucket+'/'+path;const r=await fetch(u,{method,headers:{...baseHeaders,...(type?{'Content-Type':type}:{})},body:bytes});if(!r.ok){if(method==='GET')return null;throw Error('Photo storage request failed');}return r;}
 const parts=(params.path||[]);const method=request.method;
 async function member(id){if(!uuid.test(id))return null;return (await db('tracker_members',{filters:{tracker_id:'eq.'+id,user_id:'eq.'+me.id}}))[0]||null;}
 async function detail(id){const t=(await db('trackers',{filters:{id:'eq.'+id}}))[0];const m=await member(id);if(!t||!m)throw Error('Tracker not found');const members=await db('tracker_members',{filters:{tracker_id:'eq.'+id},order:'joined_at.asc'});const entries=await db('tracker_entries',{filters:{tracker_id:'eq.'+id},order:'created_at.asc,id.asc'});const profiles=await db('profiles',{filters:{user_id:'in.('+members.map(x=>x.user_id).join(',')+')'}}).catch(()=>[]);return {id:t.id,name:t.name,role:m.role,inviteToken:t.invite_token,backdrop:{preset:t.backdrop,photo:t.backdrop==='photo'&&t.backdrop_image?t.backdrop_image.split('/').pop():null},members:members.map(x=>({id:x.user_id,email:x.email,name:profiles.find(p=>p.user_id===x.user_id)?.display_name||x.name,role:x.role,isYou:x.user_id===me.id,photo:profiles.find(p=>p.user_id===x.user_id)?.photo_key?.split('/').pop()||null,payments:{venmo:profiles.find(p=>p.user_id===x.user_id)?.venmo_username||'',cashapp:profiles.find(p=>p.user_id===x.user_id)?.cashapp_username||''}})),entries:entries.map(e=>({id:e.id,type:e.type,from:e.from_name,to:e.to_name,amount:Number(e.amount),note:e.note,date_label:e.date_label,createdBy:members.find(m=>m.user_id===e.created_by)?.name||''}))};}
 try {
  const body=['POST','PATCH'].includes(method)?await request.json().catch(()=>({})):{};
  if(parts[0]==='join'&&parts[1]&&method==='POST'){
   const t=(await db('trackers',{filters:{invite_token:'eq.'+parts[1]}}))[0];if(!t)return fail('This invite link is no longer valid.',404);
   await db('tracker_members',{method:'POST',body:{tracker_id:t.id,user_id:me.id,email:me.email,name:me.name,role:'member'},select:'*'}).catch(async e=>{if(!String(e).includes('duplicate'))throw e;});return json({id:t.id,name:t.name});
  }
  if(parts[0]==='profile'){
   const target=parts[2]||me.id;
   if(parts.length===1&&method==='GET'){const p=(await db('profiles',{filters:{user_id:'eq.'+me.id}}))[0];return json({photo:p?.photo_key?.split('/').pop()||null,displayName:p?.display_name||me.name,username:p?.username||'',bio:p?.bio||'',venmo:p?.venmo_username||'',cashapp:p?.cashapp_username||''});}
   if(parts.length===1&&method==='PATCH'){
    const p=(await db('profiles',{filters:{user_id:'eq.'+me.id}}))[0];
    const update={updated_at:new Date().toISOString()};
    if(body.displayName!==undefined){const name=clean(body.displayName,60);if(!name)return fail('Enter a display name.',400);update.display_name=name;}
    if(body.username!==undefined){const name=clean(body.username,24).toLowerCase();if(!/^[a-z0-9_]{3,24}$/.test(name))return fail('Username must be 3–24 letters, numbers or underscores.',400);const taken=await db('profiles',{filters:{username:'eq.'+name}});if(taken.some(x=>x.user_id!==me.id))return fail('That username is already taken.',409);update.username=name;}
    if(body.bio!==undefined)update.bio=clean(body.bio,180);
    if(body.venmo!==undefined){const v=clean(body.venmo,30).replace(/^@/,'');if(v&&!/^[a-zA-Z0-9_-]{3,30}$/.test(v))return fail('Enter a valid Venmo username.',400);update.venmo_username=v;}
    if(body.cashapp!==undefined){const v=clean(body.cashapp,21).replace(/^\$/,'');if(v&&!/^[a-zA-Z][a-zA-Z0-9]{0,19}$/.test(v))return fail('Enter a valid Cash App $Cashtag.',400);update.cashapp_username=v;}
    try{if(p)await db('profiles',{method:'PATCH',filters:{user_id:'eq.'+me.id},body:update});else await db('profiles',{method:'POST',body:{user_id:me.id,...update}});}catch(err){if(String(err.message).includes('duplicate'))return fail('That username is already taken.',409);throw err;}
    if(update.display_name){const memberships=await db('tracker_members',{filters:{user_id:'eq.'+me.id}});for(const m of memberships)await db('tracker_members',{method:'PATCH',filters:{user_id:'eq.'+me.id,tracker_id:'eq.'+m.tracker_id},body:{name:update.display_name}});}
    const saved=(await db('profiles',{filters:{user_id:'eq.'+me.id}}))[0];return json({photo:saved?.photo_key?.split('/').pop()||null,displayName:saved.display_name||me.name,username:saved.username||'',bio:saved.bio||'',venmo:saved.venmo_username||'',cashapp:saved.cashapp_username||''});
   }
   if(parts[1]!=='photo')return fail('Not found',404);
   if(method==='GET'){
    if(target!==me.id){const mine=await db('tracker_members',{filters:{user_id:'eq.'+me.id}});const theirs=await db('tracker_members',{filters:{user_id:'eq.'+target}});if(!mine.some(a=>theirs.some(b=>b.tracker_id===a.tracker_id)))return fail('No profile photo.',404);}
    const p=(await db('profiles',{filters:{user_id:'eq.'+target}}))[0];if(!p?.photo_key)return fail('No profile photo.',404);const r=await storage('profile-photos',p.photo_key);if(!r)return fail('No profile photo.',404);return new Response(r.body,{headers:{'Content-Type':r.headers.get('Content-Type')||'image/jpeg','Cache-Control':'private, max-age=60'}});
   }
   if(parts[2])return fail('Not found',404);
   const p=(await db('profiles',{filters:{user_id:'eq.'+me.id}}))[0];
   if(method==='DELETE'){await db('profiles',{method:'POST',body:{user_id:me.id,photo_key:null},select:'*'}).catch(async()=>db('profiles',{method:'PATCH',filters:{user_id:'eq.'+me.id},body:{photo_key:null}}));if(p?.photo_key)await storage('profile-photos',p.photo_key,'DELETE');return json({photo:null});}
   if(method==='PUT'){const bytes=new Uint8Array(await request.arrayBuffer());const type=kind(bytes);if(!bytes.length||bytes.length>2*1024*1024||!type)return fail('Upload a JPEG, PNG or WebP under 2 MB.',400);const version=crypto.randomUUID(),path=me.id+'/'+version;await storage('profile-photos',path,'POST',bytes,type);if(p)await db('profiles',{method:'PATCH',filters:{user_id:'eq.'+me.id},body:{photo_key:path,updated_at:new Date().toISOString()}});else await db('profiles',{method:'POST',body:{user_id:me.id,photo_key:path}});if(p?.photo_key)await storage('profile-photos',p.photo_key,'DELETE');return json({photo:version});}
   return fail('Method not allowed',405);
  }
  if(parts[0]!=='trackers')return fail('Not found',404);
  const id=parts[1];
  if(!id){
   if(method==='GET'){const members=await db('tracker_members',{filters:{user_id:'eq.'+me.id}});const ids=members.map(m=>m.tracker_id);if(!ids.length)return json([]);const ts=await db('trackers',{filters:{id:'in.('+ids.join(',')+')'},order:'created_at.asc'});const counts=await db('tracker_members',{filters:{tracker_id:'in.('+ids.join(',')+')'}});return json(ts.map(t=>({id:t.id,name:t.name,role:members.find(m=>m.tracker_id===t.id)?.role,memberCount:counts.filter(m=>m.tracker_id===t.id).length})));}
   if(method==='POST'){const name=clean(body.name,80)||'My tracker';const t=(await db('trackers',{method:'POST',body:{name,owner_id:me.id}}))[0];await db('tracker_members',{method:'POST',body:{tracker_id:t.id,user_id:me.id,email:me.email,name:me.name,role:'owner'}});const entries=(Array.isArray(body.entries)?body.entries:[]).slice(0,2000).map(validate).filter(Boolean);if(entries.length)await db('tracker_entries',{method:'POST',body:entries.map(e=>({...e,tracker_id:t.id,created_by:me.id}))});return json(await detail(t.id),201);}
   return fail('Method not allowed',405);
  }
  const m=await member(id);if(!m)return fail('Tracker not found.',404);const owner=m.role==='owner',sub=parts[2];
  if(!sub){
   if(method==='GET')return json(await detail(id));
   if(method==='PATCH'){const patch={};if(body.name!==undefined){patch.name=clean(body.name,80);if(!patch.name)return fail('Give the tracker a name.',400);}if(body.backdrop!==undefined){if(!presets.includes(body.backdrop))return fail('Pick one of the backdrops.',400);patch.backdrop=body.backdrop;patch.backdrop_image=null;}if(Object.keys(patch).length)await db('trackers',{method:'PATCH',filters:{id:'eq.'+id},body:patch});return json(await detail(id));}
   if(method==='DELETE'){if(owner)await db('trackers',{method:'DELETE',filters:{id:'eq.'+id}});else await db('tracker_members',{method:'DELETE',filters:{tracker_id:'eq.'+id,user_id:'eq.'+me.id}});return json({ok:true});}
  }
  if(sub==='entries'){
   if(method==='POST'&&!parts[3]){const e=validate(body);if(!e)return fail('Check the names and amount.',400);await db('tracker_entries',{method:'POST',body:{...e,tracker_id:id,created_by:me.id}});return json(await detail(id),201);}
   if(method==='DELETE'){if(parts[3]&&!uuid.test(parts[3]))return fail('Entry not found',404);await db('tracker_entries',{method:'DELETE',filters:{tracker_id:'eq.'+id,...(parts[3]?{id:'eq.'+parts[3]}:{})}});return json(await detail(id));}
  }
  if(sub==='invite'&&method==='POST'){if(body.reset===true&&!owner)return fail('Only the owner can reset the invite link.',403);const t=(await db('trackers',{filters:{id:'eq.'+id}}))[0];const token=body.reset===true||!t.invite_token?crypto.randomUUID().replaceAll('-','')+crypto.randomUUID().replaceAll('-','').slice(0,4):t.invite_token;if(token!==t.invite_token)await db('trackers',{method:'PATCH',filters:{id:'eq.'+id},body:{invite_token:token}});return json({token});}
  if(sub==='members'&&parts[3]&&method==='DELETE'){if(!owner)return fail('Only the owner can remove people.',403);if(parts[3]===me.id)return fail("You can't remove yourself as the owner.",400);await db('tracker_members',{method:'DELETE',filters:{tracker_id:'eq.'+id,user_id:'eq.'+parts[3]}});return json(await detail(id));}
  if(sub==='backdrop'){
   const t=(await db('trackers',{filters:{id:'eq.'+id}}))[0];
   if(method==='GET'){if(!t?.backdrop_image)return fail('No backdrop photo.',404);const r=await storage('tracker-backdrops',t.backdrop_image);if(!r)return fail('No backdrop photo.',404);return new Response(r.body,{headers:{'Content-Type':r.headers.get('Content-Type')||'image/jpeg','Cache-Control':'private, max-age=60'}});}
   if(method==='PUT'){const bytes=new Uint8Array(await request.arrayBuffer()),type=kind(bytes);if(!bytes.length||bytes.length>5*1024*1024||!type)return fail('Upload a JPEG, PNG or WebP under 5 MB.',400);const path=id+'/'+crypto.randomUUID();await storage('tracker-backdrops',path,'POST',bytes,type);await db('trackers',{method:'PATCH',filters:{id:'eq.'+id},body:{backdrop:'photo',backdrop_image:path}});if(t?.backdrop_image)await storage('tracker-backdrops',t.backdrop_image,'DELETE');return json(await detail(id));}
  }
  return fail('Not found',404);
 }catch(e){return fail(e.message||'Unexpected server error',500);}
}
