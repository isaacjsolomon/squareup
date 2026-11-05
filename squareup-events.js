// SquareUp Events client. Uses the existing signed-in API client.
export function initEvents({api,getTrackers,getUser}){
 const css=document.createElement('style');
 css.textContent=`
 body.sqev-page-open .wrap > :not(#sqev-view){display:none!important}
 body.sqev-page-open .wrap{max-width:1500px!important;width:100%!important}
 #sqev-view{display:block;width:100%;position:relative;z-index:1;background:transparent;overflow:visible;padding:20px 8px 70px;color:#e8f5f9;font:14px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
 #sqev-view[hidden],#sqev-view [hidden]{display:none!important}
 #sqev-view .sqev-shell{max-width:1320px;margin:0 auto}
 #sqev-view *{box-sizing:border-box}
 #sqev-view .sqev-eyebrow{font-size:11px;font-weight:800;letter-spacing:.17em;text-transform:uppercase;color:#54d9c8}
 #sqev-view h2{font-size:clamp(28px,3.2vw,39px);color:#f4fcff;margin:4px 0 5px;letter-spacing:-.045em;line-height:1.14}
 #sqev-view h3{font-size:18px;margin:0 0 15px;color:#f5fbff;letter-spacing:-.015em}
 #sqev-view .sqev-toolbar{display:flex;justify-content:space-between;align-items:center;gap:20px;flex-wrap:wrap;padding:12px 0 25px}
 #sqev-view .sqev-subtitle{color:#9ebbc9;font-size:14px;margin:0}
 #sqev-view .sqev-toolbar-actions{display:flex;gap:9px;align-items:center}
 #sqev-view .sqev-box{border:1px solid rgba(116,178,197,.24);border-radius:19px;padding:24px;margin:0;background:linear-gradient(140deg,#122f42,#0c2538);box-shadow:0 12px 30px rgba(0,7,20,.12)}
 #sqev-view .sqev-overview{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin-bottom:24px}
 #sqev-view .sqev-stat{border:1px solid rgba(114,173,192,.19);background:#0d293b;border-radius:16px;padding:20px}
 #sqev-view .sqev-stat strong{display:block;color:#fff;font-size:29px;font-weight:780;letter-spacing:-.045em;margin-top:5px}
 #sqev-view .sqev-stat span{font-size:12px;color:#a6c6d2;font-weight:600}
 #sqev-view .sqev-layout{display:grid;grid-template-columns:minmax(0,1fr);gap:20px}
 #sqev-view .sqev-headrow{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:16px}
 #sqev-view .sqev-headrow h3{margin:0}
 #sqev-view .sqev-box p{line-height:1.5}
 #sqev-view label{display:grid;gap:7px;margin:10px 0;font-weight:650;font-size:12px;color:#bfd5df}
 #sqev-view .sqev-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px 16px}
 #sqev-view input,#sqev-view select,#sqev-view textarea{width:100%;min-width:0;background:#0a2235;color:#f0fbff;border:1px solid #36586a;border-radius:11px;padding:12px 13px;font:inherit;min-height:44px;color-scheme:dark;outline:none}
 #sqev-view input:focus,#sqev-view select:focus,#sqev-view textarea:focus{border-color:#42dac6;box-shadow:0 0 0 3px rgba(66,218,198,.12)}
 #sqev-view textarea{resize:vertical}
 #sqev-view button{border:1px solid #426a7c;border-radius:11px;padding:10px 16px;background:#173a4c;color:#e8f8fb;cursor:pointer;font-size:13px;font-weight:700;min-height:42px;transition:background .16s,border-color .16s}
 #sqev-view button:hover{background:#205064;border-color:#61b8b8}
 #sqev-view button.sqev-primary{background:#2cd0bb;color:#062833;border-color:#2cd0bb}
 #sqev-view button.sqev-primary:hover{background:#59e4d0}
 #sqev-view .sqev-muted{color:#a4becb}
 #sqev-view .sqev-item{border:1px solid rgba(124,180,194,.22);padding:18px 20px;border-radius:15px;background:#0d293c}
 #sqev-view .sqev-item:hover{border-color:rgba(75,217,192,.46)}
 #sqev-view .sqev-events-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
 #sqev-view .sqev-item h4{font-size:19px;line-height:1.3;letter-spacing:-.025em;margin:10px 0 5px;color:#fff}
 #sqev-view .sqev-item p{margin:7px 0;color:#adcbd5;font-size:13px}
 #sqev-view .sqev-pill{display:inline-flex;border:1px solid rgba(56,221,185,.25);color:#8eebda;background:rgba(40,205,177,.09);border-radius:100px;padding:4px 9px;font-size:11px;font-weight:700}
 #sqev-view .sqev-event-date{color:#6ce1d1;font-weight:700;font-size:13px}
 #sqev-view .sqev-item-footer{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-top:16px}
 #sqev-view .sqev-actions{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0 22px}
 #sqev-view .sqev-details-grid{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(280px,.8fr);gap:18px;align-items:start}
 #sqev-view .sqev-details-grid>.sqev-box{min-width:0}
 #sqev-view .sqev-section-title{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:14px;padding-bottom:12px;border-bottom:1px solid rgba(143,195,207,.15)}
 #sqev-view .sqev-section-title h3{margin:0}
 #sqev-view .sqev-empty{border:1px dashed #416273;border-radius:15px;text-align:center;padding:46px 20px;color:#a4bfca}
 #sqev-view #sqev-message{min-height:20px;color:#78e4d3;font-size:13px;margin:12px 0 0}
 #sqev-view .sqev-back{margin-bottom:14px}
 #sqev-view .sqev-detail-heading{padding:5px 0 22px}
 #sqev-view .sqev-details-grid .sqev-box{margin-bottom:18px}
 #sqev-view .sqev-event-meta{display:flex;gap:10px;flex-wrap:wrap;font-size:13px;color:#bbd4dc;margin-top:13px}
 #sqev-view .sqev-event-meta span{padding:8px 12px;border:1px solid rgba(128,179,196,.23);background:#0b2839;border-radius:9px}
 #sqev-view .sqev-rsvp-button.active{background:#28cbb6;color:#05313c;border-color:#28cbb6}
 #sqev-view .sqev-form-actions{display:flex;justify-content:flex-end;margin-top:16px}
 @media(max-width:980px){#sqev-view .sqev-details-grid{grid-template-columns:1fr}}
 @media(max-width:680px){#sqev-view{padding:14px 0 95px}#sqev-view .sqev-toolbar{padding:6px 0 18px}#sqev-view .sqev-box{padding:17px;border-radius:15px}#sqev-view .sqev-overview{gap:8px}#sqev-view .sqev-stat{padding:12px}#sqev-view .sqev-stat strong{font-size:22px}#sqev-view .sqev-stat span{font-size:11px}#sqev-view .sqev-events-grid,#sqev-view .sqev-grid{grid-template-columns:1fr}#sqev-view .sqev-item{padding:16px}#sqev-view .sqev-toolbar-actions{width:100%}#sqev-view .sqev-toolbar-actions button{flex:1}}
 `
 document.head.append(css);
 const panel=document.createElement('section');
 panel.id='sqev-view';panel.hidden=true;
 panel.innerHTML=`<div class="sqev-shell">
 <div class="sqev-toolbar"><div><span class="sqev-eyebrow">SQUAREUP / EVENT PLANNING</span><h2>Events</h2><p class="sqev-subtitle">Plan together, organize the details, and stay on top of shared expenses.</p></div>
 <div class="sqev-toolbar-actions"><button type="button" id="sqev-back-home">← Home</button><button type="button" class="sqev-primary" id="sqev-create-toggle">+ New event</button></div></div>
 <div id="sqev-dashboard">
 <div class="sqev-overview"><div class="sqev-stat"><span>Total events</span><strong id="sqev-total">0</strong></div><div class="sqev-stat"><span>Upcoming</span><strong id="sqev-upcoming">0</strong></div><div class="sqev-stat"><span>Past events</span><strong id="sqev-past">0</strong></div></div>
 <div class="sqev-layout">
 <div class="sqev-box" id="sqev-create-box" hidden><div class="sqev-headrow"><h3>Create an event</h3><button type="button" id="sqev-cancel-create">Cancel</button></div>
 <form id="sqev-form"><div class="sqev-grid">
 <label>Tracker<select name="tracker_id" required></select></label><label>Event name<input name="title" maxlength="120" required placeholder="Movie night, team dinner..."></label>
 <label>Starts<input type="datetime-local" name="starts" required></label><label>Ends<input type="datetime-local" name="ends" required></label>
 </div><label>Location<input name="location" maxlength="300" placeholder="Where will it happen?"></label>
 <label>Description<textarea name="description" rows="2" maxlength="2000" placeholder="Add any information guests should know..."></textarea></label>
 <div class="sqev-form-actions"><button class="sqev-primary" type="submit">Create event</button></div></form></div>
 <div class="sqev-box"><div class="sqev-headrow"><h3>Your events</h3><span class="sqev-muted" id="sqev-count"></span></div><div id="sqev-list" class="sqev-events-grid"></div></div>
 </div></div>
 <div id="sqev-details-page" hidden>
 <button type="button" id="sqev-back-events" class="sqev-back">← All events</button>
 <div id="sqev-details"></div>
 </div><p id="sqev-message" role="status" aria-live="polite"></p>
 </div>`
 document.querySelector('.wrap')?.append(panel);
 const $=id=>panel.querySelector('#'+id),message=t=>{$('sqev-message').textContent=t};
 const safe=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const date=v=>new Date(v).toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short'});
 const localDate=v=>{const d=new Date(v);return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16)};
 let selected=null;
 async function load(){
  const trackers=getTrackers()||[], select=$('sqev-form').elements.tracker_id;
  const previous=select.value;
  select.innerHTML=trackers.map(t=>`<option value="${safe(t.id)}">${safe(t.name)}</option>`).join('');
  if(previous && trackers.some(t=>t.id===previous))select.value=previous;
  if(!trackers.length){$('sqev-list').innerHTML='<div class="sqev-empty">Create or join a tracker to start planning events.</div>';return;}
  const results=await Promise.allSettled(trackers.map(t=>api('events?tracker_id='+encodeURIComponent(t.id))));
  const failures=results.filter(x=>x.status==='rejected').length;
  const events=results.flatMap((r,i)=>r.status==='fulfilled' && Array.isArray(r.value)?r.value.map(e=>({...e,tracker_name:trackers[i].name})):[])
     .sort((a,b)=>new Date(a.starts_at)-new Date(b.starts_at));
  const now=Date.now(),upcoming=events.filter(e=>new Date(e.ends_at).getTime()>=now).length;
  $('sqev-total').textContent=String(events.length);
  $('sqev-upcoming').textContent=String(upcoming);
  $('sqev-past').textContent=String(events.length-upcoming);
  $('sqev-count').textContent=events.length+' total';
  $('sqev-list').innerHTML=events.length?events.map(e=>`
   <article class="sqev-item">
   <span class="sqev-pill">${new Date(e.ends_at).getTime()>=now?'UPCOMING':'PAST EVENT'}</span>
   <h4>${safe(e.title)}</h4>
   <div class="sqev-event-date">${safe(date(e.starts_at))}</div>
   <p>${safe(e.location||'Location not set')}</p>
   <div class="sqev-item-footer"><span class="sqev-muted">Tracker · ${safe(e.tracker_name)}</span>
   <button type="button" data-open="${safe(e.id)}">View event →</button></div>
   </article>`).join(''):'<div class="sqev-empty">No events yet. Select “New event” to plan your first one.</div>';
  if(failures)message('Some trackers could not be loaded. Try refreshing.');
 }
 async function details(id){
  const data=await api('events/'+encodeURIComponent(id)),e=data.event;selected=id;
  const own=e.created_by===getUser()?.id;
  const tracker=await api('trackers/'+encodeURIComponent(e.tracker_id)).catch(()=>({entries:[]}));
  const linked=new Set(data.expenses.map(x=>x.id));
  $('sqev-dashboard').hidden=true;
  $('sqev-details-page').hidden=false;
  $('sqev-details').innerHTML=`
   <div class="sqev-detail-heading">
    <span class="sqev-eyebrow">EVENT DETAILS</span><h2>${safe(e.title)}</h2>
    <p class="sqev-subtitle">${safe(e.description||'No description added.')}</p>
    <div class="sqev-event-meta">
     <span>◷ ${safe(date(e.starts_at))} – ${safe(date(e.ends_at))}</span>
     <span>⌖ ${safe(e.location||'Location not set')}</span>
    </div>
   </div>
   <div class="sqev-details-grid">
    <div>
     <section class="sqev-box"><div class="sqev-section-title"><h3>Schedule</h3><span class="sqev-muted">${data.schedule.length} activities</span></div>
     ${data.schedule.length?data.schedule.sort((a,b)=>new Date(a.starts_at)-new Date(b.starts_at)).map(i=>`<div class="sqev-item"><strong>${safe(i.title)}</strong><p>${safe(date(i.starts_at))}</p><p>${safe(i.location)} ${safe(i.notes)}</p>${own?`<button data-remove-item="${safe(i.id)}">Remove</button>`:''}</div>`).join(''):'<p class="sqev-muted">No scheduled activities yet.</p>'}
     ${own?`<form id="sqev-schedule"><h3 style="margin-top:20px">Add activity</h3><div class="sqev-grid"><label>Activity name<input name="title" required></label><label>Date and time<input name="starts" type="datetime-local" required></label></div><label>Location<input name="location" placeholder="Optional"></label><button type="submit">Add to schedule</button></form>`:''}
     </section>
     <section class="sqev-box"><div class="sqev-section-title"><h3>Event expenses</h3><span class="sqev-muted">${data.expenses.length} linked</span></div>
     ${data.expenses.length?data.expenses.map(x=>`<div class="sqev-item"><strong>${safe(x.note||'Expense')}</strong><p>${safe(x.from_name||x.from||'')} · ${safe(x.amount)}</p><button data-unlink="${safe(x.id)}">Unlink</button></div>`).join(''):'<p class="sqev-muted">Link an existing tracker expense to keep it organized with this event.</p>'}
     <form id="sqev-expense"><label>Existing tracker expense<select name="entry_id" required><option value="">Choose an expense...</option>${(tracker.entries||[]).filter(x=>!linked.has(x.id)).map(x=>`<option value="${safe(x.id)}">${safe(x.note||x.from+' → '+x.to)} · ${safe(x.amount)}</option>`).join('')}</select></label><button type="submit">Link expense</button></form>
     </section>
    </div>
    <div>
     <section class="sqev-box"><div class="sqev-section-title"><h3>RSVP</h3><span class="sqev-pill">${data.rsvps.filter(r=>r.status==='going').length} GOING</span></div>
      <p class="sqev-muted">Will you be there?</p>
      <div class="sqev-actions">${['going','maybe','declined'].map(status=>`<button type="button" class="sqev-rsvp-button ${data.rsvps.some(r=>r.user_id===getUser()?.id&&r.status===status)?'active':''}" data-rsvp="${status}">${status==='going'?'Going':status==='maybe'?'Maybe':'Declined'}</button>`).join('')}</div>
      <p class="sqev-muted">${data.rsvps.length} responses · ${data.rsvps.filter(r=>r.status==='maybe').length} maybe · ${data.rsvps.filter(r=>r.status==='declined').length} declined</p>
     </section>
     ${own?`<section class="sqev-box"><div class="sqev-section-title"><h3>Manage event</h3></div><p class="sqev-muted">Only the organizer can change or delete this event.</p><div class="sqev-actions"><button data-edit="1">Edit details</button><button data-delete="1">Delete event</button></div><div id="sqev-edit-holder"></div></section>`:''}
    </div>
   </div>`;
  if(own) $('sqev-details').querySelector('[data-edit]').onclick=()=>{
   const holder=$('sqev-edit-holder');
   holder.innerHTML=`<form id="sqev-edit" class="sqev-item"><h3>Edit event</h3><label>Name<input name="title" required maxlength="120" value="${safe(e.title)}"></label><label>Location<input name="location" maxlength="300" value="${safe(e.location)}"></label><label>Description<textarea name="description" maxlength="2000">${safe(e.description)}</textarea></label><div class="sqev-grid"><label>Starts<input type="datetime-local" name="starts" required value="${localDate(e.starts_at)}"></label><label>Ends<input type="datetime-local" name="ends" required value="${localDate(e.ends_at)}"></label></div><button class="sqev-primary" type="submit">Save changes</button></form>`;
  };
 }
 $('sqev-close').onclick=()=>{panel.hidden=true;document.body.style.overflow='';};
 const nav=document.createElement('button');nav.type='button';nav.id='sqev-nav';nav.className='sq-nav-link';
 nav.innerHTML='<span class="sq-nav-icon">◈</span><span class="sq-nav-label">Events</span>';
 const anchor=document.getElementById('sq-finance-nav');
 if(anchor)anchor.after(nav);else document.querySelector('.sidebar')?.append(nav);
 nav.onclick=async()=>{panel.hidden=false;document.body.style.overflow='hidden';message('');try{await load()}catch(e){message(e.message)}};
 const eventForm=$('sqev-form');
 const startField=eventForm.elements.starts,endField=eventForm.elements.ends;
 const minimumEnd=()=>{
  if(!startField.value)return;
  const start=new Date(startField.value);
  if(Number.isNaN(start.getTime()))return;
  const next=new Date(start.getTime()+3*60*60*1000);
  const local=new Date(next.getTime()-next.getTimezoneOffset()*60000).toISOString().slice(0,16);
  endField.min=startField.value;
  if(!endField.value || new Date(endField.value)<=start){endField.value=local;message('End time adjusted to three hours after the start.');}
 };
 startField.addEventListener('change',minimumEnd);
 startField.addEventListener('input',minimumEnd);
 $('sqev-form').onsubmit=async ev=>{
  ev.preventDefault();const f=ev.currentTarget.elements;
  const start=new Date(f.starts.value),end=new Date(f.ends.value);
  if(!f.starts.value || !f.ends.value || !Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())){message('Choose valid start and end dates.');return;}
  if(end<=start){message('The event must end after it starts. Change the end date or time.');endField.focus();return;}
  try{const e=await api('events','POST',{tracker_id:f.tracker_id.value,title:f.title.value,description:f.description.value,location:f.location.value,starts_at:start.toISOString(),ends_at:end.toISOString()});message('Event created.');f.title.value='';await load();await details(e.id)}
  catch(error){message(error.message)}
 };
 $('sqev-list').onclick=async ev=>{const b=ev.target.closest('[data-open]');if(b)try{await details(b.dataset.open)}catch(e){message(e.message)}};
 $('sqev-details').onclick=async ev=>{
  const b=ev.target.closest('button');if(!b||!selected)return;
  try{
   if(b.dataset.rsvp)await api('events/'+selected+'/rsvp','POST',{status:b.dataset.rsvp});
   else if(b.dataset.removeItem)await api('events/'+selected+'/schedule/'+b.dataset.removeItem,'DELETE');
   else if(b.dataset.unlink)await api('events/'+selected+'/expenses/'+b.dataset.unlink,'DELETE');
   else if(b.dataset.delete!==undefined){if(!confirm('Delete this event and its RSVP/schedule? Tracker expenses will remain.'))return;await api('events/'+selected,'DELETE');$('sqev-details').hidden=true;selected=null;await load();message('Event deleted.');return;}
   else return;
   message('Saved.');await details(selected);
  }catch(e){message(e.message)}
 };
 $('sqev-details').addEventListener('submit',async ev=>{
  if(!['sqev-edit','sqev-expense'].includes(ev.target.id))return;
  ev.preventDefault();const f=ev.target.elements;
  try{
   if(ev.target.id==='sqev-edit')await api('events/'+selected,'PATCH',{title:f.title.value,location:f.location.value,description:f.description.value,starts_at:new Date(f.starts.value).toISOString(),ends_at:new Date(f.ends.value).toISOString()});
   if(ev.target.id==='sqev-expense')await api('events/'+selected+'/expenses','POST',{entry_id:f.entry_id.value});
   message('Saved.');await details(selected);await load();
  }catch(error){message(error.message)}
 });
 $('sqev-details').onsubmit=async ev=>{if(ev.target.id!=='sqev-schedule')return;ev.preventDefault();const f=ev.target.elements;try{await api('events/'+selected+'/schedule','POST',{title:f.title.value,starts_at:new Date(f.starts.value).toISOString(),location:f.location.value});message('Schedule updated.');await details(selected)}catch(e){message(e.message)}};
}
