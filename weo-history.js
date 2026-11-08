/* Private, account-linked Weo conversation history. */
(() => {
 'use strict';
 const panel=document.getElementById('sq-ai-window');
 const prompt=document.getElementById('sq-ai-question');
 if(!panel||!prompt||document.getElementById('weo-history-button'))return;
 const api='/api/ai-history';
 let activeId=null,activeMessages=[],lastToken='',loading=false;
 const originalFetch=window.fetch.bind(window);
 function getToken(){
   if(lastToken)return lastToken;
   for(const client of [window.supabaseClient,window.sqSupabase,window.supabase]){
     // getSession is async; handled when requesting history below.
     if(client?.auth?.getSession)return '';
   }
   try{
     for(let i=0;i<localStorage.length;i++){
       const key=localStorage.key(i);
       if(!key||!/^sb-.*-auth-token$/.test(key))continue;
       const value=JSON.parse(localStorage.getItem(key)||'null');
       const token=value?.access_token||value?.currentSession?.access_token;
       if(typeof token==='string'&&token)return token;
     }
   }catch{}
   return '';
 }
 async function authToken(){
   const cached=getToken();
   if(cached)return cached;
   for(const client of [window.supabaseClient,window.sqSupabase,window.supabase]){
     if(typeof client?.auth?.getSession==='function'){
       try{
         const result=await client.auth.getSession();
         const token=result?.data?.session?.access_token;
         if(token)return token;
       }catch{}
     }
   }
   return '';
 }
 function captureToken(input,options){
   const auth=options?.headers?.Authorization||
     options?.headers?.authorization||
     (input instanceof Request?input.headers.get('Authorization'):null);
   if(typeof auth==='string'&&auth.startsWith('Bearer '))lastToken=auth.slice(7);
 }
 const historyButton=document.createElement('button');
 historyButton.id='weo-history-button';
 historyButton.type='button';
 historyButton.textContent='History';
 historyButton.setAttribute('aria-label','View previous Weo conversations');
 const head=panel.querySelector('.sq-ai-head');
 if(head){
   const controls=[...head.querySelectorAll('button')];
   const newChat=controls.find(b=>/new chat/i.test(b.textContent||''));
   if(newChat)newChat.insertAdjacentElement('beforebegin',historyButton);
   else head.appendChild(historyButton);
   newChat?.addEventListener('click',()=>{
     activeId=null;
     activeMessages=[];
     panel.querySelectorAll('[data-weo-history-bubble]').forEach(x=>x.remove());
     panel.querySelectorAll('.sq-ai-welcome,.weo-prompt-grid').forEach(el=>el.style.removeProperty('display'));
   },true);
 }
 const drawer=document.createElement('section');
 drawer.id='weo-history-drawer';
 drawer.hidden=true;
 drawer.setAttribute('role','dialog');
 drawer.setAttribute('aria-modal','true');
 drawer.setAttribute('aria-label','Weo chat history');
 drawer.innerHTML='<div class="weo-history-card"><header><div><h2>Your chats</h2><p>Private conversations saved to your account</p></div><button type="button" class="weo-history-close" aria-label="Close history">×</button></header><div class="weo-history-list" role="list"></div><p class="weo-history-status" role="status" aria-live="polite"></p></div>';
 panel.appendChild(drawer);
 const list=drawer.querySelector('.weo-history-list');
 const status=drawer.querySelector('.weo-history-status');
 const close=()=>{drawer.hidden=true;historyButton.focus({preventScroll:true})};
 drawer.querySelector('.weo-history-close').addEventListener('click',close);
 drawer.addEventListener('click',event=>{if(event.target===drawer)close()});
 drawer.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();close()}});
 async function request(path,options={}){
   const token=await authToken();
   if(!token)throw Error('Sign in to access your saved chats.');
   const res=await originalFetch(path,{
     ...options,
     headers:{Authorization:'Bearer '+token,'Content-Type':'application/json',...(options.headers||{})}
   });
   const data=await res.json().catch(()=>({}));
   if(!res.ok)throw Error(data.error||'Chat history is unavailable.');
   return data;
 }
 function makeMessage(role,content){
   const bubble=document.createElement('div');
   bubble.className='sq-ai-message '+(role==='user'?'user':'assistant')+' weo-history-message';
   bubble.dataset.weoHistoryBubble='true';
   bubble.textContent=content;
   return bubble;
 }
 function showConversation(conversation){
   const messages=Array.isArray(conversation.messages)?conversation.messages.filter(
     m=>['user','assistant'].includes(m?.role)&&typeof m.content==='string'
   ):[];
   // Clear the original chat's internal pending conversation before selecting
   // a stored one. The outgoing AI request is supplied the selected context.
   const newChat=[...panel.querySelectorAll('.sq-ai-head button')].find(b=>/new chat/i.test(b.textContent||''));
   newChat?.click();
   activeId=conversation.id;
   activeMessages=messages;
   panel.querySelectorAll('.sq-ai-welcome,.weo-prompt-grid').forEach(el=>{el.style.display='none'});
   const stream=panel.querySelector('.sq-ai-messages')||panel.querySelector('.sq-ai-body')||panel.querySelector('.sq-ai-chat-body');
   if(stream){
     stream.querySelectorAll('[data-weo-history-bubble]').forEach(el=>el.remove());
     const fragment=document.createDocumentFragment();
     for(const m of messages)fragment.appendChild(makeMessage(m.role,m.content));
     stream.appendChild(fragment);
     stream.scrollTop=stream.scrollHeight;
   }
   prompt.value='';
   window.WeoChat?.refreshSend?.();
   close();
 }
 async function removeChat(id){
   if(!window.confirm('Delete this Weo conversation permanently?'))return;
   try{
     await request(api+'?id='+encodeURIComponent(id),{method:'DELETE'});
     if(activeId===id){
       const newChat=[...panel.querySelectorAll('.sq-ai-head button')].find(b=>/new chat/i.test(b.textContent||''));
       newChat?.click();
       activeId=null;activeMessages=[];
     }
     await loadHistory();
   }catch(e){status.textContent=e.message}
 }
 async function loadHistory(){
   if(loading)return;
   loading=true;status.textContent='Loading your chats…';list.replaceChildren();
   try{
     const data=await request(api);
     const conversations=Array.isArray(data.conversations)?data.conversations:[];
     status.textContent=conversations.length?'':'No saved chats yet. Start talking with Weo to create one.';
     for(const item of conversations){
       const row=document.createElement('div');
       row.className='weo-history-item';row.setAttribute('role','listitem');
       const open=document.createElement('button');
       open.type='button';open.className='weo-history-open';
       const name=document.createElement('strong');name.textContent=String(item.title||'Untitled chat').slice(0,80);
       const time=document.createElement('small');
       const dt=new Date(item.updated_at||item.created_at);
       time.textContent=Number.isNaN(dt.getTime())?'':dt.toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'});
       open.append(name,time);
       open.addEventListener('click',async()=>{
         status.textContent='Opening conversation…';
         try{
           const result=await request(api+'?id='+encodeURIComponent(item.id));
           if(result.conversation)showConversation(result.conversation);
           else status.textContent='This conversation was not found.';
         }catch(e){status.textContent=e.message}
       });
       const remove=document.createElement('button');
       remove.type='button';remove.className='weo-history-delete';remove.textContent='Delete';
       remove.setAttribute('aria-label','Delete '+name.textContent);
       remove.addEventListener('click',()=>removeChat(item.id));
       row.append(open,remove);list.appendChild(row);
     }
   }catch(e){status.textContent=e.message}
   finally{loading=false}
 }
 historyButton.addEventListener('click',()=>{drawer.hidden=false;loadHistory()});
 // Preserve the existing AI request and response. Append text to history on
 // the authenticated server, never saving images to the conversation table.
 window.fetch=async function(input,options){
   captureToken(input,options);
   const url=typeof input==='string'?input:input?.url;
   if(typeof url!=='string'||!/(^|\/)api\/ai-chat(?:[?#]|$)/.test(url)){
     return originalFetch(input,options);
   }
   const text=options?.body;
   if(typeof text!=='string')return originalFetch(input,options);
   let data;
   try{data=JSON.parse(text)}catch{return originalFetch(input,options)}
   const latest=data?.messages?.at(-1);
   if(activeId&&latest?.role==='user'){
     // Older messages from the active account history become model context.
     const recent=activeMessages.slice(-15);
     data.messages=[...recent,{role:'user',content:latest.content}].slice(-16);
     data.conversationId=activeId;
   }
   const result=await originalFetch(input,{...options,body:JSON.stringify(data)});
   if(result.ok){
     result.clone().json().then(payload=>{
       if(typeof payload?.reply!=='string')return;
       if(payload.conversationId){
         activeId=payload.conversationId;
         if(latest?.role==='user')activeMessages.push(
           {role:'user',content:latest.content},
           {role:'assistant',content:payload.reply}
         );
       }
       if(!drawer.hidden)loadHistory();
     }).catch(()=>{});
   }
   return result;
 };
})();
