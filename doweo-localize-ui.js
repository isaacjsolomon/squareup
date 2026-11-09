/* Broader DoWeo UI localization with approved static text and cached AI translations.
   Only source-controlled interface phrases are sent to the translator. */
(function(root){
 'use strict';
 if(!root||!root.document||!root.DoWeoI18n)return;
 const i18n=root.DoWeoI18n;
 const original=new WeakMap(),attributes=new WeakMap();
 const excluded='script,style,noscript,code,pre,svg,canvas,[contenteditable],#sq-ai-stream,#tracker-chat-messages,.chat-bubble,.chat-line,.message-bubble,.sq-chat-message,.expense-description,.tracker-member-name,.sq-member-name,.sq-friend-name,[data-user-content],[data-chat-id],[data-entry-id],.sq-detail-entry,.sq-return-row,.sq-ng-transaction,.notification-item,.sq-notification-row,#history,#sq-friends-results';
 const attrNames=['placeholder','aria-label','title','alt'];
 let approved=null,language='en',cache={},requested=new Set(),pending=new Set(),running=0,scanTimer=null,saveTimer=null;
 const storageKey=locale=>'doweo-interface-translations-v2-'+locale;
 function locale(){return i18n.resolve(root);}
 function visible(el){
   if(el.closest('[hidden],[aria-hidden="true"],[inert]'))return false;
   // Native select options typically have no client rect until opened.
   if(el.tagName==='OPTION')return Boolean(el.parentElement?.getClientRects().length);
   return Boolean(el.getClientRects().length);
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
 function translate(value){
   if(language==='en')return value;
   const match=/^(\s*)([\s\S]*?)(\s*)$/.exec(value);
   if(!match)return value;
   const key=match[2];
   const translated=cache[key];
   return translated?match[1]+translated+match[3]:value;
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
     if(!eligible(key))continue;
     const next=translate(entry.source);
     if(node.nodeValue!==next){node.nodeValue=next;entry.rendered=next;}
     if(language!=='en'&&!cache[key]&&!requested.has(key))pending.add(key);
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
       if(language!=='en'&&!cache[key]&&!requested.has(key))pending.add(key);
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
     // Keep original English text and do not retry in a tight loop.
   }finally{
     running--;pump();
   }
 }
 function pump(){
   if(!approved||language==='en')return;
   while(running<2&&pending.size){
     const batch=[];
     for(const key of pending){pending.delete(key);if(!requested.has(key)&&!cache[key]){batch.push(key);requested.add(key);}if(batch.length>=16)break;}
     if(!batch.length)continue;
     running++;
     void send(batch,language);
   }
 }
 function scan(){
   if(!approved)return;
   const next=locale();
   if(language!==next){
     language=next;pending.clear();requested.clear();readCache();
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
   language=locale();readCache();
   scan();
   new MutationObserver(schedule).observe(root.document.body,{
     childList:true,subtree:true,attributes:true,attributeFilter:['class','hidden','aria-hidden','placeholder','title','aria-label']
   });
   root.document.addEventListener('doweo:languagechange',schedule);
   root.addEventListener('pageshow',schedule);
 }
 if(root.document.readyState==='loading')root.document.addEventListener('DOMContentLoaded',()=>{void init();},{once:true});
 else void init();
})(typeof globalThis!=='undefined'?globalThis:null);
