/* Keep the original bills page and handlers. Reflow only on small screens. */
(function(){
 'use strict';
 const page=document.getElementById('sq-bills-page');
 if(!page||page.dataset.dwBillsResponsive==='ready')return;
 const overview=page.querySelector('.sq-premium-overview');
 const calendar=overview?.querySelector('.sq-premium-calendar');
 const create=overview?.querySelector('.sq-bill-create-card');
 if(!overview||!calendar||!create)return;
 page.dataset.dwBillsResponsive='ready';
 const media=window.matchMedia('(max-width:760px)');
 const calendarFold=document.createElement('details');
 calendarFold.className='dw-bills-calendar-fold';
 calendarFold.setAttribute('aria-label','Billing calendar');
 const summary=document.createElement('summary');
 summary.textContent='Billing calendar';
 calendarFold.append(summary);
 const tabs=page.querySelector(':scope > .sq-bills-workspace-tabs');
 const back=page.querySelector(':scope > .sq-bills-back');
 const heading=page.querySelector(':scope > .sq-bills-title');
 const metrics=overview.querySelector('.sq-premium-metrics');
 const cards=Array.from(metrics?.querySelectorAll(':scope > article')||[]);
 const set=(node,property,value)=>node?.style.setProperty(property,value,'important');
 const clear=(node,properties)=>properties.forEach(p=>node?.style.removeProperty(p));
 const forceMobileStructure=()=>{
  // Physically reorder the top-level elements: no legacy sticky positioning or CSS order assumptions.
  if(tabs&&back&&heading){page.insertBefore(tabs,page.firstElementChild);tabs.after(back);back.after(heading);}
  set(page,'display','flex');set(page,'flex-direction','column');set(page,'gap','12px');
  set(page,'padding-top','12px');set(page,'height','auto');
  set(tabs,'position','relative');set(tabs,'top','auto');set(tabs,'inset','auto');
  set(tabs,'transform','none');set(tabs,'margin','0');set(tabs,'width','100%');
  set(back,'position','relative');set(back,'top','auto');set(back,'margin','0');
  set(heading,'position','relative');set(heading,'top','auto');set(heading,'margin','0');
  set(overview,'display','flex');set(overview,'flex-direction','column');
  set(overview,'grid-template-columns','none');set(overview,'grid-template-rows','none');
  set(metrics,'display','grid');set(metrics,'grid-template-columns','minmax(0,1.25fr) minmax(0,.75fr)');
  set(metrics,'gap','10px');set(metrics,'width','100%');
  cards.forEach(card=>{set(card,'grid-column','auto');set(card,'grid-row','auto');set(card,'min-height','108px');set(card,'width','auto');set(card,'margin','0');});
  set(create,'order','0');set(metrics,'order','1');
  set(page.querySelector('.sq-bills-columns'),'order','4');
 };
 const restoreDesktop=()=>{
  for(const [node,props] of [
   [page,['display','flex-direction','gap','padding-top','height']],
   [tabs,['position','top','inset','transform','margin','width']],
   [back,['position','top','margin']],[heading,['position','top','margin']],
   [overview,['display','flex-direction','grid-template-columns','grid-template-rows']],
   [metrics,['display','grid-template-columns','gap','width','order']],
   [create,['order']],[page.querySelector('.sq-bills-columns'),['order']]
  ])clear(node,props);
  cards.forEach(card=>clear(card,['grid-column','grid-row','min-height','width','margin']));
 };
 const apply=()=>{
  const mobile=media.matches;
  page.classList.toggle('dw-bills-compact',mobile);
  if(mobile){
   forceMobileStructure();
   if(calendar.parentElement!==calendarFold)calendarFold.append(calendar);
   if(calendarFold.parentElement!==page)page.append(calendarFold);
  }else{
   restoreDesktop();
   if(calendar.parentElement!==overview)overview.insertBefore(calendar,create);
   calendarFold.remove();
  }
 };
 if(typeof media.addEventListener==='function')media.addEventListener('change',apply);
 else if(typeof media.addListener==='function')media.addListener(apply);
 apply();
})();
