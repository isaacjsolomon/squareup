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
  // Read-only activity timeline. Personal entries stay private; tracker entries
  // require membership and are never mixed into another user's personal records.
  if(action==='activity'){
   if(request.method!=='GET'||parts.length!==1)return fail('Method not allowed',405);
   const trackerId=url.searchParams.get('tracker_id');
   const kind=url.searchParams.get('kind')||'all';
   const needle=(url.searchParams.get('q')||'').trim().toLowerCase();
   const take=Number(url.searchParams.get('limit')||50);
   if(!['all','expense','income','debt','payment'].includes(kind)
      ||needle.length>100||!Number.isInteger(take)||take<1||take>100)return fail('Invalid activity filters.');
   let rows,currency='USD',scope='personal';
   if(trackerId){
    if(!(await member(trackerId)))return fail('Tracker not found or not accessible.',404);
    const tracker=await query('trackers',{filters:{id:'eq.'+trackerId},limit:1});
    currency=String(tracker[0]?.currency||'USD').toUpperCase();
    scope='tracker';
    rows=await query('tracker_entries',{filters:{tracker_id:'eq.'+trackerId},order:'created_at.desc',limit:500});
   }else{
    rows=await query('squareup_personal_transactions',{filters:{user_id:'eq.'+uid},order:'created_at.desc',limit:500});
   }
   const mapped=rows.map(item=>{
    const entryKind=String(item.kind||item.type||'entry').toLowerCase();
    const description=scope==='personal'?String(item.description||'Transaction'):String(item.note||item.type||'Tracker entry');
    const amount=Number(item.amount);
    return {
     id:item.id,
     scope,kind:entryKind,description:description.slice(0,240),
     amount:Number.isFinite(amount)?amount:0,
     currency:scope==='personal'?String(item.currency||'USD').toUpperCase():currency,
     category:scope==='personal'?String(item.category||'').slice(0,60):'',
     from:scope==='tracker'?String(item.from_name||'').slice(0,80):'',
     to:scope==='tracker'?String(item.to_name||'').slice(0,80):'',
     status:scope==='tracker'?String(item.payment_status||'').slice(0,40):'',
     date:item.occurred_on||item.date_label||item.created_at||null,
     created_at:item.created_at||null
    };
   });
   const filtered=mapped.filter(item=>(kind==='all'||item.kind===kind)&&
     (!needle||[item.description,item.category,item.from,item.to].join(' ').toLowerCase().includes(needle)));
   return response({scope,items:filtered.slice(0,take),has_more:filtered.length>take,limited_to_recent:rows.length===500});
  }
  return fail('Not found',404);
 }catch(error){console.error('DoWeo planning failure',String(error?.message||''));return fail('Could not complete the financial planning request.',503)}
}
export {onRequest};
