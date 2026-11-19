/* Desktop tracker Overview: replace the existing + Add expense shortcut with
   a real menu wired to DoWeo's original expense/receipt/split flows. */
(function(){
 'use strict';
 const desktop=window.matchMedia('(min-width:901px)');
 const retiredNavSelector='#trackers-page > nav.dw-section-tabs[aria-label="Tracker sections"]';
 function removeRetiredNav(){
  if(desktop.matches)document.querySelector(retiredNavSelector)?.remove();
 }
 removeRetiredNav();
 desktop.addEventListener('change',removeRetiredNav);

 let installed=false,observer;
 function install(){
  if(installed||!desktop.matches)return installed;
  const old=document.getElementById('dw-compact-add');
  if(!old||!old.isConnected)return false;
  // Clone intentionally: the original button's direct Add Expense click handler
  // must not also fire when opening the menu.
  const toggle=old.cloneNode(true);
  toggle.textContent='+ Add expense';
  toggle.type='button';
  toggle.setAttribute('aria-haspopup','menu');
  toggle.setAttribute('aria-expanded','false');
  toggle.setAttribute('aria-controls','dw-compact-add-menu');
  const caret=document.createElement('span');
  caret.className='dw-compact-add-caret';
  caret.setAttribute('aria-hidden','true');
  caret.textContent='⌄';
  toggle.append(caret);
  const holder=document.createElement('div');
  holder.id='dw-compact-add-wrapper';
  holder.append(toggle);
  old.replaceWith(holder);

  const menu=document.createElement('div');
  menu.id='dw-compact-add-menu';
  menu.setAttribute('role','menu');
  menu.setAttribute('aria-label','Add expense actions');
  menu.hidden=true;
  const choices=[
   {id:'quick-expense',icon:'+',name:'Add expense',description:'Manually add an expense'},
   {id:'quick-receipt',icon:'▤',name:'Scan receipt',description:'Assign items to friends'},
   {id:'quick-split',icon:'%',name:'Split a bill',description:'Divide an expense with friends'}
  ];
  for(const choice of choices){
   const option=document.createElement('button');
   option.type='button';
   option.setAttribute('role','menuitem');
   option.dataset.expenseAction=choice.id;
   const mark=document.createElement('span');
   mark.className='dw-compact-add-option-icon';
   mark.textContent=choice.icon;
   mark.setAttribute('aria-hidden','true');
   const text=document.createElement('span');
   text.className='dw-compact-add-option-text';
   const title=document.createElement('strong');title.textContent=choice.name;
   const subtitle=document.createElement('small');subtitle.textContent=choice.description;
   text.append(title,subtitle);option.append(mark,text);
   option.addEventListener('click',()=>{
    if(option.disabled)return;
    const target=document.getElementById(choice.id);
    if(!target||target.disabled){close();return}
    close();
    // The existing receipt tool opens the review dialog and native file picker.
    // The split tool opens its real itemized bill page.
    if((choice.id==='quick-receipt'||choice.id==='quick-split')&&typeof window.dwOpenExpenseTool==='function'){
     window.dwOpenExpenseTool(choice.id);
    }else{
     target.click();
    }
   });
   menu.append(option);
  }
  document.body.append(menu);

  function close(focusToggle=false){
   menu.hidden=true;
   toggle.setAttribute('aria-expanded','false');
   if(focusToggle&&toggle.isConnected&&desktop.matches)toggle.focus({preventScroll:true});
  }
  function position(){
   if(menu.hidden)return;
   const bounds=toggle.getBoundingClientRect();
   const width=Math.min(330,Math.max(250,window.innerWidth-24));
   menu.style.width=width+'px';
   const left=Math.max(12,Math.min(window.innerWidth-width-12,bounds.right-width));
   menu.style.left=left+'px';
   const roomBelow=window.innerHeight-bounds.bottom;
   const estimated=Math.min(menu.scrollHeight,window.innerHeight-24);
   const above=roomBelow<estimated+12&&bounds.top>estimated+12;
   menu.style.top=(above?Math.max(12,bounds.top-estimated-8):Math.min(window.innerHeight-42,bounds.bottom+8))+'px';
   menu.style.maxHeight=Math.max(100,above?bounds.top-22:window.innerHeight-bounds.bottom-20)+'px';
  }
  function open(focusFirst=false,focusLast=false){
   if(!desktop.matches)return;
   for(const option of menu.querySelectorAll('[data-expense-action]')){
    const action=document.getElementById(option.dataset.expenseAction);
    option.disabled=!action||action.disabled;
   }
   menu.hidden=false;
   toggle.setAttribute('aria-expanded','true');
   position();
   if(focusFirst||focusLast){
    const active=[...menu.querySelectorAll('button:not(:disabled)')];
    if(active.length)(focusLast?active[active.length-1]:active[0]).focus({preventScroll:true});
   }
  }
  toggle.addEventListener('click',()=>{
   if(menu.hidden)open();
   else close();
  });
  toggle.addEventListener('keydown',event=>{
   if(event.key==='ArrowDown'||event.key==='ArrowUp'){
    event.preventDefault();open(event.key==='ArrowDown',event.key==='ArrowUp');
   }else if(event.key==='Escape'&&!menu.hidden){event.preventDefault();close(true)}
  });
  menu.addEventListener('keydown',event=>{
   if(event.key==='Escape'){event.preventDefault();close(true);return}
   if(!['ArrowDown','ArrowUp','Home','End'].includes(event.key))return;
   event.preventDefault();
   const available=[...menu.querySelectorAll('button:not(:disabled)')];
   if(!available.length)return;
   const current=available.indexOf(document.activeElement);
   let next=0;
   if(event.key==='End')next=available.length-1;
   else if(event.key==='ArrowUp')next=(current<=0?available.length:current)-1;
   else if(event.key==='ArrowDown')next=(current+1)%available.length;
   available[next].focus({preventScroll:true});
  });
  document.addEventListener('pointerdown',event=>{
   if(!menu.hidden&&!holder.contains(event.target)&&!menu.contains(event.target))close();
  });
  document.addEventListener('keydown',event=>{
   if(event.key==='Escape'&&!menu.hidden){event.preventDefault();close(true)}
  });
  window.addEventListener('resize',()=>{if(!desktop.matches)close();else position()});
  window.addEventListener('scroll',event=>{
   if(!menu.hidden&&!menu.contains(event.target))close();
  },true);
  desktop.addEventListener('change',()=>{close();removeRetiredNav()});
  installed=true;
  return true;
 }
 if(!install()){
  observer=new MutationObserver(()=>{
   removeRetiredNav();
   if(install())observer.disconnect();
  });
  observer.observe(document.body,{childList:true,subtree:true});
  document.addEventListener('DOMContentLoaded',()=>{if(install())observer.disconnect()},{once:true});
 }
})();
