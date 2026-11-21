/* Exact-layout desktop Overview, 2026-11-21.
   Reuse DoWeo's existing tabs, real ledger balances, activity rows and Smart
   Settle-Up actions. Personal Income/Spending/Cash Flow use the authenticated
   /finance/transactions endpoint already used by the Cash Flow page. */
(function(){
 'use strict';
 const dashboard=document.getElementById('tracker-dashboard');
 const tabs=dashboard?.querySelector(':scope > .sq-workspace-tabs');
 const originalActivity=document.getElementById('sq-return-activity');
 const originalSmart=document.getElementById('sq-return-smart-host');
 if(!dashboard||!tabs||!originalActivity||!originalSmart||document.getElementById('dw-ref-home'))return;
 const desktop=matchMedia('(min-width:901px)');
 const activityHome=originalActivity.parentNode,smartHome=originalSmart.parentNode;

 // Keep the original bottom navigation and all existing page routing intact.
 const toolbar=document.createElement('div');
 toolbar.id='dw-ref-toolbar';
 toolbar.setAttribute('aria-label','Account shortcuts');
 const makeTool=(name,label,inner)=>{
  const b=document.createElement('button');b.type='button';b.className='dw-ref-tool';b.dataset.refTool=name;b.setAttribute('aria-label',label);b.title=label;b.innerHTML=inner;toolbar.append(b);return b;
 };
 makeTool('search','Search DoWeo','<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="10.8" cy="10.8" r="7"/><path d="m16 16 5 5"/></svg>');
 const bell=makeTool('notifications','Notifications','<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg><span class="dw-ref-notice" hidden></span>');
 const avatar=makeTool('account','Open account','<span class="dw-ref-avatar-label">ME</span>');
 tabs.after(toolbar);
 const click=(sel)=>{const btn=document.querySelector(sel);if(btn){btn.click();return true;}return false;};
 toolbar.addEventListener('click',e=>{
  const action=e.target.closest('[data-ref-tool]')?.dataset.refTool;
  if(action==='search'){
   if(!click('.sq-search-launch button')&&!click('#sq-mobile-search'))click('.sq-search-launch');
  }else if(action==='notifications'){
   if(!click('#sq-mobile-notifications'))click('#notifications-toggle');
  }else if(action==='account'){
   if(!click('#nav-profile'))click('#me-avatar');
  }
 });

 const root=document.createElement('section');
 root.id='dw-ref-home';root.setAttribute('aria-label','Financial overview');
 const intro=document.createElement('div');intro.className='dw-ref-intro';
 const greet=document.createElement('div');greet.className='dw-ref-greeting';
 const h1=document.createElement('h1');h1.id='dw-ref-greeting';h1.textContent='Welcome back';
 const subtitle=document.createElement('p');subtitle.textContent='Here’s your overview for today.';
 greet.append(h1,subtitle);
 const add=document.createElement('button');add.type='button';add.id='dw-ref-add';
 add.innerHTML='<span aria-hidden="true">＋</span> Add';
 add.addEventListener('click',()=>{
  // The existing compact Add dropdown retains Split Bill, Personal and Expense.
  if(!click('#dw-compact-add'))click('#quick-expense');
 });
 intro.append(greet,add);

 const statGrid=document.createElement('div');statGrid.className='dw-ref-stats';
 function stat(id,title,icon,detail){
  const article=document.createElement('article');article.className='dw-ref-stat';article.id=id;
  const name=document.createElement('span');name.className='dw-ref-stat-label';name.textContent=title;
  const top=document.createElement('div');top.className='dw-ref-stat-heading';
  top.append(name);
  const amount=document.createElement('strong');amount.className='dw-ref-stat-amount';amount.textContent='—';
  const iconWrap=document.createElement('span');iconWrap.className='dw-ref-stat-icon';iconWrap.setAttribute('aria-hidden','true');iconWrap.innerHTML=icon;
  const valueRow=document.createElement('div');valueRow.className='dw-ref-stat-value';valueRow.append(amount,iconWrap);
  article.append(top,valueRow);
  if(detail){article.title=detail;const info=document.createElement('small');info.className='dw-ref-stat-detail';info.textContent=detail;article.append(info);}
  statGrid.append(article);return amount;
 }
 const netAmount=stat('dw-ref-stat-net','Net Balance',
 '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1"><path d="m4 17 6-6 4 4 6-8M15 7h5v5"/></svg>',
 'Current tracker balance');
 const incomeAmount=stat('dw-ref-stat-income','Total Income',
 '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 18V5m-5 5 5-5 5 5"/></svg>',
 'From your private personal transactions');
 const spendAmount=stat('dw-ref-stat-spend','Total Spending',
 '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v13m-5-5 5 5 5-5"/></svg>',
 'From your private personal transactions');

 const chart=document.createElement('section');chart.className='dw-ref-chart dw-ref-paper';
 chart.setAttribute('aria-labelledby','dw-ref-chart-title');
 const chartHead=document.createElement('div');chartHead.className='dw-ref-card-heading';
 const chartH=document.createElement('h2');chartH.id='dw-ref-chart-title';chartH.textContent='Cash Flow';
 const chartAction=document.createElement('button');chartAction.className='dw-ref-text-link';
 chartAction.type='button';chartAction.textContent='View Cash Flow  ↗';
 chartAction.addEventListener('click',()=>{
  if(typeof window.squareUpOpenFinanceHub==='function')window.squareUpOpenFinanceHub('finance');
  else click('#nav-analytics');
 });
 chartHead.append(chartH,chartAction);
 const chartBody=document.createElement('div');chartBody.className='dw-ref-chart-body';chartBody.setAttribute('aria-live','polite');
 chartBody.textContent='Loading your cash flow…';
 chart.append(chartHead,chartBody);

 const lower=document.createElement('div');lower.className='dw-ref-lower';
 const activityCard=document.createElement('section');activityCard.className='dw-ref-paper dw-ref-activity';
 activityCard.setAttribute('aria-labelledby','dw-ref-activity-title');
 const activityHead=document.createElement('div');activityHead.className='dw-ref-card-heading';
 const activityTitle=document.createElement('h2');activityTitle.id='dw-ref-activity-title';activityTitle.textContent='Recent Activity';
 const viewAll=document.createElement('button');viewAll.type='button';viewAll.className='dw-ref-text-link';viewAll.textContent='View All  →';
 viewAll.addEventListener('click',()=>click('#tracker-dashboard .sq-workspace-tabs [data-sq-tab="expenses"]'));
 activityHead.append(activityTitle,viewAll);
 const activitySlot=document.createElement('div');activitySlot.id='dw-ref-activity-slot';
 activityCard.append(activityHead,activitySlot);

 const settleCard=document.createElement('section');settleCard.className='dw-ref-paper dw-ref-settle';
 settleCard.setAttribute('aria-labelledby','dw-ref-settle-title');
 const settleHead=document.createElement('div');settleHead.className='dw-ref-settle-heading';
 const settleIcon=document.createElement('span');settleIcon.className='dw-ref-settle-icon';settleIcon.setAttribute('aria-hidden','true');
 settleIcon.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3v17M5 7h14M5 7l-3 7h6L5 7zm14 0-3 7h6l-3-7zM7 21h10"/></svg>';
 const settleName=document.createElement('div');
 const settleTitle=document.createElement('h2');settleTitle.id='dw-ref-settle-title';settleTitle.textContent='Smart Settle-Up';
 const settleIntro=document.createElement('p');settleIntro.textContent='Settle balances with one simple payment.';
 settleName.append(settleTitle,settleIntro);settleHead.append(settleIcon,settleName);
 const smartSlot=document.createElement('div');smartSlot.id='dw-ref-smart-slot';
 const settleCTA=document.createElement('button');settleCTA.type='button';settleCTA.id='dw-ref-settle-action';
 settleCTA.innerHTML='Settle Up Now <span aria-hidden="true">→</span>';
 settleCTA.addEventListener('click',()=>{
  if(!click('#sq-clean-settle')){
   const el=document.querySelector('#smart-settle-list button:not([disabled])');
   if(el)el.click();
  }
 });
 settleCard.append(settleHead,smartSlot,settleCTA);
 lower.append(activityCard,settleCard);
 root.append(intro,statGrid,chart,lower);
 toolbar.after(root);

 // Present the real existing tracker data and controls in the new layout.
 function layout(){
  const active=desktop.matches && dashboard.classList.contains('sq-tab-overview') &&
    !dashboard.classList.contains('dw-template-original');
  if(active){
   if(originalActivity.parentNode!==activitySlot)activitySlot.append(originalActivity);
   if(originalSmart.parentNode!==smartSlot)smartSlot.append(originalSmart);
  }else{
   if(originalActivity.parentNode!==activityHome)activityHome.append(originalActivity);
   if(originalSmart.parentNode!==smartHome)smartHome.append(originalSmart);
  }
 }
 function syncBalances(){
  const src=document.getElementById('sq-clean-net');
  netAmount.textContent=src?.textContent?.trim()||'—';
  const g=document.getElementById('sq-return-greeting')?.textContent?.trim()||'Welcome back';
  const match=g.match(/(?:welcome back|hi)[,!]?\s*(.*)/i);
  const first=(match?.[1]||'').replace(/^,?\s*/,'').trim();
  h1.textContent=first ? 'Hi, '+first+'!' : 'Welcome back!';
  const who=document.getElementById('who')?.textContent?.trim()||first||'';
  const initials=who.split(/\s+/).filter(Boolean).slice(0,2).map(x=>x.charAt(0).toUpperCase()).join('')||'ME';
  const avatarLabel=avatar.querySelector('.dw-ref-avatar-label');
  if(avatarLabel)avatarLabel.textContent=initials;
  const original=document.getElementById('me-avatar');
  if(original){
   const bg=getComputedStyle(original).backgroundImage;
   if(bg && bg!=='none'){
    avatar.style.backgroundImage=bg;avatar.classList.add('dw-ref-has-photo');
   }else{avatar.style.backgroundImage='';avatar.classList.remove('dw-ref-has-photo');}
  }
  const notifs=document.getElementById('notifications-count')||document.getElementById('sq-mobile-notifications-count');
  const dot=bell.querySelector('.dw-ref-notice');
  if(dot)dot.hidden=Boolean(notifs?.hidden) || !notifs?.textContent?.trim();
 }
 function money(value){
  const amount=Number(value)||0;
  return new Intl.NumberFormat(undefined,{style:'currency',currency:'USD'}).format(amount);
 }
 function svg(tag,attrs){
  const el=document.createElementNS('http://www.w3.org/2000/svg',tag);
  for(const [k,v] of Object.entries(attrs||{}))el.setAttribute(k,String(v));
  return el;
 }
 function showChart(rows){
  chartBody.replaceChildren();
  const now=new Date();
  const months=[];
  for(let n=5;n>=0;n--){
   const d=new Date(now.getFullYear(),now.getMonth()-n,1);
   months.push({key:d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'),
    label:d.toLocaleDateString(undefined,{month:'short'}),income:0,expense:0});
  }
  const valid=rows.filter(x=>x && (x.kind==='income'||x.kind==='expense') &&
    Number.isFinite(Number(x.amount)) && Number(x.amount)>=0);
  for(const x of valid){
   const m=months.find(m=>m.key===String(x.occurred_on||'').slice(0,7));
   if(m)m[x.kind]+=Number(x.amount);
  }
  incomeAmount.textContent=money(valid.filter(x=>x.kind==='income').reduce((a,x)=>a+Number(x.amount),0));
  spendAmount.textContent=money(valid.filter(x=>x.kind==='expense').reduce((a,x)=>a+Number(x.amount),0));
  if(!months.some(m=>m.income>0||m.expense>0)){
   const empty=document.createElement('div');empty.className='dw-ref-chart-empty';
   empty.textContent='No personal cash flow recorded in the last six months.';
   const link=document.createElement('button');link.type='button';link.textContent='Open Cash Flow →';
   link.addEventListener('click',()=>chartAction.click());empty.append(link);
   chartBody.append(empty);
   return;
  }
  const max=Math.max(1,...months.flatMap(m=>[m.income,m.expense]));
  const plot=document.createElement('div');plot.className='dw-ref-chart-plot';
  plot.setAttribute('role','img');plot.setAttribute('aria-label','Six-month income and spending chart based on recorded personal transactions');
  const bars=document.createElement('div');bars.className='dw-ref-chart-bars';
  months.forEach(m=>{
   const group=document.createElement('div');group.className='dw-ref-chart-month';
   const pair=document.createElement('div');pair.className='dw-ref-chart-pair';
   for(const kind of ['income','expense']){
    const bar=document.createElement('span');bar.className='dw-ref-chart-bar dw-ref-'+kind;
    bar.style.height=Math.max(3,(m[kind]/max)*100)+'%';
    bar.title=m.label+' '+kind+': '+money(m[kind]);pair.append(bar);
   }
   const label=document.createElement('small');label.textContent=m.label;
   group.append(pair,label);bars.append(group);
  });
  const chartSvg=svg('svg',{viewBox:'0 0 600 160',preserveAspectRatio:'none','aria-hidden':'true',class:'dw-ref-net-line'});
  const values=months.map(m=>m.income-m.expense);
  const lo=Math.min(0,...values),hi=Math.max(1,...values);
  const x=i=>46+i*101.6;
  const y=v=>135-110*(v-lo)/(hi-lo||1);
  const points=values.map((v,i)=>[x(i),y(v)]);
  const d=points.map((p,i)=>(i===0?'M':'L')+p[0].toFixed(1)+','+p[1].toFixed(1)).join(' ');
  chartSvg.append(svg('path',{d,fill:'none',stroke:'#4fcba4','stroke-width':'3.4','stroke-linejoin':'round','stroke-linecap':'round'}));
  points.forEach(([cx,cy])=>chartSvg.append(svg('circle',{cx,cy,r:5.5,fill:'#f4fbff',stroke:'#4fcba4','stroke-width':'3'})));
  plot.append(bars,chartSvg);
  const legend=document.createElement('div');legend.className='dw-ref-chart-legend';
  legend.innerHTML='<span><i class="dw-ref-legend-income"></i> Income</span><span><i class="dw-ref-legend-expense"></i> Spending</span><span><i class="dw-ref-legend-net"></i> Net cash flow</span>';
  chartBody.append(plot,legend);
 }
 let financeBusy=false,lastFinanceAt=0,lastProfile='null';
 async function refreshFinance(force){
  if(financeBusy||!desktop.matches||typeof window.squareUpApi!=='function')return;
  const profile=document.getElementById('who')?.textContent?.trim()||'';
  if(!force&&lastFinanceAt&&Date.now()-lastFinanceAt<30000&&lastProfile===profile)return;
  financeBusy=true;lastFinanceAt=Date.now();lastProfile=profile;
  try{
   const rows=await window.squareUpApi('finance/transactions');
   if(Array.isArray(rows))showChart(rows);
   else throw new Error('Unexpected finance response');
  }catch(_){
   incomeAmount.textContent='—';spendAmount.textContent='—';
   chartBody.textContent='Cash flow is unavailable right now. You can still open Cash Flow from Analytics.';
  }finally{financeBusy=false;}
 }
 // The finance endpoint is read-only. Recheck when records are edited elsewhere.
 const moneySource=document.getElementById('sq-clean-net');
 if(moneySource)new MutationObserver(syncBalances).observe(moneySource,{childList:true,characterData:true,subtree:true});
 const greeting=document.getElementById('sq-return-greeting');
 if(greeting)new MutationObserver(syncBalances).observe(greeting,{childList:true,characterData:true,subtree:true});
 desktop.addEventListener('change',()=>{layout();syncBalances();if(desktop.matches)refreshFinance(true);});
 window.addEventListener('squareup:tracker-detail',()=>{layout();syncBalances();refreshFinance(false);});
 document.querySelectorAll('#tracker-dashboard .sq-workspace-tabs [data-sq-tab]').forEach(btn=>{
  btn.addEventListener('click',()=>{
   requestAnimationFrame(layout);
   if(btn.dataset.sqTab==='overview'){
    refreshFinance(false);
    // Older Members/Bills routing may leave the dashboard on the previous tab.
    // Fall back to the original Home handler instead of leaving Overview blank.
    setTimeout(()=>{
     if(desktop.matches && !dashboard.classList.contains('sq-tab-overview'))
      document.getElementById('nav-home')?.click();
    },90);
   }
  });
 });
 const classObserver=new MutationObserver(()=>{
  layout();
  const active=dashboard.classList.contains('sq-tab-overview')&&desktop.matches;
  if(active)syncBalances();
 });
 classObserver.observe(dashboard,{attributes:true,attributeFilter:['class']});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&desktop.matches)refreshFinance(false);});
 document.addEventListener('doweo:finance-saved',()=>refreshFinance(true));
 // Auth and API are initialized asynchronously; do not freeze the dashboard.
 let attempts=0;
 const bootstrap=setInterval(()=>{
  if(typeof window.squareUpApi==='function'){
   clearInterval(bootstrap);syncBalances();refreshFinance(true);
  }else if(++attempts>=25){clearInterval(bootstrap);}
 },700);
 window.addEventListener('pagehide',()=>clearInterval(bootstrap),{once:true});
 layout();syncBalances();if(typeof window.squareUpApi==='function')refreshFinance(true);

 // Keep a real sidebar notifications destination, like the approved mockup.
 const nav=document.querySelector('.sidebar .squareup-nav');
 const analytics=document.getElementById('nav-analytics');
 if(nav&&analytics&&!document.getElementById('dw-ref-nav-notifications')){
  const button=document.createElement('button');button.type='button';button.id='dw-ref-nav-notifications';button.className='sq-nav-link';
  button.innerHTML='<span class="sq-nav-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg></span><span class="sq-nav-label">Notifications</span>';
  button.addEventListener('click',()=>{if(!click('#sq-mobile-notifications'))click('#notifications-toggle');});
  analytics.insertAdjacentElement('afterend',button);
 }
 const topRow=document.querySelector('.sidebar .sidebar-top-row');
 if(topRow&&!topRow.querySelector('.dw-ref-brand')){
  const brand=document.createElement('span');brand.className='dw-ref-brand';brand.textContent='DoWeo';
  topRow.querySelector('.logo-btn')?.append(brand);
 }
})();
