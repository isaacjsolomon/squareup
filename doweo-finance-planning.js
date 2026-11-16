/* DoWeo Planning: compact Finance Hub extension, preserving existing tabs. */
(function(){
 'use strict';
 const root=document.getElementById('sq-nextgen');
 const tabs=root?.querySelector('.sq-ng-tabs');
 const shell=root?.querySelector('.sq-ng-shell');
 if(!root||!tabs||!shell||document.getElementById('dw-planning-launch'))return;
 function toolsBar(){
  let host=document.getElementById('dw-finance-extras');
  if(!host){
   host=document.createElement('div');host.id='dw-finance-extras';host.setAttribute('aria-label','Additional finance tools');
   host.style.cssText='display:flex;flex-wrap:wrap;gap:9px;align-items:center;margin:10px 0 13px;max-width:100%;';
   tabs.after(host);
   host.addEventListener('click',event=>{
    const active=event.target.closest('button')?.id;
    const panels={'dw-planning-launch':'dw-planning-pane','dw-trip-plus-launch':'dw-trip-plus','dw-paylink-launch':'dw-paylink-pane'};
    for(const [launcher,panel] of Object.entries(panels)){
     if(launcher===active)continue;
     const el=document.getElementById(panel),button=document.getElementById(launcher);
     if(el)el.hidden=true;
     button?.setAttribute('aria-pressed','false');
    }
   });
  }
  return host;
 }
 const style=document.createElement('style');
 style.textContent=`
 #dw-planning-launch{border:1px solid #4a7e88;border-radius:12px;background:#153849;color:#e7f9fa;min-height:44px;padding:10px 16px;font-weight:750;cursor:pointer}
 #dw-planning-launch[aria-pressed=true]{background:#117f82;border-color:#3cddc5;color:white}
 #dw-planning-pane[hidden]{display:none!important}
 #dw-planning-pane{margin:18px 0 0;padding:20px;max-width:100%;box-sizing:border-box;background:#0e2b40;border:1px solid #3a6577;border-radius:19px;color:#effaff}
 #dw-planning-pane .dw-plan-row{display:flex;gap:12px;justify-content:space-between;align-items:center;flex-wrap:wrap}
 #dw-planning-pane h2{font-size:22px;margin:0 0 6px;color:#f5fcff}
 #dw-planning-pane p{color:#acc8d3;font-size:13px;line-height:1.5;margin:4px 0 14px}
 #dw-planning-pane .dw-plan-tabs{display:flex;gap:8px;margin:16px 0;flex-wrap:wrap}
 #dw-planning-pane button,#dw-planning-pane select,#dw-planning-pane input{font:inherit;border:1px solid #426c7e;background:#102f43;color:#effaff;border-radius:11px;min-height:43px;padding:10px 12px;max-width:100%;box-sizing:border-box}
 #dw-planning-pane button{cursor:pointer;font-weight:700}
 #dw-planning-pane button.dw-primary{background:#21ceb6;border-color:#21ceb6;color:#042d38}
 #dw-planning-pane button:disabled{opacity:.6;cursor:wait}
 #dw-planning-pane .dw-plan-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin:12px 0}
 #dw-planning-pane label{display:flex;flex-direction:column;gap:6px;font-size:12px;font-weight:700;color:#bdd9e5}
 #dw-planning-pane .dw-plan-cards{display:grid;gap:10px;margin:16px 0}
 #dw-planning-pane .dw-plan-card{border-radius:13px;background:#14394e;border:1px solid #355f71;padding:14px;overflow-wrap:anywhere}
 #dw-planning-pane .dw-plan-card strong{font-size:15px}
 #dw-planning-pane .dw-plan-progress{height:7px;background:#244d60;border-radius:20px;overflow:hidden;margin:10px 0 4px}
 #dw-planning-pane .dw-plan-progress span{display:block;height:100%;background:#33dac2;border-radius:20px}
 #dw-planning-pane .dw-plan-status{font-size:12px;min-height:18px;color:#d5f9f2}
 @media(max-width:700px){#dw-planning-pane{margin:12px 0;padding:14px;border-radius:16px}#dw-planning-pane .dw-plan-fields{grid-template-columns:1fr}#dw-planning-pane .dw-plan-row>*{width:100%}}
 `;
 document.head.append(style);
 const launch=document.createElement('button');
 launch.type='button';launch.id='dw-planning-launch';launch.textContent='Goals & Budgets';launch.setAttribute('aria-pressed','false');
 toolsBar().append(launch);
 const pane=document.createElement('section');
 pane.id='dw-planning-pane';pane.hidden=true;
 pane.innerHTML=`<div class="dw-plan-row"><div><h2>Goals & Budgets</h2><p>Plan spending and track savings progress without moving money.</p></div><button id="dw-plan-close" type="button">Close</button></div>
 <div class="dw-plan-tabs"><button class="dw-primary" type="button" id="dw-plan-goals-tab">Shared goals</button><button type="button" id="dw-plan-budget-tab">Monthly budgets</button></div>
 <div id="dw-plan-goals"><label>Tracker<select id="dw-plan-tracker" aria-label="Choose tracker"></select></label><div class="dw-plan-cards" id="dw-plan-goal-list"></div>
 <form id="dw-plan-new-goal"><div class="dw-plan-fields"><label>Goal name<input name="title" required maxlength="100" placeholder="Group trip"></label><label>Target amount<input name="amount" type="number" min=".01" step=".01" max="99999999" required placeholder="500"></label></div><button type="submit" class="dw-primary">Add savings goal</button></form></div>
 <div id="dw-plan-budgets" hidden><label>Month<input id="dw-plan-month" type="month"></label><div class="dw-plan-cards" id="dw-plan-budget-list"></div>
 <form id="dw-plan-new-budget"><div class="dw-plan-fields"><label>Category<input name="category" required maxlength="50" placeholder="Food & Dining"></label><label>Monthly limit (USD)<input name="limit" type="number" min=".01" step=".01" max="99999999" required></label></div><button class="dw-primary" type="submit">Save monthly budget</button></form></div>
 <p class="dw-plan-status" id="dw-plan-status" role="status" aria-live="polite"></p>`;
 shell.append(pane);
 const $=id=>document.getElementById(id);
 const api=async(path,method,body)=>{
  if(typeof window.squareUpApi!=='function')throw Error('Please sign in to use financial planning.');
  return window.squareUpApi(path,method,body);
 };
 const status=message=>{$('dw-plan-status').textContent=message||''};
 const money=n=>new Intl.NumberFormat(undefined,{style:'currency',currency:'USD'}).format(Number(n)||0);
 const card=(title,subtitle,percentage)=>{
  const el=document.createElement('div');el.className='dw-plan-card';
  const name=document.createElement('strong');name.textContent=title;el.append(name);
  const info=document.createElement('p');info.textContent=subtitle;el.append(info);
  if(percentage!==undefined){const bar=document.createElement('div');bar.className='dw-plan-progress';const span=document.createElement('span');span.style.width=Math.min(100,Math.max(0,percentage))+'%';bar.append(span);el.append(bar)}
  return el;
 };
 let mode='goals',busy=false;
 const currentMonth=()=>new Date().toISOString().slice(0,7);
 $('dw-plan-month').value=currentMonth();
 function setMode(next){
  mode=next;$('dw-plan-goals').hidden=next!=='goals';$('dw-plan-budgets').hidden=next!=='budgets';
  $('dw-plan-goals-tab').classList.toggle('dw-primary',next==='goals');$('dw-plan-budget-tab').classList.toggle('dw-primary',next==='budgets');
  refresh();
 }
 $('dw-plan-goals-tab').onclick=()=>setMode('goals');$('dw-plan-budget-tab').onclick=()=>setMode('budgets');
 $('dw-plan-close').onclick=()=>{pane.hidden=true;launch.setAttribute('aria-pressed','false');launch.focus()};
 tabs.addEventListener('click',event=>{if(event.target!==launch&&event.target.closest('button')){$('dw-plan-close').click()}});
 async function loadTrackers(){
  const trackers=await api('trackers');
  const select=$('dw-plan-tracker');select.replaceChildren();
  for(const tracker of Array.isArray(trackers)?trackers:[]){
   const option=document.createElement('option');option.value=tracker.id;option.textContent=tracker.name;select.append(option);
  }
 }
 async function refresh(){
  if(pane.hidden)return;
  status('Loading…');
  try{
   if(mode==='goals'){
    const id=$('dw-plan-tracker').value,list=$('dw-plan-goal-list');list.replaceChildren();
    if(!id){list.append(card('No tracker selected','Create or join a tracker to start a shared goal.'));status('');return}
    const rows=await api('finance-plus/goals?tracker_id='+encodeURIComponent(id));
    if(!rows.length)list.append(card('No goals yet','Create a shared savings goal below.'));
    for(const goal of rows){
     const el=card(goal.title,money(goal.contributed)+' tracked of '+money(goal.target_amount),100*goal.contributed/goal.target_amount);
     const form=document.createElement('form');
     const amount=document.createElement('input');amount.type='number';amount.min='.01';amount.step='.01';amount.max='99999999';amount.placeholder='Contribution';amount.required=true;amount.setAttribute('aria-label','Contribution amount');
     const button=document.createElement('button');button.textContent='Record contribution';button.className='dw-primary';button.type='submit';
     form.append(amount,button);
     form.addEventListener('submit',async event=>{event.preventDefault();button.disabled=true;try{await api('finance-plus/goals/contributions','POST',{tracker_id:id,goal_id:goal.id,amount:Number(amount.value)});status('Contribution recorded (tracking only).');await refresh()}catch(e){status(e.message)}finally{button.disabled=false}});
     el.append(form);list.append(el);
    }
   }else{
    const month=$('dw-plan-month').value,list=$('dw-plan-budget-list');list.replaceChildren();
    const data=await api('finance-plus/budgets?month='+encodeURIComponent(month));
    if(!data.budgets.length)list.append(card('No budgets for this month','Choose a category and amount below.'));
    for(const b of data.budgets)list.append(card(b.category,money(b.spent)+' spent of '+money(b.limit_amount)+' monthly limit',100*b.spent/b.limit_amount));
   }
   status('');
  }catch(e){status(e.message||'Could not load planning data.')}
 }
 $('dw-plan-tracker').onchange=refresh;$('dw-plan-month').onchange=refresh;
 $('dw-plan-new-goal').onsubmit=async function(event){
  event.preventDefault();if(busy)return;busy=true;const button=this.querySelector('[type=submit]');button.disabled=true;
  try{await api('finance-plus/goals','POST',{tracker_id:$('dw-plan-tracker').value,title:this.elements.title.value,target_amount:Number(this.elements.amount.value)});this.reset();await refresh();status('Savings goal created.')}
  catch(e){status(e.message||'Could not create goal.')}finally{busy=false;button.disabled=false}
 };
 $('dw-plan-new-budget').onsubmit=async function(event){
  event.preventDefault();if(busy)return;busy=true;const button=this.querySelector('[type=submit]');button.disabled=true;
  try{await api('finance-plus/budgets','POST',{month:$('dw-plan-month').value,category:this.elements.category.value,limit_amount:Number(this.elements.limit.value)});this.reset();await refresh();status('Monthly budget saved.')}
  catch(e){status(e.message||'Could not save budget.')}finally{busy=false;button.disabled=false}
 };
 launch.addEventListener('click',async()=>{
  pane.hidden=!pane.hidden;launch.setAttribute('aria-pressed',String(!pane.hidden));
  if(pane.hidden)return;
  status('Loading trackers…');
  try{await loadTrackers();await refresh()}catch(e){status(e.message||'Could not load trackers.')}
 });
})();
