/* Desktop-only Group Polls dashboard; preserves the original poll event handlers. */
(function(){
 'use strict';
 const desktop=window.matchMedia('(min-width:901px)');
 const page=document.getElementById('dw-polls-page');
 const workspace=document.getElementById('dw-poll-workspace');
 const cards=workspace?.querySelector('#dw-poll-cards');
 if(!page||!workspace||!cards)return;
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const shapes={
  chart:'<path d="M4 20V4m5 16v-6m5 6V8m5 12V5"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v6l4 2"/>',
  users:'<circle cx="9" cy="9" r="3"/><path d="M3 21v-2a6 6 0 0 1 12 0v2M17 9a3 3 0 1 0-1-5.8M21 21v-2a6 6 0 0 0-4-5.7"/>',
  check:'<circle cx="12" cy="12" r="9"/><path d="m7.5 12 3 3 6-6"/>',
  bell:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
  settings:'<circle cx="12" cy="12" r="3"/><path d="M10 3h4l1 3 3 1 3-1 2 4-2 3 1 3 2 2-3 4-3-1-3 1-1 3h-4l-1-3-3-1-3 1-2-4 2-3-1-3-2-2 3-4 3 1 3-1z"/>',
  empty:'<path d="M5 8h14v13H5zM8 8V4h8v4M8 13h8m-8 4h5"/>'
 };
 const svg=name=>'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+shapes[name]+'</svg>';
 const stats=document.createElement('div');stats.className='dw-poll-dashboard-stats';stats.setAttribute('aria-label','Poll overview');
 stats.innerHTML=[['chart','Total polls','dw-poll-stat-total','0'],['clock','Awaiting votes','dw-poll-stat-pending','0'],['users','Participation','dw-poll-stat-percent','0%']].map(([icon,label,id,value])=>'<div class="dw-poll-dashboard-stat"><span class="dw-poll-stat-icon">'+svg(icon)+'</span><div><span>'+label+'</span><strong id="'+id+'">'+value+'</strong></div></div>').join('');
 const grid=document.createElement('div');grid.className='dw-poll-dashboard-grid';
 grid.innerHTML=[
 '<div class="dw-poll-dashboard-main">',
 '<section class="dw-poll-dashboard-surface dw-poll-live-panel" aria-labelledby="dw-poll-live-heading">',
 '<header class="dw-poll-dashboard-heading"><h3 id="dw-poll-live-heading">Active Polls</h3><span class="dw-poll-active-count" id="dw-poll-open-count">0 open</span></header>',
 '<div class="dw-poll-cards-slot"></div><p class="dw-poll-no-active" hidden>No active polls right now. Create a poll to get started.</p></section>',
 '<section class="dw-poll-dashboard-surface dw-poll-recent-panel" aria-labelledby="dw-poll-recent-heading">',
 '<header class="dw-poll-dashboard-heading dw-poll-recent-heading"><span class="dw-poll-recent-icon">'+svg('check')+'</span><div class="dw-poll-recent-heading-text"><h3 id="dw-poll-recent-heading">Recent Results</h3><p>Completed polls from this tracker</p></div><button type="button" class="dw-poll-view-all" data-poll-dashboard-action="all-results">View all <span aria-hidden="true">→</span></button></header>',
 '<div id="dw-poll-recent-results" aria-live="polite"></div></section></div>',
 '<aside class="dw-poll-dashboard-aside" aria-label="Poll actions and voter status">',
 '<section class="dw-poll-dashboard-surface dw-poll-quick-panel"><h3>Quick Actions</h3>',
 '<button type="button" data-poll-dashboard-action="remind"><span class="dw-poll-action-icon">'+svg('bell')+'</span><span>Remind members to vote</span><span class="dw-poll-action-chevron" aria-hidden="true">›</span></button>',
 '<button type="button" data-poll-dashboard-action="results"><span class="dw-poll-action-icon">'+svg('chart')+'</span><span>View poll results</span><span class="dw-poll-action-chevron" aria-hidden="true">›</span></button>',
 '<button type="button" data-poll-dashboard-action="settings"><span class="dw-poll-action-icon">'+svg('settings')+'</span><span>Poll settings</span><span class="dw-poll-action-chevron" aria-hidden="true">›</span></button></section>',
 '<section class="dw-poll-dashboard-surface dw-poll-voter-panel"><header class="dw-poll-dashboard-heading"><h3>Voter Status</h3><span id="dw-poll-voter-summary">0 of 0 voted</span></header><div id="dw-poll-voter-list" aria-live="polite"></div></section>',
 '</aside></div>'
 ].join('');
 cards.before(stats,grid);grid.querySelector('.dw-poll-cards-slot').append(cards);
 const el=id=>workspace.querySelector('#'+id),feedback=workspace.querySelector('#dw-poll-feedback');
 const filters=[...workspace.querySelectorAll('[data-poll-filter]')];
 const count=n=>Number(n)||0;
 const closed=p=>Boolean(p.closed||(p.endsAt&&Date.parse(p.endsAt)<=Date.now()));
 let rows=[],filter='all',lastReminder=0;
 const live=()=>rows.filter(p=>!p.archived&&!closed(p));
 const completed=()=>rows.filter(p=>!p.archived&&closed(p));
 const selectFilter=name=>filters.find(b=>b.dataset.pollFilter===name)?.click();
 function render(payload){
  if(!desktop.matches)return;
  rows=Array.isArray(payload?.polls)?payload.polls:[];filter=payload?.filter||'all';
  const open=live(),done=completed();
  const totalMembers=open.reduce((n,p)=>n+count(p.totalMembers),0);
  const votedMembers=open.reduce((n,p)=>n+count(p.votedMembers),0);
  el('dw-poll-stat-total').textContent=String(rows.filter(p=>!p.archived).length);
  el('dw-poll-stat-pending').textContent=String(Math.max(0,totalMembers-votedMembers));
  el('dw-poll-stat-percent').textContent=totalMembers?Math.round(votedMembers/totalMembers*100)+'%':'0%';
  el('dw-poll-open-count').textContent=open.length+' open';
  el('dw-poll-live-heading').textContent=filter==='closed'?'Closed Polls':filter==='archived'?'Archived Polls':'Active Polls';
  const empty=workspace.querySelector('.dw-poll-no-active');
  for(const card of cards.querySelectorAll('.dw-poll-card')){
   const poll=rows.find(p=>String(p.id)===card.dataset.pollCardId);
   card.hidden=filter==='all'&&!!poll&&closed(poll);
  }
  empty.hidden=filter!=='all'||open.length>0||!!cards.querySelector('.dw-poll-empty');
  workspace.querySelector('.dw-poll-recent-panel').hidden=filter==='closed'||filter==='archived';
  el('dw-poll-recent-results').innerHTML=done.slice(0,3).map(p=>{
   const max=Math.max(0,...(p.options||[]).map(o=>count(o.votes)));
   const winners=(p.options||[]).filter(o=>count(o.votes)===max&&max>0);
   const result=max===0?'No votes cast':winners.length>1?'Tie: '+winners.map(o=>o.label).join(' / '):'Winner: '+winners[0].label;
   return '<div class="dw-poll-recent-item"><div><strong>'+esc(p.question)+'</strong><small>'+esc(result)+'</small></div><span>'+count(p.totalVotes)+' votes</span></div>';
  }).join('')||'<div class="dw-poll-recent-empty">'+svg('empty')+'<span>No completed polls yet</span></div>';
  const poll=open[0],list=el('dw-poll-voter-list'),label=el('dw-poll-voter-summary');
  if(!poll){label.textContent='No active poll';list.innerHTML='<p class="dw-poll-voter-empty">Open a poll to see voter status.</p>';return;}
  label.textContent=count(poll.votedMembers)+' of '+count(poll.totalMembers)+' voted';
  const voted=Array.isArray(poll.votedNames)?poll.votedNames:[];
  const pending=Array.isArray(poll.pendingNames)?poll.pendingNames:[];
  const people=[...voted.map(name=>({name,status:'Voted'})),...pending.map(name=>({name,status:'Pending'}))];
  if(!voted.length&&count(poll.votedMembers)>0)people.unshift({name:count(poll.votedMembers)+' member(s)',status:'Voted'});
  list.innerHTML=people.slice(0,8).map(person=>{
   const initials=String(person.name).trim().split(/\s+/).slice(0,2).map(s=>s.charAt(0)).join('').toUpperCase()||'?';
   const done=person.status==='Voted';
   return '<div class="dw-poll-voter-row"><span class="dw-poll-voter-avatar" aria-hidden="true">'+esc(initials)+'</span><span class="dw-poll-voter-name">'+esc(person.name)+'</span><span class="dw-poll-voter-state '+(done?'voted':'pending')+'">'+(done?'✓':'◷')+' '+person.status+'</span></div>';
  }).join('')||'<p class="dw-poll-voter-empty">No voter details available.</p>';
  if(people.length>8)list.insertAdjacentHTML('beforeend','<p class="dw-poll-voter-more">+'+(people.length-8)+' more members</p>');
 }
 workspace.addEventListener('click',async event=>{
  const btn=event.target.closest('[data-poll-dashboard-action]');
  if(!btn||!desktop.matches)return;
  const action=btn.dataset.pollDashboardAction;
  if(action==='all-results'){selectFilter('closed');workspace.querySelector('.dw-poll-live-panel')?.scrollIntoView({block:'start',behavior:'smooth'});return;}
  if(action==='results'){selectFilter('all');workspace.querySelector('.dw-poll-recent-panel')?.scrollIntoView({block:'center',behavior:'smooth'});return;}
  if(action==='settings'){
   const p=rows.find(p=>!p.archived&&(p.canManage??p.canClose))||rows.find(p=>(p.canManage??p.canClose));
   if(!p){feedback.textContent='Poll settings are available on polls you manage.';return;}
   selectFilter(p.archived?'archived':closed(p)?'closed':'all');
   const card=[...cards.querySelectorAll('.dw-poll-card')].find(c=>c.dataset.pollCardId===String(p.id));
   const menu=card?.querySelector('.dw-poll-menu');
   if(menu){menu.open=true;menu.querySelector('summary')?.focus();card.scrollIntoView({block:'nearest',behavior:'smooth'});}
   else feedback.textContent='Open the poll menu to manage settings.';
   return;
  }
  if(action==='remind'){
   const p=live().find(p=>Array.isArray(p.pendingNames)&&p.pendingNames.length>0);
   if(!p){feedback.textContent='No open polls have pending voters.';return;}
   if(Date.now()-lastReminder<60000){feedback.textContent='A reminder was posted recently.';return;}
   const tracker=window.sqLastOpenedTrackerDetail;
   if(!tracker?.id||tracker.id==='local'){feedback.textContent='Select a shared tracker first.';return;}
   if(!window.confirm('Post a poll reminder in tracker chat? All tracker members will receive a chat notification.'))return;
   btn.disabled=true;
   try{
    await window.squareUpApi('trackers/'+encodeURIComponent(tracker.id)+'/chat','POST',{message:'Reminder: Please vote in our group poll, "'+String(p.question).slice(0,150)+'", on DoWeo.'});
    lastReminder=Date.now();feedback.textContent='Voting reminder posted in tracker chat.';
   }catch(error){feedback.textContent=error.message||'Could not send reminder.';}
   finally{btn.disabled=false;}
  }
 });
 window.dwPollsDashboard={render};
})();