/* DoWeo global search: authenticated, membership-scoped discovery across the app. */
(function(){
 'use strict';
 const overlay=document.getElementById('sq-global-search');
 const input=document.getElementById('sq-global-query');
 const results=document.getElementById('sq-search-results');
 if(!overlay||!input||!results||window.dwGlobalSearchReady)return;
 window.dwGlobalSearchReady=true;
 const launch=document.createElement('button');
 launch.type='button';launch.className='sq-search-launch';
 launch.innerHTML='<span aria-hidden="true">⌕</span> Search <kbd>⌘ K</kbd>';
 launch.setAttribute('aria-label','Search DoWeo');
 const title=document.querySelector('.tracker-heading .sq-title-and-tour')||document.querySelector('.tracker-heading');
 if(title)title.append(launch);
 const access=()=>window.dwSearchAccess;
 const snapshot=()=>access()?.snapshot?.()||{userId:null,trackers:[],active:null,notifications:[]};
 const text=value=>String(value==null?'':value);
 const clean=value=>text(value).normalize('NFKD').toLocaleLowerCase().trim();
 const matches=(query,...parts)=>query.split(/\s+/).every(word=>clean(parts.map(text).join(' ')).includes(word));
 const asList=value=>Array.isArray(value)?value:[];
 const validId=value=>typeof value==='string'&&value&&value!=='local';
 const api=(path)=>window.squareUpApi(path);
 const keyOf=(kind,tracker,item)=>kind+':'+text(tracker)+':'+text(item);
 const newIndex=(owner)=>({owner,loadedAt:0,loading:false,trackers:[],details:[],polls:[],bills:[],messages:[],wishes:[],notifications:[],friends:[],personal:[],errors:0});
 let index=newIndex(null),profile={query:'',rows:[],loading:false,error:false};
 let returnFocus=null,querySerial=0,searchTimer=null,renderTimer=null;
 function currentQuery(){return clean(input.value);}
 function activeOwner(){return snapshot().userId||null;}
 function ensureIndex(){
   const owner=activeOwner();
   if(index.owner!==owner)index=newIndex(owner);
   return index;
 }
 function queueRender(){
   if(renderTimer!==null)return;
   renderTimer=setTimeout(()=>{renderTimer=null;if(overlay.classList.contains('open'))render();},70);
 }
 function addMessage(message){
   const p=document.createElement('p');p.className='sq-search-empty';p.textContent=message;results.append(p);
 }
 function appendGroup(name,items){
   if(!items.length)return 0;
   const heading=document.createElement('div');heading.className='sq-search-group';
   heading.textContent=name+(items.length>12?' · showing 12 of '+items.length:'');
   results.append(heading);
   items.slice(0,12).forEach(item=>{
     const button=document.createElement('button');button.type='button';button.className='sq-search-hit';
     const glyph=document.createElement('span');glyph.className='sq-search-hit-icon';glyph.textContent=item.icon||'⌕';glyph.setAttribute('aria-hidden','true');
     const body=document.createElement('span');body.className='sq-search-hit-copy';
     const strong=document.createElement('strong');strong.textContent=text(item.title);
     const small=document.createElement('small');small.textContent=text(item.sub);
     body.append(strong,small);button.append(glyph,body);
     button.addEventListener('click',async()=>{
       close();
       try{await item.action()}catch(error){console.error('Search navigation:',error);alert(error?.message||'Could not open this result.');}
     });
     results.append(button);
   });
   return items.length;
 }
 function open(){
   ensureIndex();
   returnFocus=document.activeElement;
   overlay.classList.add('open');overlay.setAttribute('aria-hidden','false');
   input.value='';profile={query:'',rows:[],loading:false,error:false};
   render();input.focus();
   // Populate authenticated sources immediately instead of waiting for the first keystroke.
   if(activeOwner())void loadIndex();
 }
 function close(){
   ++querySerial;
   if(searchTimer!==null){clearTimeout(searchTimer);searchTimer=null;}
   if(renderTimer!==null){clearTimeout(renderTimer);renderTimer=null;}
   overlay.classList.remove('open');overlay.setAttribute('aria-hidden','true');results.replaceChildren();
   if(returnFocus&&returnFocus.focus)returnFocus.focus();
 }
 window.dwOpenGlobalSearch=open;
 launch.addEventListener('click',open);
 document.getElementById('sq-mobile-search')?.addEventListener('click',open);
 document.getElementById('sq-search-close')?.addEventListener('click',close);
 overlay.addEventListener('click',event=>{if(event.target===overlay)close();});
 document.addEventListener('keydown',event=>{
   if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='k'){
     event.preventDefault();
     overlay.classList.contains('open')?close():open();
   }else if(event.key==='Escape'&&overlay.classList.contains('open'))close();
 });
 overlay.addEventListener('keydown',event=>{
   if(event.key!=='Tab'||!overlay.classList.contains('open'))return;
   const focusable=[input,document.getElementById('sq-search-close'),...results.querySelectorAll('button:not([disabled])')].filter(Boolean);
   const first=focusable[0],last=focusable[focusable.length-1];
   if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
   else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
 });
 function goHome(){document.getElementById('nav-home')?.click();}
 function selectTab(tab){
   const buttons=[...document.querySelectorAll('#tracker-dashboard [data-sq-tab]')];
   const button=buttons.find(b=>b.dataset.sqTab===tab);
   if(button)button.click();
 }
 async function goTracker(tracker,tab){
   if(!validId(tracker?.id))return;
   goHome();
   if(typeof window.sqOpenTrackerForWeo!=='function')throw Error('Tracker navigation is unavailable.');
   await window.sqOpenTrackerForWeo(tracker.id);
   if(tab)selectTab(tab);
 }
 async function goPoll(tracker,pollId){
   await goTracker(tracker,'overview');
   if(typeof window.dwOpenPollsPage==='function')window.dwOpenPollsPage();
   else document.getElementById('dw-polls-nav')?.click();
   if(pollId){
     const card=[...document.querySelectorAll('[data-poll-card-id]')].find(el=>el.dataset.pollCardId===text(pollId));
     if(card)card.scrollIntoView({block:'center',behavior:'smooth'});
   }
 }
 async function goExpense(tracker,entry){
   await goTracker(tracker,'expenses');
   if(!entry?.id)return;
   if(entry.type==='debt'&&typeof window.squareUpOpenExpenseDetails==='function'){
     window.squareUpOpenExpenseDetails(entry.id);
     return;
   }
   const row=[...document.querySelectorAll('#history > .entry')].find(el=>
     el.querySelector('[data-del]')?.dataset.del===text(entry.id));
   if(row){row.scrollIntoView({block:'center',behavior:'smooth'});row.querySelector('.sq-detail-btn')?.click();}
 }
 function featureRows(){
   const entries=[
     ['Overview','Dashboard and net balance',()=>goHome()],
     ['Trackers','Your shared trackers, trips and households',()=>document.getElementById('nav-trackers')?.click()],
     ['Friends','Friends and friend requests',()=>access()?.openFriends('friends')],
     ['Find Friends','Search public DoWeo profiles',()=>access()?.openFriends('find')],
     ['Notifications','Alerts, updates, and invitations',()=>document.getElementById('notifications-toggle')?.click()],
     ['Group Polls','Create polls and vote with tracker members',()=>window.dwOpenPollsPage?.()],
     ['Chat','Shared conversations and direct messages',()=>{(document.getElementById('nav-chat')||document.getElementById('sq-mobile-chat'))?.click();}],
     ['Expenses','Payments, expenses, and expense history',()=>{goHome();selectTab('expenses');}],
     ['Bills','Bills and subscriptions',()=>{goHome();selectTab('bills');}],
     ['Members','People sharing your current tracker',()=>{goHome();selectTab('members');}],
     ['Cash Flow','Income and spending trends',()=>window.squareUpOpenFinanceHub?.('finance')],
     ['Analytics','Spending charts and insights',()=>document.getElementById('nav-analytics')?.click()],
     ['Events','Group plans and upcoming events',()=>document.getElementById('sqev-nav')?.click()],
     ['Settings','Account, profile and preferences',()=>document.getElementById('nav-profile')?.click()],
     ['About','About DoWeo',()=>document.getElementById('nav-about')?.click()],
     ['Add Expense','Record a shared expense',()=>document.getElementById('quick-expense')?.click()],
     ['Pay Now','Record a payment or settle up',()=>document.getElementById('quick-pay')?.click()],
     ['Split a Bill','Split a receipt with friends',()=>document.getElementById('quick-split')?.click()]
   ];
   return entries.map(([title,sub,action])=>({icon:'↗',title,sub,action}));
 }
 function collectedTrackers(ctx,cache){
   const byId=new Map();
   for(const item of [...asList(ctx.trackers),...asList(cache.trackers)]){
     if(validId(item?.id))byId.set(text(item.id),item);
   }
   if(ctx.active&&byId.has(text(ctx.active.id))){
     byId.set(text(ctx.active.id),{...byId.get(text(ctx.active.id)),...ctx.active});
   }
   // Fresh authenticated tracker details take priority over a fast startup preview.
   for(const item of cache.details){
     if(validId(item?.id)&&byId.has(text(item.id)))byId.set(text(item.id),{...byId.get(text(item.id)),...item});
   }
   return [...byId.values()];
 }
 function render(){
   if(!overlay.classList.contains('open'))return;
   results.replaceChildren();
   const q=currentQuery(),ctx=snapshot(),cache=ensureIndex();
   if(!q){
     addMessage('Search friend profiles, trackers, shared members, expenses, polls, notifications, bills, messages, and more.');
     return;
   }
   const all=collectedTrackers(ctx,cache);
   const trackerById=new Map(all.map(t=>[text(t.id),t]));
   const trackerHits=all.filter(t=>matches(q,t.name,t.currency,t.role)).map(t=>({
     icon:'▣',title:text(t.name||'Tracker'),sub:'Shared tracker',action:()=>goTracker(t)
   }));
   let memberHits=[],expenseHits=[],pollHits=[],billHits=[],messageHits=[],wishHits=[];
   const seenMembers=new Set(),seenExpenses=new Set();
   for(const tracker of all){
     for(const member of asList(tracker.members)){
       const memberKey=keyOf('member',tracker.id,member.user_id||member.userId||member.id||member.email||member.name);
       if(seenMembers.has(memberKey))continue;seenMembers.add(memberKey);
       const name=text(member.displayName||member.display_name||member.name||member.username||member.email||'Member');
       if(!matches(q,name,member.email,member.username,tracker.name))continue;
       memberHits.push({icon:'♙',title:name,sub:'Member · '+text(tracker.name),action:()=>goTracker(tracker,'members')});
     }
     for(const entry of asList(tracker.entries)){
       const itemKey=keyOf('entry',tracker.id,entry.id||[entry.note,entry.date,entry.amount].join(':'));
       if(seenExpenses.has(itemKey))continue;seenExpenses.add(itemKey);
       if(!matches(q,entry.note,entry.description,entry.from,entry.to,entry.amount,entry.date,tracker.name,entry.type))continue;
       expenseHits.push({icon:'▤',title:text(entry.note||entry.description||(entry.type==='payment'?'Payment':'Expense')),
         sub:text(tracker.name)+' · '+text(entry.from)+' → '+text(entry.to)+' · '+text(entry.amount),
         action:()=>goExpense(tracker,entry)});
     }
   }
   for(const item of cache.polls){
     const tracker=trackerById.get(text(item.trackerId));if(!tracker)continue;
     const poll=item.data;
     if(!matches(q,poll.question,asList(poll.options).map(o=>o.label).join(' '),tracker.name))continue;
     pollHits.push({icon:'☷',title:text(poll.question||'Group poll'),
       sub:text(tracker.name)+' · '+(poll.closed?'Closed poll':'Group poll'),
       action:()=>goPoll(tracker,poll.id)});
   }
   for(const item of cache.bills){
     const tracker=trackerById.get(text(item.trackerId));if(!tracker)continue;
     const bill=item.data;
     if(!matches(q,bill.name,bill.kind,bill.amount,bill.frequency,tracker.name))continue;
     billHits.push({icon:'▤',title:text(bill.name||'Bill'),
       sub:text(tracker.name)+' · '+text(bill.kind||'Bill')+' · '+text(bill.amount),
       action:()=>goTracker(tracker,'bills')});
   }
   for(const item of cache.messages){
     const tracker=trackerById.get(text(item.trackerId));if(!tracker)continue;
     const message=item.data;
     if(!matches(q,message.message,message.senderName,tracker.name))continue;
     messageHits.push({icon:'♧',title:text(message.message||'Shared message').slice(0,100),
       sub:text(tracker.name)+' · '+text(message.senderName||'Tracker chat'),
       action:async()=>{await goTracker(tracker);(document.getElementById('nav-chat')||document.getElementById('sq-mobile-chat'))?.click();}});
   }
   for(const item of cache.wishes){
     const tracker=trackerById.get(text(item.trackerId));if(!tracker)continue;
     const wish=item.data;
     if(!matches(q,wish.title,wish.created_by_name,tracker.name))continue;
     wishHits.push({icon:'☆',title:text(wish.title||'Wishlist idea'),sub:'Shared wishlist · '+text(tracker.name),
       action:async()=>{await goTracker(tracker);document.getElementById('nav-friends')?.click();}});
   }
   const friendHits=cache.friends.filter(item=>item.status==='accepted'||item.status==='pending')
     .filter(item=>matches(q,item.display_name,item.username)).map(item=>({
       icon:'♙',title:text(item.display_name||item.username||'Friend'),
       sub:'@'+text(item.username||'')+' · '+(item.status==='accepted'?'Friend':'Friend request'),
       action:()=>access()?.openFriends('friends')
     }));
   const notifications=new Map();
   for(const item of [...asList(ctx.notifications),...cache.notifications]){
     notifications.set(keyOf('notification',item._social?'social':'regular',item.id),item);
   }
   const notificationHits=[...notifications.values()].filter(n=>matches(q,n.title,n.message,n.kind,n.type,n.actor_name,n.tracker_name))
     .map(n=>({icon:'◌',title:text(n.title||'Notification'),sub:text(n.message||'Notification Center').slice(0,125),
       action:()=>access()?.openNotification(n.id,!!n._social)}));
   const personalHits=cache.personal.filter(item=>matches(q,item.description,item.category,item.kind,item.amount,item.occurred_on))
     .map(item=>({icon:'▤',title:text(item.description||'Personal transaction'),
       sub:'Personal '+text(item.kind||'transaction')+' · '+text(item.category||'Other')+' · '+text(item.amount),
       action:()=>window.squareUpOpenFinanceHub?.('finance')}));
   const profileHits=profile.query===q?profile.rows.filter(u=>matches(q,u.username,u.display_name,u.displayName)).map(u=>({
     icon:'♙',title:text(u.display_name||u.username||'DoWeo user'),
     sub:'@'+text(u.username||'')+' · DoWeo profile',
     action:()=>access()?.openFriends('find',u.username)
   })):[];
   const groups=[
     ['Pages & features',featureRows().filter(f=>matches(q,f.title,f.sub))],
     ['Trackers',trackerHits],
     ['Shared tracker members',memberHits],
     ['Friends',friendHits],
     ['Friend profiles',profileHits],
     ['Expenses & payments',expenseHits],
     ['Personal transactions',personalHits],
     ['Group polls',pollHits],
     ['Bills & subscriptions',billHits],
     ['Notifications',notificationHits],
     ['Messages',messageHits],
     ['Wishlist ideas',wishHits]
   ];
   const count=groups.reduce((total,[name,items])=>total+appendGroup(name,items),0);
   if(!ctx.userId)addMessage('Sign in to search your shared content and DoWeo profiles.');
   else if(q.length<2)addMessage('Type at least 2 characters to search all your accessible content.');
   else if(cache.loading||profile.loading)addMessage('Searching your accessible DoWeo content…');
   else if(!count)addMessage('No matching content found. Try another name, tracker, question, or keyword.');
   if(cache.errors>0&&!cache.loading&&ctx.userId)
     addMessage('Some sources could not be loaded. Try reopening search to refresh.');
 }
 async function loadIndex(){
   const ctx=snapshot(),owner=ctx.userId;
   if(!owner||typeof window.squareUpApi!=='function')return;
   const cache=ensureIndex();
   if(cache.loading||cache.loadedAt&&Date.now()-cache.loadedAt<120000)return;
   cache.loading=true;cache.errors=0;
   cache.trackers=[];cache.details=[];cache.polls=[];cache.bills=[];cache.messages=[];cache.wishes=[];cache.notifications=[];cache.friends=[];cache.personal=[];
   queueRender();
   const live=()=>cache===index&&activeOwner()===owner;
   const capture=async promise=>{
     try{return await promise}catch(error){cache.errors++;console.warn('DoWeo search source unavailable:',error?.message||error);return null;}
   };
   try{
     let list=asList(ctx.trackers);
     if(!list.length)list=asList(await capture(api('trackers')));
     if(!live())return;
     cache.trackers=list.filter(t=>validId(t?.id));
     queueRender();
     const [regular,social,friends,personal]=await Promise.all([
       capture(api('notifications')),
       capture(api('social/notifications')),
       typeof access()?.listFriends==='function'?capture(access().listFriends()):Promise.resolve([]),
       capture(api('finance/transactions'))
     ]);
     if(!live())return;
     cache.notifications=[...asList(regular),...asList(social).map(item=>({...item,_social:true}))];
     cache.friends=asList(friends);
     cache.personal=asList(personal);
     queueRender();
     // Only use tracker IDs returned by this account's authenticated tracker list.
     let cursor=0;
     const workers=Math.min(3,list.length);
     await Promise.all(Array.from({length:workers},async()=>{
       while(cursor<list.length&&live()){
         const item=list[cursor++];
         if(!validId(item?.id))continue;
         const base='trackers/'+encodeURIComponent(item.id);
         const [detail,polls,bills,messages,wishes]=await Promise.all([
           capture(api(base)),capture(api(base+'/polls')),capture(api(base+'/bills')),
           capture(api(base+'/chat')),capture(api(base+'/wishlist'))
         ]);
         if(!live())return;
         if(detail&&typeof detail==='object')cache.details.push({...item,...detail,id:item.id});
         for(const [target,rows] of [[cache.polls,polls],[cache.bills,bills],[cache.messages,messages],[cache.wishes,wishes]]){
           for(const data of asList(rows))target.push({trackerId:item.id,data});
         }
         queueRender();
       }
     }));
   }finally{
     if(live()){cache.loadedAt=Date.now();cache.loading=false;queueRender();}
   }
 }
 async function loadProfiles(q,serial){
   if(!activeOwner()||q.length<3||typeof access()?.findProfiles!=='function')return;
   profile={query:q,rows:[],loading:true,error:false};
   queueRender();
   try{
     const rows=await access().findProfiles(input.value.trim());
     if(serial!==querySerial||!overlay.classList.contains('open')||currentQuery()!==q)return;
     profile={query:q,rows:asList(rows),loading:false,error:false};
   }catch(error){
     if(serial!==querySerial||currentQuery()!==q)return;
     profile={query:q,rows:[],loading:false,error:true};
     console.warn('DoWeo profile search unavailable:',error?.message||error);
   }
   queueRender();
 }
 function schedule(){
   ++querySerial;
   if(searchTimer!==null)clearTimeout(searchTimer);
   profile={query:'',rows:[],loading:false,error:false};
   ensureIndex();
   render();
   const q=currentQuery();
   if(!q||q.length<2)return;
   const serial=querySerial;
   searchTimer=setTimeout(()=>{
     searchTimer=null;
     if(serial!==querySerial||!overlay.classList.contains('open'))return;
     loadIndex();
     if(q.length>=3)loadProfiles(q,serial);
   },300);
 }
 input.addEventListener('input',schedule);
 window.addEventListener('sq-trackers-updated',()=>{index.loadedAt=0;if(overlay.classList.contains('open'))schedule();});
})();
