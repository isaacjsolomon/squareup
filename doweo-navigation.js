/* One app navigation hierarchy. Existing IDs remain compatibility entry points. */
(()=>{
 'use strict';
 const $=id=>document.getElementById(id),body=document.body;
 const legacy=document.createElement('div');legacy.hidden=true;legacy.id='dw-legacy-navigation';body.append(legacy);
 for(const id of ['nav-chat','nav-analytics']){const node=$(id);if(node)legacy.append(node);}
 const more=document.querySelector('.squareup-nav details[data-dw-nav-group="more"]');
 function tidy(){
  const beta=$('dw-beta-launch');if(beta&&more&&beta.parentNode!==more)more.append(beta);
  document.querySelectorAll('#sq-mobile-more-sheet [data-sq-destination="nav-analytics"],#sq-mobile-more-sheet [data-sq-destination="nav-chat"]').forEach(n=>n.remove());
 }
 tidy();new MutationObserver(tidy).observe(document.querySelector('.squareup-nav'),{childList:true});
 const analytics=$('analytics-page'),anchor=document.createComment('tracker analytics home');analytics?.before(anchor);
 const home=document.createElement('section');home.id='dw-account-home';home.hidden=true;home.setAttribute('aria-label','Account overview');$('tracker-dashboard').before(home);
 const context=document.createElement('div');context.id='dw-tracker-context';context.hidden=true;
 context.innerHTML='<label for="dw-tracker-picker">Tracker</label><select id="dw-tracker-picker" aria-label="Current tracker"></select>';
 body.append(context);
 const picker=$('dw-tracker-picker'),source=$('tracker-select');
 let homeRequest=false,inHomeClick=false,firstTracker=true,renderToken=0,initialized=false,frame=0;
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const active=id=>{document.querySelectorAll('.squareup-nav .sq-nav-link').forEach(n=>{const yes=n.id===id;n.classList.toggle('active',yes);if(yes)n.setAttribute('aria-current','page');else n.removeAttribute('aria-current');});document.querySelectorAll('.sq-mobile-nav button').forEach(n=>{const yes=n.dataset.target===id;n.classList.toggle('active',yes);if(yes)n.setAttribute('aria-current','page');else n.removeAttribute('aria-current');});};
 function hideHome(){homeRequest=false;home.hidden=true;body.classList.remove('dw-account-home-open');renderToken++;}
 function restoreAnalytics(){if(analytics&&analytics.parentNode!==anchor.parentNode)anchor.after(analytics);}
 function isTracker(){return !body.classList.contains('dw-account-home-open')&&!body.classList.contains('sq-finance-open')&&!body.classList.contains('sq-auth-guest')&&(body.classList.contains('sq-bills-open')||(!/settings-view|about-view|trackers-view|analytics-view|friends-view|notifications-view|sq-help-view/.test(body.className)&&$('tracker-dashboard').getClientRects().length>0));}
 function syncPicker(){
  const options=[...(body.classList.contains('sq-bills-open')?$('sq-bills-tracker'):source).options].filter(o=>o.value!=='manage'&&!o.value.startsWith('─'));const signature=options.map(o=>o.value+'\0'+o.text).join('\n');
  if(picker.dataset.options!==signature){picker.replaceChildren(...options.map(o=>new Option(o.text,o.value)));picker.dataset.options=signature;}
  const id=body.classList.contains('sq-bills-open')?$('sq-bills-tracker')?.value:window.sqLastOpenedTrackerDetail?.id||source.value;
  if([...picker.options].some(o=>o.value===id))picker.value=id;
 }
 // Find the visible top bar by its actual rendered controls rather than a guessed CSS class.
 function findDesktopHeader(){
  // The old lookup required the literal word "Search" in textContent, which
  // fails for placeholder-only search fields. Inspect rendered structure instead.
  const ask=[...document.querySelectorAll('button,a,[role="button"]')]
   .find(n=>/ask\s+weo/i.test(n.textContent||'')&&n.getClientRects().length);
  if(!ask)return null;
  for(let node=ask.parentElement,depth=0;node&&depth<10;node=node.parentElement,depth++){
   const bounds=node.getBoundingClientRect();
   if(bounds.width<450||bounds.height<45||bounds.height>230)continue;
   const hasBrand=/doweo/i.test(node.textContent||'');
   const hasSearch=Boolean(node.querySelector('input[type="search"],input[placeholder*="earch"],[role="search"],[role="searchbox"],[class*="search"],[id*="search"]'));
   if(hasBrand&&hasSearch){
    node.classList.add('dw-tracker-desktop-header');
    return node;
   }
  }
  return null;
 }
 function insertSelectorInHeader(header){
  // Insert before the search element's direct child within the header.
  const search=header.querySelector('input[type="search"],input[placeholder*="earch"],[role="searchbox"],[role="search"],[class*="search"]');
  let child=search;
  while(child&&child.parentElement!==header)child=child.parentElement;
  if(child&&child!==context)header.insertBefore(context,child);
  else {
   const ask=[...header.children].find(n=>/ask\s+weo/i.test(n.textContent||''));
   header.insertBefore(context,ask||null);
  }
 }
 function fixTrackerTabs(){
  // Use the actual five visible controls inside the tracker navigation.
  // Data attributes may differ between page versions, so do not depend on them.
  if(!isTracker())return;
  const expected=['overview','expenses','bills','members','chat'];
  // The tab bar is often a sibling ABOVE #tracker-dashboard; look across
  // the rendered page rather than assuming it lives inside that section.
  const bars=[...document.querySelectorAll('.sq-workspace-tabs,.sq-bills-workspace-tabs,[role="tablist"]')]
   .filter(el=>el.getClientRects().length&&!el.closest('#dw-legacy-navigation'));
  for(const bar of bars){
   const controls=[...bar.querySelectorAll('button,[role="tab"]')]
    .filter(el=>el.getClientRects().length);
   const tabFor=label=>controls.find(el=>
    (el.textContent||'').trim().toLowerCase()===label ||
    (el.dataset.sqTab||'').toLowerCase()===label);
   const tabs=expected.map(tabFor);
   if(tabs.some(tab=>!tab))continue;
   // Use native nodes: existing listeners, selected states and ARIA survive.
   tabs.forEach((tab,i)=>{if(tab.parentElement!==bar)bar.appendChild(tab);tab.classList.add('dw-tracker-tab-item');tab.dataset.dwTrackerTab=expected[i];});
   bar.classList.add('dw-tracker-tabs-row');
   return;
  }
 }
 function trackerContextBottom(){
  const shown=isTracker();context.hidden=!shown;if(body.classList.contains('dw-tracker-context-visible')!==shown)body.classList.toggle('dw-tracker-context-visible',shown);
  if(!shown)return 0;
  const header=document.querySelector('.sq-mobile-top');
  const mobile=matchMedia('(max-width:900px)').matches;
  const desktopHeader=mobile?null:findDesktopHeader();
  const parent=mobile?body:(desktopHeader|| (body.classList.contains('sq-bills-open')?$('sq-bills-page'):$('tracker-dashboard')));
  if(context.parentNode!==parent){if(mobile)parent.append(context);else if(desktopHeader)insertSelectorInHeader(desktopHeader);else parent.prepend(context);}
  context.classList.toggle('dw-tracker-header-inline',Boolean(desktopHeader&&!mobile));
  if(!mobile){context.style.removeProperty('top');context.style.removeProperty('left');context.style.removeProperty('width');}
  if(matchMedia('(max-width:900px)').matches&&header.getClientRects().length){const r=header.getBoundingClientRect();context.style.top=Math.ceil(r.bottom+8)+'px';context.style.left=r.left+'px';context.style.width=r.width+'px';}
  return context.getBoundingClientRect().bottom;
 }
 function sync(){frame=0;syncPicker();trackerContextBottom();fixTrackerTabs();}
 function schedule(){if(!frame)frame=requestAnimationFrame(sync);}
 picker.addEventListener('change',async()=>{
  const id=picker.value;picker.disabled=true;
  try{if(body.classList.contains('sq-bills-open')){const bills=$('sq-bills-tracker');bills.value=id;bills.dispatchEvent(new Event('change',{bubbles:true}));source.value=id;source.dispatchEvent(new Event('change',{bubbles:true}));}
   else await window.squareUpNavigateTracker(id);
  }finally{picker.disabled=false;schedule();}
 });
 const nav={
  route(page){if(page!=='dashboard'||!inHomeClick)hideHome();schedule();},
  trackerTab(name){if(!(inHomeClick&&homeRequest&&name==='overview')){hideHome();active('nav-trackers');}schedule();},
  trackerWillOpen(){if(firstTracker){firstTracker=false;return;}hideHome();schedule();},
  financeWillOpen(){hideHome();restoreAnalytics();active('sq-finance-nav');schedule();},
  restoreAnalytics,
  mountAnalytics(content){if(!analytics)return;content.append(analytics);let tools=$('dw-analytics-context');if(!tools){tools=document.createElement('div');tools.id='dw-analytics-context';tools.innerHTML='<h2>Tracker analytics</h2><label>Tracker <select aria-label="Analytics tracker"></select></label>';analytics.prepend(tools);tools.querySelector('select').addEventListener('change',async e=>{source.value=e.target.value;source.dispatchEvent(new Event('change',{bubbles:true}));});}const select=tools.querySelector('select');select.replaceChildren(...[...source.options].map(o=>new Option(o.text,o.value)));select.value=source.value;window.squareUpRenderAnalytics?.();},
  trackerContextBottom
 };
 window.DoWeoNavigation=nav;
 async function showHome(){
  window.squareUpCloseFinanceHub?.();restoreAnalytics();home.hidden=false;body.classList.add('dw-account-home-open');active('nav-home');schedule();
  history.replaceState(null,'',location.pathname+location.search+'#home');window.scrollTo(0,0);
  const token=++renderToken;
  home.innerHTML='<header><span class="dw-eyebrow">YOUR DOWEO</span><h1>Home</h1><p>Your balances across every tracker.</p></header><div role="status">Loading your balances…</div>';
  try{
   const {rows,unavailable}=await window.squareUpWalletSnapshot();if(token!==renderToken)return;
   const currencies={};for(const r of rows){const g=currencies[r.currency]??={owed:0,owe:0};g.owed+=Math.max(0,r.net);g.owe+=Math.max(0,-r.net);}
   const money=(v,c)=>{try{return new Intl.NumberFormat(undefined,{style:'currency',currency:c}).format(v);}catch{return c+' '+v.toFixed(2);}};
   home.innerHTML='<header><span class="dw-eyebrow">YOUR DOWEO</span><h1>Home</h1><p>Your balances across every tracker.</p></header><div class="dw-home-balances">'+Object.entries(currencies).map(([c,v])=>'<article><span>'+esc(c)+'</span><div><span>Owed to you<strong>'+esc(money(v.owed,c))+'</strong></span><span>You owe<strong>'+esc(money(v.owe,c))+'</strong></span></div></article>').join('')+'</div><section class="dw-home-trackers"><header><h2>Your trackers</h2><button type="button" id="dw-home-manage">Manage trackers →</button></header><div>'+rows.map(r=>'<button type="button" data-home-tracker="'+esc(r.id)+'"><span><strong>'+esc(r.name)+'</strong><small>'+esc(r.currency)+' · '+(Math.abs(r.net)<.005?'Settled up':r.net>0?'Owed to you':'You owe')+'</small></span><b>'+esc(money(Math.abs(r.net),r.currency))+' →</b></button>').join('')+'</div>'+(!rows.length?'<p>No trackers yet. Create one to start sharing expenses.</p>':'')+(unavailable?'<p role="status">'+unavailable+' tracker(s) could not be loaded. Reopen Home to retry.</p>':'')+'</section>';
   $('dw-home-manage').onclick=()=>$('nav-trackers').click();
   home.querySelectorAll('[data-home-tracker]').forEach(b=>b.onclick=async()=>{b.disabled=true;try{await window.squareUpNavigateTracker(b.dataset.homeTracker);}catch(error){b.disabled=false;alert(error.message||'Could not open tracker');}});
  }catch(error){if(token===renderToken)home.innerHTML='<h1>Home</h1><p role="alert">Could not load your balances. Please reopen Home to retry.</p><button type="button" id="dw-home-retry">Retry</button>';if($('dw-home-retry'))$('dw-home-retry').onclick=showHome;}
 }
 // Home should open the original tracker overview, not the simplified replacement dashboard.
 async function showTrackerOverview(){
  hideHome();
  try{
   const trackerId=window.sqLastOpenedTrackerDetail?.id||source?.value;
   if(trackerId&&typeof window.squareUpNavigateTracker==='function')await window.squareUpNavigateTracker(trackerId);
   else $('nav-trackers')?.click();
   document.querySelector('#tracker-dashboard [data-sq-tab="overview"]')?.click();
   active('nav-home');
  }catch(error){console.warn('Tracker overview unavailable',error);$('nav-trackers')?.click();}
  schedule();
 }
 $('nav-home').addEventListener('click',()=>{homeRequest=true;inHomeClick=true;queueMicrotask(()=>{inHomeClick=false;if(homeRequest){homeRequest=false;if(body.classList.contains('sqev-page-open'))active('sqev-nav');else showTrackerOverview();}});},true);
 document.addEventListener('click',event=>{
  if(event.target.closest('[data-sq-tab],[data-sq-bills-tab],#sq-bills-open')){hideHome();active('nav-trackers');schedule();}
  else if(event.target.closest('.squareup-nav button:not(#nav-home),#sqev-nav,#sq-finance-nav'))hideHome();
 },true);
 $('nav-analytics').addEventListener('click',e=>{e.stopImmediatePropagation();window.squareUpOpenFinanceHub('insights');},true);
 $('nav-chat').addEventListener('click',e=>{e.stopImmediatePropagation();$('nav-home').click();document.querySelector('[data-sq-tab="chat"]').click();},true);
 new MutationObserver(schedule).observe(body,{attributes:true,attributeFilter:['class']});
 new MutationObserver(schedule).observe(source,{childList:true,subtree:true});
 new MutationObserver(schedule).observe($('tracker-dashboard'),{childList:true,subtree:true});
 new MutationObserver(schedule).observe($('sq-bills-tracker'),{childList:true,subtree:true});
 window.addEventListener('squareup:tracker-detail',()=>{syncPicker();if(analytics?.closest('#sq-ng-content'))window.squareUpRenderAnalytics?.();});
 window.addEventListener('resize',schedule);window.visualViewport?.addEventListener('resize',schedule);
 new ResizeObserver(schedule).observe(document.querySelector('.sq-mobile-top'));
 // Auth startup may finish after the classic scripts; do not change deep links.
 const startup=new MutationObserver(()=>{if(body.classList.contains('sq-auth-guest')){if(!home.hidden||home.childNodes.length){hideHome();home.replaceChildren();}initialized=false;firstTracker=true;return;}if(initialized||document.documentElement.classList.contains('sq-auth-loading'))return;initialized=true;if(!location.hash||location.hash==='#home')showTrackerOverview();});
 startup.observe(document.documentElement,{attributes:true,attributeFilter:['class']});startup.observe(body,{attributes:true,attributeFilter:['class']});
 schedule();
})();
