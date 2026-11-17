/* Enhance existing tracker controls without replacing the original dashboard. */
(()=>{'use strict';
 const desktop=window.matchMedia('(min-width:901px)');
 const $=id=>document.getElementById(id);
 let busy=false,queued=false;
 const detachedChatTabs=new Map();
 // Remove the actual Chat control, irrespective of which app renderer created
 // it or whether it carries data-sq-tab. Preserve the node for mobile.
 function syncTrackerChatTab(){
  if(!desktop.matches){
   for(const [tab,marker] of detachedChatTabs){
    if(marker.parentNode)marker.parentNode.insertBefore(tab,marker);
    marker.remove();
   }
   detachedChatTabs.clear();
   return;
  }
  const bars=[...document.querySelectorAll('.sq-workspace-tabs,.sq-bills-workspace-tabs,[role="tablist"]')];
  for(const bar of bars){
   const controls=[...bar.querySelectorAll('button,[role="tab"],a')];
   const label=el=>(el.textContent||'').trim().toLowerCase();
   if(!controls.some(el=>label(el)==='overview')||!controls.some(el=>label(el)==='expenses'))continue;
   bar.classList.add('dw-four-tracker-tabs');
   for(const tab of controls){
    if(label(tab)!=='chat'||detachedChatTabs.has(tab))continue;
    const marker=document.createComment('Chat is not in desktop tracker tabs');
    tab.parentNode.insertBefore(marker,tab);
    detachedChatTabs.set(tab,marker);
    tab.remove();
   }
  }
 }
 function visible(el){return !!el&&!!el.getClientRects().length;}
 function enhance(){
  if(busy)return;
  syncTrackerChatTab();
  if(!desktop.matches)return;
  busy=true;
  try{
   const tabs=[...document.querySelectorAll('.sq-workspace-tabs')].find(el=>
    [...el.querySelectorAll('[data-sq-tab]')].some(b=>b.dataset.sqTab==='overview'));
   if(!tabs)return;
   // Chat is not a tracker navigation tab on desktop. The original Chat
   // destination elsewhere in the app remains untouched.
   tabs.classList.add('dw-integrated-tabs');
   const source=$('tracker-select');
   if(!source)return;
   const ask=[...document.querySelectorAll('button,a')].find(el=>visible(el)&&/ask\s+weo/i.test(el.textContent||''));
   if(!ask)return;
   let header=null,search=null;
   for(let el=ask.parentElement,depth=0;el&&depth<8;el=el.parentElement,depth++){
    const rect=el.getBoundingClientRect();
    if(rect.height<40||rect.height>240||rect.width<550)continue;
    const field=el.querySelector('input[type="search"],input[placeholder*="earch"],[role="searchbox"]');
    if(field&&/doweo/i.test(el.textContent||'')){header=el;search=field;break;}
   }
   if(!header||!search)return;
   header.classList.add('dw-integrated-header');
   let searchRoot=search;
   while(searchRoot.parentElement&&searchRoot.parentElement!==header)searchRoot=searchRoot.parentElement;
   searchRoot.classList.add('dw-integrated-search');
   let holder=$('dw-integrated-picker');
   if(!holder){
    holder=document.createElement('div');holder.id='dw-integrated-picker';holder.className='dw-integrated-picker';
    const icon=document.createElementNS('http://www.w3.org/2000/svg','svg');
    icon.classList.add('dw-picker-icon');icon.setAttribute('viewBox','0 0 24 24');icon.setAttribute('fill','none');icon.setAttribute('stroke-linecap','round');icon.setAttribute('stroke-linejoin','round');icon.setAttribute('aria-hidden','true');
    for(const d of ['m3 6 2 2 4-4','M13 6h8','M3 17h3','M10 17h11']){
     const line=document.createElementNS('http://www.w3.org/2000/svg','path');line.setAttribute('d',d);icon.append(line);
    }
    const label=document.createElement('label');label.htmlFor='dw-integrated-tracker-select';label.textContent='Tracker';
    const wrap=document.createElement('div');wrap.className='dw-picker-select-wrap';
    const select=document.createElement('select');select.id='dw-integrated-tracker-select';select.setAttribute('aria-label','Switch tracker');
    const arrow=document.createElementNS('http://www.w3.org/2000/svg','svg');
    arrow.classList.add('dw-picker-chevron');arrow.setAttribute('viewBox','0 0 24 24');arrow.setAttribute('fill','none');arrow.setAttribute('stroke-linecap','round');arrow.setAttribute('stroke-linejoin','round');arrow.setAttribute('aria-hidden','true');
    const chevron=document.createElementNS('http://www.w3.org/2000/svg','path');chevron.setAttribute('d','m6 9 6 6 6-6');arrow.append(chevron);
    wrap.append(select,arrow);holder.append(icon,label,wrap);
    select.addEventListener('change',()=>{source.value=select.value;source.dispatchEvent(new Event('change',{bubbles:true}));});
   }
   if(holder.parentElement!==header||holder.nextElementSibling!==searchRoot)header.insertBefore(holder,searchRoot);
   const mirror=holder.querySelector('select');
   const options=[...source.options].map(o=>[o.value,o.textContent,o.disabled]);
   const signature=JSON.stringify(options);
   if(mirror.dataset.options!==signature){
    mirror.replaceChildren(...[...source.options].map(o=>o.cloneNode(true)));
    mirror.dataset.options=signature;
   }
   if(mirror.value!==source.value)mirror.value=source.value;
   const originalRow=source.closest('.sq-tracker-picker-row,.sq-tracker-selector,.sq-tracker-select-row')||source.parentElement;
   if(originalRow&&originalRow!==header&&!originalRow.contains(tabs))originalRow.classList.add('dw-original-picker-hidden');
  }finally{busy=false;}
 }
 function queue(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;enhance();});}
 new MutationObserver(queue).observe(document.body,{childList:true,subtree:true});
 document.addEventListener('change',queue,true);
 window.addEventListener('load',queue);
 desktop.addEventListener('change',queue);
 queue();
})();
