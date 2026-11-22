/* Cash Flow desktop view: reuse Spending Analytics' structure, not the old finance card grid.
   Only called for desktop; mobile continues to use the original renderer. */
(function(){
 'use strict';
 let range='6', recapMonth='';
 window.dwCashFlowAnalyticsRender=function({content,finance,money,esc,refresh}){
  const now=new Date(),todayKey=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0');
  const chosen=recapMonth||todayKey;
  const date=new Date(Number(chosen.slice(0,4)),Number(chosen.slice(5,7))-1,1);
  const prev=new Date(date.getFullYear(),date.getMonth()-1,1);
  const prevKey=prev.getFullYear()+'-'+String(prev.getMonth()+1).padStart(2,'0');
  const keyFor=x=>String(x.occurred_on||'').slice(0,7);
  const valid=(Array.isArray(finance)?finance:[]).filter(x=>x&&['income','expense'].includes(x.kind)&&Number.isFinite(Number(x.amount))&&Number(x.amount)>=0);
  const sum=(list,kind)=>list.filter(x=>x.kind===kind).reduce((total,x)=>total+Number(x.amount),0);
  const recap=valid.filter(x=>keyFor(x)===chosen),previous=valid.filter(x=>keyFor(x)===prevKey);
  const recIncome=sum(recap,'income'),recSpent=sum(recap,'expense'),prevNet=sum(previous,'income')-sum(previous,'expense');
  const oldKeys=valid.map(keyFor).filter(k=>/^\d{4}-\d{2}$/.test(k)&&k<=todayKey).sort();
  const earliest=oldKeys[0]||todayKey;
  const allCount=Math.max(6,(now.getFullYear()-Number(earliest.slice(0,4)))*12+now.getMonth()-Number(earliest.slice(5,7))+2);
  const count=range==='all'?allCount:Number(range);
  const months=Array.from({length:count},(_,i)=>{
   const d=new Date(now.getFullYear(),now.getMonth()-(count-i-1),1);
   return {key:d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'),label:d.toLocaleDateString(undefined,{month:'short'}),income:0,expense:0};
  });
  const monthMap=new Map(months.map(m=>[m.key,m]));
  const rows=valid.filter(x=>range==='all'||monthMap.has(keyFor(x)));
  for(const x of rows){const m=monthMap.get(keyFor(x));if(m)m[x.kind]+=Number(x.amount);}
  const income=sum(rows,'income'),spent=sum(rows,'expense'),net=income-spent;
  const max=Math.max(1,...months.flatMap(m=>[m.income,m.expense]));
  const bars=months.map(m=>'<div class="sq-month-column dw-cash-month"><div class="sq-month-bar-space dw-cash-bars"><div class="dw-cash-bar income" style="height:'+(m.income?Math.max(3,m.income/max*100):0)+'%" title="Income '+esc(money(m.income))+'"></div><div class="dw-cash-bar spending" style="height:'+(m.expense?Math.max(3,m.expense/max*100):0)+'%" title="Spending '+esc(money(m.expense))+'"></div></div><span class="sq-month-label">'+esc(m.label)+'</span></div>').join('');
  const categories={};
  rows.filter(x=>x.kind==='expense').forEach(x=>{const name=String(x.category||'Uncategorized');categories[name]=(categories[name]||0)+Number(x.amount);});
  const groups=Object.entries(categories).sort((a,b)=>b[1]-a[1]);
  const colors=window.matchMedia('(max-width:900px)').matches
    ? ['#ABC6D7','#ABC6D7','#ABC6D7','#ABC6D7','#ABC6D7','#ABC6D7']
    : ['#ABC6D7','#ABC6D7','#ABC6D7','#ABC6D7','#ABC6D7','#ABC6D7'];
  let angle=0;
  const gradient=groups.map(([name,amount],i)=>{const start=angle;angle+=spent?amount/spent*100:0;return colors[i%colors.length]+' '+start.toFixed(2)+'% '+angle.toFixed(2)+'%';}).join(',');
  const legend=groups.map(([name,amount],i)=>'<div class="sq-person-legend-item dw-cash-person-row"><span class="sq-person-dot" style="background:'+colors[i%colors.length]+'"></span><div><span>'+esc(name)+'</span><strong>'+esc(money(amount))+'</strong><small>'+(spent?(amount/spent*100).toFixed(0):0)+'% of spending</small></div></div>').join('');
  const donut=groups.length?'<div class="sq-person-donut dw-cash-donut" style="background:conic-gradient('+gradient+')"><div class="sq-person-donut-hole"><strong>'+esc(money(spent))+'</strong><span>Spending</span></div></div><div class="sq-person-legend dw-cash-legend">'+legend+'</div>':'<p class="sq-analytics-empty">No spending recorded for this period.</p>';
  const recapCards=[['Income',money(recIncome)],['Spending',money(recSpent)],['Net cash flow',money(recIncome-recSpent)],['Previous month net',money(prevNet)]];
  const kpis=[['↗','Personal cash flow',money(net),'Income minus spending'],['＋','Total income',money(income),'Recorded in this period'],['↘','Total spending',money(spent),'Recorded in this period'],['≡','Transactions',String(rows.length),'Income and expense entries']];
  const stats=recapCards.map(([label,value])=>'<div class="sq-recap-stat"><span>'+esc(label)+'</span><strong>'+esc(value)+'</strong></div>').join('');
  const kpiHtml=kpis.map(([symbol,label,value,note])=>'<div class="analytics-stat"><div class="sq-stat-label"><span class="sq-stat-icon" aria-hidden="true">'+symbol+'</span>'+esc(label)+'</div><strong>'+esc(value)+'</strong><small>'+esc(note)+'</small></div>').join('');
  const recent=rows.slice().sort((a,b)=>String(b.occurred_on||'').localeCompare(String(a.occurred_on||''))).map(x=>'<div class="sq-recent-row dw-cash-recent-row"><div class="sq-recent-main"><b>'+esc(x.description||'Personal transaction')+'</b><small>'+esc(x.category||'Uncategorized')+' · '+esc(x.kind)+'</small></div><span class="sq-recent-date">'+esc(x.occurred_on||'')+'</span><strong class="sq-recent-amount">'+(x.kind==='expense'?'-':'+')+esc(money(x.amount))+'</strong><button type="button" data-delete="'+esc(x.id)+'">Delete</button></div>').join('');
  const comparisons=[['Income',sum(previous,'income'),recIncome],['Spending',sum(previous,'expense'),recSpent],['Net cash flow',prevNet,recIncome-recSpent]].map(([label,prior,current])=>'<tr><th scope="row">'+esc(label)+'</th><td>'+esc(money(prior))+'</td><td>'+esc(money(current))+'</td><td>'+esc(money(current-prior))+'</td></tr>').join('');
  const monthLabel=date.toLocaleDateString(undefined,{month:'long',year:'numeric'});
  content.innerHTML='<div class="sq-analytics-header dw-cash-header"><div><h2>Cash Flow</h2><p>Private spending and income, separate from your shared trackers.</p></div><div class="dw-cash-header-actions"><label class="sq-analytics-filter">Time range <select id="dw-cash-range" aria-label="Cash Flow time range"><option value="6" '+(range==='6'?'selected':'')+'>Last 6 months</option><option value="12" '+(range==='12'?'selected':'')+'>Last 12 months</option><option value="all" '+(range==='all'?'selected':'')+'>All time</option></select></label><button type="button" id="sq-ng-open-transaction" aria-haspopup="dialog" aria-controls="sq-ng-txn-overlay">+ Add transaction</button></div></div>'+
  '<section class="sq-analytics-panel dw-cash-panel dw-cash-recap"><div class="sq-analytics-panel-heading"><div><h3>Monthly cash flow recap</h3></div><div class="sq-recap-controls"><label class="sq-analytics-filter">Month <input type="month" id="dw-cash-month" value="'+esc(chosen)+'" aria-label="Choose recap month"></label><button type="button" id="dw-cash-export" class="small-btn">Export CSV</button></div></div><div class="sq-recap-grid dw-cash-recap-grid">'+stats+'</div><p class="sq-recap-note dw-cash-recap-note">Private transactions recorded in '+esc(monthLabel)+'. Shared tracker balances are not included.</p></section>'+
  '<div class="analytics-stats dw-cash-kpis">'+kpiHtml+'</div>'+
  '<div class="sq-analytics-charts dw-cash-charts"><section class="sq-analytics-panel dw-cash-panel"><div class="sq-analytics-panel-heading"><div><h3>Monthly cash flow</h3><p class="dw-cash-key"><i class="income"></i> Income <i class="spending"></i> Spending</p></div></div><div class="sq-month-chart dw-cash-chart-scroll"><div class="dw-cash-chart-months" style="--dw-cash-columns:'+count+'">'+bars+'</div></div></section><section class="sq-analytics-panel dw-cash-panel"><div class="sq-analytics-panel-heading"><div><h3>Spending by category</h3></div></div><div class="sq-person-chart dw-cash-person-chart">'+donut+'</div></section></div>'+
  '<section class="sq-analytics-panel dw-cash-panel dw-cash-activity"><div class="sq-analytics-panel-heading"><div><h3>Recent personal activity</h3></div></div><div class="sq-analytics-recent">'+(recent||'<p class="sq-analytics-empty">No personal transactions in this period.</p>')+'</div></section>'+
  '<section class="sq-analytics-panel dw-cash-panel dw-cash-comparison"><div class="sq-analytics-panel-heading"><div><h3>Month comparison</h3></div></div><div class="dw-cash-table-wrap"><table><thead><tr><th>Category</th><th>'+esc(prev.toLocaleDateString(undefined,{month:'short',year:'numeric'}))+'</th><th>'+esc(monthLabel)+'</th><th>Change</th></tr></thead><tbody>'+comparisons+'</tbody></table></div></section><p class="dw-cash-footnote">Personal records are private and never change shared tracker balances.</p>';
  content.querySelector('#dw-cash-range').addEventListener('change',e=>{range=e.target.value;refresh();});
  content.querySelector('#dw-cash-month').addEventListener('change',e=>{if(/^\d{4}-\d{2}$/.test(e.target.value)){recapMonth=e.target.value;refresh();}});
  content.querySelector('#dw-cash-export').addEventListener('click',()=>{
   const lines=[['Date','Type','Description','Category','Amount (USD)'],...recap.map(x=>[x.occurred_on||'',x.kind||'',x.description||'',x.category||'',x.amount||0])];
   const quote=v=>'"'+String(v).replace(/"/g,'""')+'"';
   const csv=lines.map(line=>line.map(quote).join(',')).join('\r\n');
   const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
   const a=document.createElement('a');a.href=url;a.download='doweo-cash-flow-'+chosen+'.csv';
   document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  });
 };
})();
