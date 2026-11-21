/* DoWeo desktop first-run guide. All preview data is local and read-only.
 * Uses the existing tracker creation, sharing and expense buttons.
 * Never inserts example records, creates financial entries or changes mobile. */
(function(){
 'use strict';
 const desktop=window.matchMedia('(min-width: 901px)');
 if(!desktop.matches)return; // Never initialize onboarding controls on mobile.
 const gallery=document.getElementById('trackers-gallery');
 const trackersPage=document.getElementById('trackers-page');
 const dashboard=document.getElementById('tracker-dashboard');
 const header=trackersPage?.querySelector('.trackers-header');
 if(!gallery||!trackersPage||!header||!dashboard)return;

 const make=(tag,cls,text)=>{
   const el=document.createElement(tag);
   if(cls)el.className=cls;
   if(text!==undefined)el.textContent=text;
   return el;
 };
 const steps=[
   {title:'Create a tracker',description:'Keep one group of shared expenses together.',action:'Create tracker'},
   {title:'Invite your people',description:'Share a tracker with the friends you split with.',action:'Share tracker'},
   {title:'Add your first expense',description:'Record who paid and how you want to split it.',action:'Add expense'},
   {title:'Settle up',description:'See who owes whom, then record payments when they happen.',action:'View balance'}
 ];
 const preview=[
   {title:'Example tracker',tag:'A sample, not a saved tracker',text:'Imagine a weekend trip with three people: Avery, Blake, and Casey. You can group shared costs in one place.'},
   {title:'Example expense',tag:'Dinner · $60.00',text:'Avery paid $60.00. The bill is split equally among three people, so each share is $20.00.'},
   {title:'Example balances',tag:'What the group owes',text:'Blake owes Avery $20.00, and Casey owes Avery $20.00. The example contains no real debts or payments.'}
 ];
 let initialized=false, galleryHadTrackers=false, dismissed=false, returnFocus=null, step=0, mode='tour', beforeOverflow='';
 const manual=new Set();

 const openButton=make('button','dw-first-run-open','Getting started');
 openButton.type='button';openButton.id='dw-first-run-open';openButton.hidden=true;
 header.append(openButton);

 const card=make('section','dw-first-run-card');
 card.id='dw-first-run';card.hidden=true;card.setAttribute('aria-label','Getting started with DoWeo');
 const top=make('div','dw-first-run-top');
 const copy=make('div','');
 copy.append(make('span','dw-first-run-eyebrow','NEW TO DOWEO'),make('h2','','Your first split, made simple'),make('p','','Follow these steps when you are ready. Nothing is saved until you use a real DoWeo action.'));
 const dismiss=make('button','dw-first-run-dismiss','Dismiss');dismiss.type='button';
 top.append(copy,dismiss);
 const progress=make('p','dw-first-run-progress');progress.setAttribute('role','status');
 const list=make('ol','dw-first-run-steps');
 const rowInputs=[];
 const actionButtons=[];
 steps.forEach((spec,index)=>{
   const item=make('li','dw-first-run-step');
   const label=make('label','dw-first-run-step-label');
   const check=document.createElement('input');check.type='checkbox';check.setAttribute('aria-label',spec.title+' completed');
   if(index===0){check.disabled=true;check.setAttribute('title','Completed automatically when you create a tracker');}
   const text=make('span','dw-first-run-step-text');
   text.append(make('strong','',spec.title),make('small','',spec.description));
   label.append(check,text);
   const action=make('button','dw-first-run-step-action',spec.action);action.type='button';
   item.append(label,action);list.append(item);
   rowInputs.push(check);actionButtons.push(action);
   if(index>0)check.addEventListener('change',()=>{if(check.checked)manual.add(index);else manual.delete(index);updateProgress()});
 });
 const actions=make('div','dw-first-run-actions');
 const tour=make('button','dw-first-run-primary','Take the 4-step tour');tour.type='button';
 const example=make('button','dw-first-run-secondary','Preview an example tracker');example.type='button';
 actions.append(tour,example);
 card.append(top,progress,list,actions);
 header.after(card);

 const homePrompt=make('section','dw-first-run-home');
 homePrompt.id='dw-first-run-prompt';
 homePrompt.hidden=true;
 homePrompt.setAttribute('aria-label','Getting started');
 homePrompt.append(make('div','dw-first-run-home-copy','New to DoWeo? Try the first steps or preview a sample tracker.'));
 const promptActions=make('div','dw-first-run-home-actions');
 const start=make('button','dw-first-run-primary','Get started');start.type='button';
 const promptExample=make('button','dw-first-run-secondary','See example');promptExample.type='button';
 promptActions.append(start,promptExample);homePrompt.append(promptActions);
 const summary=document.getElementById('sq-return-summary');
 if(summary)summary.before(homePrompt);else dashboard.prepend(homePrompt);

 const overlay=make('div','dw-first-run-overlay');overlay.id='dw-first-run-overlay';overlay.hidden=true;
 const dialog=make('section','dw-first-run-dialog');
 dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');
 dialog.setAttribute('aria-labelledby','dw-first-run-dialog-title');
 dialog.setAttribute('aria-describedby','dw-first-run-dialog-description');
 const close=make('button','dw-first-run-close','×');close.type='button';close.setAttribute('aria-label','Close guide');
 const kicker=make('span','dw-first-run-dialog-kicker');
 const title=make('h2','');title.id='dw-first-run-dialog-title';
 const tag=make('strong','dw-first-run-dialog-tag');
 const description=make('p','');description.id='dw-first-run-dialog-description';
 const exampleVisual=make('div','dw-first-run-example');
 const foot=make('div','dw-first-run-dialog-foot');
 const back=make('button','dw-first-run-secondary','Back');back.type='button';
 const next=make('button','dw-first-run-primary','Next');next.type='button';
 foot.append(back,next);
 dialog.append(close,kicker,title,tag,description,exampleVisual,foot);overlay.append(dialog);
 document.body.append(overlay);

 function updateProgress(){
   rowInputs[0].checked=galleryHadTrackers;
   let n=Number(galleryHadTrackers);
   for(let i=1;i<rowInputs.length;i++)n+=Number(rowInputs[i].checked);
   progress.textContent=n+' of 4 steps complete';
   card.classList.toggle('dw-first-run-complete',n===4);
   for(let i=0;i<rowInputs.length;i++)list.children[i].classList.toggle('dw-first-run-done',rowInputs[i].checked);
   actionButtons[1].disabled=!galleryHadTrackers;
   actionButtons[2].disabled=!galleryHadTrackers;
   actionButtons[3].disabled=!galleryHadTrackers;
 }
 function canShow(){return desktop.matches&&!document.body.classList.contains('sq-auth-guest')&&!document.documentElement.classList.contains('sq-auth-loading')&&document.getElementById('onboarding-page')?.hidden!==false;}
 function showPanel(){if(!canShow())return;dismissed=false;card.hidden=false;homePrompt.hidden=true;}
 function hidePanel(){card.hidden=true;dismissed=true;homePrompt.hidden=!(!galleryHadTrackers&&canShow());}
 function openGuide(selected){
   if(!canShow())return;
   mode=selected;step=0;returnFocus=document.activeElement;
   beforeOverflow=document.body.style.overflow;
   overlay.hidden=false;
   document.body.style.overflow='hidden';
   paint();
   close.focus({preventScroll:true});
 }
 function closeGuide(){
   overlay.hidden=true;
   document.body.style.overflow=beforeOverflow;
   if(returnFocus?.isConnected)returnFocus.focus({preventScroll:true});
 }
 function paint(){
   const data=mode==='tour'?steps:preview;
   const current=data[step];
   kicker.textContent=(mode==='tour'?'GETTING STARTED':'EXAMPLE ONLY')+' · '+(step+1)+' / '+data.length;
   title.textContent=current.title;
   description.textContent=mode==='tour'?current.description:current.text;
   tag.hidden=mode!=='sample';
   tag.textContent=mode==='sample'?current.tag:'';
   exampleVisual.hidden=mode!=='sample';
   exampleVisual.replaceChildren();
   if(mode==='sample'){
     const people=['Avery','Blake','Casey'];
     const dataRows=step===0?['Avery  ·  Owner','Blake  ·  Member','Casey  ·  Member']:
       step===1?['Dinner  ·  $60.00','Paid by Avery','3 equal shares  ·  $20.00']:
       ['Blake → Avery  ·  $20.00','Casey → Avery  ·  $20.00','Example balances only'];
     for(const row of dataRows)exampleVisual.append(make('div','dw-first-run-example-row',row));
   }
   back.disabled=step===0;next.textContent=step===data.length-1?'Finish':'Next';
 }
 function isReady(){
   return Boolean(gallery.querySelector('.dw-guided-empty')||gallery.querySelector('.tracker-tile'));
 }
 function sync(){
   const allowed=canShow();
   openButton.hidden=!allowed;
   if(!allowed){card.hidden=true;homePrompt.hidden=true;if(!overlay.hidden)closeGuide();return;}
   if(!isReady())return;
   const empty=gallery.querySelector('.dw-guided-empty');
   galleryHadTrackers=Boolean(gallery.querySelector('.tracker-tile'));
   if(!initialized){
     initialized=true;
     card.hidden=galleryHadTrackers;
   }else if(galleryHadTrackers && card.hidden===false){
     // Keep the checklist on screen so users can continue after first creation.
   }else if(!dismissed&&!galleryHadTrackers){
     card.hidden=false;
   }
   homePrompt.hidden=!!(galleryHadTrackers||dismissed);
   updateProgress();
   // Enhance the existing empty-state CTA rather than replace its handlers.
   if(empty&&!empty.querySelector('.dw-first-run-example-link')){
     const previewLink=make('button','dw-guided-empty-action dw-first-run-example-link','Preview a sample tracker');
     previewLink.type='button';previewLink.addEventListener('click',()=>openGuide('sample'));
     empty.append(previewLink);
   }
 }
 function navigate(id){
   if(!desktop.matches)return;
   const control=document.getElementById(id);
   if(control&&!control.disabled)control.click();
 }
 function action(index){
   if(index===0){navigate('tracker-gallery-new');return;}
   if(!galleryHadTrackers)return;
   if(index===1){navigate('tb-share');return;}
   if(index===2){navigate('nav-home');navigate('quick-expense');return;}
   if(index===3){navigate('nav-home');navigate('sq-clean-settle');}
 }
 actionButtons.forEach((button,index)=>button.addEventListener('click',()=>action(index)));
 start.addEventListener('click',()=>{navigate('nav-trackers');showPanel();card.scrollIntoView({block:'start',behavior:'auto'})});
 openButton.addEventListener('click',()=>{if(card.hidden)showPanel();else hidePanel()});
 dismiss.addEventListener('click',hidePanel);
 tour.addEventListener('click',()=>openGuide('tour'));
 example.addEventListener('click',()=>openGuide('sample'));
 promptExample.addEventListener('click',()=>openGuide('sample'));
 close.addEventListener('click',closeGuide);
 back.addEventListener('click',()=>{step=Math.max(0,step-1);paint()});
 next.addEventListener('click',()=>{const length=mode==='tour'?steps.length:preview.length;if(step<length-1){step++;paint()}else closeGuide()});
 overlay.addEventListener('click',event=>{if(event.target===overlay)closeGuide()});
 document.addEventListener('keydown',event=>{
   if(overlay.hidden)return;
   if(event.key==='Escape'){event.preventDefault();closeGuide();return;}
   if(event.key!=='Tab')return;
   const controls=[close,back,next].filter(b=>!b.disabled);
   const index=controls.indexOf(document.activeElement);
   if(event.shiftKey&&index===0){event.preventDefault();controls[controls.length-1].focus()}
   else if(!event.shiftKey&&index===controls.length-1){event.preventDefault();controls[0].focus()}
 });
 const observer=new MutationObserver(()=>{if(!desktop.matches)return;queueMicrotask(sync)});
 observer.observe(gallery,{childList:true,subtree:true});
 // Recheck on sign-in, when tracker gallery arrives, and on desktop viewport.
 const authObserver=new MutationObserver(sync);
 authObserver.observe(document.body,{attributes:true,attributeFilter:['class']});
 authObserver.observe(document.documentElement,{attributes:true,attributeFilter:['class']});
 desktop.addEventListener('change',()=>{sync()});
 sync();
})();
