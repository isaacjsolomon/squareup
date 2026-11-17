/* Bills mobile layout lives in an isolated shell. Keep original controls, handlers and IDs. */
(function(){
 'use strict';
 const page=document.getElementById('sq-bills-page');
 if(!page||page.dataset.dwBillsResponsive==='ready')return;
 const overview=page.querySelector('.sq-premium-overview');
 const calendar=overview?.querySelector('.sq-premium-calendar');
 const create=overview?.querySelector('.sq-bill-create-card');
 const tabs=page.querySelector('.sq-bills-workspace-tabs');
 const back=page.querySelector('.sq-bills-back');
 const heading=page.querySelector('.sq-bills-title');
 const columns=page.querySelector('.sq-bills-columns');
 const message=page.querySelector('#sq-bills-message');
 if(!overview||!calendar||!create||!tabs||!back||!heading||!columns)return;
 page.dataset.dwBillsResponsive='ready';
 const media=window.matchMedia('(max-width:760px)');
 const shell=document.createElement('div');
 shell.className='dw-bills-mobile-shell';
 const workspace=document.createElement('div');workspace.className='dw-bills-workspace';
 const fold=document.createElement('details');fold.className='dw-bills-calendar-fold';fold.setAttribute('aria-label','Billing calendar');
 const foldTitle=document.createElement('summary');foldTitle.textContent='Billing calendar';fold.append(foldTitle);
 // Each element gets a placeholder so desktop restoration is lossless.
 const elements=[tabs,back,heading,overview,columns,message,calendar].filter(Boolean);
 const anchors=new Map();
 for(const node of elements){
  const marker=document.createComment('bills-original-'+(node.id||node.className));
  node.before(marker);anchors.set(node,marker);
 }
 const restore=()=>{
  for(const node of elements){
   const anchor=anchors.get(node);
   if(anchor?.parentNode)anchor.after(node);
  }
  // Preserve the original desktop calendar position in the overview grid.
  if(calendar.parentElement!==overview)overview.insertBefore(calendar,create);
  fold.remove();shell.remove();page.classList.remove('dw-bills-compact');
 };
 const apply=()=>{
  if(!media.matches){restore();return;}
  page.classList.add('dw-bills-compact');
  // Append only actual page elements, never copies or substitute action buttons.
  shell.append(tabs,workspace);
  for(const node of [back,heading,overview,columns])workspace.append(node);
  if(calendar.parentElement!==fold)fold.append(calendar);
  workspace.append(fold);
  if(message)workspace.append(message);
  if(shell.parentElement!==page)page.prepend(shell);
  scheduleMeasure();
 };
 // iPhone safe areas and larger text change the fixed header's actual bottom.
 // Use its measured edge for both initial clearance and sticky tab positioning.
 let measureFrame=0;
 function measureHeader(){
  measureFrame=0;
  if(!media.matches||!page.getClientRects().length)return;
  const header=document.querySelector('.sq-mobile-top');
  if(!header||!header.getClientRects().length)return;
  const bottom=Math.ceil(header.getBoundingClientRect().bottom)+10;
  const pageBox=page.getBoundingClientRect();
  const documentTop=pageBox.top+window.scrollY;
  shell.style.setProperty('--dw-bills-header-bottom',bottom+'px');
  shell.style.setProperty('--dw-bills-tabs-left',pageBox.left+'px');
  shell.style.setProperty('--dw-bills-tabs-width',pageBox.width+'px');
  shell.style.setProperty('--dw-bills-start-inset',Math.max(8,Math.ceil(bottom+tabs.getBoundingClientRect().height+14-documentTop))+'px');
 }
 function scheduleMeasure(){if(!measureFrame)measureFrame=requestAnimationFrame(measureHeader)}
 const header=document.querySelector('.sq-mobile-top');
 if(header&&typeof ResizeObserver!=='undefined')new ResizeObserver(scheduleMeasure).observe(header);
 new MutationObserver(scheduleMeasure).observe(document.body,{attributes:true,attributeFilter:['class']});
 window.addEventListener('resize',scheduleMeasure,{passive:true});
 window.addEventListener('pageshow',scheduleMeasure);
 window.visualViewport?.addEventListener('resize',scheduleMeasure,{passive:true});
 // The entire Add tile is clickable; the original button retains its keyboard
 // access, label and dialog handler. Never intercept fields inside the editor.
 create.addEventListener('click',event=>{
  if(media.matches&&create.classList.contains('sq-mobile-collapsed')&&!event.target.closest('button,input,select,textarea,a'))document.getElementById('sq-bill-mobile-toggle')?.click();
 });
 if(media.addEventListener)media.addEventListener('change',apply);
 else media.addListener(apply);
 apply();
})();

// The other tracker views share a separate bar. Keep its original DOM parent
// and handlers; only reserve its height and align it with the fixed header.
(function(){
 'use strict';
 const dashboard=document.getElementById('tracker-dashboard');
 const tabs=dashboard?.querySelector('.sq-workspace-tabs');
 const header=document.querySelector('.sq-mobile-top');
 if(!dashboard||!tabs||!header)return;
 const media=window.matchMedia('(max-width:900px)');
 const originalPadding={value:dashboard.style.getPropertyValue('padding-top'),priority:dashboard.style.getPropertyPriority('padding-top')};
 let frame=0;
 function restore(){
  if(dashboard.classList.contains('dw-mobile-tabs-ready'))dashboard.classList.remove('dw-mobile-tabs-ready');
  if(originalPadding.value)dashboard.style.setProperty('padding-top',originalPadding.value,originalPadding.priority);
  else dashboard.style.removeProperty('padding-top');
 }
 function measure(){
  frame=0;
  if(!media.matches){restore();return;}
  if(!dashboard.getClientRects().length||!header.getClientRects().length||document.body.classList.contains('sq-bills-open'))return;
  if(!dashboard.classList.contains('dw-mobile-tabs-ready'))dashboard.classList.add('dw-mobile-tabs-ready');
  const edge=header.getBoundingClientRect();
  const top=Math.ceil(edge.bottom)+10;
  dashboard.style.setProperty('--dw-tracker-tabs-top',top+'px');
  dashboard.style.setProperty('--dw-tracker-tabs-left',edge.left+'px');
  dashboard.style.setProperty('--dw-tracker-tabs-width',edge.width+'px');
  const documentTop=dashboard.getBoundingClientRect().top+window.scrollY;
  dashboard.style.setProperty('padding-top',Math.max(0,Math.ceil(top+tabs.getBoundingClientRect().height+14-documentTop))+'px','important');
 }
 function schedule(){if(!frame)frame=requestAnimationFrame(measure)}
 const observer=new MutationObserver(schedule);
 observer.observe(document.body,{attributes:true,attributeFilter:['class']});
 observer.observe(dashboard,{attributes:true,attributeFilter:['class','hidden']});
 if(typeof ResizeObserver!=='undefined'){
  const resize=new ResizeObserver(schedule);resize.observe(header);resize.observe(tabs);
 }
 window.addEventListener('resize',schedule,{passive:true});
 window.addEventListener('pageshow',schedule);
 window.visualViewport?.addEventListener('resize',schedule,{passive:true});
 if(media.addEventListener)media.addEventListener('change',schedule);else media.addListener(schedule);
 schedule();
})();


/*
 * Desktop tracker toolbar. This intentionally enhances the existing header
 * and the original four-tab bar; it never substitutes the Home/dashboard.
 * It also leaves the isolated mobile Bills layout untouched.
 */
(function(){
 'use strict';
 const desktop=window.matchMedia('(min-width:901px)');
 const dashboard=document.getElementById('tracker-dashboard');
 const source=document.getElementById('tracker-select');
 if(!dashboard||!source)return;
 const tabbar=dashboard.querySelector('.sq-workspace-tabs');
 if(!tabbar)return;
 const picker=document.createElement('div');
 picker.id='dw-inline-tracker-picker';
 picker.innerHTML='<span class="dw-inline-tracker-symbol" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m4 7 2 2 3-4"/><path d="M12 7h9"/><circle cx="6" cy="17" r="2"/><path d="M12 17h9"/></svg></span><label for="dw-inline-tracker-select">Tracker</label><select id="dw-inline-tracker-select" aria-label="Switch tracker"></select>';
 const select=picker.querySelector('select');
 const chat=document.createElement('button');
 chat.type='button';
 chat.className='dw-inline-chat-tab';
 chat.textContent='Chat';
 chat.setAttribute('aria-label','Open chat');
 chat.setAttribute('role','tab');
 chat.setAttribute('aria-selected','false');
 chat.addEventListener('click',()=>{
  const original=document.getElementById('nav-chat');
  if(original&&original!==chat){original.click();return;}
  const mobileChat=document.getElementById('sq-mobile-chat-top');
  const action=mobileChat?.querySelector('button,a');
  if(action)action.click();
 });
 let frame=0;
 function findHeader(){
  const visible=node=>Boolean(node&&node.getClientRects().length);
  const asks=[...document.querySelectorAll('button,a,[role="button"]')]
    .filter(node=>visible(node)&&/ask\s*weo/i.test(node.textContent||''));
  for(const ask of asks){
   for(let node=ask.parentElement,depth=0;node&&depth<10;node=node.parentElement,depth++){
    const rect=node.getBoundingClientRect();
    if(rect.width<400||rect.height<40||rect.height>220)continue;
    if(!/doweo/i.test(node.textContent||''))continue;
    const search=node.querySelector('input[type="search"],input[placeholder*="earch" i],[role="search"],[role="searchbox"],[class*="search"],[id*="search"]');
    if(search||/search/i.test(node.textContent||''))return node;
   }
  }
  return null;
 }
 function syncOptions(){
  const options=[...source.options].filter(option=>option.value&&option.value!=='manage'&&!option.value.startsWith('─'));
  const signature=options.map(option=>option.value+'\u0000'+option.text).join('\n');
  if(select.dataset.signature!==signature){
   select.replaceChildren(...options.map(option=>new Option(option.text,option.value)));
   select.dataset.signature=signature;
  }
  if(options.some(option=>option.value===source.value))select.value=source.value;
 }
 select.addEventListener('change',()=>{
  const id=select.value;
  const original=source.value;
  source.value=id;
  source.dispatchEvent(new Event('change',{bubbles:true}));
  // The legacy select may be a filter only; the existing global tracker
  // opening function is the application's own navigation handler.
  if(typeof window.openTracker==='function' && id!==original){
   Promise.resolve(window.openTracker(id)).catch(error=>console.warn('Tracker switch failed',error));
  }
 });
 function apply(){
  frame=0;
  if(!desktop.matches){
   document.body.classList.remove('dw-desktop-tracker-tools');
   return;
  }
  const visible=(dashboard.getClientRects().length>0 || document.body.classList.contains('sq-bills-open')) &&
   !document.body.classList.contains('sq-auth-guest') &&
   !document.body.classList.contains('settings-view') &&
   !document.body.classList.contains('trackers-view');
  const header=visible?findHeader():null;
  const shouldShow=Boolean(visible&&header);
  document.body.classList.toggle('dw-desktop-tracker-tools',shouldShow);
  if(!shouldShow)return;
  syncOptions();
  // Insert alongside the existing search control; preserve search and Weo.
  if(picker.parentElement!==header){
   const search=header.querySelector('input[type="search"],input[placeholder*="earch" i],[role="searchbox"],[role="search"],[class*="search"]');
   let region=search;
   while(region&&region.parentElement!==header)region=region.parentElement;
   if(region&&region!==picker)header.insertBefore(picker,region);
   else {
    const askChild=[...header.children].find(el=>/ask\s*weo/i.test(el.textContent||''));
    header.insertBefore(picker,askChild||null);
   }
  }
  header.classList.add('dw-inline-tracker-header');
  const tabs=[...tabbar.querySelectorAll('button[data-sq-tab]')];
  if(tabbar.contains(chat))chat.remove();
  tabbar.classList.add('dw-inline-five-tabs');
 }
 function schedule(){if(!frame)frame=requestAnimationFrame(apply)}
 const observer=new MutationObserver(schedule);
 observer.observe(document.body,{attributes:true,attributeFilter:['class'],childList:true,subtree:false});
 observer.observe(dashboard,{attributes:true,attributeFilter:['class','hidden'],childList:true});
 observer.observe(source,{childList:true,subtree:true,attributes:true,attributeFilter:['value']});
 window.addEventListener('squareup:tracker-detail',schedule);
 window.addEventListener('resize',schedule,{passive:true});
 window.addEventListener('pageshow',schedule);
 if(desktop.addEventListener)desktop.addEventListener('change',schedule);
 source.addEventListener('change',schedule);
 schedule();
})();
