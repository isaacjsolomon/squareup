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
 // Use the original real Add dropdown button itself, not a proxy control.
 // This preserves its keyboard menu interactions and all previous app tests.
 const add=document.createElement('div');add.id='dw-ref-add';
 add.className='dw-ref-add-host';
 intro.append(greet,add);
 function mountRealAdd(){
  const holder=document.getElementById('dw-compact-add-wrapper');
  if(!holder)return false;
  if(holder.parentElement!==add)add.append(holder);
  const button=holder.querySelector('#dw-compact-add');
  if(button&&!button.dataset.dwRefLabeled){
   button.dataset.dwRefLabeled='true';
   const caret=button.querySelector('.dw-compact-add-caret');
   button.replaceChildren(document.createTextNode('+ Add'));
   if(caret)button.append(caret);
   button.setAttribute('aria-label','Add expense, scan receipt or split a bill');
  }
  return true;
 }
 if(!mountRealAdd()){
  const watchAdd=new MutationObserver(()=>{
   if(mountRealAdd())watchAdd.disconnect();
  });
  watchAdd.observe(document.body,{childList:true,subtree:true});
 }

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
 function chartLocale(){
  const resolved=window.DoWeoI18n?.resolve?.(window)||document.documentElement.lang||'en';
  return resolved==='he-script'?'he':resolved;
 }
 function tr(key,fallback){
  return window.dwUnifiedLocale?.t?.(key)||fallback;
 }
 let lastChartRows=[];
 function showChart(rows){
  chartBody.replaceChildren();
  lastChartRows=Array.isArray(rows)?rows.slice():[];
  const now=new Date();
  const monthLocale=chartLocale();
  const months=[];
  for(let n=5;n>=0;n--){
   const d=new Date(now.getFullYear(),now.getMonth()-n,1);
   months.push({key:d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'),
     label:d.toLocaleDateString(monthLocale,{month:'short'}),income:0,expense:0,count:0});
  }
  const valid=lastChartRows.filter(x=>x && ['income','expense'].includes(x.kind) &&
    Number.isFinite(Number(x.amount)) && Number(x.amount)>=0);
  for(const row of valid){
    const month=months.find(m=>m.key===String(row.occurred_on||'').slice(0,7));
    if(!month)continue;
    month[row.kind]+=Number(row.amount);
    month.count++;
  }
  // These totals are all-time private records, exactly as in the existing
  // Cash Flow workspace. Tracker balances remain independent.
  incomeAmount.textContent=money(valid.filter(x=>x.kind==='income').reduce((n,x)=>n+Number(x.amount),0));
  spendAmount.textContent=money(valid.filter(x=>x.kind==='expense').reduce((n,x)=>n+Number(x.amount),0));
  const active=months.filter(m=>m.count>0);
  if(active.length===0){
    const empty=document.createElement('div');empty.className='dw-ref-chart-empty';
    const headline=document.createElement('strong');headline.dataset.dwShellKey='noRecentCashflow';
    headline.textContent=tr('noRecentCashflow','No cash flow in the last six months');
    const detail=document.createElement('span');detail.dataset.dwShellKey='cashflowEmptyHint';
    detail.textContent=tr('cashflowEmptyHint','Record income or spending to see your monthly trend.');
    const link=document.createElement('button');link.type='button';link.dataset.dwShellKey='openCashFlow';
    link.textContent=tr('openCashFlow','Open Cash Flow →');
    link.addEventListener('click',()=>chartAction.click());
    empty.append(headline,detail,link);chartBody.append(empty);
    document.dispatchEvent(new Event('doweo:uiupdated'));
    return;
  }
  const current=months[months.length-1];
  const summary=document.createElement('div');summary.className='dw-ref-chart-summary';
  const count=document.createElement('span');count.className='dw-ref-chart-range';count.dataset.dwShellKey='lastSixMonths';
  count.textContent=tr('lastSixMonths','Last 6 months');
  const net=document.createElement('span');net.className='dw-ref-chart-net';
  const netLabel=document.createElement('span');netLabel.dataset.dwShellKey='netThisMonth';
  netLabel.textContent=tr('netThisMonth','Net this month');
  const netValue=document.createElement('strong');
  netValue.textContent=money(current.income-current.expense);
  netValue.className=current.income-current.expense<0?'dw-ref-negative':'dw-ref-positive';
  net.append(netLabel,netValue);summary.append(count,net);
  chartBody.append(summary);
  const maximum=Math.max(...months.map(m=>Math.max(m.income,m.expense)),1);
  const approximate=maximum/4;
  const power=Math.pow(10,Math.floor(Math.log10(approximate)));
  const stepCandidates=[1,2,2.5,5,10].map(n=>n*power);
  let step=stepCandidates.find(n=>n>=approximate);
  if(!step)step=10*power;
  const scale=step*4;
  const plot=document.createElement('div');plot.className='dw-ref-month-chart';
  plot.setAttribute('role','img');
  plot.setAttribute('aria-label',tr('incomeVsSpending','Monthly income and spending')+' — '+tr('lastSixMonths','Last 6 months'));
  const grid=document.createElement('div');grid.className='dw-ref-chart-grid';
  const axis=new Intl.NumberFormat(monthLocale,{style:'currency',currency:'USD',notation:'compact',maximumFractionDigits:1});
  for(let tick=4;tick>=0;tick--){
    const line=document.createElement('div');line.className='dw-ref-chart-gridline';
    const label=document.createElement('span');label.textContent=axis.format(step*tick);
    const rule=document.createElement('i');rule.setAttribute('aria-hidden','true');
    line.append(label,rule);grid.append(line);
  }
  const bars=document.createElement('div');bars.className='dw-ref-chart-months';
  months.forEach(m=>{
    const group=document.createElement('div');group.className='dw-ref-chart-month';
    const tracks=document.createElement('div');tracks.className='dw-ref-chart-tracks';
    for(const kind of ['income','expense']){
      const track=document.createElement('div');track.className='dw-ref-chart-track';
      const bar=document.createElement('span');bar.className='dw-ref-chart-bar dw-ref-bar-'+kind;
      const value=m[kind];
      const pct=Math.min(100,Math.max(0,value/scale*100));
      bar.style.height=value?Math.max(1.5,pct)+'%':'0%';
      if(!value)bar.classList.add('dw-ref-zero');
      bar.title=m.label+' — '+tr(kind,kind==='income'?'Income':'Spending')+': '+money(value);
      track.append(bar);tracks.append(track);
    }
    const label=document.createElement('small');label.textContent=m.label;
    const inactive=document.createElement('span');inactive.className='dw-ref-empty-month';
    inactive.textContent=m.count?'': '·';
    inactive.setAttribute('aria-hidden','true');
    group.append(tracks,inactive,label);
    bars.append(group);
  });
  plot.append(grid,bars);chartBody.append(plot);
  const legend=document.createElement('div');legend.className='dw-ref-chart-legend';
  for(const [key,color] of [['income','dw-ref-legend-income'],['expense','dw-ref-legend-expense']]){
    const part=document.createElement('span');
    const dot=document.createElement('i');dot.className=color;dot.setAttribute('aria-hidden','true');
    const text=document.createElement('span');text.dataset.dwShellKey=key;
    text.textContent=tr(key,key==='income'?'Income':'Spending');
    part.append(dot,text);legend.append(part);
  }
  chartBody.append(legend);
  document.dispatchEvent(new Event('doweo:uiupdated'));
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
 let returningViaHome=false;
 document.querySelectorAll('#tracker-dashboard .sq-workspace-tabs [data-sq-tab]').forEach(btn=>{
  btn.addEventListener('click',()=>{
   requestAnimationFrame(layout);
   if(btn.dataset.sqTab==='overview'){
    refreshFinance(false);
    // Reuse the canonical Home routing after switching from any other tracker
    // tab. Some legacy views keep their old body route even if the tab itself
    // becomes selected; class-name checks alone are not sufficient.
    if(desktop.matches && !returningViaHome){
     returningViaHome=true;
     setTimeout(()=>{
      try { document.getElementById('nav-home')?.click(); }
      finally { setTimeout(()=>{ returningViaHome=false; },200); }
     },60);
    }
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
 document.addEventListener('doweo:languagechange',()=>{
   if(lastChartRows.length)showChart(lastChartRows);
   else if(chartBody.querySelector('.dw-ref-chart-empty'))showChart([]);
 });
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
 // Legacy sidebar themes sometimes hide the original icon spans. Provide a
 // guaranteed visible icon for each original destination without replacing its
 // button or navigation handler; hide these duplicates outside desktop CSS.
 const sidebarIcons=[
  ['#nav-home','<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>'],
  ['#nav-trackers','<path d="m12 3 9 5-9 5-9-5 9-5zM3 12l9 5 9-5M3 16l9 5 9-5"/>'],
  ['#sqev-nav','<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18"/>'],
  ['#nav-analytics','<path d="M3 20V4M7 20v-6m5 6V9m5 11V5"/>'],
  ['#dw-ref-nav-notifications','<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/>'],
  ['.sidebar .dw-nav-group[data-dw-nav-group="social"]>summary','<circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2M19 8v8m-4-4h8"/>'],
  ['.sidebar .dw-nav-group[data-dw-nav-group="more"]>summary','<circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/>']
 ];
 for(const [selector,parts] of sidebarIcons){
  const button=document.querySelector(selector);
  if(!button||button.querySelector(':scope>.dw-ref-static-icon'))continue;
  const mark=document.createElement('span');mark.className='dw-ref-static-icon';mark.setAttribute('aria-hidden','true');
  mark.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">'+parts+'</svg>';
  button.prepend(mark);
 }
 const topRow=document.querySelector('.sidebar .sidebar-top-row');
 if(topRow&&!topRow.querySelector('.dw-ref-brand')){
  const brand=document.createElement('span');brand.className='dw-ref-brand';brand.textContent='DoWeo';
  topRow.querySelector('.logo-btn')?.append(brand);
 }
})();
