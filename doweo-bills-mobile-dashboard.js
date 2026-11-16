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
  for(const node of [tabs,back,heading,overview,columns])shell.append(node);
  if(calendar.parentElement!==fold)fold.append(calendar);
  shell.append(fold);
  if(message)shell.append(message);
  if(shell.parentElement!==page)page.prepend(shell);
 };
 if(media.addEventListener)media.addEventListener('change',apply);
 else media.addListener(apply);
 apply();
})();
