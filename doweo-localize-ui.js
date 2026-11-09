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
   // Translate fixed UI tokens in mixed status lines without touching names,
   // expense descriptions, dates, amounts, or other user-authored data.
   if(value.includes(' · ')){
     const parts=value.split(' · ');
     let changed=false;
     const converted=parts.map(part=>{
       const key=approvedKey(part);
       if(key){queueToken(key);if(cache[key]){changed=true;return cache[key];}}
       for(const token of ['Next due','added by','Previous month spending','Owed to you','You owe']){
         if(part.startsWith(token+' ')){
           queueToken(token);
           if(cache[token]){changed=true;return cache[token]+part.slice(token.length);}
         }
       }
       return part;
     });
     if(changed)return converted.join(' · ');
   }
   const patterns=[
     /^(\d+) (members?|total|saved)$/i,
     /^(Last activity)( · .+)$/,
     /^(monthly)( · .+)$/i,
     /^(Next due)( .+)$/i,
     /^(Welcome back)(, .+)$/,
     /^(Hi,)( .+)$/,
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
   const decorated=/^([+☆★✦✧←→↗↖↘↙📌]\s*)(.+)$/.exec(key);
   const candidate=decorated?decorated[2]:key;
   const canonical=approvedKey(candidate);
   const suffix=canonical!==candidate&&candidate.endsWith(':')?':':'';
   const translated=canonical&&cache[canonical];
   if(translated)return match[1]+(decorated?decorated[1]:'')+translated+suffix+match[3];
   const month=/^(January|February|March|April|May|June|July|August|September|October|November|December) (\d{4})$/.exec(key);
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
   const decorated=/^[+☆★✦✧←→↗↖↘↙📌]\s*(.+)$/.exec(exact);
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
     if(!eligible(key)&&!/(\d+ (?:members?|total|saved)|Last activity · |monthly · |Next due |Welcome back, |Hi, |Archived trackers \(\d+\)| owes |^(?:January|February|March|April|May|June|July|August|September|October|November|December) \d{4}$)/i.test(key))continue;
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
 const screenshotSpanish={"Events":"Eventos","Event planning":"Planificación de eventos","Total events":"Total de eventos","Upcoming":"Próximos","Past events":"Eventos pasados","Your events":"Tus eventos","View event →":"Ver evento →","Create new tracker":"Crear nuevo grupo","Choose from 7 templates or start with a blank tracker.":"Elige entre siete plantillas o empieza desde cero.","members":"miembros","member":"miembro","Favorite":"Favorito","Last activity":"Última actividad","No activity yet":"Todavía no hay actividad","Open tracker →":"Abrir grupo →","Archived trackers":"Grupos archivados","Tracker members":"Miembros del grupo","People sharing this tracker":"Personas que comparten este grupo","You":"Tú","Email":"Correo electrónico","Not added":"Sin agregar","Subscriptions":"Suscripciones","No bills yet.":"Todavía no hay facturas.","Select a tracker":"Selecciona un grupo","Billing calendar":"Calendario de facturación","Select a day to see scheduled bills and subscriptions.":"Selecciona un día para ver las facturas y suscripciones programadas.","Welcome back":"Bienvenido de nuevo","Your people, payments, and shared activity.":"Tus contactos, pagos y actividad compartida.","Current balances":"Saldos actuales","Who owes whom in this tracker":"Quién le debe a quién en este grupo","Smart settle-up":"Liquidación inteligente","Split a bill":"Dividir una cuenta","Search expenses...":"Buscar gastos...","All time":"Todo el tiempo","All statuses":"Todos los estados","OWES":"DEBE","owes":"debe","Subscriptions & Bills":"Suscripciones y facturas","New event":"Nuevo evento","total":"en total","saved":"guardados","monthly":"mensual","Next due":"Próximo vencimiento","Automatic":"Automático","Tracker member":"Miembro del grupo","Outstanding balance":"Saldo pendiente","Who owes whom":"Quién le debe a quién","All categories":"Todas las categorías","All members":"Todos los miembros","Food & Dining":"Comida y restaurantes","confirmed":"confirmado","added by":"añadido por","Active subscriptions":"Suscripciones activas","Estimated monthly recurring":"Total mensual recurrente estimado","Based on saved schedules":"Según los pagos programados","In selected tracker":"En el grupo seleccionado","Add a bill or subscription":"Añadir factura o suscripción","Set up a recurring expense for your tracker.":"Configura un gasto recurrente para tu grupo.","UPCOMING":"PRÓXIMO","Plan together, organize the details, and stay on top of shared expenses.":"Planifica en grupo, organiza los detalles y controla los gastos compartidos.","View event":"Ver evento","New tracker":"Nuevo grupo","Open tracker":"Abrir grupo","Finance":"Finanzas","Financial Hub":"Centro financiero","Home":"Inicio","Overview":"Resumen","Members":"Miembros","Tracker":"Grupo","Trackers":"Grupos de gastos","Trips":"Viajes","Households":"Hogares","Wallet":"Billetera","Expenses":"Gastos","Settlements":"Liquidaciones","Activity":"Actividad","Recent activity":"Actividad reciente","Total income":"Ingresos totales","Total spending":"Gastos totales","Cash Flow":"Flujo de caja","Settings":"Configuración","Account":"Cuenta","Search":"Buscar","Your shared space":"Tu espacio compartido","YOUR SHARED SPACE":"TU ESPACIO COMPARTIDO","Your balance":"Tu saldo","People in this tracker":"Personas en este grupo","View all":"Ver todo","Balances by person":"Saldos por persona","Simplify group debts into fewer payments. Suggestions do not move money.":"Simplifica las deudas del grupo con menos pagos. Las sugerencias no transfieren dinero.","Recent Activity":"Actividad reciente","Expenses and payments in this tracker":"Gastos y pagos de este grupo","Export CSV":"Exportar CSV","Status":"Estado","Details":"Detalles","Delete":"Eliminar","Remove":"Eliminar","Filters":"Filtros","Filter expenses by category or person":"Filtra los gastos por categoría o persona","Category":"Categoría","Member":"Miembro","Add an expense":"Añadir un gasto","Quick add options":"Opciones rápidas","Scan receipt":"Escanear recibo","Assign items to friends":"Asignar artículos a amigos","Divide an expense with friends":"Divide un gasto con amigos","Pay Now":"Pagar ahora","Send via Venmo or Cash App":"Enviar mediante Venmo o Cash App","Organize recurring payments by tracker, see upcoming due dates, and remove bills you no longer need.":"Organiza los pagos periódicos por grupo, consulta las próximas fechas de vencimiento y elimina las facturas que ya no necesites.","Bills":"Facturas","Username":"Nombre de usuario","Clear everything in this tracker":"Borrar todo lo de este grupo","Create a new tracker":"Crear un grupo nuevo","☆ Favorite":"☆ Favorito","← Home":"← Inicio","+ New event":"+ Nuevo evento","Payments":"Pagos","Recent personal activity":"Actividad personal reciente","Balance":"Saldo","Personal Finance Hub":"Centro de finanzas personales","Private spending and income, separate from your shared trackers.":"Gastos e ingresos privados, separados de tus grupos compartidos.","Personal":"Personal","Wallet & Settlements":"Billetera y liquidaciones","Your balances across existing trackers, without changing any debts.":"Tus saldos de los grupos existentes, sin modificar ninguna deuda.","Connected trackers":"Grupos vinculados","Trackers owed to you":"Grupos que te deben dinero","Trackers you owe":"Grupos a los que debes dinero","Settlement overview":"Resumen de liquidaciones","Totals are grouped by currency so different currencies are never incorrectly combined.":"Los totales se agrupan por moneda para no combinar diferentes divisas.","Recent settlement activity":"Actividad reciente de liquidaciones","Confirmed payments recorded in your accessible trackers.":"Pagos confirmados registrados en tus grupos.","Balances by tracker":"Saldos por grupo","Search your trackers":"Buscar grupos","All balances":"Todos los saldos","Tracker name":"Nombre del grupo","Manage payments →":"Gestionar pagos →","Owed to you":"Te deben","You owe":"Debes","Sent":"Enviado","Received":"Recibido","Settlement payment":"Pago de liquidación","Personal cash flow":"Flujo de caja personal","Add expense":"Añadir gasto","Add Expense":"Añadir gasto","Or record income":"O registrar ingresos","Personal records are private and never change shared tracker balances.":"Los registros personales son privados y nunca modifican los saldos compartidos.","Trip Mode":"Modo viaje","Household Mode":"Modo hogar","Your trips":"Tus viajes","Your households":"Tus hogares","Create new trip":"Crear nuevo viaje","Create new household":"Crear nuevo hogar","Link existing tracker":"Vincular grupo existente","No trips linked yet":"Aún no hay viajes vinculados","Open household":"Abrir hogar","Your existing trips stay linked to their trackers.":"Tus viajes siguen vinculados a sus grupos.","Build shared routines around your existing trackers.":"Organiza rutinas compartidas con tus grupos existentes.","Subscription Manager":"Gestor de suscripciones","Manage your bills and subscriptions":"Gestiona tus facturas y suscripciones","Open Bills & Subscriptions":"Abrir facturas y suscripciones","Existing subscriptions":"Suscripciones existentes","Manage in billing center":"Gestionar en el centro de facturación","Linked to original records":"Vinculado a los registros originales","Multi-Currency":"Multidivisa","Currency converter":"Conversor de divisas","Favorite currencies":"Divisas favoritas","Manage currencies":"Gestionar divisas","Latest available rates":"Tipos de cambio más recientes","Amount":"Importe","From currency":"De la divisa","To currency":"A la divisa","Convert":"Convertir","Smart Insights":"Análisis inteligentes","This month income":"Ingresos de este mes","This month spending":"Gastos de este mes","Monthly cash flow":"Flujo de caja mensual","Last six months":"Últimos seis meses","This month's spending categories":"Categorías de gastos de este mes","Previous month spending":"Gastos del mes anterior","Spending Analytics":"Análisis de gastos","Monthly spending recap":"Resumen mensual de gastos","Expense entries":"Movimientos de gastos","Average expense":"Gasto promedio","Total expenses":"Gastos totales","Recent expenses":"Gastos recientes","Expenses by person":"Gastos por persona","Tracker group chat":"Chat del grupo","Search messages...":"Buscar mensajes...","Pinned":"Fijados","Group polls":"Encuestas del grupo","Make decisions together in chat.":"Toma decisiones en grupo desde el chat.","New poll":"Nueva encuesta","Find a message in this conversation":"Buscar un mensaje en esta conversación","Clear":"Borrar","Message your group...":"Escribe a tu grupo...","Send":"Enviar","My Friends":"Mis amigos","Pending Requests":"Solicitudes pendientes","Find Friends":"Buscar amigos","Search for DoWeo users":"Buscar usuarios de DoWeo","Enter at least 3 username characters":"Introduce al menos tres caracteres del usuario","View profile":"Ver perfil","Shared wishlist":"Lista de deseos compartida","Add idea":"Añadir idea","Optional link":"Enlace opcional","No ideas yet. Add the first one.":"Todavía no hay ideas. Añade la primera.","Account Settings":"Configuración de la cuenta","Manage your profile, payments, and preferences.":"Gestiona tu perfil, tus pagos y tus preferencias.","Edit Profile":"Editar perfil","Edit profile":"Editar perfil","Your name, username, bio, and profile picture.":"Tu nombre, usuario, biografía y foto de perfil.","Change profile picture":"Cambiar foto de perfil","Display name":"Nombre visible","Bio":"Biografía","Save profile":"Guardar perfil","Payment Accounts":"Cuentas de pago","Friends' payment accounts":"Cuentas de pago de amigos","Venmo username":"Usuario de Venmo","Apple Cash contact (optional)":"Contacto de Apple Cash (opcional)","Save payment accounts":"Guardar cuentas de pago","Push notifications":"Notificaciones push","Notification preferences":"Preferencias de notificaciones","Enable push notifications":"Activar notificaciones push","New expenses":"Nuevos gastos","Payments and confirmations":"Pagos y confirmaciones","Group chat messages":"Mensajes del chat grupal","Mentions in group chat":"Menciones en el chat grupal","Due-date reminders":"Recordatorios de vencimiento","Install DoWeo":"Instalar DoWeo","Delete account":"Eliminar cuenta","Delete my account":"Eliminar mi cuenta","Change password":"Cambiar contraseña","Log out":"Cerrar sesión","Language":"Idioma","Back to Dashboard":"Volver al inicio","Help improve DoWeo":"Ayuda a mejorar DoWeo","Report a bug, share an idea, or rate your experience.":"Informa de errores, comparte ideas o valora tu experiencia.","Bug report":"Informe de error","Feature idea":"Sugerencia de función","Rate DoWeo":"Valorar DoWeo","Subject":"Asunto","Your rating":"Tu valoración","A short description":"Descripción breve","What happened? What would you like to see?":"¿Qué ocurrió? ¿Qué te gustaría ver?","Send feedback":"Enviar comentarios","Beta Feedback":"Comentarios de la beta","About DoWeo":"Acerca de DoWeo","Site tutorial":"Tutorial del sitio","Keeping money between friends simple.":"Simplificamos las cuentas entre amigos.","Track together":"Gestionar juntos","Split automatically":"Dividir automáticamente","Scan receipts":"Escanear recibos","Stay organized":"Mantente organizado","How This Website Was Made":"Cómo se creó este sitio web","Go to your trackers →":"Ir a tus grupos →","Finance Hub":"Centro financiero","Chat":"Chat","Hi,":"Hola,","Groups":"Grupos","Social":"Social","More":"Más","About":"Acerca de","Analytics":"Análisis","Friends":"Amigos"};
 function seedStaticTranslations(){
   const dictionary=root.DoWeoTranslations?.languages;
   const en=dictionary?.en, localized=dictionary?.[language];
   if(Array.isArray(en)&&Array.isArray(localized))en.forEach((source,index)=>{
     if(typeof localized[index]==='string'&&localized[index].trim()&&approved.has(source))cache[source]=localized[index];
   });
   // Keep sidebar navigation immediately usable in every supported language,
   // including when the on-demand translation service is unavailable.
   const navTranslations={
     es:['Centro financiero','Comentarios de la beta','Hola,'],
     fr:['Centre financier','Avis bêta','Bonjour,'],
     he:['מרכז פיננסי','משוב בטא','שלום,'],
     'zh-Hans':['财务中心','测试反馈','你好，'],
     pt:['Centro financeiro','Feedback beta','Olá,'],
     de:['Finanzübersicht','Beta-Feedback','Hallo,'],
     it:['Centro finanziario','Feedback beta','Ciao,'],
     ja:['ファイナンスハブ','ベータ版への意見','こんにちは、'],
     ar:['المركز المالي','ملاحظات تجريبية','مرحبًا،'],
     ko:['금융 허브','베타 피드백','안녕하세요,'],
     hi:['वित्तीय केंद्र','बीटा प्रतिक्रिया','नमस्ते,']
   };
   const sidebar=navTranslations[language];
   if(sidebar)for(const [index,source] of ['Finance Hub','Beta Feedback','Hi,'].entries())
     if(approved.has(source))cache[source]=sidebar[index];
   // Reviewed Spanish labels override stale localStorage/AI values.
   if(language==='es')for(const [source,destination] of Object.entries(screenshotSpanish)){
     if(approved.has(source))cache[source]=destination;
   }
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
   // Allow the app to opt into targeted rescans after manually rendering a view.
   root.document.addEventListener('doweo:uiupdated',schedule);
 }
 if(root.document.readyState==='loading')root.document.addEventListener('DOMContentLoaded',()=>{void init();},{once:true});
 else void init();
})(typeof globalThis!=='undefined'?globalThis:null);
