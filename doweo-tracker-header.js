/* Enhance existing tracker controls without replacing the original dashboard. */
(()=>{'use strict';
 const desktop=window.matchMedia('(min-width:901px)');
 const $=id=>document.getElementById(id);
 let busy=false,queued=false;
 function visible(el){return !!el&&!!el.getClientRects().length;}
 function enhance(){
  if(busy||!desktop.matches)return;
  busy=true;
  try{
   const tabs=[...document.querySelectorAll('.sq-workspace-tabs')].find(el=>
    [...el.querySelectorAll('[data-sq-tab]')].some(b=>b.dataset.sqTab==='overview'));
   if(!tabs)return;
   const keys=['overview','expenses','bills','members','chat'];
   const existing=[...tabs.querySelectorAll('button[data-sq-tab]')];
   const buttons=keys.map(key=>existing.find(b=>b.dataset.sqTab===key));
   if(!buttons[4]){
    const chat=document.createElement('button');
    chat.type='button';chat.dataset.sqTab='chat';chat.setAttribute('role','tab');chat.setAttribute('aria-selected','false');
    chat.textContent='Chat';chat.className='dw-added-chat-tab';
    chat.addEventListener('click',()=>{
     const target=$('nav-chat')||document.querySelector('[data-sq-destination="nav-chat"]');
     if(target)target.click();
    });
    tabs.append(chat);
   }
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


/* Desktop sidebar: six primary destinations, original actions retained. */
(()=>{
 'use strict';
 const desktop=matchMedia('(min-width:901px)');
 let scheduled=false,updating=false;
 const original=id=>document.getElementById(id);
 function findNav(){
  return document.querySelector('.sidebar .squareup-nav');
 }
 function iconMarkup(id,fallback){
  const originalButton=original(id);
  const svg=originalButton?.querySelector('svg');
  return svg?svg.outerHTML:fallback;
 }
 function clickOriginal(id){
  const el=original(id);
  if(el)el.click();
 }
 function compactButton(label,icon,handler){
  const b=document.createElement('button');
  b.type='button';b.className='dw-sidebar-subitem';
  b.innerHTML=icon+'<span>'+label+'</span>';
  b.addEventListener('click',handler);
  return b;
 }
 function mount(){
  if(updating||!desktop.matches)return;
  const nav=findNav();
  const finance=original('sq-finance-nav'),analytics=original('nav-analytics');
  const friends=original('nav-friends'),chat=original('nav-chat');
  const more=nav?.querySelector('details[data-dw-nav-group="more"]');
  if(!nav||!finance||!analytics||!friends||!chat||!more)return;
  updating=true;
  try{
   if(!nav.querySelector('#dw-desktop-finance-more')){
    const panel=document.createElement('div');
    panel.id='dw-desktop-finance-more';
    panel.className='dw-sidebar-finance-panel';
    const toggle=document.createElement('button');
    toggle.type='button';toggle.className='dw-sidebar-finance-toggle';
    toggle.setAttribute('aria-label','Show Finance Hub sections');
    toggle.setAttribute('aria-expanded','false');
    toggle.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>';
    const submenu=document.createElement('div');
    submenu.className='dw-sidebar-finance-submenu';submenu.hidden=true;
    submenu.append(compactButton('Analytics',iconMarkup('nav-analytics',''),()=>{
     clickOriginal('nav-analytics');submenu.hidden=true;toggle.setAttribute('aria-expanded','false');
    }));
    toggle.addEventListener('click',()=>{
     submenu.hidden=!submenu.hidden;
     toggle.setAttribute('aria-expanded',String(!submenu.hidden));
    });
    panel.append(toggle,submenu);
    finance.insertAdjacentElement('afterend',panel);
   }
   if(!nav.querySelector('#dw-desktop-social')){
    const social=document.createElement('details');
    social.id='dw-desktop-social';social.className='dw-sidebar-social';
    const summary=document.createElement('summary');
    summary.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg><span>Social</span><svg class="dw-social-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>';
    const submenu=document.createElement('div');submenu.className='dw-sidebar-social-submenu';
    submenu.append(
     compactButton('Friends',iconMarkup('nav-friends',''),()=>{clickOriginal('nav-friends');social.open=false;}),
     compactButton('Chat',iconMarkup('nav-chat',''),()=>{clickOriginal('nav-chat');social.open=false;})
    );
    social.append(summary,submenu);
    more.insertAdjacentElement('beforebegin',social);
   }
   nav.classList.add('dw-desktop-sidebar-compact');
  }finally{updating=false;}
 }
 function queue(){
  if(scheduled||!desktop.matches)return;
  scheduled=true;requestAnimationFrame(()=>{scheduled=false;mount();});
 }
 const target=document.querySelector('.sidebar .squareup-nav');
 if(target)new MutationObserver(queue).observe(target,{childList:true});
 document.addEventListener('DOMContentLoaded',queue,{once:true});
 window.addEventListener('load',queue);
 desktop.addEventListener('change',queue);
 queue();
})();
