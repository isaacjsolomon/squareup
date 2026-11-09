/* Broader DoWeo UI localization with approved static text and cached AI translations.
   Only source-controlled interface phrases are sent to the translator. */
(function(root){
 'use strict';
 if(!root||!root.document||!root.DoWeoI18n)return;
 const i18n=root.DoWeoI18n;
 const original=new WeakMap(),attributes=new WeakMap();
 const excluded='script,style,noscript,code,pre,svg,canvas,[contenteditable],#sq-ai-stream,#tracker-chat-messages,.chat-bubble,.chat-line,.message-bubble,.sq-chat-message,.expense-description,.tracker-member-name,.sq-member-name,.sq-friend-name,[data-user-content],[data-chat-id],[data-entry-id]';
 const attrNames=['placeholder','aria-label','title','alt','value'];
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
     /^(\d+) (members?|total|saved)$/i,
     /^(Last activity)( · .+)$/,
     /^(monthly)( · .+)$/i,
     /^(Next due)( .+)$/i,
     /^(Welcome back)(, .+)$/,
     /^(Archived trackers)( \(\d+\))$/,
     /^(.*?)( owes )(.*)$/
   ];
   const clean=value.trim();
   for(let n=0;n<patterns.length;n++){
     const match=patterns[n].exec(clean);
     if(!match)continue;
     if(n===0){
       let token=match[2];
       // Correct legacy singular "1 members" labels.
       if(match[1]==='1'&&token.toLowerCase()==='members')token='member';
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
   const canonical=approvedKey(key);
   if(language!=='en'&&canonical&&!cache[canonical]&&!requested.has(canonical)&&(retries.get(canonical)||0)<MAX_ATTEMPTS)pending.add(canonical);
 }
 function translate(value){
   if(language==='en')return value;
   const match=/^(\s*)([\s\S]*?)(\s*)$/.exec(value);
   if(!match)return value;
   const key=match[2];
   // UI controls are often rendered with decorative icons or a plus/arrow.
   // Translate only an approved label and preserve its decoration.
   const decorated=/^([+☆★✦✧←→↗↖↘↙📌]\\s*)(.+)$/.exec(key);
   const candidate=decorated?decorated[2]:key;
   const canonical=approvedKey(candidate);
   const suffix=canonical!==candidate&&candidate.endsWith(':')?':':'';
   const translated=canonical&&cache[canonical];
   if(translated)return match[1]+(decorated?decorated[1]:'')+translated+suffix+match[3];
   const month=/^(January|February|March|April|May|June|July|August|September|October|November|December) (\\d{4})$/.exec(key);
   if(month){
     const year=Number(month[2]),index=['January','February','March','April','May','June','July','August','September','October','November','December'].indexOf(month[1]);
     return match[1]+new Intl.DateTimeFormat(language,{month:'long',year:'numeric'}).format(new Date(Date.UTC(year,index,1)))+match[3];
   }
   return match[1]+translateDynamic(key)+match[3];
 }
 function approvedKey(value){
   const exact=String(value||'').trim();
   if(approved.has(exact))return exact;
   // Prefix glyphs belong to the interface, never to customer data.
   const decorated=/^[+☆★✦✧←→↗↖↘↙📌]\\s*(.+)$/.exec(exact);
   if(decorated&&approved.has(decorated[1]))return decorated[1];
   const normalized=exact.replace(/\s+/g,' ');
   if(approved.has(normalized))return normalized;
   if(normalized.endsWith(':')&&approved.has(normalized.slice(0,-1)))return normalized.slice(0,-1);
   return null;
 }
 function eligible(value){
   const text=String(value||'').trim();
   return text.length>1&&text.length<=170&&Boolean(approvedKey(text))&&!/^[\d\s$.,%+-]+$/.test(text);
 }
 function render(){
   const tree=root.document.createTreeWalker(root.document.body,NodeFilter.SHOW_TEXT);
   let node;
   while((node=tree.nextNode())){
     const el=node.parentElement;
     if(!isSafe(el)||!visible(el))continue;
     const entry=getOriginal(node),key=entry.source.trim();
     if(!eligible(key)&&language==='en')continue;
     if(!eligible(key)&&!/(\d+ (?:members?|total|saved)|Last activity · |monthly · |Next due |Welcome back, |Archived trackers \(\d+\)| owes |^(?:January|February|March|April|May|June|July|August|September|October|November|December) \d{4}$)/i.test(key))continue;
     const next=translate(entry.source);
     if(node.nodeValue!==next){node.nodeValue=next;entry.rendered=next;}
     if(eligible(key))queueToken(key);
   }
   root.document.querySelectorAll('[placeholder],[aria-label],[title],[alt],input[type="button"],input[type="submit"],input[type="reset"]').forEach(el=>{
     if(!isSafe(el)||!visible(el))return;
     let record=attributes.get(el);
     if(!record){record={};attributes.set(el,record);}
     for(const name of attrNames){
       if(!el.hasAttribute(name)||name==='value'&&!el.matches('input[type="button"],input[type="submit"],input[type="reset"]'))continue;
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
 const screenshotSpanish={"Events":"Eventos","Event planning":"Planificación de eventos","Total events":"Eventos totales","Upcoming":"Próximos","Past events":"Eventos pasados","Your events":"Tus eventos","View event →":"Ver evento →","Create new tracker":"Crear nuevo grupo","Choose from 7 templates or start with a blank tracker.":"Elige entre siete plantillas o empieza desde cero.","members":"miembros","member":"miembro","Favorite":"Favorito","Last activity":"Última actividad","No activity yet":"Sin actividad todavía","Open tracker →":"Abrir grupo →","Archived trackers":"Grupos archivados","Tracker members":"Miembros del grupo","People sharing this tracker":"Personas que comparten este grupo","You":"Tú","Email":"Correo electrónico","Not added":"Sin agregar","Subscriptions":"Suscripciones","No bills yet.":"Todavía no hay facturas.","Select a tracker":"Selecciona un grupo","Billing calendar":"Calendario de facturación","Select a day to see scheduled bills and subscriptions.":"Selecciona un día para ver las facturas y suscripciones programadas.","Welcome back":"Bienvenido de nuevo","Your people, payments, and shared activity.":"Tus contactos, pagos y actividad compartida.","Current balances":"Saldos actuales","Who owes whom in this tracker":"Quién le debe a quién en este grupo","Smart settle-up":"Liquidación inteligente","Split a bill":"Dividir una cuenta","Search expenses...":"Buscar gastos...","All time":"Todo el tiempo","All statuses":"Todos los estados","OWES":"DEBE","owes":"debe","Subscriptions & Bills":"Suscripciones y facturas","New event":"Nuevo evento","total":"en total","saved":"guardados","monthly":"mensual","Next due":"Próximo vencimiento","Automatic":"Automático","Tracker member":"Miembro del grupo","Outstanding balance":"Saldo pendiente","Who owes whom":"Quién le debe a quién","All categories":"Todas las categorías","All members":"Todos los miembros","Food & Dining":"Comida y restaurantes","confirmed":"confirmado","added by":"agregado por","Active subscriptions":"Suscripciones activas","Estimated monthly recurring":"Total mensual recurrente estimado","Based on saved schedules":"Según los pagos programados","In selected tracker":"En el grupo seleccionado","Add a bill or subscription":"Añadir factura o suscripción","Set up a recurring expense for your tracker.":"Configura un gasto recurrente para tu grupo.","UPCOMING":"PRÓXIMO","Plan together, organize the details, and stay on top of shared expenses.":"Planifica en grupo, organiza los detalles y controla los gastos compartidos.","View event":"Ver evento","New tracker":"Nuevo grupo","Open tracker":"Abrir grupo","Finance":"Finanzas","Financial Hub":"Centro financiero","Home":"Inicio","Overview":"Resumen","Members":"Miembros","Tracker":"Grupo","Trackers":"Grupos","Trips":"Viajes","Households":"Hogares","Wallet":"Billetera","Expenses":"Gastos","Settlements":"Liquidaciones","Activity":"Actividad","Recent activity":"Actividad reciente","Total income":"Ingresos totales","Total spending":"Gastos totales","Cash Flow":"Flujo de caja","Settings":"Configuración","Account":"Cuenta","Search":"Buscar","Your shared space":"Tu espacio compartido","YOUR SHARED SPACE":"TU ESPACIO COMPARTIDO","Your balance":"Tu saldo","People in this tracker":"Personas en este grupo","View all":"Ver todo","Balances by person":"Saldos por persona","Simplify group debts into fewer payments. Suggestions do not move money.":"Simplifica las deudas del grupo con menos pagos. Las sugerencias no transfieren dinero.","Recent Activity":"Actividad reciente","Expenses and payments in this tracker":"Gastos y pagos de este grupo","Export CSV":"Exportar CSV","Status":"Estado","Details":"Detalles","Delete":"Eliminar","Remove":"Quitar","Filters":"Filtros","Filter expenses by category or person":"Filtra los gastos por categoría o persona","Category":"Categoría","Member":"Miembro","Add an expense":"Añadir un gasto","Quick add options":"Opciones rápidas","Scan receipt":"Escanear recibo","Assign items to friends":"Asignar artículos a amigos","Divide an expense with friends":"Divide un gasto con amigos","Pay Now":"Pagar ahora","Send via Venmo or Cash App":"Enviar mediante Venmo o Cash App","Organize recurring payments by tracker, see upcoming due dates, and remove bills you no longer need.":"Organiza los pagos recurrentes por grupo, consulta los próximos vencimientos y elimina las facturas innecesarias.","Bills":"Facturas","Username":"Nombre de usuario","Clear everything in this tracker":"Borrar todo lo de este grupo","Create a new tracker":"Crear un grupo nuevo"};
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
