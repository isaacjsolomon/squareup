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
 const timeIcon=document.createElement('span');timeIcon.className='dw-ref-time-icon';timeIcon.setAttribute('aria-hidden','true');
 const greetingCopy=document.createElement('div');greetingCopy.className='dw-ref-greeting-copy';
 const h1=document.createElement('h1');h1.id='dw-ref-greeting';h1.dataset.dwTimeAware='true';h1.textContent='Welcome!';
 const dateLabel=document.createElement('p');dateLabel.className='dw-ref-greeting-date';dateLabel.id='dw-ref-greeting-date';
 greetingCopy.append(h1,dateLabel);
 const summaryStatus=document.createElement('div');summaryStatus.className='dw-ref-balance-status';
 const balanceBadge=document.createElement('span');balanceBadge.className='dw-ref-balance-pill';balanceBadge.id='dw-ref-balance-pill';
 const balanceLine=document.createElement('p');balanceLine.className='dw-ref-balance-line';balanceLine.id='dw-ref-balance-line';
 summaryStatus.append(balanceBadge,balanceLine);
 greet.append(timeIcon,greetingCopy,summaryStatus);
 // The current viewer's device time, not a server clock or a fixed time zone,
 // determines greeting and icon. The same banner respects the selected language.
 const dayWords={
  en:['Good morning','Good afternoon','Good evening','Good night'],
  es:['Buenos días','Buenas tardes','Buenas noches','Buenas noches'],
  fr:['Bonjour','Bon après-midi','Bonsoir','Bonne nuit'],
  he:['בוקר טוב','צהריים טובים','ערב טוב','לילה טוב'],
  'zh-Hans':['早上好','下午好','晚上好','晚安'],
  pt:['Bom dia','Boa tarde','Boa noite','Boa noite'],
  de:['Guten Morgen','Guten Tag','Guten Abend','Gute Nacht'],
  it:['Buongiorno','Buon pomeriggio','Buonasera','Buonanotte'],
  ja:['おはようございます','こんにちは','こんばんは','おやすみなさい'],
  ar:['صباح الخير','طاب مساؤك','مساء الخير','ليلة سعيدة'],
  ko:['좋은 아침입니다','좋은 오후입니다','좋은 저녁입니다','편안한 밤 되세요'],
  hi:['सुप्रभात','शुभ दोपहर','शुभ संध्या','शुभ रात्रि'],
  ru:['Доброе утро','Добрый день','Добрый вечер','Спокойной ночи'],
  tr:['Günaydın','İyi günler','İyi akşamlar','İyi geceler'],
  vi:['Chào buổi sáng','Chào buổi chiều','Chào buổi tối','Chúc ngủ ngon'],
  nl:['Goedemorgen','Goedemiddag','Goedenavond','Goedenacht'],
  pl:['Dzień dobry','Miłego popołudnia','Dobry wieczór','Dobranoc'],
  sv:['God morgon','God eftermiddag','God kväll','God natt'],
  bn:['সুপ্রভাত','শুভ অপরাহ্ন','শুভ সন্ধ্যা','শুভ রাত্রি']
 };
 // State labels do not treat a tracker balance as "today's" earnings.
 const balanceWords={
  en:['On track','To settle','All settled','Balance pending',"You're up",'You owe','No outstanding balance','Open a tracker to see your balance'],
  es:['A tu favor','Por saldar','Todo saldado','Saldo pendiente','A tu favor','Debes','Sin saldos pendientes','Abre un grupo para ver tu saldo'],
  fr:['Solde positif','À régler','Tout est réglé','Solde indisponible','En votre faveur','Vous devez','Aucun solde à régler','Ouvrez un groupe pour voir votre solde'],
  he:['יתרה חיובית','יש להסדיר','הכול הוסדר','היתרה ממתינה','לזכותך','עליך לשלם','אין יתרה פתוחה','יש לפתוח קבוצה כדי לראות יתרה'],
  'zh-Hans':['余额为正','待结清','已结清','余额待更新','你的应收','你需要支付','没有未结余额','打开分账组查看余额'],
  pt:['Saldo positivo','A acertar','Tudo acertado','Saldo pendente','A seu favor','Você deve','Sem saldo pendente','Abra um grupo para ver o saldo'],
  de:['Positiver Saldo','Ausgleich offen','Alles ausgeglichen','Saldo ausstehend','Zu deinen Gunsten','Du schuldest','Keine offenen Beträge','Öffne eine Gruppe für deinen Saldo'],
  it:['Saldo positivo','Da saldare','Tutto saldato','Saldo in attesa','A tuo favore','Devi','Nessun saldo in sospeso','Apri un gruppo per vedere il saldo'],
  ja:['プラス残高','精算が必要','精算済み','残高を確認中','受け取り予定','支払い予定','未精算の残高はありません','グループを開いて残高を確認'],
  ar:['رصيد موجب','للتسوية','تمت التسوية','الرصيد قيد التحديث','لك مستحقات','عليك دفع','لا رصيد مستحق','افتح مجموعة لعرض الرصيد'],
  ko:['플러스 잔액','정산 필요','모두 정산됨','잔액 확인 중','받을 금액','지불할 금액','미정산 잔액 없음','그룹을 열어 잔액을 확인하세요'],
  hi:['सकारात्मक शेष','निपटान बाकी','सब निपटा','शेष लंबित','आपको मिलेंगे','आपको देने हैं','कोई बकाया नहीं','शेष देखने के लिए समूह खोलें'],
  ru:['Положительный баланс','К оплате','Всё погашено','Баланс уточняется','Вам должны','Вы должны','Нет открытых задолженностей','Откройте группу, чтобы увидеть баланс'],
  tr:['Pozitif bakiye','Ödenecek','Hesaplar kapandı','Bakiye bekleniyor','Alacağınız','Borcunuz','Açık bakiye yok','Bakiyeyi görmek için grup açın'],
  vi:['Số dư dương','Cần thanh toán','Đã thanh toán hết','Đang tải số dư','Bạn được nhận','Bạn cần trả','Không còn số dư','Mở nhóm để xem số dư'],
  nl:['Positief saldo','Nog te verrekenen','Alles verrekend','Saldo nog onbekend','Je ontvangt','Je bent verschuldigd','Geen openstaand saldo','Open een groep om je saldo te zien'],
  pl:['Dodatnie saldo','Do rozliczenia','Wszystko rozliczone','Saldo oczekuje','Do otrzymania','Do zapłaty','Brak zaległych sald','Otwórz grupę, aby zobaczyć saldo'],
  sv:['Positivt saldo','Att reglera','Allt reglerat','Saldo väntar','Du får tillbaka','Du är skyldig','Inget utestående saldo','Öppna en grupp för att se saldot'],
  bn:['ধনাত্মক ব্যালেন্স','পরিশোধ বাকি','সব মিটেছে','ব্যালেন্স অপেক্ষমাণ','আপনি পাবেন','আপনাকে দিতে হবে','কোনো বকেয়া নেই','ব্যালেন্স দেখতে গ্রুপ খুলুন']
 };
 const timeSvg={
  morning:'<circle cx="12" cy="12" r="4.1"/><path d="M12 2v2.5m0 15V22M4.9 4.9l1.8 1.8m10.6 10.6 1.8 1.8M2 12h2.5M19.5 12H22M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"/>',
  afternoon:'<circle cx="12" cy="11" r="4.4"/><path d="M12 1.8v2.3M3.7 11H1.8m20.4 0h-1.9M5.8 4.8 4.2 3.2m14 1.6 1.6-1.6M4 19h16M8 22h8"/>',
  evening:'<path d="M2 18h20M5 21h14M5 14.5a7 7 0 0 1 14 0M12 3v2m-7-1 1.6 1.6M19 4l-1.6 1.6"/>',
  night:'<path d="M20 15.2A8.7 8.7 0 0 1 8.8 4a8.8 8.8 0 1 0 11.2 11.2Z"/><path d="M17.6 3v4M15.6 5h4m-1.3 5v2.4m-1.2-1.2h2.4"/>'
 };
 function phaseForHour(hour){
  return hour>=5&&hour<12?'morning':hour>=12&&hour<17?'afternoon':hour>=17&&hour<21?'evening':'night';
 }
 function currentLanguage(){
  const raw=window.DoWeoI18n?.resolve?.(window)||window.dwUnifiedLocale?.locale?.()||document.documentElement.lang||navigator.language||'en';
  const normalized=raw==='he-script'?'he':raw;
  return dayWords[normalized]?normalized:(dayWords[String(normalized).split('-')[0]]?String(normalized).split('-')[0]:'en');
 }
 function renderTimeGreeting(now=new Date()){
  const lang=currentLanguage();
  const phase=phaseForHour(now.getHours());
  const icon='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round">'+timeSvg[phase]+'</svg>';
  if(timeIcon.dataset.phase!==phase){timeIcon.innerHTML=icon;timeIcon.dataset.phase=phase;}
  const greetingIndex={morning:0,afternoon:1,evening:2,night:3}[phase];
  const fullName=h1.dataset.dwGreetingName||'';
  const name=fullName.split(/\s+/)[0];
  const label=dayWords[lang][greetingIndex]+(name?', '+name:'')+'!';
  if(h1.textContent!==label)h1.textContent=label;
  greet.dataset.timeOfDay=phase;
  try {
   const formatted=new Intl.DateTimeFormat(lang,{weekday:'long',month:'long',day:'numeric'}).format(now);
   if(dateLabel.textContent!==formatted)dateLabel.textContent=formatted;
  }catch(_){dateLabel.textContent=new Intl.DateTimeFormat('en',{weekday:'long',month:'long',day:'numeric'}).format(now);}
  updateBalanceStatus(lang);
 }
 function updateBalanceStatus(lang=currentLanguage()){
  const words=balanceWords[lang]||balanceWords.en;
  const source=document.getElementById('sq-clean-net');
  const raw=source?.textContent?.trim()||'';
  const number=Number(raw.replace(/[^\d.,−-]/g,'').replace(/,/g,'').replace('−','-'));
  const state=!/[\d]/.test(raw)||!Number.isFinite(number)?'unknown':number>0.005?'positive':number<-.005?'negative':'zero';
  greet.dataset.balanceState=state;
  const labels={positive:words[0],negative:words[1],zero:words[2],unknown:words[3]};
  if(balanceBadge.textContent!==labels[state])balanceBadge.textContent=labels[state];
  balanceBadge.dataset.state=state;
  const text=state==='positive'?words[4]:state==='negative'?words[5]:'';
  const amount=state==='positive'?raw:state==='negative'?raw.replace(/[-−]/g,''):'';
  if(state==='zero')balanceLine.textContent=words[6];
  else if(state==='unknown')balanceLine.textContent=words[7];
  else{
   // Use the real tracker amount, not a hard-coded number or claimed daily gain.
   const pieces=[document.createTextNode(text+' ')];
   const value=document.createElement('strong');value.textContent=amount;
   pieces.push(value);
   if(balanceLine.textContent!==text+' '+amount)balanceLine.replaceChildren(...pieces);
  }
 }
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
  if(button){
   // Remove any leftover caret rendered by a previously cached Add-menu script.
   button.querySelectorAll('.dw-compact-add-caret').forEach(caret=>caret.remove());
   if(!button.dataset.dwRefLabeled){
    button.dataset.dwRefLabeled='true';
    button.replaceChildren(document.createTextNode('+ Add'));
    button.setAttribute('aria-label','Add expense, scan receipt or split a bill');
   }
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
 const insights=document.createElement('div');
 insights.className='glass-insights';
 const categories=document.createElement('section');
 categories.className='dw-ref-paper glass-categories';
 const title=document.createElement('h2');
 title.textContent='Spending by Category';
 const breakdown=document.createElement('div');
 categories.append(title,breakdown);
 const ranges=document.createElement('div');
 ranges.className='glass-ranges';
 let range=7;
 for(const [label,days] of [['7D',7],['30D',30],['3M',90],['All',0]]){
  const button=document.createElement('button');
  button.type='button';button.textContent=label;
  button.setAttribute('aria-pressed',String(days===range));
  button.onclick=()=>{
   range=days;
   for(const item of ranges.children)item.setAttribute('aria-pressed',String(item===button));
   drawTrend(lastChartRows);
  };
  ranges.append(button);
 }
 chartHead.append(ranges);
 const trend=document.createElement('div');trend.className='glass-trend';
 chart.append(trend);
 function drawTrend(rows){
  const dates=new Map();
  const end=new Date();end.setHours(0,0,0,0);
  const start=new Date(end);start.setDate(start.getDate()-range+1);
  if(range)dates.set(start.getTime(),[0,0]);
  dates.set(end.getTime(),[0,0]);
  let count=0;
  for(const row of rows){
   const day=new Date(String(row.occurred_on).slice(0,10)+'T00:00:00').getTime();
   if(!Number.isFinite(day)||day>end||(range&&day<start)||!['income','expense'].includes(row.kind)||!Number.isFinite(+row.amount))continue;
   const pair=dates.get(day)||[0,0];pair[row.kind==='income'?0:1]+=Number(row.amount);dates.set(day,pair);count++;
  }
  trend.replaceChildren();
  if(!count){trend.textContent='No transactions in this period.';return;}
  const ordered=[...dates].sort((a,b)=>a[0]-b[0]);
  let income=0,spending=0;
  const points=ordered.map(([day,pair])=>[day,income+=pair[0],spending+=pair[1]]);
  const max=Math.max(1,income,spending);
  const graph=svg('svg',{viewBox:'0 0 520 148',role:'img','aria-label':'Cumulative income and spending'});
  const x=day=>45+460*(day-points[0][0])/Math.max(1,end-points[0][0]);
  for(const fraction of [0,.5,1]){
   const y=125-110*fraction;
   graph.append(svg('line',{x1:45,x2:505,y1:y,y2:y,stroke:'#ffffff33'}));
   const label=svg('text',{x:0,y:y+4,fill:'#cee2ee','font-size':10});label.textContent=new Intl.NumberFormat(chartLocale(),{notation:'compact'}).format(max*fraction);graph.append(label);
  }
  for(const [series,color] of [[1,'#68efb2'],[2,'#68c5ff']]){
   const coords=points.map(p=>[x(p[0]),125-110*p[series]/max]);
   graph.append(svg('polyline',{points:coords.map(p=>p.join(',')).join(' '),fill:'none',stroke:color,'stroke-width':3}));
   for(const [cx,cy] of coords)graph.append(svg('circle',{cx,cy,r:2.5,fill:color}));
  }
  const legend=document.createElement('small');legend.textContent='Income '+money(income)+'  ·  Spending '+money(spending);
  trend.append(graph,legend);
 }
 function drawCategories(rows){
  const totals=new Map();
  for(const r of rows)if(r.kind==='expense'&&Number(r.amount)>0){
   const name=r.category||'Uncategorized';totals.set(name,(totals.get(name)||0)+Number(r.amount));
  }
  breakdown.replaceChildren();
  if(!totals.size){breakdown.textContent='No spending recorded yet.';return;}
  const ordered=[...totals].sort((a,b)=>b[1]-a[1]);
  const sum=ordered.reduce((total,entry)=>total+entry[1],0);
  const palette=['#68efb2','#63bfff','#bb92ff','#ffab99','#ffdc79','#a9bed0'];
  const list=document.createElement('ul'),stops=[];
  let angle=0;
  ordered.forEach(([name,value],i)=>{
   const color=palette[i%palette.length],next=angle+360*value/sum;
   stops.push(color+' '+angle+'deg '+next+'deg');angle=next;
   const li=document.createElement('li');li.style.setProperty('--key',color);
   const label=document.createElement('span');label.textContent=name;
   const amount=document.createElement('b');amount.textContent=money(value);
   li.append(label,Math.round(100*value/sum)+'%',amount);list.append(li);
  });
  const ring=document.createElement('div');ring.className='glass-ring';
  ring.style.backgroundImage='conic-gradient('+stops.join(',')+')';
  const center=document.createElement('strong');center.textContent=money(sum);ring.append(center);breakdown.append(ring,list);
 }
 insights.append(categories,chart);
 root.append(intro,statGrid,insights,lower);
 toolbar.after(root);
 // All language tables, time icons, status nodes and layout elements are ready.
 // Do not call before the const definitions above have been initialized.
 renderTimeGreeting();

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
  h1.dataset.dwGreetingName=first;
  renderTimeGreeting();
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
  chartBody.removeAttribute('data-dw-shell-key');
  chartBody.replaceChildren();
  lastChartRows=Array.isArray(rows)?rows.slice():[];
  drawCategories(lastChartRows);drawTrend(lastChartRows);
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
   lastChartRows=[];breakdown.textContent='Spending is unavailable.';trend.textContent='Cash flow is unavailable.';
   chartBody.dataset.dwShellKey='chartUnavailable';
   chartBody.textContent=tr('chartUnavailable','Cash flow is unavailable right now. You can still open Cash Flow from the sidebar.');
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
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&desktop.matches){renderTimeGreeting();refreshFinance(false);}});
 window.addEventListener('pageshow',()=>{if(desktop.matches)renderTimeGreeting();});
 window.addEventListener('focus',()=>{if(desktop.matches)renderTimeGreeting();});
 // Refresh at minute boundaries, including when the viewer crosses midnight or
 // any of the four time-of-day boundaries with the dashboard still open.
 setInterval(()=>{if(desktop.matches)renderTimeGreeting();},60*1000);
 document.addEventListener('doweo:finance-saved',()=>refreshFinance(true));
 document.addEventListener('doweo:languagechange',()=>{
   renderTimeGreeting();
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
 // Existing destinations can now live in the My Wallet flyout rather than the
 // direct sidebar. Search the whole document to avoid cloning Cash Flow.
 if(nav&&analytics){
   let cashFlow=document.getElementById('nav-cashflow');
   if(!cashFlow){
     cashFlow=document.createElement('button');
     cashFlow.type='button';cashFlow.id='nav-cashflow';cashFlow.className='sq-nav-link';
     cashFlow.setAttribute('aria-label','Open Cash Flow');
     cashFlow.innerHTML='<span class="sq-nav-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 3v18h18"/><path d="m6 15 4-4 3 2 5-7"/><path d="M16 6h2v2"/></svg></span><span class="sq-nav-label">Cash Flow</span>';
     cashFlow.addEventListener('click',()=>{
       document.getElementById('nav-home')?.click();
       window.squareUpOpenFinanceHub?.('finance');
       nav.querySelectorAll('.sq-nav-link').forEach(button=>{
         button.classList.remove('active');button.removeAttribute('aria-current');
       });
       cashFlow.classList.add('active');cashFlow.setAttribute('aria-current','page');
     });
   }
   // Keep Cash Flow beside Analytics only when both are direct sidebar links.
   // When the destinations are in My Wallet, do not reorder or duplicate them.
   if(!cashFlow.isConnected){
     if(analytics.closest('#dw-my-wallet-flyout'))analytics.after(cashFlow);
     else analytics.before(cashFlow);
   }else if(cashFlow.parentElement===nav&&analytics.parentElement===nav&&cashFlow.nextElementSibling!==analytics){
     analytics.before(cashFlow);
   }
 }
 if(nav&&analytics){
  let button=document.getElementById('dw-ref-nav-notifications');
  if(!button){
   button=document.createElement('button');button.type='button';button.id='dw-ref-nav-notifications';button.className='sq-nav-link';
  button.innerHTML='<span class="sq-nav-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg></span><span class="sq-nav-label">Notifications</span>';
   button.addEventListener('click',()=>{if(!click('#sq-mobile-notifications'))click('#notifications-toggle');});
  }
  // Notifications belong in the actual sidebar, never the wallet flyout.
  // Preserve the original mobile placement when the wallet menu is absent.
  const wallet=window.matchMedia('(min-width:901px)').matches?nav.querySelector('#dw-personal-finance'):null;
  if(wallet){
    if(button.parentElement!==nav||button.previousElementSibling!==wallet)wallet.after(button);
  }else if(!button.isConnected){
    if(analytics.parentElement===nav)analytics.after(button);
    else nav.append(button);
  }
 }
 // Legacy sidebar themes sometimes hide the original icon spans. Provide a
 // guaranteed visible icon for each original destination without replacing its
 // button or navigation handler; hide these duplicates outside desktop CSS.
 const sidebarIcons=[
  ['#nav-home','<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>'],
  ['#nav-trackers','<path d="m12 3 9 5-9 5-9-5 9-5zM3 12l9 5 9-5M3 16l9 5 9-5"/>'],
  ['#sqev-nav','<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18"/>'],
  ['#nav-cashflow','<path d="M3 3v18h18"/><path d="m6 15 4-4 3 2 5-7"/><path d="M16 6h2v2"/>'],
  ['#nav-analytics','<path d="M3 20V4M7 20v-6m5 6V9m5 11V5"/>'],
  ['#dw-ref-nav-notifications','<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/>'],
  ['.sidebar .dw-nav-group[data-dw-nav-group="social"]>summary','<circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2M19 8v8m-4-4h8"/>'],
  ['.sidebar .dw-nav-group[data-dw-nav-group="more"]>summary','<circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/>']
 ];
 for(const [selector,parts] of sidebarIcons){
  const button=document.querySelector(selector);
  // The flyout displays the original .sq-nav-icon; never prepend a second
  // icon to items moved out of the sidebar.
  if(!button||!nav?.contains(button)||button.querySelector(':scope>.dw-ref-static-icon'))continue;
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
