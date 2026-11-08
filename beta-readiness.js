/* DoWeo beta-readiness enhancements. No payment writes or automatic reminder sending. */
(()=>{
  'use strict';
  const $=id=>document.getElementById(id);
  const STORAGE_PREFIX='dw-first-steps-v1:';
  function userKey(){
    const u=typeof currentUser!=='undefined'?currentUser:null;
    return u?.id?STORAGE_PREFIX+u.id:null;
  }
  function getSteps(){
    const key=userKey();if(!key)return null;
    try{return JSON.parse(localStorage.getItem(key)||'null')}catch{return null}
  }
  function saveSteps(state){
    const key=userKey();if(!key)return;
    try{localStorage.setItem(key,JSON.stringify(state))}catch(_){}
  }
  const tasks=[
    {title:'Create or open a tracker',desc:'Use a shared space to keep group expenses together.',target:'nav-trackers'},
    {title:'Explore expenses',desc:'See where group balances and transaction history live.',target:'expenses'},
    {title:'Explore your Finance Hub',desc:'Your private finances are separate from shared tracker debts.',target:'sq-finance-nav'}
  ];
  let onboardingPending=false;
  const form=$('onboard-form');
  if(form){
    form.addEventListener('submit',()=>{
      if(form.checkValidity())onboardingPending=true;
    });
    const page=$('onboarding-page');
    const observer=new MutationObserver(()=>{
      if(!onboardingPending||!page.hidden)return;
      onboardingPending=false;
      // Save only after the existing profile setup closes successfully.
      if(userKey()&&!getSteps()){
        saveSteps({completed:[],dismissed:false});
        $('nav-home')?.click();
        renderChecklist();
      }
    });
    if(page)observer.observe(page,{attributes:true,attributeFilter:['hidden']});
  }
  function renderChecklist(){
    const dashboard=$('tracker-dashboard');
    if(!dashboard)return;
    let section=$('dw-first-steps');
    const state=getSteps();
    if(!state||state.dismissed){
      section?.remove();return;
    }
    if(!section){
      section=document.createElement('section');
      section.id='dw-first-steps';
      section.setAttribute('aria-label','Getting started checklist');
      const tabs=dashboard.querySelector('.sq-workspace-tabs');
      tabs?.insertAdjacentElement('afterend',section);
    }
    section.replaceChildren();
    const title=document.createElement('div');
    title.className='dw-first-title';
    const heading=document.createElement('div');
    const h=document.createElement('h2');h.textContent='Get started with DoWeo';
    const p=document.createElement('p');p.textContent=state.completed.length+' of '+tasks.length+' steps explored · No sample expenses will be created.';
    heading.append(h,p);
    const close=document.createElement('button');close.type='button';close.textContent='Dismiss';close.setAttribute('aria-label','Dismiss getting started checklist');
    close.addEventListener('click',()=>{state.dismissed=true;saveSteps(state);renderChecklist()});
    title.append(heading,close);section.append(title);
    tasks.forEach((t,i)=>{
      const row=document.createElement('button');row.type='button';row.className='dw-first-step';
      const done=state.completed.includes(i);
      const mark=document.createElement('span');mark.className='dw-first-mark';mark.textContent=done?'✓':String(i+1);
      const details=document.createElement('span');const strong=document.createElement('strong');strong.textContent=t.title;const small=document.createElement('small');small.textContent=t.desc;details.append(strong,small);
      row.append(mark,details);
      if(done)row.classList.add('done');
      row.addEventListener('click',()=>{
        if(!state.completed.includes(i)){state.completed.push(i);saveSteps(state);}
        renderChecklist();
        if(t.target==='expenses'){
          $('nav-home')?.click();
          document.querySelector('#tracker-dashboard [data-sq-tab="expenses"]')?.click();
        }else $(t.target)?.click();
      });
      section.append(row);
    });
    if(state.completed.length===tasks.length){
      const finished=document.createElement('p');finished.className='dw-first-finish';finished.textContent='You have explored the essentials. Dismiss this checklist whenever you are ready.';section.append(finished);
    }
  }
  const tour=$('sq-replay-tour');
  if(tour){
    const replay=document.createElement('button');replay.type='button';replay.className='sq-header-tour-btn';replay.textContent='Getting started checklist';
    replay.addEventListener('click',()=>{
      if(!userKey())return;
      saveSteps({completed:[],dismissed:false});
      $('nav-home')?.click();renderChecklist();
    });
    tour.insertAdjacentElement('afterend',replay);
  }
  // Add dated, read-only reminders beside the existing Smart Settle-Up list.
  const settleList=$('smart-settle-list');
  function renderDates(){
    const card=$('smart-settle-card');
    const detail=window.sqLastOpenedTrackerDetail;
    if(!card||!detail||!Array.isArray(detail.entries))return;
    let area=$('dw-payment-dates');
    if(!area){
      area=document.createElement('section');area.id='dw-payment-dates';
      const body=card.querySelector('.tracker-collapsible-body');
      body?.append(area);
    }
    if(!area)return;
    area.replaceChildren();
    const header=document.createElement('h3');header.textContent='Payment due dates';area.append(header);
    const caption=document.createElement('p');caption.textContent='Dates saved on expenses. These are not live overdue balances; check settlement history before sending a reminder.';area.append(caption);
    const dated=detail.entries.filter(e=>e.type==='debt'&&e.dueDate&&(!e.paymentStatus||e.paymentStatus==='confirmed'))
      .map(e=>({e,time:Date.parse(String(e.dueDate).slice(0,10)+'T12:00:00')}))
      .filter(x=>Number.isFinite(x.time)).sort((a,b)=>a.time-b.time).slice(0,5);
    if(!dated.length){
      const empty=document.createElement('p');empty.textContent='No scheduled due dates in this tracker.';area.append(empty);return;
    }
    const members=Array.isArray(detail.members)?detail.members:[];
    dated.forEach(({e,time})=>{
      const row=document.createElement('div');row.className='dw-due-row';
      const info=document.createElement('div');
      const label=document.createElement('strong');label.textContent=(e.note||'Shared expense').slice(0,80);
      const extra=document.createElement('small');extra.textContent=new Date(time).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'})+' · '+Number(e.amount||0).toLocaleString(undefined,{style:'currency',currency:'USD'});
      info.append(label,extra);row.append(info);
      const creditor=members.find(m=>String(m.name||m.email).trim().toLowerCase()===String(e.to||'').trim().toLowerCase());
      const debtor=members.find(m=>String(m.name||m.email).trim().toLowerCase()===String(e.from||'').trim().toLowerCase());
      if(creditor?.isYou&&debtor?.email){
        const button=document.createElement('button');button.type='button';button.textContent='Draft reminder';
        button.addEventListener('click',()=>window.squareUpSendReminder?.(e.from,e.to,e.amount));
        row.append(button);
      }
      area.append(row);
    });
  }
  if(settleList){
    new MutationObserver(()=>renderDates()).observe(settleList,{childList:true,subtree:false});
  }
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){renderDates();renderChecklist()}});
  setInterval(renderDates,20000);
  // The initial authenticated state can arrive after this script executes.
  setTimeout(()=>{renderChecklist();renderDates()},1500);
})();
