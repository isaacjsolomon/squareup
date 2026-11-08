/* Weo account-linked chat history. Uses the same authenticated API as the app. */
(() => {
 'use strict';
 const panel=document.getElementById('sq-ai-window');
 const head=panel?.querySelector('.sq-ai-head');
 if(!panel||!head||document.getElementById('weo-history-button'))return;
 const api=(path,method,body)=>{
   if(typeof window.squareUpApi!=='function')throw Error('Sign in to access Weo history.');
   return window.squareUpApi(path,method,body);
 };
 const button=document.createElement('button');
 button.id='weo-history-button';button.type='button';
 button.setAttribute('aria-label','View previous Weo conversations');
 button.innerHTML='<svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3 2"/></svg><span>History</span>';
 const reset=head.querySelector('.sq-ai-reset');
 if(reset)reset.before(button);else head.appendChild(button);
 const drawer=document.createElement('section');
 drawer.id='weo-history-drawer';drawer.hidden=true;
 drawer.setAttribute('role','dialog');
 drawer.setAttribute('aria-modal','true');
 drawer.setAttribute('aria-label','Your Weo conversations');
 drawer.innerHTML='<div class="weo-history-card"><header><div><h2>Your chats</h2><p>Private conversations saved to your account</p></div><button type="button" class="weo-history-close" aria-label="Close history">×</button></header><div class="weo-history-list" role="list"></div><p class="weo-history-status" role="status" aria-live="polite"></p></div>';
 panel.appendChild(drawer);
 const list=drawer.querySelector('.weo-history-list');
 const status=drawer.querySelector('.weo-history-status');
 let busy=false;
 const close=()=>{drawer.hidden=true;button.focus({preventScroll:true})};
 drawer.querySelector('.weo-history-close').addEventListener('click',close);
 drawer.addEventListener('click',e=>{if(e.target===drawer)close()});
 drawer.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();close()}});
 async function deleteConversation(id){
   if(!confirm('Delete this Weo conversation permanently?'))return;
   try{
     const result=await api('ai-history?id='+encodeURIComponent(id),'DELETE');
     if(!result.success)throw Error('Could not delete that conversation.');
     await refresh();
   }catch(e){status.textContent=e.message||'Could not delete the conversation.'}
 }
 async function openConversation(id){
   status.textContent='Opening conversation…';
   try{
     const result=await api('ai-history?id='+encodeURIComponent(id));
     if(!result.conversation)throw Error('This conversation is unavailable.');
     const success=window.WeoChat?.restore?.(result.conversation.messages,result.conversation.id);
     if(!success)throw Error('Weo is busy. Try again after the current reply finishes.');
     close();
   }catch(e){status.textContent=e.message||'Could not open conversation.'}
 }
 async function refresh(){
   if(busy)return;
   busy=true;list.replaceChildren();status.textContent='Loading your saved chats…';
   try{
     const data=await api('ai-history');
     const chats=Array.isArray(data.conversations)?data.conversations:[];
     status.textContent=chats.length?'':'No chats saved yet. Start a conversation with Weo.';
     for(const chat of chats){
       const row=document.createElement('div');
       row.className='weo-history-item';row.setAttribute('role','listitem');
       const open=document.createElement('button');open.type='button';open.className='weo-history-open';
       const title=document.createElement('strong');
       title.textContent=String(chat.title||'New conversation').slice(0,80);
       const date=document.createElement('small');
       const time=new Date(chat.updated_at||chat.created_at);
       date.textContent=Number.isNaN(time.getTime())?'':time.toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'});
       open.append(title,date);
       open.addEventListener('click',()=>openConversation(chat.id));
       const del=document.createElement('button');del.type='button';
       del.className='weo-history-delete';del.textContent='Delete';
       del.setAttribute('aria-label','Delete '+title.textContent);
       del.addEventListener('click',()=>deleteConversation(chat.id));
       row.append(open,del);list.appendChild(row);
     }
   }catch(e){status.textContent=e.message||'History is temporarily unavailable.'}
   finally{busy=false}
 }
 button.addEventListener('click',()=>{drawer.hidden=false;refresh()});
 window.addEventListener('weo:chat-saved',()=>{if(!drawer.hidden)refresh()});
})();
