import {initBetaFeedback} from './beta-feedback.js';
// DoWeo Events client. Uses the existing signed-in API client.
export function initEvents({api,getTrackers,getUser}){
 initBetaFeedback({api,getUser});
 const css=document.createElement('style');
 css.textContent=`
 body.sqev-page-open .wrap > :not(#sqev-view){display:none!important}
 body.sqev-page-open .wrap{max-width:1500px!important;width:100%!important}
 #sqev-view{display:block;width:100%;position:relative;z-index:1;background:transparent;overflow:visible;padding:20px 8px 70px;color:#F3F8FC;font:14px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
 #sqev-view[hidden],#sqev-view [hidden]{display:none!important}
 #sqev-view .sqev-shell{max-width:1320px;margin:0 auto}
 #sqev-view *{box-sizing:border-box}
 #sqev-view .sqev-eyebrow{font-size:11px;font-weight:800;letter-spacing:.17em;text-transform:uppercase;color:#ABC6D7}
 #sqev-view h2{font-size:clamp(28px,3.2vw,39px);color:#F3F8FC;margin:4px 0 5px;letter-spacing:-.045em;line-height:1.14}
 #sqev-view h3{font-size:18px;margin:0 0 15px;color:#F3F8FC;letter-spacing:-.015em}
 #sqev-view .sqev-toolbar{display:flex;justify-content:space-between;align-items:center;gap:20px;flex-wrap:wrap;padding:12px 0 25px}
 #sqev-view .sqev-subtitle{color:#ABC6D7;font-size:14px;margin:0}
 #sqev-view .sqev-toolbar-actions{display:flex;gap:9px;align-items:center}
 #sqev-view .sqev-box{border:1px solid color-mix(in srgb, #ABC6D7 24%, transparent);border-radius:19px;padding:24px;margin:0;background:linear-gradient(140deg,#102B40,#102B40);box-shadow:0 12px 30px color-mix(in srgb, #0A1B2E 12%, transparent)}
 #sqev-view .sqev-overview{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin-bottom:24px}
 #sqev-view .sqev-stat{border:1px solid color-mix(in srgb, #ABC6D7 19%, transparent);background:#102B40;border-radius:16px;padding:20px}
 #sqev-view .sqev-stat strong{display:block;color:#F3F8FC;font-size:29px;font-weight:780;letter-spacing:-.045em;margin-top:5px}
 #sqev-view .sqev-stat span{font-size:12px;color:#ABC6D7;font-weight:600}
 #sqev-view .sqev-layout{display:grid;grid-template-columns:minmax(0,1fr);gap:20px}
 #sqev-view .sqev-headrow{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:16px}
 #sqev-view .sqev-headrow h3{margin:0}
 #sqev-view .sqev-box p{line-height:1.5}
 #sqev-view label{display:grid;gap:7px;margin:10px 0;font-weight:650;font-size:12px;color:#ABC6D7}
 #sqev-view .sqev-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px 16px}
 #sqev-view input,#sqev-view select,#sqev-view textarea{width:100%;min-width:0;background:#0A1B2E;color:#F3F8FC;border:1px solid #355E72;border-radius:11px;padding:12px 13px;font:inherit;min-height:44px;color-scheme:dark;outline:none}
 #sqev-view input:focus,#sqev-view select:focus,#sqev-view textarea:focus{border-color:#ABC6D7;box-shadow:0 0 0 3px color-mix(in srgb, #ABC6D7 12%, transparent)}
 #sqev-view textarea{resize:vertical}
 #sqev-view button{border:1px solid #355E72;border-radius:11px;padding:10px 16px;background:#173750;color:#F3F8FC;cursor:pointer;font-size:13px;font-weight:700;min-height:42px;transition:background .16s,border-color .16s}
 #sqev-view button:hover{background:#204158;border-color:#ABC6D7}
 #sqev-view button.sqev-primary{background:#ABC6D7;color:#0A1B2E;border-color:#ABC6D7}
 #sqev-view button.sqev-primary:hover{background:#ABC6D7}
 #sqev-view .sqev-muted{color:#ABC6D7}
 #sqev-view .sqev-item{border:1px solid color-mix(in srgb, #ABC6D7 22%, transparent);padding:18px 20px;border-radius:15px;background:#102B40}
 #sqev-view .sqev-item:hover{border-color:color-mix(in srgb, #ABC6D7 46%, transparent)}
 #sqev-view .sqev-events-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
 #sqev-view .sqev-item h4{font-size:19px;line-height:1.3;letter-spacing:-.025em;margin:10px 0 5px;color:#F3F8FC}
 #sqev-view .sqev-item p{margin:7px 0;color:#ABC6D7;font-size:13px}
 #sqev-view .sqev-pill{display:inline-flex;border:1px solid color-mix(in srgb, #ABC6D7 25%, transparent);color:#ABC6D7;background:color-mix(in srgb, #355E72 9%, transparent);border-radius:100px;padding:4px 9px;font-size:11px;font-weight:700}
 #sqev-view .sqev-event-date{color:#ABC6D7;font-weight:700;font-size:13px}
 #sqev-view .sqev-item-footer{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-top:16px}
 #sqev-view .sqev-actions{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0 22px}
 #sqev-view .sqev-details-grid{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(280px,.8fr);gap:18px;align-items:start}
 #sqev-view .sqev-details-grid>.sqev-box{min-width:0}
 #sqev-view .sqev-manage-wide{width:100%;margin-top:18px;min-width:0;min-height:190px}
 #sqev-view .sqev-section-title{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:14px;padding-bottom:12px;border-bottom:1px solid color-mix(in srgb, #ABC6D7 15%, transparent)}
 #sqev-view .sqev-section-title h3{margin:0}
 #sqev-view .sqev-empty{border:1px dashed #355E72;border-radius:15px;text-align:center;padding:46px 20px;color:#ABC6D7}
 #sqev-view #sqev-message{min-height:20px;color:#ABC6D7;font-size:13px;margin:12px 0 0}
 #sqev-view .sqev-back{margin-bottom:14px}
 #sqev-view .sqev-detail-heading{padding:5px 0 22px}
 #sqev-view .sqev-details-grid .sqev-box{margin-bottom:18px}
 #sqev-view .sqev-event-meta{display:flex;gap:10px;flex-wrap:wrap;font-size:13px;color:#ABC6D7;margin-top:13px}
 #sqev-view .sqev-event-meta span{padding:8px 12px;border:1px solid color-mix(in srgb, #ABC6D7 23%, transparent);background:#102B40;border-radius:9px}
 #sqev-view .sqev-rsvp-button.active{background:#355E72;color:#102B40;border-color:#355E72}
 #sqev-view .sqev-new-expense{border-color:#355E72;background:linear-gradient(135deg,#102B40,#102B40)}
 #sqev-view .sqev-new-expense>summary{background:#355E72;color:#102B40;font-size:15px;font-weight:800;min-height:52px;display:flex;align-items:center;justify-content:space-between;gap:8px}
 #sqev-view .sqev-new-expense>summary:after{content:'+';font-size:23px;color:#102B40;line-height:1}
 #sqev-view .sqev-new-expense[open]>summary:after{content:'−'}
 #sqev-view .sqev-new-expense>form{padding:15px}
 #sqev-view .sqev-new-expense button[type=submit]{width:100%;min-height:48px;margin-top:10px}

 body.sqev-page-open{background:linear-gradient(125deg,#0A1B2E,#102B40 65%,#0A1B2E)!important}
 #sqev-view .sqev-hero{border-radius:22px;background:linear-gradient(120deg,#173750,#102B40);background-size:cover;background-position:center;min-height:190px;display:flex;align-items:flex-end;position:relative;overflow:hidden;margin-bottom:20px;border:1px solid color-mix(in srgb, #ABC6D7 30%, transparent)}
 #sqev-view .sqev-hero:before{content:'';position:absolute;inset:0;background:linear-gradient(0deg,color-mix(in srgb, #0A1B2E 96%, transparent),color-mix(in srgb, #0A1B2E 12%, transparent))}
 #sqev-view .sqev-hero-content{position:relative;z-index:1;padding:28px;width:100%}
 #sqev-view .sqev-hero h2{font-size:clamp(32px,4vw,48px)}
 #sqev-view .sqev-hero .sqev-subtitle{color:#F3F8FC}
 #sqev-view .sqev-timeline{border-left:2px solid #355E72;padding-left:22px;margin-left:8px;display:grid;gap:12px}
 #sqev-view .sqev-timeline .sqev-item{position:relative}
 #sqev-view .sqev-timeline .sqev-item:before{content:'';width:11px;height:11px;background:#ABC6D7;border-radius:50%;position:absolute;left:-29px;top:21px}
 #sqev-view .sqev-guest-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:9px}
 #sqev-view .sqev-guest{display:flex;align-items:center;gap:9px;background:#102B40;border:1px solid #355E72;padding:10px;border-radius:12px;font-size:12px}
 #sqev-view .sqev-avatar{width:31px;height:31px;border-radius:50%;background:#355E72;display:grid;place-items:center;font-weight:800;flex:none}
 #sqev-view .sqev-guest small{display:block;color:#ABC6D7}
 #sqev-view .sqev-task{display:flex;gap:10px;align-items:center;justify-content:space-between;border-bottom:1px solid #355E72;padding:11px 0}
 #sqev-view .sqev-task input[type=checkbox]{width:20px;min-height:20px;flex:none;cursor:pointer}
 #sqev-view .sqev-task-main{flex:1;min-width:0}
 #sqev-view .sqev-task.done .sqev-task-main{text-decoration:line-through;opacity:.64}
 #sqev-view .sqev-small-actions{display:flex;gap:7px;flex-wrap:wrap}
 #sqev-view .sqev-metric{font-size:24px;font-weight:800;color:#ABC6D7;margin:5px 0}
 #sqev-view .sqev-box+.sqev-box{margin-top:16px}
 @media(max-width:680px){#sqev-view .sqev-hero{min-height:165px}#sqev-view .sqev-hero-content{padding:20px}}

 /* Mobile-first Events: compact navigation, stacked cards, usable forms and native-safe controls */
 #sqev-view .sqev-mobile-sections{display:none}
 #sqev-view .sqev-collapsible{margin-top:14px;border:1px solid #355E72;background:#102B40;border-radius:13px;overflow:hidden}
 #sqev-view .sqev-collapsible>summary{padding:14px 16px;font-weight:750;color:#ABC6D7;cursor:pointer;list-style:none}
 #sqev-view .sqev-collapsible>summary::-webkit-details-marker{display:none}
 #sqev-view .sqev-collapsible>summary:after{content:'＋';float:right}
 #sqev-view .sqev-collapsible[open]>summary:after{content:'−'}
 #sqev-view .sqev-collapsible>form{padding:0 14px 15px}
 #sqev-view .sqev-status{position:sticky;bottom:calc(env(safe-area-inset-bottom) + 12px);z-index:15;background:#173750;color:#F3F8FC;border:1px solid #ABC6D7;border-radius:12px;padding:12px;box-shadow:0 8px 25px color-mix(in srgb, #0A1B2E 53.3%, transparent)}
 #sqev-view .sqev-status:empty{display:none}
 #sqev-view button:disabled{opacity:.55;cursor:wait}
 @media(max-width:900px){
  body.sqev-page-open{overflow-x:hidden!important}
  #sqev-view{padding:10px 10px calc(95px + env(safe-area-inset-bottom));width:100%;min-width:0}
  #sqev-view .sqev-shell{width:100%;max-width:100%;min-width:0}
  #sqev-view .sqev-toolbar{padding:8px 0 15px;align-items:flex-start}
  #sqev-view .sqev-toolbar h2{font-size:28px}
  #sqev-view .sqev-toolbar-actions{width:auto}
  #sqev-view .sqev-toolbar-actions button{min-height:44px;padding:9px 12px}
  #sqev-view .sqev-overview{grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-bottom:15px}
  #sqev-view .sqev-stat{padding:12px 9px}
  #sqev-view .sqev-stat strong{font-size:23px}
  #sqev-view .sqev-stat span{font-size:11px}
  #sqev-view .sqev-events-grid,#sqev-view .sqev-details-grid{display:grid;grid-template-columns:minmax(0,1fr);gap:12px}
  #sqev-view .sqev-hero{min-height:150px;border-radius:17px;margin-bottom:12px}
  #sqev-view .sqev-hero-content{padding:18px}
  #sqev-view .sqev-hero h2{font-size:clamp(26px,7vw,36px);overflow-wrap:anywhere}
  #sqev-view .sqev-event-meta{gap:7px}
  #sqev-view .sqev-event-meta span{font-size:12px;padding:8px}
  #sqev-view .sqev-box{padding:16px;border-radius:15px;overflow:hidden}
  #sqev-view .sqev-details-grid .sqev-box{margin:0}
  #sqev-view .sqev-details-grid>div{display:contents}
  #sqev-view .sqev-details-grid .sqev-box,#sqev-view .sqev-manage-wide{width:100%;min-width:0;margin:0;min-height:0}
  #sqev-view .sqev-grid{grid-template-columns:minmax(0,1fr)}
  #sqev-view input,#sqev-view textarea,#sqev-view select{font-size:16px;max-width:100%}
  #sqev-view .sqev-actions button{flex:1 1 auto;min-width:0;min-height:44px}
  #sqev-view .sqev-item{padding:13px}
  #sqev-view .sqev-task{align-items:flex-start}
  #sqev-view .sqev-guest-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
  #sqev-view .sqev-mobile-sections{display:flex;overflow-x:auto;gap:8px;scrollbar-width:none;-webkit-overflow-scrolling:touch;margin:5px 0 14px;padding-bottom:4px}
  #sqev-view .sqev-mobile-sections button{flex:0 0 auto;white-space:nowrap;padding:9px 14px;min-height:43px;border-radius:12px}
  #sqev-view .sqev-mobile-sections button.active{background:#ABC6D7;color:#0A1B2E;border-color:#ABC6D7}
  #sqev-view .sqev-details-grid .sqev-box[data-ev-section],#sqev-view .sqev-manage-wide[data-ev-section]{display:none}
  #sqev-view .sqev-details-grid .sqev-box[data-ev-section].sqev-show,#sqev-view .sqev-manage-wide[data-ev-section].sqev-show{display:block}
  #sqev-view .sqev-form-actions button,#sqev-view .sqev-collapsible button[type=submit]{width:100%;min-height:46px}
 }
 #sqev-view .sqev-form-actions{display:flex;justify-content:flex-end;margin-top:16px}
 @media(max-width:980px){#sqev-view .sqev-details-grid{grid-template-columns:1fr}}
 @media(max-width:680px){#sqev-view{padding:14px 0 95px}#sqev-view .sqev-toolbar{padding:6px 0 18px}#sqev-view .sqev-box{padding:17px;border-radius:15px}#sqev-view .sqev-overview{gap:8px}#sqev-view .sqev-stat{padding:12px}#sqev-view .sqev-stat strong{font-size:22px}#sqev-view .sqev-stat span{font-size:11px}#sqev-view .sqev-events-grid,#sqev-view .sqev-grid{grid-template-columns:1fr}#sqev-view .sqev-item{padding:16px}#sqev-view .sqev-toolbar-actions{width:100%}#sqev-view .sqev-toolbar-actions button{flex:1}}

 @media(max-width:900px){
  #sqev-view .sqev-mobile-sections{position:sticky;top:0;z-index:20;background:#0A1B2E;padding:10px 4px;border-radius:12px;margin:0 0 14px;box-shadow:0 8px 20px color-mix(in srgb, #0A1B2E 26.7%, transparent)}
  #sqev-view .sqev-mobile-sections button{font-size:13px}
  #sqev-view .sqev-details-grid{display:block}
  #sqev-view .sqev-details-grid .sqev-box[data-ev-section]:not(.sqev-show),#sqev-view .sqev-manage-wide[data-ev-section]:not(.sqev-show){display:none!important}
  #sqev-view .sqev-details-grid .sqev-box[data-ev-section].sqev-show,#sqev-view .sqev-manage-wide[data-ev-section].sqev-show{display:block!important;margin-bottom:12px}
  #sqev-view .sqev-guest-grid{grid-template-columns:minmax(0,1fr)}
  #sqev-view .sqev-task button{flex:none}
  #sqev-view .sqev-toolbar-actions{display:flex;flex-wrap:wrap}
  #sqev-view .sqev-toolbar-actions button{flex:1}
  #sqev-view .sqev-status{position:sticky;bottom:calc(75px + env(safe-area-inset-bottom));z-index:25}
 }
 `
 document.head.append(css);
 const panel=document.createElement('section');
 panel.id='sqev-view';panel.hidden=true;
 panel.innerHTML=`<div class="sqev-shell">
 <div class="sqev-toolbar"><div><span class="sqev-eyebrow">DOWEO / EVENT PLANNING</span><h2>Events</h2><p class="sqev-subtitle">Plan together, organize the details, and stay on top of shared expenses.</p></div>
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
 <div id="sqev-mobile-sections" class="sqev-mobile-sections" aria-label="Event sections"></div><div id="sqev-details"></div>
 </div><p id="sqev-message" role="status" aria-live="polite"></p>
 </div>`;
 (document.querySelector('.wrap')||document.body).append(panel);
 const $=id=>panel.querySelector('#'+id),message=t=>{$('sqev-message').textContent=t;const el=$('sqev-message');el.classList.toggle('sqev-status',!!t);if(t)el.scrollIntoView({block:'nearest'});};
 const safe=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const date=v=>new Date(v).toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short'});
 const localDate=v=>{const d=new Date(v);return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16)};
 let selected=null,activeSection='schedule',busy=false;
 function setEventSection(section){
  activeSection=section;
  $('sqev-mobile-sections').querySelectorAll('[data-section]').forEach(b=>{const on=b.dataset.section===section;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on))});
  $('sqev-details').querySelectorAll('[data-ev-section]').forEach(el=>el.classList.toggle('sqev-show',el.dataset.evSection===section));
 }
 $('sqev-mobile-sections').addEventListener('click',ev=>{const b=ev.target.closest('[data-section]');if(b)setEventSection(b.dataset.section)});
 async function saveEventAction(button,work,success='Saved.'){
  if(busy)return;busy=true;
  if(button)button.disabled=true;
  try{await work();message(success);await details(selected)}
  catch(error){message(error.message||'Could not save. Please try again.')}
  finally{busy=false;if(button?.isConnected)button.disabled=false}
 }

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
   <div class="sqev-hero" ${e.cover_url?'style="background-image:url(&quot;'+safe(e.cover_url)+'&quot;)"':''}>
    <div class="sqev-hero-content">
     <span class="sqev-eyebrow">DOWEO / EVENT DETAILS</span><h2>${safe(e.title)}</h2>
     <p class="sqev-subtitle">${safe(e.description||'Plan together, enjoy the event.')}</p>
     <div class="sqev-event-meta">
      <span>◷ ${safe(date(e.starts_at))} – ${safe(date(e.ends_at))}</span>
      <span>⌖ ${safe(e.location||'Location not set')}</span>
     </div>
     
    </div>
   </div>
   <div class="sqev-details-grid">
    <div>
     <section class="sqev-box" data-ev-section="schedule"><div class="sqev-section-title"><h3>Schedule</h3><span class="sqev-muted">${data.schedule.length} activities</span></div>
     <div class="sqev-timeline">${data.schedule.length?data.schedule.sort((a,b)=>new Date(a.starts_at)-new Date(b.starts_at)).map(i=>`<div class="sqev-item"><strong>${safe(i.title)}</strong><p>${safe(date(i.starts_at))}</p><p>${safe(i.location)} ${safe(i.notes)}</p>${own?`<div class="sqev-small-actions"><button type="button" data-edit-item="${safe(i.id)}">Edit</button><button type="button" data-remove-item="${safe(i.id)}">Remove</button></div>`:''}</div>`).join(''):'<p class="sqev-muted">No scheduled activities yet.</p>'}</div><div id="sqev-schedule-edit"></div>
     ${own?`<details class="sqev-collapsible"><summary>Add activity</summary><form id="sqev-schedule"><h3 style="margin-top:12px">New activity</h3><div class="sqev-grid"><label>Activity name<input name="title" required></label><label>Date and time<input name="starts" type="datetime-local" required></label></div><label>Location<input name="location" placeholder="Optional"></label><button type="submit">Add to schedule</button></form></details>`:''}
     </section>
     <section class="sqev-box" data-ev-section="expenses"><div class="sqev-section-title"><h3>Event expenses</h3><span class="sqev-muted">${data.expenses.length} linked</span></div>
     <div class="sqev-metric">${safe(tracker.currency||'USD')} ${data.expenses.reduce((a,x)=>a+(x.type==='debt'?Number(x.amount)||0:0),0).toFixed(2)}</div><p class="sqev-muted">Total linked expenses · Debts and payments continue to use tracker balances and approvals.</p>
     <details class="sqev-collapsible sqev-new-expense"><summary>＋ Add Expense</summary>
      <form id="sqev-new-expense">
       <p class="sqev-muted">Add an expense directly to this event's tracker. Normal approval rules still apply.</p>
       <div class="sqev-grid">
        <label>Who owes<select name="from" required><option value="">Choose member</option>${(tracker.members||[]).map(m=>`<option value="${safe(m.name)}">${safe(m.name)}</option>`).join('')}</select></label>
        <label>Who paid<select name="to" required><option value="">Choose member</option>${(tracker.members||[]).map(m=>`<option value="${safe(m.name)}">${safe(m.name)}</option>`).join('')}</select></label>
        <label>Amount (${safe(tracker.currency||'USD')})<input type="number" name="amount" min="0.01" max="1000000000" step="0.01" required placeholder="0.00" inputmode="decimal"></label>
        <label>Description<input name="note" maxlength="200" placeholder="Tickets, snacks..." required></label>
       </div>
       <button type="submit" class="sqev-primary">Save expense</button>
      </form>
     </details>
     ${data.expenses.length?data.expenses.map(x=>`<div class="sqev-item"><strong>${safe(x.note||'Expense')}</strong><p>${safe(x.from_name||x.from||'')} · ${safe(x.amount)}</p><button data-unlink="${safe(x.id)}">Unlink</button></div>`).join(''):'<p class="sqev-muted">Link an existing tracker expense to keep it organized with this event.</p>'}
     <details class="sqev-collapsible"><summary>Link existing expense</summary><form id="sqev-expense"><label>Existing tracker expense<select name="entry_id" required><option value="">Choose an expense...</option>${(tracker.entries||[]).filter(x=>!linked.has(x.id)).map(x=>`<option value="${safe(x.id)}">${safe(x.note||x.from+' → '+x.to)} · ${safe(x.amount)}</option>`).join('')}</select></label><button type="submit">Link expense</button></form></details>
     </section>
    </div>
    <div>
     <section class="sqev-box" data-ev-section="rsvp"><div class="sqev-section-title"><h3>RSVP</h3><span class="sqev-pill">${data.rsvps.filter(r=>r.status==='going').length} GOING</span></div>
      <p class="sqev-muted">Will you be there?</p>
      <div class="sqev-actions">${['going','maybe','declined'].map(status=>`<button type="button" class="sqev-rsvp-button ${data.rsvps.some(r=>r.user_id===getUser()?.id&&r.status===status)?'active':''}" data-rsvp="${status}">${status==='going'?'Going':status==='maybe'?'Maybe':'Declined'}</button>`).join('')}</div>
      <p class="sqev-muted">${data.rsvps.length} responses · ${data.rsvps.filter(r=>r.status==='maybe').length} maybe · ${data.rsvps.filter(r=>r.status==='declined').length} declined</p>
     </section>
     <section class="sqev-box" data-ev-section="guests"><div class="sqev-section-title"><h3>Guest list & invitations</h3><span class="sqev-muted">${(data.people||[]).length} tracker members</span></div>
      <div class="sqev-guest-grid">${(data.people||[]).map(p=>`<div class="sqev-guest"><span class="sqev-avatar">${safe((p.name||'?').slice(0,1).toUpperCase())}</span><div><strong>${safe(p.name)}</strong><small>${safe(p.status==='not_responded'?(p.invited?'Invited · Awaiting RSVP':'Not invited'):p.status)}</small></div></div>`).join('')}</div>
      ${own?`<details class="sqev-collapsible"><summary>Invite a member</summary><form id="sqev-invite"><label>Invite an existing tracker member<select name="user_id" required><option value="">Choose a person...</option>${(data.people||[]).filter(p=>p.id!==getUser()?.id).map(p=>`<option value="${safe(p.id)}">${safe(p.name)}</option>`).join('')}</select></label><button type="submit">Send invitation</button></form></details>`:''}
      <p class="sqev-muted">To invite someone outside this tracker, add them as a tracker member first.</p>
     </section>
     <section class="sqev-box" data-ev-section="tasks"><div class="sqev-section-title"><h3>Shared checklist</h3><span class="sqev-muted">${(data.tasks||[]).filter(t=>t.completed).length}/${(data.tasks||[]).length} complete</span></div>
      ${(data.tasks||[]).map(t=>`<div class="sqev-task ${t.completed?'done':''}"><input type="checkbox" data-task-toggle="${safe(t.id)}" ${t.completed?'checked':''} ${own||t.assigned_to===getUser()?.id?'':'disabled'} aria-label="Complete task"><div class="sqev-task-main"><strong>${safe(t.title)}</strong><small class="sqev-muted" style="display:block">Assigned: ${safe((data.people||[]).find(p=>p.id===t.assigned_to)?.name||'Unassigned')}</small></div>${own?`<button type="button" data-task-delete="${safe(t.id)}">Remove</button>`:''}</div>`).join('')||'<p class="sqev-muted">No checklist tasks yet.</p>'}
      ${own?`<details class="sqev-collapsible"><summary>Add checklist task</summary><form id="sqev-task"><label>Task<input name="title" maxlength="200" required placeholder="Bring supplies, book tickets..."></label><label>Assign to<select name="assigned_to"><option value="">Unassigned</option>${(data.people||[]).map(p=>`<option value="${safe(p.id)}">${safe(p.name)}</option>`).join('')}</select></label><button type="submit">Add task</button></form></details>`:''}
     </section>
    </div>
   </div>
   ${own?`<section class="sqev-box sqev-manage-wide" data-ev-section="manage"><div class="sqev-section-title"><h3>Manage event</h3></div><p class="sqev-muted">Only the organizer can change or delete this event.</p><div class="sqev-actions"><button data-edit="1">Edit details</button><button data-delete="1">Delete event</button></div><div id="sqev-edit-holder"></div></section>`:''}`;
  // Mobile sections are explicit, accessible buttons rather than a long, difficult-to-use page.
  const sections=[['schedule','Schedule'],['rsvp','RSVP'],['guests','Guests'],['expenses','Expenses'],['tasks','Checklist'],['manage','Manage']];
  const available=sections.filter(([key])=>!!$('sqev-details').querySelector('[data-ev-section="'+key+'"]'));
  const mobileTabs=$('sqev-mobile-sections');
  mobileTabs.innerHTML=available.map(([key,label])=>'<button type="button" data-section="'+key+'">'+label+'</button>').join('');
  setEventSection(available.some(([key])=>key===activeSection)?activeSection:'schedule');
  if(own) $('sqev-details').querySelector('[data-edit]').onclick=()=>{
   const holder=$('sqev-edit-holder');
   holder.innerHTML=`<form id="sqev-edit" class="sqev-item"><h3>Edit event</h3><label>Name<input name="title" required maxlength="120" value="${safe(e.title)}"></label><label>Location<input name="location" maxlength="300" value="${safe(e.location)}"></label><label>Description<textarea name="description" maxlength="2000">${safe(e.description)}</textarea></label><label>Cover image HTTPS URL<input name="cover_url" type="url" placeholder="https://example.com/photo.jpg" value="${safe(e.cover_url||'')}"></label><div class="sqev-grid"><label>Starts<input type="datetime-local" name="starts" required value="${localDate(e.starts_at)}"></label><label>Ends<input type="datetime-local" name="ends" required value="${localDate(e.ends_at)}"></label></div><button class="sqev-primary" type="submit">Save changes</button></form>`;
  };
 }
 // Navigation buttons are present in index.html, so they remain visible during loading.
 // Reuse them rather than creating a duplicate menu item after asynchronous initialization.
 let nav=document.getElementById('sqev-nav');
 if(!nav){
  nav=document.createElement('button');nav.type='button';nav.id='sqev-nav';nav.className='sq-nav-link';
  nav.innerHTML='<span class="sq-nav-icon">◈</span><span class="sq-nav-label">Events</span>';
  const anchor=document.getElementById('sq-finance-nav');
  if(anchor)anchor.after(nav);else document.querySelector('.sidebar')?.append(nav);
 }
 const mobileNav=document.querySelector('.sq-mobile-nav');
 let mobileButton=document.getElementById('sqev-mobile-nav');
 if(mobileNav&&!mobileButton){
  mobileButton=document.createElement('button');
  mobileButton.type='button';mobileButton.id='sqev-mobile-nav';
  mobileButton.innerHTML='<span class="sq-m-icon" aria-hidden="true">◈</span>Events';
  const mobileAnchor=document.getElementById('sq-mobile-finance');
  if(mobileAnchor)mobileAnchor.after(mobileButton);else mobileNav.append(mobileButton);
 }
 function closeEvents(){
  if(panel.hidden)return;
  panel.hidden=true;
  document.body.classList.remove('sqev-page-open');
  nav.classList.remove('active');
  nav.removeAttribute('aria-current');
  mobileButton?.classList.remove('active');
 }
 function backToEvents(){selected=null;$('sqev-dashboard').hidden=false;$('sqev-details-page').hidden=true;message('');window.scrollTo({top:0,behavior:'instant'});}
 async function openEvents(){
  // Restore the existing app workspace, then use the same page container as other sections.
  if(panel.hidden)document.getElementById('nav-home')?.click();
  panel.hidden=false;document.body.classList.add('sqev-page-open');
  nav.classList.add('active');nav.setAttribute('aria-current','page');
  mobileButton?.classList.add('active');backToEvents();
  try{await load()}catch(e){message(e.message)}
 }
 nav.addEventListener('click',openEvents);
 mobileButton?.addEventListener('click',ev=>{ev.preventDefault();ev.stopPropagation();openEvents()});
 document.querySelector('.sidebar')?.addEventListener('click',ev=>{
  if(ev.target.closest('#sqev-nav'))return;
  if(ev.target.closest('button.sq-nav-link, #side-toggle, #nav-home, #nav-trackers, #nav-profile, #nav-about, #nav-friends, #sq-finance-nav'))closeEvents();
 },true);
 mobileNav?.addEventListener('click',ev=>{if(!ev.target.closest('#sqev-mobile-nav'))closeEvents()},true);
 $('sqev-back-home').onclick=()=>{closeEvents();document.getElementById('nav-home')?.click();};
 $('sqev-back-events').onclick=backToEvents;
 $('sqev-create-toggle').onclick=()=>{$('sqev-create-box').hidden=false;$('sqev-create-box').scrollIntoView({behavior:'smooth',block:'start'});};
 $('sqev-cancel-create').onclick=()=>{$('sqev-create-box').hidden=true;message('');};
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
  try{const e=await api('events','POST',{tracker_id:f.tracker_id.value,title:f.title.value,description:f.description.value,location:f.location.value,starts_at:start.toISOString(),ends_at:end.toISOString()});message('Event created.');f.title.value='';$('sqev-create-box').hidden=true;await load();await details(e.id)}
  catch(error){message(error.message)}
 };
 $('sqev-list').onclick=async ev=>{const b=ev.target.closest('[data-open]');if(b)try{await details(b.dataset.open);window.scrollTo({top:0,behavior:'instant'})}catch(e){message(e.message)}};
 $('sqev-details').onclick=async ev=>{
  const b=ev.target.closest('button');if(!b||!selected)return;
  try{
   if(b.dataset.rsvp)await api('events/'+selected+'/rsvp','POST',{status:b.dataset.rsvp});
   else if(b.dataset.removeItem)await api('events/'+selected+'/schedule/'+b.dataset.removeItem,'DELETE');
   else if(b.dataset.unlink)await api('events/'+selected+'/expenses/'+b.dataset.unlink,'DELETE');
   else if(b.dataset.taskDelete){if(!confirm('Remove this checklist task?'))return;await api('events/'+selected+'/tasks/'+encodeURIComponent(b.dataset.taskDelete),'DELETE');}
   else if(b.dataset.editItem){
    const item=(await api('events/'+selected)).schedule.find(i=>i.id===b.dataset.editItem);
    if(!item)return message('Activity not found.');
    activeSection='schedule';
    $('sqev-schedule-edit').innerHTML='<form id="sqev-schedule-update" class="sqev-item"><h3>Edit activity</h3><input type="hidden" name="item_id" value="'+safe(item.id)+'"><label>Activity<input name="title" required maxlength="120" value="'+safe(item.title)+'"></label><label>Starts<input name="starts" type="datetime-local" required value="'+localDate(item.starts_at)+'"></label><label>Location<input name="location" value="'+safe(item.location||'')+'"></label><label>Notes<textarea name="notes">'+safe(item.notes||'')+'</textarea></label><button type="submit" class="sqev-primary">Save activity</button><button type="button" data-cancel-edit="1">Cancel</button></form>';
    $('sqev-schedule-edit').scrollIntoView({block:'nearest'});return;
   }
   else if(b.dataset.cancelEdit){$('sqev-schedule-edit').innerHTML='';return;}
   else if(b.dataset.delete!==undefined){if(!confirm('Delete this event and its RSVP/schedule? Tracker expenses will remain.'))return;await api('events/'+selected,'DELETE');backToEvents();await load();message('Event deleted.');return;}
   else return;
   message('Saved.');await details(selected);
  }catch(e){message(e.message)}
 };
 $('sqev-details').addEventListener('change',async ev=>{
  const cb=ev.target.closest('[data-task-toggle]');
  if(!cb||!selected||busy)return;
  const intended=cb.checked;cb.disabled=true;
  await saveEventAction(cb,()=>api('events/'+selected+'/tasks/'+encodeURIComponent(cb.dataset.taskToggle),'PATCH',{completed:intended}),'Checklist updated.');
 });
 $('sqev-details').addEventListener('submit',async ev=>{
  const form=ev.target;
  if(!['sqev-edit','sqev-expense','sqev-new-expense','sqev-schedule','sqev-schedule-update','sqev-invite','sqev-task'].includes(form.id))return;
  ev.preventDefault();if(busy)return;
  const f=form.elements, id=selected, button=form.querySelector('[type=submit]');
  if(form.id==='sqev-edit'||form.id==='sqev-schedule-update'){
   const starts=new Date(f.starts.value);
   if(!Number.isFinite(starts.getTime()))return message('Enter a valid date.');
   if(form.id==='sqev-edit'){
    const ends=new Date(f.ends.value);
    if(!Number.isFinite(ends.getTime())||ends<=starts)return message('End must be after start.');
   }
  }
  await saveEventAction(button,async()=>{
   if(form.id==='sqev-edit')await api('events/'+id,'PATCH',{title:f.title.value,location:f.location.value,description:f.description.value,cover_url:f.cover_url.value,starts_at:new Date(f.starts.value).toISOString(),ends_at:new Date(f.ends.value).toISOString()});
   if(form.id==='sqev-expense'){if(!f.entry_id.value)throw Error('Choose an expense first.');await api('events/'+id+'/expenses','POST',{entry_id:f.entry_id.value})}
   if(form.id==='sqev-new-expense'){
    const from=f.from.value,to=f.to.value,amount=Number(f.amount.value),note=f.note.value.trim();
    if(!from||!to||from===to)throw Error('Choose two different tracker members.');
    if(!Number.isFinite(amount)||amount<=0||amount>1e9)throw Error('Enter a valid amount.');
    if(!note)throw Error('Add a description.');
    const eventInfo=await api('events/'+encodeURIComponent(id));
    const trackerId=eventInfo.event.tracker_id;
    // Read before creating so we only link the new expense, never somebody else's.
    const before=await api('trackers/'+encodeURIComponent(trackerId));
    const known=new Set((before.entries||[]).map(entry=>entry.id));
    const saved=await api('trackers/'+encodeURIComponent(trackerId)+'/entries','POST',{
     type:'debt',from,to,amount,note,currency:before.currency||'USD',date:new Date().toLocaleDateString()
    });
    const added=(saved.entries||[]).filter(entry=>!known.has(entry.id));
    const matching=added.filter(entry=>entry.type==='debt'&&entry.from===from&&entry.to===to&&Math.abs(Number(entry.amount)-amount)<0.011&&entry.note===note);
    // The API returns tracker detail rather than the new entry's id.
    const created=matching.length===1?matching[0]:added.length===1?added[0]:null;
    if(!created)throw Error('Expense saved in the tracker, but could not link automatically. Use Link existing expense below.');
    try{await api('events/'+encodeURIComponent(id)+'/expenses','POST',{entry_id:created.id})}
    catch(linkErr){throw Error('Expense saved in the tracker. Linking failed: '+linkErr.message+'. Use Link existing expense to attach it.');}
   }
   if(form.id==='sqev-schedule')await api('events/'+id+'/schedule','POST',{title:f.title.value,starts_at:new Date(f.starts.value).toISOString(),location:f.location.value});
   if(form.id==='sqev-schedule-update')await api('events/'+id+'/schedule/'+encodeURIComponent(f.item_id.value),'PATCH',{title:f.title.value,starts_at:new Date(f.starts.value).toISOString(),location:f.location.value,notes:f.notes.value});
   if(form.id==='sqev-invite')await api('events/'+id+'/invites','POST',{user_id:f.user_id.value});
   if(form.id==='sqev-task')await api('events/'+id+'/tasks','POST',{title:f.title.value,assigned_to:f.assigned_to.value||null});
  },form.id==='sqev-invite'?'Invitation sent.':'Saved.');
  if(form.id==='sqev-edit')await load();
 });

}
