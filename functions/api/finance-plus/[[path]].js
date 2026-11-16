// DoWeo financial planning endpoints. Existing balances and transactions are read-only.
const BASE='https://pajrdqarszbnrlstoyly.supabase.co';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const response=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
const fail=(error,status=400)=>response({error},status);
const text=(value,max)=>typeof value==='string'?value.trim().slice(0,max):'';
const money=value=>{const n=Number(value);return Number.isFinite(n)&&n>0&&n<=99999999?Math.round(n*100)/100:null};
const monthOk=value=>typeof value==='string'&&/^\d{4}-(0[1-9]|1[0-2])$/.test(value);
async function onRequest({request,env,params}){
 if(!env.SUPABASE_SERVICE_ROLE_KEY)return fail('Financial planning is not configured.',503);
 if(!['GET','POST','PATCH'].includes(request.method))return fail('Method not allowed',405);
 const origin=request.headers.get('Origin');
 if(origin&&origin!==new URL(request.url).origin)return fail('Origin not allowed',403);
 const bearer=request.headers.get('Authorization')||'';
 if(!/^Bearer\s+\S+$/.test(bearer))return fail('Please sign in.',401);
 const headers={apikey:env.SUPABASE_SERVICE_ROLE_KEY,Authorization:bearer};
 let auth;
 try{auth=await fetch(BASE+'/auth/v1/user',{headers});}catch{return fail('Session unavailable',503)}
 if(!auth.ok)return fail('Please sign in again.',401);
 const user=await auth.json();
 if(!UUID.test(user.id||''))return fail('Invalid session.',401);
 const uid=user.id;
 const key=env.SUPABASE_SERVICE_ROLE_KEY;
 const service={apikey:key,Authorization:'Bearer '+key};
 async function query(table,{filters={},method='GET',body,order,limit,prefer}={}){
  const url=new URL(BASE+'/rest/v1/'+table);
  url.searchParams.set('select','*');
  Object.entries(filters).forEach(([k,v])=>url.searchParams.set(k,v));
  if(order)url.searchParams.set('order',order);
  if(limit)url.searchParams.set('limit',String(limit));
  const res=await fetch(url,{method,headers:{...service,Prefer:prefer||'return=representation',...(method!=='GET'?{'Content-Type':'application/json'}:{})},body:body===undefined?undefined:JSON.stringify(body)});
  const value=await res.json().catch(()=>[]);
  if(!res.ok)throw new Error(value?.message||value?.error||'Database request failed');
  return value;
 }
 async function member(trackerId){
  if(!UUID.test(trackerId||''))return false;
  const [owners,members]=await Promise.all([
   query('trackers',{filters:{id:'eq.'+trackerId},limit:1}),
   query('tracker_members',{filters:{tracker_id:'eq.'+trackerId,user_id:'eq.'+uid},limit:1})
  ]);
  return !!(owners.length&&(String(owners[0].owner_id).toLowerCase()===uid.toLowerCase()||members.length));
 }
 let body={};
 if(request.method!=='GET'){
  if(!(request.headers.get('Content-Type')||'').includes('application/json'))return fail('Use JSON.',415);
  try{body=await request.json()}catch{return fail('Invalid JSON.',400)}
  if(!body||typeof body!=='object'||Array.isArray(body))return fail('Invalid request.',400);
 }
 const parts=params.path||[];
 const action=parts[0];
 const url=new URL(request.url);
 try{
  if(action==='budgets'){
   const month=url.searchParams.get('month')||new Date().toISOString().slice(0,7);
   if(request.method==='GET'){
    if(!monthOk(month))return fail('Invalid budget month.');
    const [budgets,transactions]=await Promise.all([
     query('doweo_monthly_budgets',{filters:{user_id:'eq.'+uid,month:'eq.'+month+'-01'}}),
     query('squareup_personal_transactions',{filters:{user_id:'eq.'+uid,kind:'eq.expense',and:'(occurred_on.gte.'+month+'-01,occurred_on.lt.'+new Date(Date.UTC(Number(month.slice(0,4)),Number(month.slice(5,7)),1)).toISOString().slice(0,10)+')'},limit:5000})
    ]);
    const spent={};
    for(const entry of transactions)if(entry.currency==='USD')spent[entry.category]=(spent[entry.category]||0)+Number(entry.amount||0);
    return response({month,budgets:budgets.map(b=>({...b,spent:Math.round((spent[b.category]||0)*100)/100})),currency:'USD'});
   }
   if(request.method==='POST'){
    const m=text(body.month,7),category=text(body.category,50),limit=money(body.limit_amount);
    if(!monthOk(m)||!category||limit===null)return fail('Provide a valid month, category and limit.');
    const row={user_id:uid,month:m+'-01',category,limit_amount:limit,currency:'USD'};
    const saved=await query('doweo_monthly_budgets',{method:'POST',body:row,prefer:'resolution=merge-duplicates,return=representation',filters:{on_conflict:'user_id,month,category'}});
    return response(saved[0],201);
   }
   return fail('Method not allowed',405);
  }
  if(action==='goals'){
   const trackerId=request.method==='GET'?url.searchParams.get('tracker_id'):body.tracker_id;
   if(!(await member(trackerId)))return fail('Tracker not found or not accessible.',404);
   if(request.method==='GET'){
    const [goals,contributions]=await Promise.all([
     query('squareup_savings_goals',{filters:{tracker_id:'eq.'+trackerId},order:'created_at.desc',limit:100}),
     query('squareup_goal_contributions',{filters:{tracker_id:'eq.'+trackerId},order:'created_at.desc',limit:1000})
    ]);
    return response(goals.map(goal=>({...goal,contributions:contributions.filter(c=>c.goal_id===goal.id),contributed:Math.round(contributions.filter(c=>c.goal_id===goal.id).reduce((n,c)=>n+Number(c.amount||0),0)*100)/100})));
   }
   if(request.method==='POST'&&parts.length===1){
    const title=text(body.title,100),target=money(body.target_amount);
    if(!title||target===null)return fail('Enter a title and positive goal amount.');
    const saved=await query('squareup_savings_goals',{method:'POST',body:{tracker_id:trackerId,created_by:uid,title,target_amount:target}});
    return response(saved[0],201);
   }
   if(request.method==='POST'&&parts[1]==='contributions'){
    const goalId=body.goal_id,amount=money(body.amount);
    if(!UUID.test(goalId||'')||amount===null)return fail('Invalid goal or contribution.');
    const goals=await query('squareup_savings_goals',{filters:{id:'eq.'+goalId,tracker_id:'eq.'+trackerId},limit:1});
    if(!goals.length)return fail('Goal not found.',404);
    const saved=await query('squareup_goal_contributions',{method:'POST',body:{tracker_id:trackerId,goal_id:goalId,user_id:uid,display_name:text(user.user_metadata?.full_name||user.email?.split('@')[0]||'Member',60),amount,note:text(body.note,200)}});
    return response({...saved[0],tracking_only:true},201);
   }
   return fail('Method not allowed',405);
  }
  if(action==='trips'){
   const trackerId=request.method==='GET'?url.searchParams.get('tracker_id'):body.tracker_id;
   if(!(await member(trackerId)))return fail('Tracker not found or not accessible.',404);
   if(parts[1]==='items'){
    const tripId=request.method==='GET'?url.searchParams.get('trip_id'):body.trip_id;
    if(!UUID.test(tripId||''))return fail('Invalid trip ID.');
    const trips=await query('squareup_trips',{filters:{id:'eq.'+tripId,tracker_id:'eq.'+trackerId},limit:1});
    if(!trips.length)return fail('Trip not found.',404);
    if(request.method==='GET')return response(await query('squareup_trip_items',{filters:{tracker_id:'eq.'+trackerId,trip_id:'eq.'+tripId},order:'date.asc.nullslast,created_at.asc',limit:300}));
    if(request.method==='POST'){
     const title=text(body.title,120),type=text(body.type,32);
     const date=body.date==null||body.date===''?null:String(body.date);
     const estimated=body.estimated_cost==null||body.estimated_cost===''?null:money(body.estimated_cost);
     if(!title||!['activity','reservation','packing','task','travel','lodging'].includes(type)||date&&!/^\d{4}-\d{2}-\d{2}$/.test(date)||estimated===null&&body.estimated_cost!=null&&body.estimated_cost!=='')return fail('Invalid trip item.');
     const rawLink=text(body.link_url,350);
     if(rawLink&&!/^https:\/\//i.test(rawLink))return fail('Use a secure HTTPS link.');
     const saved=await query('squareup_trip_items',{method:'POST',body:{tracker_id:trackerId,trip_id:tripId,created_by:uid,title,type,date,done:false,notes:text(body.notes,500),estimated_cost:estimated,link_url:rawLink||null}});
     return response(saved[0],201);
    }
    if(request.method==='PATCH'&&UUID.test(parts[2]||'')&&typeof body.done==='boolean'){
     const item=await query('squareup_trip_items',{filters:{id:'eq.'+parts[2],tracker_id:'eq.'+trackerId,trip_id:'eq.'+tripId},limit:1});
     if(!item.length)return fail('Trip item not found.',404);
     const saved=await query('squareup_trip_items',{method:'PATCH',filters:{id:'eq.'+parts[2],tracker_id:'eq.'+trackerId,trip_id:'eq.'+tripId},body:{done:body.done}});
     return response(saved[0]);
    }
    return fail('Method not allowed',405);
   }
   if(request.method==='GET')return response(await query('squareup_trips',{filters:{tracker_id:'eq.'+trackerId},order:'created_at.desc',limit:100}));
   if(request.method==='POST'){
    const name=text(body.name,100),date=body.date==null||body.date===''?null:String(body.date);
    if(!name||date&&!/^\d{4}-\d{2}-\d{2}$/.test(date))return fail('Invalid trip details.');
    const saved=await query('squareup_trips',{method:'POST',body:{tracker_id:trackerId,created_by:uid,name,date}});
    return response(saved[0],201);
   }
   return fail('Method not allowed',405);
  }
  if(action==='activity'){
   if(request.method!=='GET')return fail('Method not allowed',405);
   const trackerId=url.searchParams.get('tracker_id');
   if(!(await member(trackerId)))return fail('Tracker not found or not accessible.',404);
   const [entries,personal,trackerRows]=await Promise.all([
    query('tracker_entries',{filters:{tracker_id:'eq.'+trackerId},order:'created_at.desc',limit:500}),
    query('squareup_personal_transactions',{filters:{user_id:'eq.'+uid},order:'created_at.desc',limit:500}),
    query('trackers',{filters:{id:'eq.'+trackerId},limit:1})
   ]);
   // Tracker entries store converted balances in the tracker's base currency.
   // Legacy entries may have no individual currency column.
   const trackerCurrency=String(trackerRows[0]?.currency||'USD').toUpperCase();
   const timeline=[
    ...entries.map(e=>({id:e.id,source:'tracker',kind:e.type,created_at:e.created_at||e.date_label,amount:e.amount,currency:trackerCurrency,original_amount:e.original_amount,original_currency:e.original_currency,exchange_rate:e.exchange_rate,payment_status:e.payment_status,description:e.note||e.type})),
    ...personal.map(e=>({id:e.id,source:'personal',kind:e.kind,created_at:e.created_at,amount:e.amount,currency:e.currency||'USD',description:e.description,category:e.category}))
   ].sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at))).slice(0,700);
   return response({timeline,notice:'Timeline contains saved transaction records; edit/deletion audit events are not yet recorded.'});
  }
  if(action==='payment-requests'){
   const trackerId=request.method==='GET'?url.searchParams.get('tracker_id'):body.tracker_id;
   if(!(await member(trackerId)))return fail('Tracker not found or not accessible.',404);
   if(request.method==='GET'){
    return response(await query('doweo_payment_requests',{filters:{tracker_id:'eq.'+trackerId,created_by:'eq.'+uid},order:'created_at.desc',limit:50}));
   }
   if(request.method==='POST'&&parts[1]==='revoke'){
    if(!UUID.test(body.id||''))return fail('Invalid request ID.');
    const saved=await query('doweo_payment_requests',{method:'PATCH',filters:{id:'eq.'+body.id,created_by:'eq.'+uid,tracker_id:'eq.'+trackerId},body:{revoked_at:new Date().toISOString()}});
    if(!saved.length)return fail('Request not found.',404);
    return response({ok:true});
   }
   if(request.method==='POST'&&parts.length===1){
    const amount=money(body.amount),note=text(body.public_note||'',120);
    const rows=await query('trackers',{filters:{id:'eq.'+trackerId},limit:1});
    if(!rows.length)return fail('Tracker not found.',404);
    const currency=String(rows[0].currency||'USD').toUpperCase();
    if(!/^[A-Z]{3}$/.test(currency)||amount===null)return fail('Invalid request amount.');
    const recent=await query('doweo_payment_requests',{filters:{created_by:'eq.'+uid,created_at:'gte.'+new Date(Date.now()-86400000).toISOString()},limit:21});
    if(recent.length>=20)return fail('Daily payment-request limit reached.',429);
    const saved=await query('doweo_payment_requests',{method:'POST',body:{tracker_id:trackerId,created_by:uid,amount,currency,public_note:note}});
    return response({id:saved[0].id,url:new URL('/pay/?token='+encodeURIComponent(saved[0].token),url.origin).href,expires_at:saved[0].expires_at,tracking_only:true},201);
   }
   return fail('Method not allowed',405);
  }
  if(action==='currency-quote'){
   if(request.method!=='GET')return fail('Method not allowed',405);
   const from=String(url.searchParams.get('from')||'').toUpperCase(),to=String(url.searchParams.get('to')||'').toUpperCase(),amount=money(url.searchParams.get('amount'));
   const allowed=['USD','EUR','GBP','CAD','AUD','JPY','CHF','CNY','INR','MXN','BRL','KRW','SGD','HKD','NZD','SEK','NOK','DKK','ILS','ZAR'];
   if(!allowed.includes(from)||!allowed.includes(to)||amount===null)return fail('Invalid currency or amount.');
   if(from===to)return response({from,to,amount,rate:1,converted:amount,as_of:new Date().toISOString(),estimate:true});
   const provider=await fetch('https://open.er-api.com/v6/latest/'+from);
   if(!provider.ok)return fail('Exchange rate is temporarily unavailable.',503);
   const data=await provider.json();
   const rate=Number(data.rates?.[to]);
   if(data.result!=='success'||!Number.isFinite(rate)||rate<=0)return fail('Exchange rate is unavailable.',503);
   return response({from,to,amount,rate,converted:Math.round(amount*rate*100)/100,as_of:data.time_last_update_utc||null,estimate:true,source:'open.er-api.com'});
  }
  return fail('Not found',404);
 }catch(error){console.error('DoWeo planning failure',String(error?.message||''));return fail('Could not complete the financial planning request.',503)}
}
export {onRequest};
