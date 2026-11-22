/* Convert long desktop tools from centered blocking popups into navigable, full-width
   workspace pages. Existing forms, IDs, handlers and API calls stay in place. */
(function(){
 'use strict';
 const desktop=window.matchMedia('(min-width:901px)');
 const specs=[
  ['new-modal','Create new tracker','Choose a template or start with a blank tracker.','[data-close]'],
  ['manage-modal','Manage trackers','Review, rename or leave your trackers.','[data-close]'],
  ['share-modal','Share tracker','Manage invitations and share access.','[data-close]'],
  ['backdrop-modal','Tracker backdrop','Customize the appearance of this tracker.','[data-close]'],
  ['settle-modal','Settle up','Record a payment against a shared balance.','#settle-close'],
  ['photo-modal','Profile photo','Manage the photo shown to tracker members.','#photo-close'],
  ['sq-quick-calculator','Quick split calculator','Split a total, with tax and tip, without saving.','#sq-calc-close'],
  ['sq-social-modal','DoWeo Social','Wrapped insights and shareable group activity.','#sq-social-close'],
  ['sq-features-overlay','Tracker extras','Goals, attachments and collaborative tools.','#sq-features-close'],
  ['sq-pay-now-modal','Pay Now','Choose a payment destination and amount.','#sq-pay-now-cancel'],
  ['sq-ng-txn-overlay','Add personal transaction','Track private income and spending.','.sq-ng-txn-close'],
  ['sq-details-overlay','Expense details','View activity and manage this expense.','#sq-details-close'],
  ['sq-expense-dialog','Add expense','Record a shared expense.','.sq-action-modal-close'],
  ['sq-receipt-dialog','Scan receipt','Review a receipt and assign purchases.','.sq-action-modal-close'],
  ['dw-legal-standalone','Privacy and Terms','Review DoWeo policies and account terms.','[data-dw-legal-close]']
 ];
 let current=null,storedUrl=null,storedState=null,syncQueued=false,popping=false;
 function setupLegalPage(){
  const trigger=document.getElementById('nav-privacy-terms');
  if(!trigger||document.getElementById('dw-legal-standalone'))return;
  const page=document.createElement('section');
  page.id='dw-legal-standalone';page.hidden=true;
  page.setAttribute('aria-label','Privacy and Terms');
  const cards=document.createElement('div');cards.className='dw-legal-document-cards';
  for(const [name,description,path] of [
   ['Privacy Policy','How DoWeo handles personal information and account data.','/privacy/'],
   ['Terms of Service','The rules and responsibilities for using DoWeo.','/terms/']
  ]){
    const card=document.createElement('a');card.href=path;
    const heading=document.createElement('strong');heading.textContent=name;
    const detail=document.createElement('span');detail.textContent=description;
    const arrow=document.createElement('span');arrow.textContent='View document →';
    card.append(heading,detail,arrow);cards.append(card);
  }
  const close=document.createElement('button');close.type='button';close.hidden=true;close.dataset.dwLegalClose='';
  close.addEventListener('click',()=>{page.hidden=true});
  page.append(cards,close);document.body.append(page);
  document.addEventListener('click',event=>{
    if(!desktop.matches)return;
    if(event.target.closest('#nav-privacy-terms')!==trigger)return;
    event.preventDefault();event.stopImmediatePropagation();
    if(current&&current.el!==page)closeViaOriginal(current.el,current.spec[3]);
    page.hidden=false;requestSync();
  },true);
 }

 const hasOpen=(el,id)=>{
  if(!el||!desktop.matches)return false;
  if(id==='sq-details-overlay')return el.classList.contains('open');
  if(el.classList.contains('modal-bg'))return el.classList.contains('open');
  return !el.hidden&&!el.hasAttribute('hidden')&&el.getAttribute('aria-hidden')!=='true';
 };
 function closeViaOriginal(el,selector){
  const close=el.querySelector(selector)||el.querySelector('[aria-label="Close"]')||el.querySelector('[data-close]');
  if(close){close.click();return}
  el.hidden=true;el.classList.remove('open');el.setAttribute('aria-hidden','true');
 }
 function decorate(el,spec){
  if(el.classList.contains('dw-desktop-standalone'))return;
  const head=document.createElement('header');head.className='dw-standalone-head';
  const back=document.createElement('button');back.type='button';back.className='dw-standalone-back';back.textContent='← Back';
  const copy=document.createElement('div');copy.className='dw-standalone-copy';
  const eyebrow=document.createElement('span');eyebrow.className='dw-standalone-eyebrow';eyebrow.textContent='DOWEO WORKSPACE';
  const title=document.createElement('h1');title.textContent=spec[1];
  const subtitle=document.createElement('p');subtitle.textContent=spec[2];
  copy.append(eyebrow,title,subtitle);head.append(back,copy);el.prepend(head);
  back.addEventListener('click',()=>closeViaOriginal(el,spec[3]));
  el.classList.add('dw-desktop-standalone');
  const dialog=el.matches('[role="dialog"]')?el:el.querySelector('[role="dialog"][aria-modal="true"]');
  if(dialog){dialog.setAttribute('aria-modal','false');dialog.setAttribute('role','region')}
 }
 function release(){
  if(!current)return;
  const old=current;current=null;
  if(storedUrl&&!popping&&location.href!==storedUrl){
   history.replaceState(storedState,'',storedUrl);
  }
  storedUrl=null;storedState=null;
  document.body.classList.remove('dw-standalone-active');
  if(old.el?.isConnected)old.el.querySelector('.dw-standalone-back')?.blur();
 }
 function sync(){
  syncQueued=false;
  if(!desktop.matches){release();return}
  const active=specs.map(spec=>({spec,el:document.getElementById(spec[0])}))
    .find(entry=>hasOpen(entry.el,entry.spec[0]));
  if(!active){release();return}
  decorate(active.el,active.spec);
  if(current?.el===active.el)return;
  if(current)release();
  storedUrl=location.href;storedState=history.state;
  current=active;
  document.body.classList.add('dw-standalone-active');
  try{
   const url=new URL(location.href);
   url.searchParams.set('workspace',active.spec[0].replace(/-modal$|-overlay$|-dialog$/,''));
   history.pushState({dwStandalone:active.spec[0]},'',url.pathname+url.search+url.hash);
  }catch(_){}
 }
 function requestSync(){
  if(syncQueued)return;
  syncQueued=true;
  queueMicrotask(sync);
 }
 window.addEventListener('popstate',()=>{
  if(!current)return;
  if(history.state?.dwStandalone===current.spec[0])return;
  popping=true;
  closeViaOriginal(current.el,current.spec[3]);
  requestSync();
  queueMicrotask(()=>{popping=false});
 });
 desktop.addEventListener('change',requestSync);
 new MutationObserver(requestSync).observe(document.documentElement,{
  subtree:true,childList:true,attributes:true,attributeFilter:['hidden','class','aria-hidden']
 });
 document.addEventListener('DOMContentLoaded',()=>{setupLegalPage();requestSync()},{once:true});
 if(document.readyState!=='loading')setupLegalPage();
 document.addEventListener('click',event=>{
  if(!desktop.matches||!current)return;
  const target=event.target.closest('aside.sidebar button.sq-nav-link,aside.sidebar .dw-nav-social-trigger');
  if(target&&target.id!=='nav-privacy-terms')closeViaOriginal(current.el,current.spec[3]);
 },true);
 requestSync();
})();

/* Mirror the tracker backdrop selected by DoWeo's EXISTING settings.
   It contains either the preset gradient or the authenticated tracker photo
   blob URL; no new storage keys or network calls are introduced. */
(function(){
 'use strict';
 const desktop=window.matchMedia('(min-width:901px)');
 const backdrop=document.getElementById('backdrop');
 if(!backdrop)return;

 /* Keep the original shared X button on mobile. Desktop invitation intentionally
    opts out of the oversized global close-control styling. */
 function syncInstagramClose(){
  const close=document.querySelector('#sq-instagram-invite .sq-ig-x');
  if(close)close.classList.toggle('doweo-close-control',!desktop.matches);
 }
 syncInstagramClose();
 desktop.addEventListener('change',syncInstagramClose);
 const fallback='linear-gradient(135deg,#112b48,#0a1b31)';
 const root=document.documentElement.style;
 function syncWallpaper(){
  if(!desktop.matches)return;
  const image=backdrop.style.backgroundImage;
  const next=image&&image!=='none'?image:fallback;
  if(root.getPropertyValue('--dw-selected-tracker-wallpaper')!==next){
   root.setProperty('--dw-selected-tracker-wallpaper',next);
  }
 }
 syncWallpaper();
 new MutationObserver(syncWallpaper).observe(backdrop,{attributes:true,attributeFilter:['style']});
 desktop.addEventListener('change',syncWallpaper);
 window.addEventListener('squareup:tracker-detail',syncWallpaper);
 document.addEventListener('DOMContentLoaded',syncWallpaper,{once:true});
})();
