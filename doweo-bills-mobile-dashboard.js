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
