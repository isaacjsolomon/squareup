/* Deterministic translations for DoWeo's new universal shell and dashboard.
   The rest of the product continues using the existing approved UI translator.
   Never translate user-entered descriptions, names, amounts or chat messages. */
(async function(){
 'use strict';
 if(window.dwUnifiedLocale)return;
 let tables;
 try{
   const data=await import('/doweo-unified-locales.mjs');
   tables=data.SHELL_TRANSLATIONS;
 }catch(error){
   console.warn('Shell offline translations not loaded; keeping original site localization.',error);
   return;
 }
 const locale=()=>{
   const code=window.DoWeoI18n?.resolve?.(window)||document.documentElement.lang||'en';
   const normalized=code==='he-script'?'he':code;
   return Object.hasOwn(tables,normalized)?normalized:'en';
 };
 const t=key=>tables[locale()][key]||tables.en[key]||key;
 const greeting=name=>String(name||'').trim()
   ?t('hello').replace('{name}',String(name).trim())
   :t('welcome');

 function setText(selector,key){
   const node=document.querySelector(selector);if(!node)return;
   const desired=t(key);
   if(node.textContent!==desired)node.textContent=desired;
 }
 function apply(){
   const selectors={
     '#dw-ref-home .dw-ref-greeting p':'intro',
     '#dw-ref-stat-net .dw-ref-stat-label':'netBalance',
     '#dw-ref-stat-net .dw-ref-stat-detail':'trackerBalance',
     '#dw-ref-stat-income .dw-ref-stat-label':'totalIncome',
     '#dw-ref-stat-income .dw-ref-stat-detail':'privateRecords',
     '#dw-ref-stat-spend .dw-ref-stat-label':'totalSpending',
     '#dw-ref-stat-spend .dw-ref-stat-detail':'privateRecords',
     '#dw-ref-chart-title':'cashFlow',
     '#dw-ref-home #dw-ref-activity-title':'recentActivity',
     '#dw-ref-home #dw-ref-settle-title':'smartSettle',
     '#dw-ref-home .dw-ref-settle-heading p':'settleDescription',
     '#dw-ref-nav-notifications .sq-nav-label':'notifications'
   };
   for(const [selector,key] of Object.entries(selectors))setText(selector,key);
   const greetingNode=document.getElementById('dw-ref-greeting');
   if(greetingNode){
     const name=greetingNode.dataset.dwGreetingName||'';
     const label=greeting(name);
     if(greetingNode.textContent!==label)greetingNode.textContent=label;
   }
   const buttons={
     '#dw-ref-home .dw-ref-chart .dw-ref-text-link':'viewCashFlow',
     '#dw-ref-home .dw-ref-activity .dw-ref-text-link':'viewAll'
   };
   for(const [selector,key] of Object.entries(buttons))setText(selector,key);

   const add=document.querySelector('#dw-ref-add #dw-compact-add');
   if(add){
     const label='＋ '+t('add');
     const textNode=[...add.childNodes].find(n=>n.nodeType===Node.TEXT_NODE);
     if(textNode){
       if(textNode.textContent!==label)textNode.textContent=label;
     }else add.prepend(document.createTextNode(label));
     add.setAttribute('aria-label',t('addActions'));
   }
   const settle=document.getElementById('dw-ref-settle-action');
   if(settle){
     const node=[...settle.childNodes].find(n=>n.nodeType===Node.TEXT_NODE);
     const label=t('settleCTA')+' ';
     if(node){
       if(node.textContent!==label)node.textContent=label;
     }else settle.prepend(document.createTextNode(label));
   }
   for(const node of document.querySelectorAll('[data-dw-shell-key]')){
     if(node===add||node.closest('#dw-ref-add #dw-compact-add'))continue;
     const key=node.dataset.dwShellKey;
     if(!tables.en[key])continue;
     const desired=t(key);
     if(node.textContent!==desired)node.textContent=desired;
   }
   const topic={search:'search',notifications:'notifications',account:'openAccount'};
   for(const button of document.querySelectorAll('#dw-all-topbar [data-dw-all-tool],#dw-ref-toolbar [data-ref-tool]')){
     const kind=button.dataset.dwAllTool||button.dataset.refTool;
     const key=topic[kind];if(!key)continue;
     button.setAttribute('aria-label',t(key));
     button.title=t(key);
   }
   const chart=document.querySelector('#dw-ref-home .dw-ref-chart');
   if(chart)chart.setAttribute('aria-label',t('cashFlow'));
   const stats={net:'trackerBalance',income:'privateRecords',spend:'privateRecords'};
   for(const [name,key] of Object.entries(stats)){
     const stat=document.getElementById('dw-ref-stat-'+name);
     if(stat)stat.title=t(key);
   }
 }
 let pending=false;
 const schedule=()=>{
   if(pending)return;
   pending=true;
   requestAnimationFrame(()=>{pending=false;apply();});
 };
 window.dwUnifiedLocale={locale,t,greeting,apply};
 document.addEventListener('doweo:languagechange',schedule);
 document.addEventListener('doweo:uiupdated',schedule);
 window.addEventListener('pageshow',schedule);
 window.addEventListener('squareup:tracker-detail',schedule);
 // Dynamic routes use original UI controls, not rebuilt translations.
 const bar=document.getElementById('dw-all-topbar');
 if(bar)new MutationObserver(schedule).observe(bar,{childList:true,subtree:false});
 schedule();
})();
