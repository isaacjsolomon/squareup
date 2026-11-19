/* DoWeo trip planning and transaction timeline: additive Finance Hub panel. */
(function(){
 'use strict';
 const root=document.getElementById('sq-nextgen'),tabs=root?.querySelector('.sq-ng-tabs'),shell=root?.querySelector('.sq-ng-shell');
 if(!root||!tabs||!shell||document.getElementById('dw-trip-plus-launch'))return;
 function toolsBar(){
  let host=document.getElementById('dw-finance-extras');
  if(!host){
   host=document.createElement('div');host.id='dw-finance-extras';host.setAttribute('aria-label','Additional finance tools');
   host.style.cssText='display:flex;flex-wrap:wrap;gap:9px;align-items:center;margin:10px 0 13px;max-width:100%;';
   tabs.after(host);
   host.addEventListener('click',event=>{
    const active=event.target.closest('button')?.id;
    const panels={'dw-planning-launch':'dw-planning-pane','dw-trip-plus-launch':'dw-trip-plus','dw-paylink-launch':'dw-paylink-pane'};
    for(const [launcher,panel] of Object.entries(panels)){
     if(launcher===active)continue;
     const el=document.getElementById(panel),button=document.getElementById(launcher);
     if(el)el.hidden=true;
     button?.setAttribute('aria-pressed','false');
    }
   });
  }
  return host;
 }
 const style=document.createElement('style');style.textContent=`
 #dw-trip-plus-launch{border:1px solid #487784;border-radius:12px;background:#12354a;color:#e9faff;min-height:44px;padding:10px 14px;font-weight:750;cursor:pointer}
 #dw-trip-plus-launch[aria-pressed=true]{background:#138781;border-color:#4ad5c2}
 #dw-trip-plus[hidden],#dw-trip-plus [hidden]{display:none!important}
 #dw-trip-plus{background:#0d2a3e;color:#f3feff;border:1px solid #426a7b;border-radius:19px;padding:19px;margin:16px 0;max-width:100%;box-sizing:border-box}
 #dw-trip-plus h2{font-size:22px;margin:0 0 8px;color:#f5ffff}
 #dw-trip-plus p{font-size:13px;line-height:1.5;color:#b1cbd6;margin:6px 0 14px}
 #dw-trip-plus .dw-trip-row{display:flex;gap:11px;align-items:center;flex-wrap:wrap;margin-bottom:10px}
 #dw-trip-plus label{display:flex;flex-direction:column;gap:5px;font-size:12px;color:#c0dce7;font-weight:750;flex:1;min-width:130px}
 #dw-trip-plus input,#dw-trip-plus select,#dw-trip-plus button{font:inherit;padding:10px 12px;min-height:43px;border-radius:11px;border:1px solid #426f80;background:#123649;color:#f2ffff;max-width:100%;box-sizing:border-box}
 #dw-trip-plus button{cursor:pointer;font-weight:750}
 #dw-trip-plus button.dw-trip-primary{background:#2ad4bf;color:#072e37;border-color:#2ad4bf}
 #dw-trip-plus button:disabled{opacity:.6;cursor:wait}
 #dw-trip-plus .dw-trip-list{display:grid;gap:9px;margin:13px 0}
 #dw-trip-plus .dw-trip-card{background:#153a4e;border:1px solid #365e70;border-radius:12px;padding:12px;overflow-wrap:anywhere}
 #dw-trip-plus .dw-trip-card strong{font-size:15px}
 #dw-trip-plus .dw-trip-card small{display:block;color:#aecbd6;font-size:12px;margin-top:6px}
 #dw-trip-plus .dw-trip-card a{color:#66e4d4}
 #dw-trip-budget-summary{background:#153a4e;border:1px solid #365e70;border-radius:12px;padding:12px;margin:12px 0;color:#effaff}
 #dw-trip-budget-summary p{margin:6px 0}
 #dw-trip-budget-summary small{color:#aecbd6}
 #dw-trip-plus .dw-trip-status{min-height:22px;color:#b8ecdf;font-size:12px}
 @media(max-width:700px){#dw-trip-plus{padding:13px;margin:12px 0}#dw-trip-plus .dw-trip-row>*{width:100%;flex:1 1 100%}}
 `;document.head.append(style);
 const launch=document.createElement('button');launch.id='dw-trip-plus-launch';launch.type='button';launch.textContent='Trip Planner & Activity';launch.setAttribute('aria-pressed','false');toolsBar().append(launch);
 const pane=document.createElement('section');pane.id='dw-trip-plus';pane.hidden=true;
 pane.innerHTML=`<div class="dw-trip-row"><h2>Trips & financial activity</h2><button id="dw-trip-close" type="button">Close</button></div>
 <div class="dw-trip-row"><label>Tracker<select id="dw-trip-tracker"></select></label><button type="button" id="dw-trip-tab" class="dw-trip-primary">Trip manager</button><button type="button" id="dw-activity-tab">Activity timeline</button></div>
 <section id="dw-trip-panel"><div class="dw-trip-row"><label>Trip<select id="dw-trip-selected"></select></label></div>
 <form id="dw-trip-create"><div class="dw-trip-row"><label>New trip name<input name="name" required maxlength="100" placeholder="Summer trip"></label><label>Start date<input name="date" type="date"></label></div><button type="submit" class="dw-trip-primary">Create trip</button></form>
 <div id="dw-trip-budget-summary" role="status" aria-live="polite" hidden></div>
 <div class="dw-trip-list" id="dw-trip-items"></div>
 <form id="dw-trip-add-item"><div class="dw-trip-row"><label>Item<input name="title" maxlength="120" required placeholder="Hotel reservation"></label><label>Type<select name="type"><option value="activity">Activity</option><option value="reservation">Reservation</option><option value="lodging">Lodging</option><option value="travel">Travel</option><option value="packing">Packing</option><option value="task">Task</option></select></label><label>Date<input name="date" type="date"></label><label>Estimated cost<input name="estimated_cost" type="number" min=".01" max="99999999" step=".01"></label></div><div class="dw-trip-row"><label>Notes<input name="notes" maxlength="500"></label><label>Reference link (HTTPS)<input name="link_url" type="url" maxlength="350" placeholder="https://"></label></div><button type="submit" class="dw-trip-primary">Add itinerary item</button></form></section>
 <section id="dw-activity-panel" hidden><p>Search saved personal and tracker transactions. This is an activity timeline, not yet a full edit/deletion audit log.</p><label>Search activity<input id="dw-activity-search" placeholder="Description or category"></label><div class="dw-trip-list" id="dw-activity-list"></div></section>
 <p class="dw-trip-status" id="dw-trip-status" role="status" aria-live="polite"></p>`;
 shell.append(pane);
 const $=id=>document.getElementById(id);
 const api=(path,method,body)=>{if(typeof window.squareUpApi!=='function')throw Error('Sign in to access planning.');return window.squareUpApi(path,method,body)};
 const status=text=>{$('dw-trip-status').textContent=text||''};
 const money=(n,c='USD')=>{try{return new Intl.NumberFormat(undefined,{style:'currency',currency:c}).format(Number(n)||0)}catch{return String(n)+' '+c}};
 const box=(name,info)=>{const card=document.createElement('div');card.className='dw-trip-card';const title=document.createElement('strong');title.textContent=name;const meta=document.createElement('small');meta.textContent=info||'';card.append(title,meta);return card};
 let mode='trips',items=[],busy=false,trackerCurrencies=new Map();
 function updateTripBudget(rows){
  const target=$('dw-trip-budget-summary');
  target.replaceChildren();
  if(!rows.length){target.hidden=true;return}
  const priced=rows.filter(x=>x.estimated_cost!=null&&x.estimated_cost!==''&&Number.isFinite(Number(x.estimated_cost))&&Number(x.estimated_cost)>=0);
  const total=priced.reduce((sum,x)=>sum+Math.round(Number(x.estimated_cost)*100),0)/100;
  const completed=priced.filter(x=>x.done).reduce((sum,x)=>sum+Math.round(Number(x.estimated_cost)*100),0)/100;
  const currency=trackerCurrencies.get(activeTracker())||'USD';
  const heading=document.createElement('strong');heading.textContent='Trip cost estimate';
  const amount=document.createElement('p');amount.textContent=money(total,currency)+' estimated · '+money(completed,currency)+' in completed items';
  const detail=document.createElement('small');detail.textContent=priced.length+' of '+rows.length+' items have estimates. These are planned costs, not confirmed spending.';
  target.append(heading,amount,detail);target.hidden=false;
 }
 function activeTracker(){return $('dw-trip-tracker').value}
 function activeTrip(){return $('dw-trip-selected').value}
 const toggle=next=>{mode=next;$('dw-trip-panel').hidden=mode!=='trips';$('dw-activity-panel').hidden=mode!=='activity';$('dw-trip-tab').classList.toggle('dw-trip-primary',mode==='trips');$('dw-activity-tab').classList.toggle('dw-trip-primary',mode==='activity');refresh()};
 $('dw-trip-tab').onclick=()=>toggle('trips');$('dw-activity-tab').onclick=()=>toggle('activity');
 $('dw-trip-close').onclick=()=>{pane.hidden=true;launch.setAttribute('aria-pressed','false');launch.focus()};
 tabs.addEventListener('click',event=>{if(event.target!==launch&&event.target.closest('button'))$('dw-trip-close').click()});
 async function loadTrackers(){
  const trackers=await api('trackers');const sel=$('dw-trip-tracker');sel.replaceChildren();
  trackerCurrencies=new Map((Array.isArray(trackers)?trackers:[]).map(t=>[String(t.id),/^[A-Z]{3}$/.test(String(t.currency||'USD'))?String(t.currency||'USD'):'USD']));
  for(const t of Array.isArray(trackers)?trackers:[]){const opt=document.createElement('option');opt.value=t.id;opt.textContent=t.name;sel.append(opt)}
 }
 async function loadTrips(){
  const sel=$('dw-trip-selected');const old=sel.value;sel.replaceChildren();
  if(!activeTracker())return;
  const trips=await api('finance-plus/trips?tracker_id='+encodeURIComponent(activeTracker()));
  for(const trip of trips){const opt=document.createElement('option');opt.value=trip.id;opt.textContent=trip.name+(trip.date?' · '+trip.date:'');sel.append(opt)}
  if(trips.some(t=>t.id===old))sel.value=old;
 }
 async function refresh(){
  if(pane.hidden)return;
  try{
   status('Loading…');
   if(!activeTracker()){status('Select a tracker.');return}
   if(mode==='trips'){
    await loadTrips();const list=$('dw-trip-items');list.replaceChildren();
    if(!activeTrip()){$('dw-trip-budget-summary').hidden=true;list.append(box('No trips yet','Create one above to start planning.'));status('');return}
    const rows=await api('finance-plus/trips/items?tracker_id='+encodeURIComponent(activeTracker())+'&trip_id='+encodeURIComponent(activeTrip()));
    updateTripBudget(rows);
    if(!rows.length)list.append(box('No itinerary items','Add an activity, task, reservation or packing item.'));
    for(const item of rows){
     const card=box(item.title,(item.type||'Item')+(item.date?' · '+item.date:'')+(item.estimated_cost?' · '+money(item.estimated_cost):''));
     if(item.notes){const note=document.createElement('p');note.textContent=item.notes;card.append(note)}
     if(item.link_url){const a=document.createElement('a');a.href=item.link_url;a.rel='noopener noreferrer';a.target='_blank';a.textContent='View reference';card.append(a)}
     const done=document.createElement('button');done.type='button';done.textContent=item.done?'Mark incomplete':'Mark complete';done.setAttribute('aria-label',done.textContent+' '+item.title);
     done.onclick=async()=>{done.disabled=true;try{await api('finance-plus/trips/items/'+item.id,'PATCH',{tracker_id:activeTracker(),trip_id:activeTrip(),done:!item.done});await refresh()}catch(e){status(e.message)}finally{done.disabled=false}};
     card.append(done);list.append(card);
    }
   }else{
    const data=await api('finance-plus/activity?tracker_id='+encodeURIComponent(activeTracker()));
    items=data.timeline||[];renderActivity();
   }
   status('');
  }catch(e){status(e.message||'Could not load trip or activity information.')}
 }
 function renderActivity(){
  const target=$('dw-activity-list');target.replaceChildren();
  const search=$('dw-activity-search').value.trim().toLowerCase();
  const shown=items.filter(item=>(item.description+' '+(item.category||'')+' '+item.kind).toLowerCase().includes(search));
  if(!shown.length)target.append(box('No matching activity','Try a different search.'));
  for(const item of shown.slice(0,150))target.append(box(item.description||item.kind,
   (item.source==='tracker'?'Tracker':'Personal')+' · '+money(item.amount,item.currency)+' · '+new Date(item.created_at).toLocaleDateString()+(item.payment_status?' · '+item.payment_status:'')));
 }
 $('dw-activity-search').addEventListener('input',renderActivity);
 $('dw-trip-tracker').onchange=refresh;
 $('dw-trip-selected').onchange=async()=>{const list=$('dw-trip-items');list.replaceChildren();await refresh()};
 async function submit(form,fn){if(busy)return;busy=true;const button=form.querySelector('[type=submit]');button.disabled=true;try{await fn();form.reset();await refresh();status('Saved successfully.')}catch(e){status(e.message||'Could not save.')}finally{busy=false;button.disabled=false}}
 $('dw-trip-create').onsubmit=function(event){event.preventDefault();submit(this,()=>api('finance-plus/trips','POST',{tracker_id:activeTracker(),name:this.elements.name.value,date:this.elements.date.value||null}))};
 $('dw-trip-add-item').onsubmit=function(event){event.preventDefault();submit(this,()=>api('finance-plus/trips/items','POST',{tracker_id:activeTracker(),trip_id:activeTrip(),title:this.elements.title.value,type:this.elements.type.value,date:this.elements.date.value||null,estimated_cost:this.elements.estimated_cost.value||null,notes:this.elements.notes.value,link_url:this.elements.link_url.value}))};
 launch.onclick=async()=>{pane.hidden=!pane.hidden;launch.setAttribute('aria-pressed',String(!pane.hidden));if(pane.hidden)return;try{await loadTrackers();await refresh()}catch(e){status(e.message||'Could not load trackers.')}};
})();

/* Desktop-only categories for the existing Trackers gallery. */
(function(){
 'use strict';
 const desktop=window.matchMedia('(min-width:901px)');
 const page=document.getElementById('trackers-page');
 const nav=page?.querySelector('.dw-section-tabs[aria-label="Tracker sections"]');
 const gallery=document.getElementById('trackers-gallery');
 if(!page||!nav||!gallery||nav.dataset.gallerySwitcher)return;
 nav.dataset.gallerySwitcher='true';
 let active='all',loaded=false,busy=false,groups={trip:new Set(),household:new Set()},queued=false;
 const buttons=[...nav.querySelectorAll('button[data-dw-section]')];
 buttons.forEach(button=>{
  button.dataset.galleryCategory=button.dataset.dwSection==='trackers'?'all':button.dataset.dwSection==='home'?'household':'trip';
  button.removeAttribute('data-dw-section'); // Avoid legacy Finance Hub navigation.
 });
 const style=document.createElement('style');style.id='dw-desktop-trackers-switcher';
 style.textContent=[
 '@media(min-width:901px){',
 'body.trackers-view:not(.sq-bills-open) #trackers-page>.dw-section-tabs[aria-label="Tracker sections"]{display:flex!important;visibility:visible!important;opacity:1!important;position:relative!important;z-index:5!important;gap:7px!important;margin:0 0 20px!important;padding:6px!important;width:100%!important;background:#10293c!important;border:1px solid #365b6c!important;border-radius:14px!important;box-sizing:border-box!important}',
 '#trackers-page>.dw-section-tabs[aria-label="Tracker sections"] button{display:block!important;flex:1!important;min-height:46px!important;border:0!important;border-radius:10px!important;font:inherit!important;font-weight:750!important;background:transparent!important;color:#d3e5ef!important;cursor:pointer!important}',
 '#trackers-page>.dw-section-tabs[aria-label="Tracker sections"] button[aria-pressed="true"]{color:#062d38!important;background:#37ddc1!important;box-shadow:0 3px 12px #002b3a44!important}',
 '#dw-gallery-category-status{font-size:14px;color:#d3e5ef;margin:0 0 14px}',
 '#dw-gallery-category-status[hidden]{display:none!important}',
 '}',
 '@media(max-width:900px){#dw-gallery-category-status{display:none!important}#trackers-page>.dw-section-tabs[aria-label="Tracker sections"]{display:none!important}}'
 ].join('\n');
 document.head.append(style);
 const status=document.createElement('p');status.id='dw-gallery-category-status';status.hidden=true;status.setAttribute('role','status');status.setAttribute('aria-live','polite');nav.after(status);
 function ids(rows){return (Array.isArray(rows)?rows:[]).map(row=>String(row?.tracker_id||'')).filter(Boolean)}
 async function loadGroups(){
  if(busy||typeof window.squareUpApi!=='function')return;
  busy=true;status.textContent='Loading categories…';
  try{
   const [tripLinks,homeLinks,tripPlans,homePlans]=await Promise.all([
    window.squareUpApi('finance/workspace-links?type=trip'),
    window.squareUpApi('finance/workspace-links?type=household'),
    window.squareUpApi('finance/workspace?type=trip'),
    window.squareUpApi('finance/workspace?type=household')
   ]);
   groups={trip:new Set([...ids(tripLinks),...ids(tripPlans)]),household:new Set([...ids(homeLinks),...ids(homePlans)])};loaded=true;
  }catch(error){loaded=false;status.textContent='Categories could not be loaded. All Trackers is still available.'}
  finally{busy=false;apply()}
 }
 function groupFor(card){
  const id=card.dataset.trackerId||'',name=card.querySelector('h3')?.textContent||'';
  let template=-1;try{const raw=localStorage.getItem('sq_tracker_template_'+id);if(raw!==null&&raw!=='')template=Number(raw)}catch(_){}
  return {
   trip:groups.trip.has(id)||[1,2,3,5].includes(template),
   household:groups.household.has(id)||[0,4].includes(template)||/\b(household|roommates?|housemates?|apartment|home bills?|home expenses?|shared living)\b/i.test(name)
  };
 }
 function apply(){
  if(!desktop.matches)return;
  buttons.forEach(button=>{const yes=button.dataset.galleryCategory===active;button.setAttribute('aria-pressed',String(yes));if(yes)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current')});
  let count=0;
  for(const card of gallery.querySelectorAll(':scope > .tracker-tile')){
   const match=active==='all'||groupFor(card)[active];
   card.hidden=!match;card.style.display=match?'':'none';if(match)count++;
  }
  const create=gallery.querySelector(':scope > .sq-create-tracker-row');
  const archive=gallery.querySelector(':scope > .sq-archive-toggle');
  if(create)create.hidden=active!=='all';
  if(archive)archive.hidden=active!=='all';
  if(active!=='all'){const archived=gallery.querySelector(':scope > .sq-archived-wrap');if(archived)archived.hidden=true}
  status.hidden=active==='all';
  if(active==='all'){status.textContent='';return}
  if(!loaded){if(busy)status.textContent='Loading categories…';else status.textContent='Categories unavailable. Choose All Trackers.';return}
  status.textContent=count?count+' '+(active==='trip'?'trip':'household')+' tracker'+(count===1?'':'s'):'No '+(active==='trip'?'trips':'households')+' yet. Create or link one in the existing workspace tools.';
 }
 nav.addEventListener('click',event=>{
  const button=event.target.closest('button[data-gallery-category]');
  if(!button||!desktop.matches)return;
  event.stopPropagation();active=button.dataset.galleryCategory;apply();
  if(active!=='all'&&!loaded&&!busy)loadGroups();
 });
 new MutationObserver(()=>{if(queued)return;queued=true;queueMicrotask(()=>{queued=false;apply()})}).observe(gallery,{childList:true});
 desktop.addEventListener('change',()=>{
  if(desktop.matches){active='all';apply();return}
  for(const card of gallery.querySelectorAll(':scope > .tracker-tile')){card.hidden=false;card.style.display=''}
  for(const selector of [':scope > .sq-create-tracker-row',':scope > .sq-archive-toggle'])gallery.querySelector(selector)?.removeAttribute('hidden');
 });
 document.getElementById('nav-trackers')?.addEventListener('click',()=>{if(desktop.matches){active='all';loaded=false;apply()}});
 apply();
})();
