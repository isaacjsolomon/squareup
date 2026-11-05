// SquareUp Events client. Uses the existing signed-in API client.
export function initEvents({api,getTrackers}){
 const css=document.createElement('style');
 css.textContent=`
 #sqev-view{position:fixed;z-index:10010;inset:0;background:#071827f5;overflow:auto;padding:28px 18px;color:#e7f8fb;font:15px system-ui}
 #sqev-view[hidden]{display:none!important}#sqev-view .sqev-shell{max-width:1060px;margin:auto}
 #sqev-view h2{font-size:30px;color:#f3ffff;margin:0}#sqev-view h3{margin:0 0 10px;color:#fff}
 #sqev-view .sqev-toolbar{display:flex;justify-content:space-between;gap:15px;align-items:center;margin-bottom:20px}
 #sqev-view .sqev-box{border:1px solid #31576a;border-radius:18px;padding:20px;margin:14px 0;background:#102e42}
 #sqev-view input,#sqev-view select,#sqev-view textarea{width:100%;background:#092235;color:#fff;border:1px solid #497083;border-radius:10px;padding:11px;font:inherit;min-width:0}
 #sqev-view label{display:block;margin:8px 0;font-weight:600}#sqev-view .sqev-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
 #sqev-view button{border:1px solid #3b7582;border-radius:10px;padding:11px 16px;background:#164357;color:#fff;cursor:pointer;font-weight:650}
 #sqev-view button.sqev-primary{background:#25c9af;color:#062b31;border-color:#25c9af}
 #sqev-view .sqev-muted{color:#bdd2dd}#sqev-view .sqev-item{border:1px solid #35596b;padding:16px;border-radius:13px;margin:12px 0;background:#0b283d}
 #sqev-view .sqev-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}
 #sqev-view #sqev-message{min-height:24px;color:#70e6d5}
 @media(max-width:650px){#sqev-view{padding:18px 12px}#sqev-view .sqev-grid{grid-template-columns:1fr}#sqev-view h2{font-size:24px}}
 `;
 document.head.append(css);
 const panel=document.createElement('section');
 panel.id='sqev-view';panel.hidden=true;
 panel.innerHTML=`<div class="sqev-shell"><div class="sqev-toolbar"><div><small class="sqev-muted">SQUAREUP · SHARED EVENTS</small><h2>Events</h2></div><button id="sqev-close" type="button">Close</button></div>
 <div class="sqev-box"><h3>Plan an event</h3><form id="sqev-form">
 <div class="sqev-grid"><label>Tracker<select name="tracker_id" required></select></label><label>Event name<input name="title" maxlength="120" required placeholder="Movie night, team dinner..."></label>
 <label>Starts<input type="datetime-local" name="starts" required></label><label>Ends<input type="datetime-local" name="ends" required></label></div>
 <label>Location<input name="location" maxlength="300" placeholder="Optional"></label>
 <label>Description<textarea name="description" rows="2" maxlength="2000"></textarea></label>
 <button class="sqev-primary" type="submit">Create event</button></form><p id="sqev-message" role="status"></p></div>
 <div class="sqev-box"><h3>Upcoming and past events</h3><div id="sqev-list"></div></div>
 <div class="sqev-box" id="sqev-details" hidden></div></div>`;
 document.body.append(panel);
 const $=id=>panel.querySelector('#'+id),message=t=>{$('sqev-message').textContent=t};
 const safe=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const date=v=>new Date(v).toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short'});
 let selected=null;
 async function load(){
  const trackers=getTrackers()||[], select=$('sqev-form').elements.tracker_id;
  select.innerHTML=trackers.map(t=>`<option value="${safe(t.id)}">${safe(t.name)}</option>`).join('');
  if(!trackers.length){$('sqev-list').textContent='Create or join a tracker first.';return;}
  const all=await Promise.all(trackers.map(async t=>{
   try{return (await api('events?tracker_id='+encodeURIComponent(t.id))).map(e=>({...e,tracker_name:t.name}))}
   catch{return []}
  }));
  const events=all.flat().sort((a,b)=>new Date(a.starts_at)-new Date(b.starts_at));
  $('sqev-list').innerHTML=events.length?events.map(e=>`<div class="sqev-item"><strong>${safe(e.title)}</strong> <small class="sqev-muted">· ${safe(e.tracker_name)}</small><p>${safe(date(e.starts_at))} – ${safe(date(e.ends_at))}</p><p>${safe(e.location)}</p><button data-open="${safe(e.id)}">Details / RSVP</button></div>`).join(''):'No events yet. Create your first event above.';
 }
 async function details(id){
  const data=await api('events/'+encodeURIComponent(id)),e=data.event;selected=id;
  const myId=(window.squareUpCurrentUserId||'');
  $('sqev-details').hidden=false;
  $('sqev-details').innerHTML=`<h3>${safe(e.title)}</h3><p>${safe(e.description)}</p><p>${safe(e.location)} · ${safe(date(e.starts_at))}</p>
   <h3>RSVP</h3><div class="sqev-actions"><button data-rsvp="going">Going</button><button data-rsvp="maybe">Maybe</button><button data-rsvp="declined">Declined</button></div>
   <p class="sqev-muted">${data.rsvps.length} responses · ${data.rsvps.filter(r=>r.status==='going').length} going</p>
   <h3>Schedule</h3>${data.schedule.length?data.schedule.sort((a,b)=>new Date(a.starts_at)-new Date(b.starts_at)).map(i=>`<div class="sqev-item"><strong>${safe(i.title)}</strong> · ${safe(date(i.starts_at))}<p>${safe(i.location)} ${safe(i.notes)}</p></div>`).join(''):'<p>No schedule items yet.</p>'}
   <form id="sqev-schedule"><div class="sqev-grid"><label>Activity<input name="title" required></label><label>Time<input name="starts" type="datetime-local" required></label></div><label>Location<input name="location"></label><button type="submit">Add schedule item (organizer)</button></form>
   <h3>Linked expenses</h3><p>${data.expenses.length} expenses linked to this event.</p>`;
 }
 $('sqev-close').onclick=()=>{panel.hidden=true;document.body.style.overflow='';};
 const nav=document.createElement('button');nav.type='button';nav.id='sqev-nav';nav.className='sq-nav-link';
 nav.innerHTML='<span class="sq-nav-icon">◈</span><span class="sq-nav-label">Events</span>';
 const anchor=document.getElementById('sq-finance-nav');
 if(anchor)anchor.after(nav);else document.querySelector('.sidebar')?.append(nav);
 nav.onclick=async()=>{panel.hidden=false;document.body.style.overflow='hidden';message('');try{await load()}catch(e){message(e.message)}};
 $('sqev-form').onsubmit=async ev=>{
  ev.preventDefault();const f=ev.currentTarget.elements;
  try{const e=await api('events','POST',{tracker_id:f.tracker_id.value,title:f.title.value,description:f.description.value,location:f.location.value,starts_at:new Date(f.starts.value).toISOString(),ends_at:new Date(f.ends.value).toISOString()});message('Event created.');f.title.value='';await load();await details(e.id)}
  catch(error){message(error.message)}
 };
 $('sqev-list').onclick=async ev=>{const b=ev.target.closest('[data-open]');if(b)try{await details(b.dataset.open)}catch(e){message(e.message)}};
 $('sqev-details').onclick=async ev=>{const b=ev.target.closest('[data-rsvp]');if(b&&selected)try{await api('events/'+selected+'/rsvp','POST',{status:b.dataset.rsvp});message('RSVP saved.');await details(selected)}catch(e){message(e.message)}};
 $('sqev-details').onsubmit=async ev=>{if(ev.target.id!=='sqev-schedule')return;ev.preventDefault();const f=ev.target.elements;try{await api('events/'+selected+'/schedule','POST',{title:f.title.value,starts_at:new Date(f.starts.value).toISOString(),location:f.location.value});message('Schedule updated.');await details(selected)}catch(e){message(e.message)}};
}
