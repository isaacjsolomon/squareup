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
    const label=document.createElement('label');label.htmlFor='dw-integrated-tracker-select';label.textContent='Tracker';
    const select=document.createElement('select');select.id='dw-integrated-tracker-select';select.setAttribute('aria-label','Switch tracker');
    holder.append(label,select);
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
