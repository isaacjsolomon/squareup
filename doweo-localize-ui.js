/* Broader DoWeo UI localization with approved static text and cached AI translations.
   Only source-controlled interface phrases are sent to the translator. */
(function(root){
 'use strict';
 if(!root||!root.document||!root.DoWeoI18n)return;
 const i18n=root.DoWeoI18n;
 const original=new WeakMap(),attributes=new WeakMap();
 const excluded='script,style,noscript,code,pre,svg,canvas,[contenteditable],#sq-ai-stream,#tracker-chat-messages,.chat-bubble,.chat-line,.message-bubble,.sq-chat-message,.expense-description,.tracker-member-name,.sq-member-name,.sq-friend-name,[data-user-content],[data-chat-id],[data-entry-id],.sq-detail-entry,.sq-return-row,.sq-ng-transaction,.notification-item,.sq-notification-row,#history,#sq-friends-results';
 const attrNames=['placeholder','aria-label','title','alt'];
 let approved=null,language='en',cache={},requested=new Set(),pending=new Set(),running=0,scanTimer=null,saveTimer=null,retryTimer=null,lastRequest=0;
 const retries=new Map();
 const MAX_ATTEMPTS=4;
 const localizedTokens=new Set(['members','member','Favorite','Last activity','OWES','owes','total','saved','monthly','Next due','Automatic','Tracker member','Outstanding balance','Who owes whom','confirmed','added by']);
 const SEND_INTERVAL=3100; // Stay below the API's 20 requests/minute per visitor.
 const storageKey=locale=>'doweo-interface-translations-v2-'+locale;
 function locale(){return i18n.resolve(root);}
 function visible(el){
   // Translate inactive tabs and dialogs too, before they are first opened.
   // Text from user-generated areas is still blocked by isSafe().
   // Native select options typically have no client rect until opened.
   return true;
 }
 function isSafe(element){
   return Boolean(element)&&!element.closest(excluded)&&!element.closest('[data-dw-language-select]');
 }
 function getOriginal(node){
   const value=node.nodeValue;
   let entry=original.get(node);
   if(!entry||entry.rendered!==value){entry={source:value,rendered:value};original.set(node,entry);}
   return entry;
 }
 function translateDynamic(value){
   // Preserve personal names, amounts and dates; request only fixed UI labels.
   const patterns=[
     /^(\\d+) (members?|total|saved)$/i,
     /^(Last activity)( · .+)$/,
     /^(monthly)( · .+)$/i,
     /^(Next due)( .+)$/i,
     /^(Welcome back)(, .+)$/,
     /^(Archived trackers)( \\(\\d+\\))$/,
     /^(.*?)( owes )(.*)$/
   ];
   const clean=value.trim();
   for(let n=0;n<patterns.length;n++){
     const match=patterns[n].exec(clean);
     if(!match)continue;
     if(n===0){
       const token=match[2];
       queueToken(token);
       return match[1]+' '+(cache[token]||token);
     }
     if(n===6){
       queueToken('owes');
       return match[1]+' '+(cache.owes||'owes')+' '+match[3];
     }
     const key=match[1];
     queueToken(key);
     return (cache[key]||key)+match[2];
   }
   return value;
 }
 function queueToken(key){
   if(language!=='en'&&approved.has(key)&&!cache[key]&&!requested.has(key))pending.add(key);
 }
 function translate(value){
   if(language==='en')return value;
   const match=/^(\s*)([\s\S]*?)(\s*)$/.exec(value);
   if(!match)return value;
   const key=match[2];
   const translated=cache[key];
   return match[1]+(translated||translateDynamic(key))+match[3];
 }
 function eligible(value){
   const text=String(value||'').trim();
   return text.length>1&&text.length<=170&&approved.has(text)&&!/^[\d\s$.,%+-]+$/.test(text);
 }
 function render(){
   const tree=root.document.createTreeWalker(root.document.body,NodeFilter.SHOW_TEXT);
   let node;
   while((node=tree.nextNode())){
     const el=node.parentElement;
     if(!isSafe(el)||!visible(el))continue;
     const entry=getOriginal(node),key=entry.source.trim();
     if(!eligible(key)&&language==='en')continue;
     if(!eligible(key)&&!/(\\d+ (?:members?|total|saved)|Last activity · |monthly · |Next due |Welcome back, |Archived trackers \\(\\d+\\)| owes )/i.test(key))continue;
     const next=translate(entry.source);
     if(node.nodeValue!==next){node.nodeValue=next;entry.rendered=next;}
     if(eligible(key))queueToken(key);
   }
   root.document.querySelectorAll('[placeholder],[aria-label],[title],[alt]').forEach(el=>{
     if(!isSafe(el)||!visible(el))return;
     let record=attributes.get(el);
     if(!record){record={};attributes.set(el,record);}
     for(const name of attrNames){
       if(!el.hasAttribute(name))continue;
       const current=el.getAttribute(name);
       const last=record[name];
       if(!last||current!==last.rendered)record[name]={source:current,rendered:current};
       const entry=record[name],key=entry.source.trim();
       if(!eligible(key))continue;
       const next=translate(entry.source);
       if(current!==next){el.setAttribute(name,next);entry.rendered=next;}
       queueToken(key);
     }
   });
   pump();
 }
 function save(){
   if(saveTimer)clearTimeout(saveTimer);
   saveTimer=setTimeout(()=>{
     try{root.localStorage.setItem(storageKey(language),JSON.stringify(cache));}catch(_){}
   },250);
 }
 function readCache(){
   try{
     const stored=JSON.parse(root.localStorage.getItem(storageKey(language))||'{}');
     cache=stored&&typeof stored==='object'&&!Array.isArray(stored)?stored:{};
   }catch(_){cache={};}
 }
 async function send(batch,lang){
   try{
     const response=await fetch('/api/ui-translate',{
       method:'POST',credentials:'same-origin',
       headers:{'Content-Type':'application/json'},
       body:JSON.stringify({locale:lang,texts:batch})
     });
     if(!response.ok)throw Error('Translation unavailable');
     const result=await response.json();
     if(!Array.isArray(result.translations)||result.translations.length!==batch.length)throw Error('Invalid translation');
     if(lang!==language)return;
     batch.forEach((key,index)=>{
       const value=result.translations[index];
       if(typeof value==='string'&&value.trim())cache[key]=value.trim();
     });
     save();schedule();
   }catch(_){
     if(lang===language){
       for(const key of batch){
         const count=(retries.get(key)||0)+1;
         retries.set(key,count);
         requested.delete(key);
         if(count<MAX_ATTEMPTS)pending.add(key);
       }
       // Retry transient API failures without looping or exhausting rate limits.
       const delay=4500*Math.min(4,Math.max(...batch.map(k=>retries.get(k)||1)));
       if(retryTimer)clearTimeout(retryTimer);
       retryTimer=setTimeout(()=>{retryTimer=null;pump();},delay);
     }
   }finally{
     running--;pump();
   }
 }
 function pump(){
   if(!approved||language==='en'||!pending.size)return;
   if(running>0||retryTimer)return;
   const wait=SEND_INTERVAL-(Date.now()-lastRequest);
   if(wait>0){retryTimer=setTimeout(()=>{retryTimer=null;pump();},wait);return;}
   while(running<1&&pending.size){
     const batch=[];
     for(const key of pending){pending.delete(key);if(!requested.has(key)&&!cache[key]){batch.push(key);requested.add(key);}if(batch.length>=16)break;}
     if(!batch.length)return;
     lastRequest=Date.now();
     running++;
     void send(batch,language);
   }
 }
 const screenshotSpanish={"Events":"Eventos","Event planning":"Planificación de eventos","Total events":"Eventos totales","Upcoming":"Próximos","Past events":"Eventos pasados","Your events":"Tus eventos","View event →":"Ver evento →","Create new tracker":"Crear nuevo grupo","Choose from 7 templates or start with a blank tracker.":"Elige entre 7 plantillas o empieza desde cero.","members":"miembros","member":"miembro","Favorite":"Favorito","Last activity":"Última actividad","No activity yet":"Sin actividad todavía","Open tracker →":"Abrir grupo →","Archived trackers":"Grupos archivados","Tracker members":"Miembros del grupo","People sharing this tracker":"Personas que comparten este grupo","You":"Tú","Email":"Correo electrónico","Not added":"Sin agregar","Subscriptions":"Suscripciones","No bills yet.":"Todavía no hay facturas.","Select a tracker":"Selecciona un grupo","Billing calendar":"Calendario de facturación","Select a day to see scheduled bills and subscriptions.":"Selecciona un día para ver los pagos programados.","Welcome back":"Bienvenido de nuevo","Your people, payments, and shared activity.":"Tus contactos, pagos y actividad compartida.","Current balances":"Saldos actuales","Who owes whom in this tracker":"Quién le debe a quién en este grupo","Smart settle-up":"Liquidación inteligente","Split a bill":"Dividir una cuenta","Search expenses...":"Buscar gastos...","All time":"Todo el tiempo","All statuses":"Todos los estados","OWES":"DEBE","owes":"debe","Subscriptions & Bills":"Suscripciones y facturas","New event":"Nuevo evento","total":"en total","saved":"guardados","monthly":"mensual","Next due":"Próximo vencimiento","Automatic":"Automático","Tracker member":"Miembro del grupo","Outstanding balance":"Saldo pendiente","Who owes whom":"Quién le debe a quién","All categories":"Todas las categorías","All members":"Todos los miembros","Food & Dining":"Comida y restaurantes","confirmed":"confirmado","added by":"agregado por","Active subscriptions":"Suscripciones activas","Estimated monthly recurring":"Total mensual recurrente estimado","Based on saved schedules":"Según los pagos programados","In selected tracker":"En el grupo seleccionado","Add a bill or subscription":"Agregar factura o suscripción","Set up a recurring expense for your tracker.":"Configura un gasto recurrente para tu grupo.","UPCOMING":"PRÓXIMO"};
 function seedStaticTranslations(){
   if(language==='es')for(const [source,destination] of Object.entries(screenshotSpanish)){
     if(approved.has(source)&&!cache[source])cache[source]=destination;
   }
   const dictionary=root.DoWeoTranslations?.languages;
   const en=dictionary?.en, localized=dictionary?.[language];
   if(!Array.isArray(en)||!Array.isArray(localized))return;
   en.forEach((source,index)=>{
     if(typeof localized[index]==='string'&&localized[index].trim()&&approved.has(source))cache[source]=localized[index];
   });
 }
 function scan(){
   if(!approved)return;
   const next=locale();
   if(language!==next){
     language=next;pending.clear();requested.clear();retries.clear();
     if(retryTimer){clearTimeout(retryTimer);retryTimer=null;}
     readCache();
     seedStaticTranslations();
   }
   render();
 }
 function schedule(){
   if(scanTimer)clearTimeout(scanTimer);
   scanTimer=setTimeout(scan,120);
 }
 async function init(){
   try{
     const module=await import('/doweo-ui-catalog.mjs');
     approved=new Set(module.UI_PHRASES);
   }catch(_){return;}
   language=locale();readCache();seedStaticTranslations();
   scan();
   new MutationObserver(schedule).observe(root.document.body,{
     childList:true,characterData:true,subtree:true,attributes:true,attributeFilter:['class','hidden','aria-hidden','placeholder','title','aria-label','alt']
   });
   root.document.addEventListener('doweo:languagechange',schedule);
   root.addEventListener('pageshow',schedule);
 }
 if(root.document.readyState==='loading')root.document.addEventListener('DOMContentLoaded',()=>{void init();},{once:true});
 else void init();
})(typeof globalThis!=='undefined'?globalThis:null);
