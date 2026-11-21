import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

// Isolated, request-level regression tests. No live accounts, network or money writes.
const source = readFileSync(new URL('../functions/api/[[path]].js', import.meta.url), 'utf8');
const {onRequest} = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
const me = '11111111-1111-4111-8111-111111111111';
const friend = '22222222-2222-4222-8222-222222222222';
const outside = '33333333-3333-4333-8333-333333333333';
const legacy = '44444444-4444-4444-8444-444444444444';
const shared = '55555555-5555-4555-8555-555555555555';
const entryId = '66666666-6666-4666-8666-666666666666';

function fixture({dueRecurring = false} = {}) {
  const trackers = [
    {id:legacy,owner_id:me,name:'Legacy Owner',currency:'USD',created_at:'2026-01-01'},
    {id:shared,owner_id:outside,name:'Shared Trip',currency:'EUR',created_at:'2026-01-02'}
  ];
  // Owner lacks the legacy membership row; both people have shared memberships.
  const members = [
    {tracker_id:shared,user_id:me,name:'Alex',role:'editor'},
    {tracker_id:shared,user_id:friend,name:'Jordan',role:'editor'}
  ];
  const entries = [];
  const requests = [];
  let active = 0,maxActive = 0;
  const original = globalThis.fetch;
  globalThis.fetch = async (input, options={}) => {
    const url = new URL(input);
    if(url.pathname === '/auth/v1/user') return Response.json({
      id:me,email:'alex@example.test',user_metadata:{full_name:'Alex'}
    });
    assert.ok(url.pathname.startsWith('/rest/v1/'),'Unexpected backend call: '+url.pathname);
    const table = url.pathname.split('/').at(-1);
    const filters = url.searchParams;
    const method = options.method || 'GET';
    requests.push({table,method,filters:Object.fromEntries(filters)});
    active++;maxActive = Math.max(active,maxActive);
    // Gives truly concurrent requests time to overlap; verifies two-stage concurrency.
    await new Promise(resolve=>setTimeout(resolve,3));
    active--;
    let rows;
    if(table==='trackers') rows=trackers;
    else if(table==='tracker_members') rows=members;
    else if(table==='tracker_entries') {
      if(method==='POST'){
        const data=JSON.parse(options.body);
        entries.push({...data,id:entryId});
        rows=[entries.at(-1)];
      }else rows=entries;
    }
    else if(table==='squareup_tracker_permissions') rows=[];
    else if(table==='profiles') rows=[];
    else if(table==='squareup_tracker_settings') rows=[{require_expense_approval:false}];
    else if(table==='squareup_recurring_expenses'){
      if(method==='PATCH') rows=[{id:outside}];
      else rows=dueRecurring && filters.get('tracker_id')==='eq.'+shared
        ? [{id:outside,tracker_id:shared,from_name:'Alex',to_name:'Jordan',amount:12,note:'Recurring lunch',created_by:me,frequency:'monthly',next_date:new Date().toISOString().slice(0,10),active:true}]
        : [];
    }
    else if(table==='squareup_notifications') rows=method==='POST'?[{id:outside}]:[];
    else assert.fail('Unexpected table: '+table);
    for(const [key,value] of filters.entries()){
      if (['tracker_id','owner_id','id','user_id','recurring_id','recurring_on'].includes(key)){
        if(value.startsWith('eq.'))rows=rows.filter(row=>String(row[key])===value.slice(3));
        if(value.startsWith('in.(')){
          const ids=value.slice(4,-1).split(',');
          rows=rows.filter(row=>ids.includes(String(row[key])));
        }
      }
    }
    return Response.json(rows);
  };
  return {
    requests,entries,get maxActive(){return maxActive},
    restore(){globalThis.fetch=original},
    async call(parts=['trackers']){
      return onRequest({
        request:new Request('https://doweo.app/api/'+parts.join('/'),{headers:{authorization:'Bearer fixture'}}),
        env:{SUPABASE_SERVICE_ROLE_KEY:'fixture-service-role'},
        params:{path:parts}
      });
    }
  };
}

test('tracker list includes owner fallback, membership roles, and accurate counts with paired reads',async()=>{
  const h=fixture();
  try{
    const result=await h.call();
    assert.equal(result.status,200);
    assert.deepEqual(await result.json(),[
      {id:legacy,name:'Legacy Owner',currency:'USD',role:'owner',memberCount:0},
      {id:shared,name:'Shared Trip',currency:'EUR',role:'editor',memberCount:2}
    ]);
    assert.equal(h.requests.filter(r=>r.table==='trackers').length,2);
    assert.equal(h.requests.filter(r=>r.table==='tracker_members').length,2);
    assert.ok(h.maxActive>=2,'independent tracker reads should overlap');
    assert.ok(h.requests.every(r=>r.method==='GET'),'gallery must not write database records');
  }finally{h.restore()}
});

test('tracker detail avoids redundant membership and whole-tracker refetches when no recurrence is due',async()=>{
  const h=fixture();
  try{
    const result=await h.call(['trackers',shared]);
    assert.equal(result.status,200);
    const data=await result.json();
    assert.equal(data.name,'Shared Trip');
    assert.equal(data.role,'editor');
    assert.equal(data.members.length,2);
    assert.equal(data.members[0].ledgerName,'Alex');
    assert.deepEqual(data.entries,[]);
    const count=table=>h.requests.filter(r=>r.table===table).length;
    assert.equal(count('trackers'),3,'member authorization + owner record + detail, without duplicate detail membership lookup');
    assert.equal(count('tracker_members'),3,'authorization + permissions + detail, no duplicated detail membership lookup');
    assert.equal(count('tracker_entries'),1,'empty recurring sync must not refetch the ledger');
    assert.equal(count('squareup_recurring_expenses'),1,'still performs the real recurring sync check');
    assert.equal(count('profiles'),1,'no duplicate profile fetch');
    assert.ok(h.requests.every(r=>r.method==='GET'));
  }finally{h.restore()}
});

test('legacy owner can still open a tracker without a membership row',async()=>{
  const h=fixture();
  try{
    const result=await h.call(['trackers',legacy]);
    assert.equal(result.status,200);
    const detail=await result.json();
    assert.equal(detail.role,'owner');
    assert.equal(detail.members.length,0);
  }finally{h.restore()}
});

test('tracker with a newly due recurring expense refreshes its detail and shows the new entry',async()=>{
  const h=fixture({dueRecurring:true});
  try{
    const result=await h.call(['trackers',shared]);
    assert.equal(result.status,200);
    const data=await result.json();
    assert.equal(data.entries.length,1);
    assert.equal(data.entries[0].note,'Recurring lunch');
    assert.equal(data.entries[0].amount,12);
    assert.equal(h.requests.filter(r=>r.table==='tracker_entries'&&r.method==='POST').length,1);
    assert.equal(h.requests.filter(r=>r.table==='squareup_recurring_expenses'&&r.method==='PATCH').length,1);
    assert.equal(h.requests.filter(r=>r.table==='tracker_entries'&&r.method==='GET'&&!r.filters.recurring_id).length,2,
      'only an actual new entry should cause a second full detail read');
  }finally{h.restore()}
});
