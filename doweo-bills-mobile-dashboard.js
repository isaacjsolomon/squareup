/* Keep the original bills page and handlers. Reflow only on small screens. */
(function(){
 'use strict';
 const initialize=()=>{
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
 const apply=()=>{
  const mobile=media.matches;
  page.classList.toggle('dw-bills-compact',mobile);
  if(mobile){
   if(calendar.parentElement!==calendarFold)calendarFold.append(calendar);
   if(calendarFold.parentElement!==page)page.append(calendarFold);
  }else{
   if(calendar.parentElement!==overview)overview.insertBefore(calendar,create);
   calendarFold.remove();
  }
 };
 if(typeof media.addEventListener==='function')media.addEventListener('change',apply);
 else if(typeof media.addListener==='function')media.addListener(apply);
 apply();
 };
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initialize,{once:true});
 else initialize();
})();
