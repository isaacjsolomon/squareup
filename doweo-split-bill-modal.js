/* Split a Bill: stable member labels and a genuine scroll-contained popup.
   Existing split calculations, split save handler, backend writes, and mobile steps
   are intentionally reused instead of copied or replaced. */
(function(){
 'use strict';
 const page=document.getElementById('split-page');
 const closeOriginal=document.getElementById('split-back');
 if(!page||!closeOriginal||document.getElementById('dw-split-modal'))return;

 // Ledger names (tracker_members.name) must be used for server writes; the
 // surrounding UI may continue showing the member's friendly profile name.
 const existingLabel=typeof window.splitLabel==='function'?window.splitLabel:null;
 if(existingLabel){
  window.splitLabel=function(ledgerName){
   const tracker=typeof window.squareUpApprovalTracker==='function'?window.squareUpApprovalTracker():null;
   const member=tracker?.members?.find(m=>
    String(m.ledgerName||m.name||'').trim().toLocaleLowerCase()===String(ledgerName||'').trim().toLocaleLowerCase()
   );
   if(member){
    const display=String(member.name||member.ledgerName||ledgerName).trim();
    return member.isYou?'You ('+display+')':display;
   }
   return existingLabel(ledgerName);
  };
 }

 const originalPosition=document.createComment('Split a Bill original position');
 page.before(originalPosition);
 const overlay=document.createElement('div');
 overlay.id='dw-split-modal';
 overlay.setAttribute('role','dialog');
 overlay.setAttribute('aria-label','Split a Bill');
 overlay.setAttribute('aria-modal','true');
 overlay.hidden=true;
 const close=document.createElement('button');
 close.id='dw-split-modal-close';
 close.type='button';
 close.setAttribute('aria-label','Close Split a Bill');
 close.textContent='×';
 page.prepend(close);
 overlay.append(page);
 document.body.append(overlay);

 let shown=false,focusBefore=null;
 const isSaving=()=>Boolean(window.splitState?.saving);
 function dismiss(){
  if(isSaving())return;
  closeOriginal.click(); // Preserves the original hash and split view cleanup.
 }
 close.addEventListener('click',dismiss);
 overlay.addEventListener('pointerdown',event=>{
  if(event.target===overlay)dismiss();
 });
 overlay.addEventListener('keydown',event=>{
  if(event.key==='Escape'){
   event.preventDefault();
   event.stopPropagation();
   dismiss();
   return;
  }
  if(event.key!=='Tab')return;
  const available=[...overlay.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href]')]
   .filter(el=>el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden');
  if(!available.length)return;
  const first=available[0],last=available[available.length-1];
  if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}
  else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}
 });
 function sync(){
  const active=document.body.classList.contains('split-view');
  overlay.hidden=!active;
  document.body.classList.toggle('dw-split-modal-open',active);
  if(active&&!shown){
   focusBefore=document.activeElement;
   page.scrollTop=0;
   requestAnimationFrame(()=>{if(!overlay.hidden)close.focus({preventScroll:true})});
  }
  if(!active&&shown){
   if(focusBefore?.isConnected&&typeof focusBefore.focus==='function')focusBefore.focus({preventScroll:true});
   focusBefore=null;
  }
  shown=active;
 }
 new MutationObserver(sync).observe(document.body,{attributes:true,attributeFilter:['class']});
 new MutationObserver(()=>{
  if(!overlay.hidden)page.scrollTop=0;
 }).observe(page,{attributes:true,attributeFilter:['data-split-step']});
 sync();
})();
