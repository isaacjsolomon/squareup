/* Broader DoWeo UI localization with approved static text and cached AI translations.
   Only source-controlled interface phrases are sent to the translator. */
(function(root){
 'use strict';
 if(!root||!root.document||!root.DoWeoI18n)return;
 const i18n=root.DoWeoI18n;
 const original=new WeakMap(),attributes=new WeakMap();
 const excluded='script,style,noscript,code,pre,svg,canvas,[contenteditable],#sq-ai-stream,#tracker-chat-messages,.chat-bubble,.chat-line,.message-bubble,.sq-chat-message,.expense-description,.tracker-member-name,.sq-member-name,.sq-friend-name,[data-user-content],[data-chat-id],[data-entry-id]';
 const attrNames=['placeholder','aria-label','title','alt','value'];
 let approved=null,coreTranslations=null,language='en',cache={},requested=new Set(),pending=new Set(),running=0,scanTimer=null,saveTimer=null,retryTimer=null,lastRequest=0;
 const retries=new Map();
 const MAX_ATTEMPTS=4;
 const localizedTokens=new Set(['members','member','Favorite','Last activity','OWES','owes','total','saved','monthly','Next due','Automatic','Tracker member','Outstanding balance','Who owes whom','confirmed','added by']);
 const SEND_INTERVAL=3100; // Stay below the API's 20 requests/minute per visitor.
 const storageKey=locale=>'doweo-interface-translations-v2-'+locale;
 function locale(){return i18n.resolve(root);}
 function visible(el){
   // Translate the active view first. Previously every hidden page, dialog and
   // dropdown queued thousands of requests ahead of the text on screen.
   // Native option elements have no layout rectangles even while selectable.
   if(el.matches?.('option,optgroup'))return true;
   let node=el;
   while(node&&node!==root.document.body){
     if(node.hidden||node.getAttribute?.('aria-hidden')==='true'||node.getAttribute?.('inert')!==null)return false;
     const style=root.getComputedStyle(node);
     if(style.display==='none'||style.visibility==='hidden'||style.visibility==='collapse')return false;
     node=node.parentElement;
   }
   return true;
 }
 function isSafe(element){
   return Boolean(element)&&!element.closest(excluded)&&!element.closest('[data-dw-language-select],[data-dw-language-grid]');
 }
 function getOriginal(node){
   const value=node.nodeValue;
   let entry=original.get(node);
   if(!entry||entry.rendered!==value){entry={source:value,rendered:value};original.set(node,entry);}
   return entry;
 }
 function translateDynamic(value){
   // Financial totals and record titles contain private amounts/descriptions.
   // Translate fixed phrases only; never send the whole string for translation.
   const category=/^\[Category: (Food & Dining|Food|Other)\](.*)$/.exec(value);
   if(category){
     queueToken('Category:');queueToken(category[1]);
     const heading=cache['Category:']||'Category:';
     const label=cache[category[1]]||category[1];
     return '['+heading+' '+label+']'+category[2];
   }
   const perPerson=/^(\$[\d,.]+) (per person)$/.exec(value);
   if(perPerson){
     queueToken('per person');
     return perPerson[1]+' '+(cache['per person']||'per person');
   }
   // User names, descriptions and amounts are never submitted to translation.
   // Only translate the static pieces of mixed status/summary rows.
   const statusPrefix=/^(Sent|Received|Settlement payment|income|expense|Job|Food)( · .+)$/.exec(value);
   if(statusPrefix){queueToken(statusPrefix[1]);return (cache[statusPrefix[1]]||statusPrefix[1])+statusPrefix[2];}
   const previousMonth=/^(Previous month spending:)( .+)$/.exec(value);
   if(previousMonth){queueToken('Previous month spending');return (cache['Previous month spending']||'Previous month spending')+':'+previousMonth[2];}
   const categoryLabel=/^(\\[Category: )([^\\]]+)(\\])(.*)$/.exec(value);
   if(categoryLabel){
     queueToken('Category:');
     const label=approvedKey(categoryLabel[2]);
     if(label)queueToken(label);
     return '['+(cache['Category:']||'Category:')+' '+(label?(cache[label]||label):categoryLabel[2])+']'+categoryLabel[4];
   }
   const withTip=/^(Total including tip:)( .+)$/.exec(value);
   if(withTip){
     queueToken(withTip[1]);
     return (cache[withTip[1]]||withTip[1])+withTip[2];
   }
   const youName=/^(You)( \([^)]+\))$/.exec(value);
   if(youName){
     queueToken('You');
     return (cache.You||'You')+youName[2];
   }
   const splitSelected=/^(Split between)( \(\d+ selected\))$/.exec(value);
   if(splitSelected){
     queueToken('Split between');queueToken('selected');
     const selected=cache.selected||'selected';
     return (cache['Split between']||'Split between')+splitSelected[2].replace('selected',selected);
   }
   const tourStep=/^(DOWEO GUIDE) · (\d+) OF (\d+)$/.exec(value);
   if(tourStep){
     queueToken('DOWEO GUIDE');queueToken('OF');
     return (cache['DOWEO GUIDE']||'DOWEO GUIDE')+' · '+tourStep[2]+' '+(cache.OF||'OF')+' '+tourStep[3];
   }
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
       // Russian requires the correct form for quantities: 1 участник,
       // 2 участника, 5 участников, 21 участник, 22 участника.
       if(language==='ru'&&/^members?$/i.test(token)){
         const quantity=Number(match[1]),lastTwo=quantity%100,last=quantity%10;
         const noun=lastTwo>=11&&lastTwo<=14?'участников':last===1?'участник':last>=2&&last<=4?'участника':'участников';
         return match[1]+' '+noun;
       }
       // Japanese, Korean and Chinese counters join their classifiers without
       // English-style whitespace: 2人, 2명, 2位成员.
       const translated=cache[token]||token;
       const separator=['ja','ko','zh-Hans'].includes(language)&&/^members?$/i.test(token)?'':' ';
       return match[1]+separator+translated;
     }
     if(match[2]===' owes '){
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
   const decorated=/^([+＋☆★✦✧←→↗↖↘↙📌📎▤▣]\s*)(.+)$/u.exec(key);
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
   const decorated=/^[+＋☆★✦✧←→↗↖↘↙📌📎▤▣]\s*(.+)$/u.exec(exact);
   if(decorated&&approved.has(decorated[1]))return decorated[1];
   const normalized=exact.replace(/\s+/g,' ');
   if(approved.has(normalized))return normalized;
   if(normalized.endsWith(':')&&approved.has(normalized.slice(0,-1)))return normalized.slice(0,-1);
   return null;
 }
 function eligible(value){
   const text=String(value||'').trim();
   return text.length>1&&text.length<=600&&Boolean(approvedKey(text))&&!/^[\\d\\s$.,%+-]+$/.test(text);
 }
 // Remove short decorative explanations directly below page/section headings.
 // Keep form hints, critical financial notices, user-authored event text and
 // longer instructional or accessibility content.
 function hideDecorativeDescriptions(){
   // About is editorial content; its descriptions are intentional.
   for(const el of root.document.querySelectorAll('#about-page [data-dw-decorative-description]')){
     el.hidden=false;
     delete el.dataset.dwDecorativeDescription;
   }
   const roots=root.document.querySelectorAll('main, [role="main"], #sqev-view');
   const scope=roots.length?roots:[root.document.body];
   for(const container of scope){
     container.querySelectorAll('h1 + p, h2 + p, h3 + p, .sqev-toolbar .sqev-subtitle').forEach(el=>{
       if(el.closest('#about-page,form,dialog,[role="dialog"],[role="alert"],[role="status"],blockquote,[data-user-content],.sqev-detail-heading'))return;
       const text=el.textContent.trim();
       if(!text||text.length>260||el.querySelector('a,button,input,select,textarea'))return;
       // Exclude any instructions with safety, account deletion, or payment meaning.
       if(/password|permanently|cannot be undone|never transfers|confirm recipient|sensitive information|dispute|security|privacy policy|terms|warning|required/i.test(text))return;
       if(!el.hidden){el.hidden=true;el.dataset.dwDecorativeDescription='true';}
     });
   }
 }
 const actionLocales={
   es:['Crear nuevo grupo','Crear nuevo viaje','Crear nuevo hogar','Crear nuevo evento','Abrir grupo'],
   fr:['Créer un groupe','Créer un voyage','Créer un foyer','Créer un événement','Ouvrir le groupe'],
   he:['יצירת קבוצה חדשה','יצירת טיול חדש','יצירת משק בית חדש','יצירת אירוע חדש','פתיחת קבוצה'],
   'zh-Hans':['创建新群组','创建新旅行','创建新家庭','创建新活动','打开群组'],
   pt:['Criar novo grupo','Criar nova viagem','Criar nova casa','Criar novo evento','Abrir grupo'],
   de:['Neue Gruppe erstellen','Neue Reise erstellen','Neuen Haushalt erstellen','Neue Veranstaltung erstellen','Gruppe öffnen'],
   it:['Crea un nuovo gruppo','Crea un nuovo viaggio','Crea una nuova casa','Crea un nuovo evento','Apri gruppo'],
   ja:['新しいグループを作成','新しい旅行を作成','新しい世帯を作成','新しいイベントを作成','グループを開く'],
   ar:['إنشاء مجموعة جديدة','إنشاء رحلة جديدة','إنشاء منزل جديد','إنشاء فعالية جديدة','فتح المجموعة'],
   ko:['새 그룹 만들기','새 여행 만들기','새 가구 만들기','새 이벤트 만들기','그룹 열기'],
   hi:['नया समूह बनाएँ','नई यात्रा बनाएँ','नया घर बनाएँ','नया कार्यक्रम बनाएँ','समूह खोलें'],
   ru:["Создать группу","Создать поездку","Создать совместное жильё","Создать событие","Открыть группу"],
   tr:["Yeni grup oluştur","Yeni gezi oluştur","Yeni ortak hane oluştur","Yeni etkinlik oluştur","Grubu aç"],
   vi:["Tạo nhóm mới","Tạo chuyến đi mới","Tạo hộ gia đình mới","Tạo sự kiện mới","Mở nhóm"],
   nl:["Nieuwe groep maken","Nieuwe reis maken","Nieuw huishouden aanmaken","Nieuw evenement maken","Groep openen"],
   pl:["Utwórz nową grupę","Utwórz nową podróż","Utwórz nowe gospodarstwo domowe","Utwórz nowe wydarzenie","Otwórz grupę"],
   sv:["Skapa ny grupp","Skapa ny resa","Skapa nytt hushåll","Skapa nytt evenemang","Öppna grupp"],
   bn:["নতুন গ্রুপ তৈরি করুন","নতুন ভ্রমণ তৈরি করুন","নতুন যৌথ পরিবার তৈরি করুন","নতুন ইভেন্ট তৈরি করুন","গ্রুপ খুলুন"]
 };
 const actionKeys=['Create new tracker','Create new trip','Create new household','Create new event','Open tracker'];
 // Gallery cards and workspace buttons are recreated by the app after asynchronous
 // data loads. Translate from their original action identity on every scan,
 // rather than relying on the rendered English text remaining unchanged.
 function translateCreateActions(){
   const targets=root.document.querySelectorAll('button');
   for(const element of targets){
     // The targeted controls contain only plain text. Never overwrite complex buttons.
     if(element.children.length)continue;
     let source=element.dataset.dwCreateAction;
     if(!source){
       const raw=element.textContent.trim();
       const normalized=raw.replace(/^([+＋])\s*/,'').replace(/\s+/g,' ').replace(/\s*[→➜]\s*$/,'').trim();
       const canonical=actionKeys.find(key=>key.toLowerCase()===normalized.toLowerCase());
       if(!canonical)continue;
       source=canonical;
       element.dataset.dwCreateAction=source;
     }
     const i=actionKeys.indexOf(source);
     if(i<0)continue;
     const label=coreTranslations?.[language]?.[source]||actionLocales[language]?.[i]||source;
     const arrow=source==='Open tracker'?' →':'';
     // Keep the leading plus for dynamically recreated controls.
     if(source.startsWith('Create new ')&&element.dataset.dwCreatePlus===undefined){
       element.dataset.dwCreatePlus=/^[+＋]/u.test(element.textContent.trim())?'true':'false';
     }
     const next=(source.startsWith('Create new ')&&element.dataset.dwCreatePlus==='true'?'＋ ':'')+label+arrow;
     if(element.textContent!==next)element.textContent=next;
   }
 }

 function fixRtlInputIdentifiers(){
   // Hebrew/Arabic are RTL, but usernames, handles, phone numbers and
   // email addresses must keep their original LTR character order.
   const rtl=language==='he'||language==='ar';
   const ids=['settings-username','settings-venmo','settings-cashapp','settings-applecash'];
   for(const id of ids){
     const el=root.document.getElementById(id);
     if(el){if(rtl)el.setAttribute('dir','ltr');else el.removeAttribute('dir');}
   }
 }
 function render(){
   // Do not hide descriptive copy as a substitute for translating it.
   fixRtlInputIdentifiers();
   translateCreateActions();
   const tree=root.document.createTreeWalker(root.document.body,NodeFilter.SHOW_TEXT);
   let node;
   while((node=tree.nextNode())){
     const el=node.parentElement;
     if(!isSafe(el)||!visible(el))continue;
     const entry=getOriginal(node),key=entry.source.trim();
     if(!eligible(key)&&language==='en')continue;
     if(!eligible(key)&&!/(\d+ (?:members?|total|saved)|Last activity · |monthly · |Next due |Welcome back, |Hi, |DOWEO GUIDE · |\[Category: [^\]]+\]|\$[\d,.]+ per person$|Total including tip:|^You \(|^Split between \(|Previous month spending:|^(?:Sent|Received|Settlement payment) · |Archived trackers \(\d+\)| owes |^(?:January|February|March|April|May|June|July|August|September|October|November|December) \d{4}$)/i.test(key))continue;
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
   translateCreateActions();
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
     for(const key of pending){if(!requested.has(key)&&!cache[key]){const chars=batch.reduce((n,v)=>n+v.length,0);if(batch.length&&chars+key.length>4700)break;batch.push(key);requested.add(key);}pending.delete(key);if(batch.length>=12)break;}
     if(!batch.length)return;
     lastRequest=Date.now();
     running++;
     void send(batch,language);
   }
 }
 const screenshotSpanish={"Events":"Eventos","Event planning":"Planificación de eventos","Total events":"Total de eventos","Upcoming":"Próximos","Past events":"Eventos pasados","Your events":"Tus eventos","View event →":"Ver evento →","Create new tracker":"Crear nuevo grupo","Choose from 7 templates or start with a blank tracker.":"Elige entre siete plantillas o empieza desde cero.","members":"miembros","member":"miembro","Favorite":"Favorito","Last activity":"Última actividad","No activity yet":"Todavía no hay actividad","Open tracker →":"Abrir grupo →","Archived trackers":"Grupos archivados","Tracker members":"Miembros del grupo","People sharing this tracker":"Personas que comparten este grupo","You":"Tú","Email":"Correo electrónico","Not added":"Sin agregar","Subscriptions":"Suscripciones","No bills yet.":"Todavía no hay facturas.","Select a tracker":"Selecciona un grupo","Billing calendar":"Calendario de facturación","Select a day to see scheduled bills and subscriptions.":"Selecciona un día para ver las facturas y suscripciones programadas.","Welcome back":"Bienvenido de nuevo","Your people, payments, and shared activity.":"Tus contactos, pagos y actividad compartida.","Current balances":"Saldos actuales","Who owes whom in this tracker":"Quién le debe a quién en este grupo","Smart settle-up":"Liquidación inteligente","Split a bill":"Dividir una cuenta","Search expenses...":"Buscar gastos...","All time":"Todo el tiempo","All statuses":"Todos los estados","OWES":"DEBE","owes":"debe","Subscriptions & Bills":"Suscripciones y facturas","New event":"Nuevo evento","total":"en total","saved":"guardados","monthly":"mensual","Next due":"Próximo vencimiento","Automatic":"Automático","Tracker member":"Miembro del grupo","Outstanding balance":"Saldo pendiente","Who owes whom":"Quién le debe a quién","All categories":"Todas las categorías","All members":"Todos los miembros","Food & Dining":"Comida y restaurantes","confirmed":"confirmado","added by":"añadido por","Active subscriptions":"Suscripciones activas","Estimated monthly recurring":"Total mensual recurrente estimado","Based on saved schedules":"Según los pagos programados","In selected tracker":"En el grupo seleccionado","Add a bill or subscription":"Añadir factura o suscripción","Set up a recurring expense for your tracker.":"Configura un gasto recurrente para tu grupo.","UPCOMING":"PRÓXIMO","Plan together, organize the details, and stay on top of shared expenses.":"Planifica en grupo, organiza los detalles y controla los gastos compartidos.","View event":"Ver evento","New tracker":"Nuevo grupo","Open tracker":"Abrir grupo","Finance":"Finanzas","Financial Hub":"Centro financiero","Home":"Inicio","Overview":"Resumen","Members":"Miembros","Tracker":"Grupo","Trackers":"Grupos de gastos","Trips":"Viajes","Households":"Hogares","Wallet":"Cartera","Expenses":"Gastos","Settlements":"Liquidaciones","Activity":"Actividad","Recent activity":"Actividad reciente","Total income":"Ingresos totales","Total spending":"Gastos totales","Cash Flow":"Flujo de caja","Settings":"Configuración","Account":"Cuenta","Search":"Buscar","Your shared space":"Tu espacio compartido","YOUR SHARED SPACE":"TU ESPACIO COMPARTIDO","Your balance":"Tu saldo","People in this tracker":"Personas en este grupo","View all":"Ver todo","Balances by person":"Saldos por persona","Simplify group debts into fewer payments. Suggestions do not move money.":"Simplifica las deudas del grupo con menos pagos. Las sugerencias no transfieren dinero.","Recent Activity":"Actividad reciente","Expenses and payments in this tracker":"Gastos y pagos de este grupo","Export CSV":"Exportar CSV","Status":"Estado","Details":"Detalles","Delete":"Eliminar","Remove":"Eliminar","Filters":"Filtros","Filter expenses by category or person":"Filtra los gastos por categoría o persona","Category":"Categoría","Member":"Miembro","Add an expense":"Añadir un gasto","Quick add options":"Opciones rápidas","Scan receipt":"Escanear recibo","Assign items to friends":"Asignar artículos a amigos","Divide an expense with friends":"Divide un gasto con amigos","Pay Now":"Pagar ahora","Send via Venmo or Cash App":"Enviar mediante Venmo o Cash App","Organize recurring payments by tracker, see upcoming due dates, and remove bills you no longer need.":"Organiza los pagos periódicos por grupo, consulta las próximas fechas de vencimiento y elimina las facturas que ya no necesites.","Bills":"Facturas","Username":"Nombre de usuario","Clear everything in this tracker":"Borrar todo lo de este grupo","Create a new tracker":"Crear un grupo nuevo","☆ Favorite":"☆ Favorito","← Home":"← Inicio","+ New event":"+ Nuevo evento","Payments":"Pagos","Recent personal activity":"Actividad personal reciente","Balance":"Saldo","Personal Finance Hub":"Centro de finanzas personales","Private spending and income, separate from your shared trackers.":"Gastos e ingresos privados, separados de tus grupos compartidos.","Personal":"Personal","Wallet & Settlements":"Billetera y liquidaciones","Your balances across existing trackers, without changing any debts.":"Tus saldos de los grupos existentes, sin modificar ninguna deuda.","Connected trackers":"Grupos vinculados","Trackers owed to you":"Grupos que te deben dinero","Trackers you owe":"Grupos a los que debes dinero","Settlement overview":"Resumen de liquidaciones","Totals are grouped by currency so different currencies are never incorrectly combined.":"Los totales se agrupan por moneda para no combinar diferentes divisas.","Recent settlement activity":"Actividad reciente de liquidaciones","Confirmed payments recorded in your accessible trackers.":"Pagos confirmados registrados en tus grupos.","Balances by tracker":"Saldos por grupo","Search your trackers":"Buscar grupos","All balances":"Todos los saldos","Tracker name":"Nombre del grupo","Manage payments →":"Gestionar pagos →","Owed to you":"Te deben","You owe":"Debes","Sent":"Enviado","Received":"Recibido","Settlement payment":"Pago de liquidación","Personal cash flow":"Flujo de caja personal","Add expense":"Añadir gasto","Add Expense":"Añadir gasto","Or record income":"O registrar ingresos","Personal records are private and never change shared tracker balances.":"Los registros personales son privados y nunca modifican los saldos compartidos.","Trip Mode":"Modo viaje","Household Mode":"Modo hogar","Your trips":"Tus viajes","Your households":"Tus hogares","Create new trip":"Crear nuevo viaje","Create new household":"Crear nuevo hogar","Link existing tracker":"Vincular grupo existente","No trips linked yet":"Aún no hay viajes vinculados","Open household":"Abrir hogar","Your existing trips stay linked to their trackers.":"Tus viajes siguen vinculados a sus grupos.","Build shared routines around your existing trackers.":"Organiza rutinas compartidas con tus grupos existentes.","Subscription Manager":"Gestor de suscripciones","Manage your bills and subscriptions":"Gestiona tus facturas y suscripciones","Open Bills & Subscriptions":"Abrir facturas y suscripciones","Existing subscriptions":"Suscripciones existentes","Manage in billing center":"Gestionar en el centro de facturación","Linked to original records":"Vinculado a los registros originales","Multi-Currency":"Multidivisa","Currency converter":"Conversor de divisas","Favorite currencies":"Divisas favoritas","Manage currencies":"Gestionar divisas","Latest available rates":"Tipos de cambio más recientes","Amount":"Importe","From currency":"De la divisa","To currency":"A la divisa","Convert":"Convertir","Smart Insights":"Análisis inteligentes","This month income":"Ingresos de este mes","This month spending":"Gastos de este mes","Monthly cash flow":"Flujo de caja mensual","Last six months":"Últimos seis meses","This month's spending categories":"Categorías de gastos de este mes","Previous month spending":"Gastos del mes anterior","Spending Analytics":"Análisis de gastos","Monthly spending recap":"Resumen mensual de gastos","Expense entries":"Movimientos de gastos","Average expense":"Gasto promedio","Total expenses":"Gastos totales","Recent expenses":"Gastos recientes","Expenses by person":"Gastos por persona","Tracker group chat":"Chat del grupo","Search messages...":"Buscar mensajes...","Pinned":"Fijados","Group polls":"Encuestas del grupo","Make decisions together in chat.":"Toma decisiones en grupo desde el chat.","New poll":"Nueva encuesta","Find a message in this conversation":"Buscar un mensaje en esta conversación","Clear":"Borrar","Message your group...":"Escribe a tu grupo...","Send":"Enviar","My Friends":"Mis amigos","Pending Requests":"Solicitudes pendientes","Find Friends":"Buscar amigos","Search for DoWeo users":"Buscar usuarios de DoWeo","Enter at least 3 username characters":"Introduce al menos tres caracteres del usuario","View profile":"Ver perfil","Shared wishlist":"Lista de deseos compartida","Add idea":"Añadir idea","Optional link":"Enlace opcional","No ideas yet. Add the first one.":"Todavía no hay ideas. Añade la primera.","Account Settings":"Configuración de la cuenta","Manage your profile, payments, and preferences.":"Gestiona tu perfil, tus pagos y tus preferencias.","Edit Profile":"Editar perfil","Edit profile":"Editar perfil","Your name, username, bio, and profile picture.":"Tu nombre, usuario, biografía y foto de perfil.","Change profile picture":"Cambiar foto de perfil","Display name":"Nombre visible","Bio":"Biografía","Save profile":"Guardar perfil","Payment Accounts":"Cuentas de pago","Friends' payment accounts":"Cuentas de pago de amigos","Venmo username":"Usuario de Venmo","Apple Cash contact (optional)":"Contacto de Apple Cash (opcional)","Save payment accounts":"Guardar cuentas de pago","Push notifications":"Notificaciones push","Notification preferences":"Preferencias de notificaciones","Enable push notifications":"Activar notificaciones push","New expenses":"Nuevos gastos","Payments and confirmations":"Pagos y confirmaciones","Group chat messages":"Mensajes del chat grupal","Mentions in group chat":"Menciones en el chat grupal","Due-date reminders":"Recordatorios de vencimiento","Install DoWeo":"Instalar DoWeo","Delete account":"Eliminar cuenta","Delete my account":"Eliminar mi cuenta","Change password":"Cambiar contraseña","Log out":"Cerrar sesión","Language":"Idioma","Back to Dashboard":"Volver al inicio","Help improve DoWeo":"Ayuda a mejorar DoWeo","Report a bug, share an idea, or rate your experience.":"Informa de errores, comparte ideas o valora tu experiencia.","Bug report":"Informe de error","Feature idea":"Sugerencia de función","Rate DoWeo":"Valorar DoWeo","Subject":"Asunto","Your rating":"Tu valoración","A short description":"Descripción breve","What happened? What would you like to see?":"¿Qué ocurrió? ¿Qué te gustaría ver?","Send feedback":"Enviar comentarios","Beta Feedback":"Comentarios de la beta","About DoWeo":"Acerca de DoWeo","Site tutorial":"Tutorial del sitio","Keeping money between friends simple.":"Simplificamos las cuentas entre amigos.","Track together":"Gestionar juntos","Split automatically":"Dividir automáticamente","Scan receipts":"Escanear recibos","Stay organized":"Mantente organizado","How This Website Was Made":"Cómo se creó este sitio web","Go to your trackers →":"Ir a tus grupos →","Finance Hub":"Centro financiero","Chat":"Mensajes","Hi,":"Hola,","Groups":"Grupos","Social":"Comunidad","More":"Más","About":"Acerca de","Analytics":"Análisis","Friends":"Amigos","Household":"Hogar","Currencies":"Divisas","Insights":"Análisis","Create new event":"Crear nuevo evento","Create new":"Crear nuevo","Create a tracker":"Crear un grupo","Manage bills":"Gestionar facturas","Your DoWeo AI assistant":"Tu asistente de IA de DoWeo","History":"Historial","New chat":"Nuevo chat","Your chats":"Tus conversaciones","Private conversations saved to your account":"Conversaciones privadas guardadas en tu cuenta","← Back to Home":"← Volver al inicio","Add attachment":"Añadir archivo adjunto","Connect group poll":"Vincular encuesta del grupo","Connect expense":"Vincular gasto","Add to chat":"Añadir al chat","ABOUT DOWEO":"ACERCA DE DOWEO","❔ Site tutorial":"❔ Tutorial del sitio","Keeping money":"Gestionar el dinero","between friends ":"entre amigos ","simple.":"es sencillo.","DoWeo makes it easy to track shared expenses, split bills, and settle up with friends. No awkward conversations, no spreadsheets — just a simple way to stay even.":"DoWeo facilita el seguimiento de gastos compartidos, la división de cuentas y la liquidación de deudas entre amigos. Sin conversaciones incómodas ni hojas de cálculo: una forma sencilla de llevar las cuentas al día.","Keep all your shared expenses in one place.":"Guarda todos tus gastos compartidos en un solo lugar.","See who owes who with up-to-date balances.":"Consulta quién debe a quién con saldos actualizados.","Upload a receipt and assign items to friends.":"Sube un recibo y asigna los artículos a tus amigos.","Add due dates, get notifications, and settle up easily.":"Añade fechas de vencimiento, recibe notificaciones y salda cuentas fácilmente.","BEHIND THE WEBSITE":"DETRÁS DEL SITIO WEB","DoWeo started as an idea to make it easier for friends to track and settle shared expenses. Here’s how the website came together.":"DoWeo nació de una idea para facilitar que los amigos registren y salden sus gastos compartidos. Así se creó el sitio web.","The Idea":"La idea","The beginning":"El comienzo","Built with Netlify":"Creado con Netlify","The first working version of DoWeo was created with Netlify’s AI website builder.":"La primera versión funcional de DoWeo se creó con el constructor web de inteligencia artificial de Netlify.","First version":"Primera versión","Added Supabase":"Se incorporó Supabase","Supabase brought user accounts, profiles, shared trackers, expenses, and the database behind the app.":"Supabase aportó cuentas de usuario, perfiles, grupos de gastos compartidos y la base de datos de la aplicación.","The foundation":"La base","Moved to Cloudflare Pages":"Migración a Cloudflare Pages","The website moved to Cloudflare Pages, with code managed through GitHub and server-side features connected to Supabase.":"El sitio se trasladó a Cloudflare Pages, con código gestionado en GitHub y servicios conectados a Supabase.","New home":"Nuevo hogar","Added More Features":"Se añadieron más funciones","Expense splitting, Smart Settle-Up, group chat, notifications, friends, receipt tools, and tracker customization made DoWeo more useful.":"La división de gastos, las liquidaciones inteligentes, el chat, las notificaciones, los recibos y la personalización hicieron DoWeo más útil.","Growing":"En crecimiento","Constantly Improving":"Mejoras constantes","DoWeo continues to evolve through testing, fixing bugs, and ideas from the people who use it.":"DoWeo continúa evolucionando gracias a pruebas, correcciones e ideas de sus usuarios.","Ongoing":"En curso","OUR MISSION":"NUESTRA MISIÓN","Less confusion.":"Menos confusión.","More time together.":"Más tiempo juntos.","DoWeo was built to make managing shared money effortless, so you can focus on what actually matters — your friends, experiences, and memories.":"DoWeo se creó para simplificar la gestión del dinero compartido, para que puedas centrarte en lo que de verdad importa: tus amigos, experiencias y recuerdos.","DOWEO GUIDE":"GUÍA DE DOWEO","Back":"Atrás","Next →":"Siguiente →","Finish ✓":"Finalizar ✓","Welcome to DoWeo":"Bienvenido a DoWeo","DoWeo brings shared expense tracking and personal finance tools together. This guide explains the main pages and how to use them.":"DoWeo reúne herramientas para gestionar gastos compartidos y finanzas personales. Esta guía explica las páginas principales y cómo utilizarlas.","Home and balances":"Inicio y saldos","Open a tracker to view its Overview, net balance, expense activity, and quick actions. Each tracker keeps its own members and balances.":"Abre un grupo para consultar su resumen, saldo neto, gastos y acciones rápidas. Cada grupo conserva sus propios miembros y saldos.","Trackers and invitations":"Grupos e invitaciones","Use Trackers to create, open, and share groups. Tracker settings let you manage available permissions, names, and backdrops.":"Utiliza Grupos para crear, abrir y compartir grupos. En la configuración puedes gestionar permisos, nombres y fondos.","Expenses and receipt splitting":"Gastos y división de recibos","Add Expense records who paid and how the cost is divided. Split a Bill and Scan Receipt help assign purchases to the right people.":"Añadir gasto registra quién pagó y cómo se divide el importe. Dividir una cuenta y Escanear recibo permiten asignar compras.","Payments and settlements":"Pagos y liquidaciones","Use Pay Now and the tracker payment workflow to record and confirm settlements. The Finance Hub Wallet summarizes balances across trackers without merging currencies or duplicating debts.":"Usa Pagar ahora para registrar y confirmar liquidaciones. La Cartera del Centro financiero resume los saldos sin mezclar divisas ni duplicar deudas.","Bills and subscriptions":"Facturas y suscripciones","The Bills section manages recurring bills and subscriptions, including available scheduling and payment-sharing controls. Finance Hub → Subscriptions links to this same billing center, not a second set of charges.":"La sección Facturas gestiona facturas periódicas y suscripciones. Centro financiero → Suscripciones abre el mismo centro de facturación, sin duplicar cargos.","Open your Finance Hub":"Abre tu Centro financiero","Select Finance in the mobile bottom navigation or the Finance Hub navigation entry on desktop. On mobile, use the Finance Hub section dropdown to switch between its tools.":"Selecciona Finanzas en la navegación móvil o Centro financiero en el escritorio. En móvil, usa el menú de secciones para cambiar de herramienta.","Personal Finance":"Finanzas personales","Finance Hub → Personal Finance lets you add and manage private income and expense records. These are separate from shared tracker debts. Smart Insights summarizes the personal records you have saved.":"Centro financiero → Finanzas personales permite gestionar ingresos y gastos privados, separados de las deudas compartidas. Análisis inteligentes resume los registros.","Trips and travel spending":"Viajes y gastos de viaje","Finance Hub → Trips lets you select a tracker, view travel spending and category breakdowns, and manage trip plans or budgets. Shared charges continue to use the tracker expense and payment system.":"Centro financiero → Viajes permite elegir un grupo, consultar gastos por categoría y gestionar planes o presupuestos. Los gastos compartidos permanecen en el grupo.","Household tools":"Herramientas del hogar","Finance Hub → Household connects household plans, chores, groceries, and notes to an existing tracker. Use the household workspace to create, edit, complete, or delete available items.":"Centro financiero → Hogar vincula planes, tareas, compras y notas a un grupo existente. Allí puedes crear, modificar, completar o eliminar elementos.","Currency converter and favorites":"Conversor de divisas y favoritos","Finance Hub → Currencies converts amounts using the latest available exchange rates. Codes are shown with currency names; tap a star to favorite a currency and move it to the top of the selectors. Favorites are saved on this device. Conversions are estimates and do not change balances.":"Centro financiero → Divisas convierte importes con tipos de cambio disponibles. Marca las divisas favoritas para verlas primero. Las conversiones son estimaciones y no cambian los saldos.","Chat, notifications, and friends":"Chat, notificaciones y amigos","Use Chat to communicate, the bell for activity notifications, and available friend and member controls to find people and manage your groups. On mobile, Chat is in the top navigation.":"Usa el chat para comunicarte, la campana para ver notificaciones y los controles de amigos para gestionar tus grupos. En móvil, el chat aparece en la navegación superior.","Account, help, and settings":"Cuenta, ayuda y ajustes","Account lets you update your profile and available payment usernames. The About page includes this tutorial; you can replay it whenever you want.":"En Cuenta puedes actualizar tu perfil y usuarios de pago. Este tutorial está en Acerca de y puedes repetirlo cuando quieras.","You’re ready!":"¡Todo listo!","You can revisit About → Site tutorial for a refresher. This guide never creates, edits, or deletes your records.":"Puedes volver a Acerca de → Tutorial del sitio cuando quieras. Esta guía nunca crea, modifica ni elimina tus registros.","← Back":"← Atrás","OF":"DE","Close tutorial":"Cerrar tutorial","Start a new conversation":"Iniciar nueva conversación","Close history":"Cerrar historial","How much was paid back?":"¿Cuánto se ha devuelto?",". How much was paid back?":". ¿Cuánto se ha devuelto?","Pay the full amount":"Pagar el importe completo","This squares them up completely.":"Esto salda la deuda por completo.","Record payment":"Registrar pago","Manually add an expense":"Añadir un gasto manualmente","Log Payment":"Registrar pago","Record a payment you made":"Registra un pago que hayas realizado","Quick Split Calculator":"Calculadora rápida de división","Quick split calculator":"Calculadora rápida de división","Calculate everyone’s share":"Calcula cuánto corresponde a cada persona","Calculate a share without saving an expense.":"Calcula cuánto corresponde a cada persona sin guardar un gasto.","Bill total":"Total de la cuenta","Tip percentage":"Porcentaje de propina","Number of people":"Número de personas","per person":"por persona","Total including tip:":"Total con propina:","Close":"Cerrar","Scan Receipt":"Escanear recibo","Owes money":"Debe dinero","Paid back":"Pago devuelto","Who owes money?":"¿Quién debe dinero?","Who is owed money?":"¿A quién se le debe dinero?","Who owes money":"Quién debe dinero","Who is owed money":"A quién se le debe dinero","Amount ($)":"Importe ($)","What for? (pizza, Uber...)":"¿En qué se gastó? (pizza, Uber...)","Expense category":"Categoría del gasto","Save entry":"Guardar registro","Payment due date (optional)":"Fecha de vencimiento del pago (opcional)","Expense currency":"Divisa del gasto","Split between":"Dividir entre","Split method":"Método de división","Split equally":"Dividir en partes iguales","Exact amounts":"Importes exactos","Percentages":"Porcentajes","Shares":"Partes","Split summary":"Resumen de la división","Payments owed to payer":"Pagos que se deben a quien pagó","Payments owed to You":"Pagos que se te deben","Add to Tracker":"Añadir al grupo","This records expenses in DoWeo. No money is transferred.":"Esto registra gastos en DoWeo. No se transfiere dinero.","Bill currency":"Divisa de la cuenta","Divide an expense with your friends.":"Divide un gasto con tus amigos.","Scan a receipt with AI-assisted text recognition":"Escanea un recibo con reconocimiento de texto asistido por IA","On mobile, take a photo of your receipt to recognize items and prices. Review everything before splitting. Recognition runs in your browser.":"En el móvil, fotografía el recibo para identificar artículos y precios. Revisa todo antes de dividir el importe. El reconocimiento se realiza en tu navegador.","Take or upload receipt photo (mobile)":"Hacer o subir foto del recibo (móvil)","Choose receipt photo":"Elegir foto del recibo","Assign receipt items to friends →":"Asignar artículos del recibo a amigos →","Expense description":"Descripción del gasto","Dinner at a restaurant":"Cena en un restaurante","Total amount ($)":"Importe total ($)","Enter total bill amount":"Introduce el importe total de la cuenta","Who paid?":"¿Quién pagó?","Split equally among everyone":"Dividir en partes iguales","Enter each person’s share. Exact amounts must total the bill, percentages must total 100%, and shares must be positive whole numbers.":"Introduce la parte de cada persona. Los importes exactos deben sumar el total, los porcentajes el 100 % y las participaciones deben ser números enteros positivos.","Select a category":"Selecciona una categoría","Category:":"Categoría:","Other":"Otros","Food":"Comida","Amount paid ($)":"Importe pagado ($)","selected":"seleccionados","Permanently delete your DoWeo account, profile, payment usernames, profile photo, and your saved tracker data. Trackers you own will also be deleted for their members. This cannot be undone.":"Eliminar permanentemente tu cuenta de DoWeo, perfil, nombres de usuario de pago, foto de perfil y datos guardados de los grupos. Los grupos que hayas creado también se eliminarán para sus miembros. Esta acción no se puede deshacer.","Split a Bill":"Dividir una cuenta","Back to Home":"Volver al inicio"};
 function seedStaticTranslations(){
   const dictionary=root.DoWeoTranslations?.languages;
   const en=dictionary?.en, localized=dictionary?.[language];
   if(Array.isArray(en)&&Array.isArray(localized))en.forEach((source,index)=>{
     if(typeof localized[index]==='string'&&localized[index].trim()&&approved.has(source))cache[source]=localized[index];
   });
   // Deterministic multilingual fallbacks must override stale AI/localStorage
   // entries so frequently used controls work even when Workers AI is offline.
   const core=coreTranslations?.[language];
   if(core)for(const [source,destination] of Object.entries(core)){
     if(approved.has(source)&&typeof destination==='string'&&destination.trim())cache[source]=destination;
   }
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
     hi:['वित्तीय केंद्र','बीटा प्रतिक्रिया','नमस्ते,'],
     ru:['Финансовый центр','Отзыв о бета-версии','Привет,'],
     tr:['Finans Merkezi','Beta Geri Bildirimi','Merhaba,'],
     vi:['Trung tâm tài chính','Phản hồi bản thử nghiệm','Xin chào,'],
     nl:['Financieel overzicht','Bètafeedback','Hoi,'],
     pl:['Centrum finansów','Opinie o wersji beta','Cześć,'],
     sv:['Ekonomicenter','Betafeedback','Hej,'],
     bn:['অর্থ ব্যবস্থাপনা','বেটা সংস্করণ সম্পর্কে মতামত','স্বাগতম,']
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
     // The catalog is required; the reviewed offline bundle is optional.
     // A missing optional chunk must never disable all language switching.
     const module=await import('/doweo-ui-catalog.mjs');
     approved=new Set(module.UI_PHRASES);
     try{
       const core=await import('/doweo-core-locales.mjs');
       coreTranslations=core.CORE_UI_TRANSLATIONS||null;
     }catch(error){
       coreTranslations=null;
       console.warn('DoWeo offline locale bundle unavailable; using existing translations.',error);
     }
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
