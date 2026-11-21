/* Shared DoWeo desktop shell. No page is replaced: original screen instances,
   commands, active tracker, finance state and the mobile bottom navigation remain. */
(function(){
  'use strict';
  if(document.getElementById('dw-all-topbar'))return;
  const body=document.body;
  const dashboard=document.getElementById('tracker-dashboard');
  const sidebar=document.querySelector('body > aside.sidebar');
  const sidebarNav=sidebar?.querySelector('.squareup-nav');
  const existingTabs=dashboard?.querySelector(':scope > .sq-workspace-tabs');
  if(!body||!dashboard||!sidebarNav||!existingTabs)return;
  const desktop=window.matchMedia('(min-width:901px)');
  const pageStates=['trackers-view','analytics-view','settings-view','about-view',
    'friends-view','notifications-view','split-view','sq-help-view',
    'sq-finance-open','sq-bills-open','dw-polls-open','dw-chats-open'];
  const visible=id=>{const node=document.getElementById(id);return !!node&&!node.hidden&&!!node.getClientRects().length;};
  const bar=document.createElement('header');bar.id='dw-all-topbar';bar.setAttribute('aria-label','DoWeo navigation');
  const tabs=document.createElement('nav');tabs.id='dw-all-top-tabs';tabs.setAttribute('aria-label','Tracker sections');
  const items=[['overview','Overview'],['expenses','Expenses'],['bills','Bills'],['members','Members']];
  for(const [key,label] of items){
    const button=document.createElement('button');button.type='button';
    button.dataset.dwAllTab=key;button.dataset.dwShellKey=key;
    button.textContent=label;button.setAttribute('aria-current','false');
    tabs.append(button);
  }
  const tools=document.createElement('div');tools.id='dw-all-top-tools';tools.setAttribute('aria-label','Account shortcuts');
  const svg=(paths)=>'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+paths+'</svg>';
  const icons={
    search:'<circle cx="10.7" cy="10.7" r="7"/><path d="m16 16 5 5"/>',
    notifications:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/>',
    home:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
    trackers:'<path d="m12 3 9 5-9 5-9-5 9-5zM3 12l9 5 9-5M3 16l9 5 9-5"/>',
    analytics:'<path d="M4 20V4m5 16v-6m5 6V8m5 12V5"/>',
    events:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18"/>',
    social:'<circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2M19 8v8m-4-4h8"/>',
    more:'<circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/>',
    chat:'<path d="M21 11.5a8.5 8.5 0 0 1-12.4 7.5L3 21l1.9-5.6A8.5 8.5 0 1 1 21 11.5z"/>',
    account:'<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',
    about:'<circle cx="12" cy="12" r="10"/><path d="M12 11v6"/><circle cx="12" cy="7.5" r="1" fill="currentColor" stroke="none"/>',
    privacy:'<path d="M5 3h11l3 3v15H5zM16 3v4h3M8 11h8M8 15h8M8 19h5"/>',
    polls:'<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8 9h8m-8 4h8m-8 4h5"/>',
    default:'<rect x="4" y="4" width="16" height="16" rx="4"/><path d="M8 12h8"/>'
  };
  const toolLabels=[['search','Search DoWeo'],['notifications','Notifications'],['account','Open account']];
  for(const [key,label] of toolLabels){
    const button=document.createElement('button');button.type='button';
    button.dataset.dwAllTool=key;button.className='dw-all-tool';button.setAttribute('aria-label',label);
    button.dataset.dwShellKey=key==='account'?'openAccount':key==='search'?'search':'notifications';
    button.title=label;
    if(key==='account')button.innerHTML='<span class="dw-all-avatar-text">ME</span>';
    else button.innerHTML=svg(icons[key])+(key==='notifications'?'<span class="dw-all-notification-dot" hidden></span>':'');
    tools.append(button);
  }
  bar.append(tabs,tools);
  // Outside the dashboard, which is display:none on other routes.
  sidebar.after(bar);

  function originalTab(name){return existingTabs.querySelector('[data-sq-tab="'+name+'"]');}
  tabs.addEventListener('click',event=>{
    const button=event.target.closest('[data-dw-all-tab]');
    if(!button)return;
    const section=button.dataset.dwAllTab;
    const home=document.getElementById('nav-home');
    home?.click(); // Normal router clears Analytics, Bills, More, Settings, etc.
    if(section!=='overview'){
      requestAnimationFrame(()=>originalTab(section)?.click());
    }
    requestAnimationFrame(sync);
    setTimeout(sync,120);
  });
  tools.addEventListener('click',event=>{
    const button=event.target.closest('[data-dw-all-tool]');if(!button)return;
    const key=button.dataset.dwAllTool;
    const homeButton=document.querySelector('#dw-ref-toolbar [data-ref-tool="'+key+'"]');
    if(homeButton){homeButton.click();return;}
    if(key==='search')document.querySelector('.sq-search-launch')?.click();
    else if(key==='notifications')document.getElementById('notifications-toggle')?.click();
    else document.getElementById('nav-profile')?.click();
  });
  function syncProfile(){
    const a=document.querySelector('#dw-ref-toolbar [data-ref-tool="account"]');
    const dst=tools.querySelector('[data-dw-all-tool="account"]');
    if(!dst)return;
    const profile=document.getElementById('me-avatar');
    const from=a?.querySelector('.dw-ref-avatar-label')?.textContent?.trim();
    const who=document.getElementById('who')?.textContent?.trim()||'';
    dst.querySelector('.dw-all-avatar-text').textContent=from||who.split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]?.toUpperCase()).join('')||'ME';
    const bg=profile?getComputedStyle(profile).backgroundImage:'none';
    if(bg&&bg!=='none'){dst.style.backgroundImage=bg;dst.classList.add('dw-all-has-photo');}
    else{dst.style.backgroundImage='';dst.classList.remove('dw-all-has-photo');}
    const count=document.getElementById('notifications-count');
    const dot=tools.querySelector('.dw-all-notification-dot');
    if(dot)dot.hidden=!(count&&!count.hidden&&count.textContent?.trim());
  }

  const nameFor=el=>{
    const raw=(el.id||'').toLowerCase();
    if(raw.includes('notification'))return 'notifications';
    if(raw.includes('analytic'))return 'analytics';
    if(raw.includes('tracker'))return 'trackers';
    if(raw.includes('poll'))return 'polls';
    if(raw.includes('event')||raw.includes('sqev'))return 'events';
    if(raw.includes('chat'))return 'chat';
    if(raw.includes('friend')||raw.includes('social'))return 'social';
    if(raw.includes('home'))return 'home';
    if(raw.includes('profile')||raw.includes('setting'))return 'account';
    if(raw.includes('privacy')||raw.includes('terms'))return 'privacy';
    if(raw.includes('about'))return 'about';
    if(raw.includes('more'))return 'more';
    const name=(el.querySelector('.dw-nav-group-name,.dw-social-label,.sq-nav-label')?.textContent||
      el.getAttribute('aria-label')||el.textContent||'').trim().toLowerCase();
    for(const key of ['notification','analytic','tracker','event','poll','chat','friend','social','home','account','setting','more','about','privacy']){
      if(name.includes(key))return ({notification:'notifications',analytic:'analytics',tracker:'trackers',
        event:'events',friend:'social',setting:'account'}[key]||key);
    }
    return 'default';
  };
  const originalSidebarStyles=new Map();
  function repairSidebar(){
    if(!desktop.matches){
      // Exact original inline styles return when the site switches to mobile.
      // The main phone navigation, sheets and More grid never use these icons.
      for(const [element,previous] of originalSidebarStyles){
        if(!element.isConnected)continue;
        if(previous===null)element.removeAttribute('style');
        else element.setAttribute('style',previous);
      }
      originalSidebarStyles.clear();
      return;
    }
    // Every direct navigation surface, including independently implemented
    // Social/More controls, gets the exact same icon box and text metrics.
    const entries=[
      ...sidebarNav.querySelectorAll(':scope > button.sq-nav-link'),
      ...sidebarNav.querySelectorAll(':scope > .dw-nav-social-trigger'),
      ...sidebarNav.querySelectorAll(':scope > .dw-nav-group > summary'),
      ...sidebarNav.querySelectorAll(':scope > details > summary')
    ];
    for(const entry of new Set(entries)){
      if(!entry.isConnected||entry.hidden||getComputedStyle(entry).display==='none')continue;
      let mark=entry.querySelector(':scope > .dw-all-nav-icon');
      if(!mark){
        mark=document.createElement('span');mark.className='dw-all-nav-icon';
        mark.setAttribute('aria-hidden','true');
        mark.innerHTML=svg(icons[nameFor(entry)]||icons.default);
        entry.prepend(mark);
      }
      // Historical DoWeo styles include higher-specificity !important icon
      // hiding rules. Important inline presentation wins without replacing the
      // real buttons, click handlers, flyouts, accessible names or labels.
      const force=(el,key,value)=>{
        if(!originalSidebarStyles.has(el))originalSidebarStyles.set(el,el.getAttribute('style'));
        el.style.setProperty(key,value,'important');
      };
      for(const [key,value] of Object.entries({
        display:'inline-flex',visibility:'visible',opacity:'1',width:'27px',height:'27px',
        'min-width':'27px','min-height':'27px',flex:'0 0 27px',
        'align-items':'center','justify-content':'center',
        margin:'0 13px 0 0',padding:'0',position:'static',transform:'none',
        'clip-path':'none',color:'#f6faff'
      }))force(mark,key,value);
      const glyph=mark.querySelector('svg');
      if(glyph){
        for(const [key,value] of Object.entries({
          display:'block',visibility:'visible',opacity:'1',width:'25px',height:'25px',
          stroke:'#f6faff',fill:'none'
        }))force(glyph,key,value);
      }
      const isActive=entry.classList.contains('active')||entry.getAttribute('aria-current')==='page';
      for(const [key,value] of Object.entries({
        height:'53px','min-height':'53px','max-height':'53px',
        'font-family':'inherit','font-size':'16px','font-weight':'625',
        'line-height':'1.2','text-align':'start','align-items':'center',
        'justify-content':'flex-start','border-radius':'15px',
        background:isActive?'#435b7e':'transparent',
        border:isActive?'1px solid rgba(195,224,255,.17)':'1px solid transparent',
        'box-shadow':'none',transform:'none',color:'#f5faff'
      }))force(entry,key,value);
      const label=entry.querySelector('.sq-nav-label,.dw-social-label,.dw-nav-group-name');
      if(label){
        for(const [key,value] of Object.entries({
          display:'inline-block',visibility:'visible',opacity:'1',
          'font-family':'inherit','font-size':'16px','font-weight':'625',
          'line-height':'1.2','letter-spacing':'normal','text-transform':'none'
        }))force(label,key,value);
      }
    }
  }
  let sideScheduled=false;
  if(sidebarNav){
    new MutationObserver(()=>{
      if(sideScheduled)return;
      sideScheduled=true;
      requestAnimationFrame(()=>{sideScheduled=false;repairSidebar();});
    }).observe(sidebarNav,{childList:true,subtree:true});
  }

  // The new header appears on *all* non-Overview signed-in destinations.
  const trackerGallery=document.getElementById('trackers-page');
  const galleryOriginalDisplay=trackerGallery?.style.getPropertyValue('display')||'';
  const galleryOriginalPriority=trackerGallery?.style.getPropertyPriority('display')||'';
  function isolateStandaloneViews(){
    if(!desktop.matches||!trackerGallery)return;
    // Old tracker-gallery rules can override the normal router and keep an
    // unrelated page in the document flow (seen in the About screenshot).
    const standalone=['about-view','analytics-view','settings-view','friends-view','notifications-view'];
    const hide=standalone.some(state=>body.classList.contains(state));
    if(hide)trackerGallery.style.setProperty('display','none','important');
    else if(trackerGallery.style.getPropertyValue('display')==='none'&&
            trackerGallery.style.getPropertyPriority('display')==='important'){
      if(galleryOriginalDisplay)trackerGallery.style.setProperty('display',galleryOriginalDisplay,galleryOriginalPriority);
      else trackerGallery.style.removeProperty('display');
    }
  }
  // Capture the actual native Overview pill geometry, then reuse it for
  // every secondary page. This avoids competing fixed widths and offsets.
  let measuredHomeBar=null;
  function keepMatchingTabGeometry(){
    if(!desktop.matches)return;
    const rect=existingTabs.getBoundingClientRect();
    if(rect.width>200&&rect.height>40&&getComputedStyle(existingTabs).display!=='none'){
      measuredHomeBar={x:rect.x,y:rect.y,w:rect.width,h:rect.height,viewport:innerWidth};
    }
    if(!measuredHomeBar)return;
    const offset=(innerWidth-measuredHomeBar.viewport)/2;
    for(const [name,val] of Object.entries({
      position:'fixed',left:(measuredHomeBar.x+offset)+'px',
      top:measuredHomeBar.y+'px',width:measuredHomeBar.w+'px',
      height:measuredHomeBar.h+'px',transform:'none'
    }))tabs.style.setProperty(name,val,'important');
  }
  function sync(){
    isolateStandaloneViews();
    keepMatchingTabGeometry();
    const legacyView=pageStates.some(key=>body.classList.contains(key));
    const isOverview=!legacyView && dashboard.classList.contains('sq-tab-overview') &&
      !dashboard.classList.contains('dw-template-original')&&visible('tracker-dashboard');
    const secondary=desktop.matches&&!isOverview;
    const guest=body.classList.contains('sq-auth-guest')||body.classList.contains('sq-auth-loading');
    body.classList.toggle('dw-all-secondary-view',secondary&&!guest);
    if(desktop.matches){
      const active=legacyView?'':([...existingTabs.querySelectorAll('[data-sq-tab]')].find(b=>b.getAttribute('aria-selected')==='true')?.dataset.sqTab||'');
      for(const b of tabs.querySelectorAll('button[data-dw-all-tab]')){
        const selected=active===b.dataset.dwAllTab;
        b.setAttribute('aria-current',selected?'page':'false');
        b.setAttribute('aria-pressed',String(selected));
      }
      syncProfile();
      repairSidebar();
    }
  }
  let queued=false;
  function schedule(){
    if(queued)return;queued=true;
    requestAnimationFrame(()=>{queued=false;sync();});
  }
  new MutationObserver(schedule).observe(body,{attributes:true,attributeFilter:['class']});
  new MutationObserver(schedule).observe(dashboard,{attributes:true,attributeFilter:['class','hidden']});
  new MutationObserver(schedule).observe(document.querySelector('.wrap')||body,
    {attributes:true,subtree:false,attributeFilter:['class','hidden']});
  for(const b of existingTabs.querySelectorAll('[data-sq-tab]'))b.addEventListener('click',schedule);
  sidebarNav.addEventListener('click',()=>{schedule();setTimeout(schedule,120);});
  document.addEventListener('click',event=>{
    if(event.target.closest('button[data-dw-all-tab],#dw-all-topbar'))return;
    schedule();
    setTimeout(schedule,120);
  },true);
  window.addEventListener('squareup:tracker-detail',schedule);
  window.addEventListener('pageshow',schedule);
  desktop.addEventListener('change',schedule);
  document.addEventListener('doweo:languagechange',schedule);
  window.dwUnifiedShell={sync,repairSidebar,topbar:bar};
  schedule();
})();

/* Desktop navigation clean-up and chronological notification groups.
   Original notification buttons retain their delegated handlers. */
(function(){
 'use strict';
 const desktop=window.matchMedia('(min-width:901px)');
 const list=document.getElementById('notifications-list');
 const friends=document.getElementById('friends-page');
 const nativeFriends=document.getElementById('nav-friends');
 function restoreFriends(){
   if(!desktop.matches||!document.body.classList.contains('friends-view')||!friends)return;
   if(friends.hidden)friends.hidden=false;if(friends.hasAttribute('aria-hidden'))friends.removeAttribute('aria-hidden');
   friends.style.setProperty('display','block','important');
   const root=friends.closest('.wrap');
   if(root){root.style.setProperty('height','auto');root.style.setProperty('min-height','0');}
   if(typeof window.squareUpLoadFriends==='function')window.squareUpLoadFriends().catch(console.warn);
 }
 // Social flyout entries must open the actual page, not the tracker Home overview.
 document.addEventListener('click',function(event){
   const link=event.target.closest('[data-sq-destination="nav-friends"]');
   if(!link||!desktop.matches)return;
   event.preventDefault();event.stopImmediatePropagation();
   nativeFriends?.click();
   requestAnimationFrame(restoreFriends);
 },true);
 if(friends){
   new MutationObserver(()=>{if(desktop.matches&&document.body.classList.contains('friends-view'))requestAnimationFrame(restoreFriends);})
     .observe(friends,{attributes:true,attributeFilter:['hidden','aria-hidden']});
 }
 let grouping=false;
 function dayOf(entry){
   const note=entry.querySelector('.note')?.textContent||'';
   const match=note.match(/\b(\d{1,2}\/\d{1,2}\/\d{4})\b/)||
     note.match(/\b(\d{4}-\d{2}-\d{2})\b/);
   if(!match)return null;
   const date=new Date(match[1].includes('/')?match[1]:match[1]+'T12:00:00');
   if(Number.isNaN(date.getTime()))return null;
   return {key:date.toISOString().slice(0,10),label:new Intl.DateTimeFormat(document.documentElement.lang||'en',{weekday:'long',month:'long',day:'numeric',year:'numeric'}).format(date)};
 }
 function regroup(){
   if(!list||grouping||!desktop.matches)return;
   const items=Array.from(list.children).filter(el=>el.classList.contains('entry'));
   if(!items.length)return;
   grouping=true;
   try{
     const groups=new Map();
     for(const entry of items){
       const d=dayOf(entry)||{key:'undated',label:'Other notifications'};
       if(!groups.has(d.key))groups.set(d.key,{label:d.label,items:[]});
       groups.get(d.key).items.push(entry);
     }
     const fragment=document.createDocumentFragment();
     [...groups.entries()].sort((a,b)=>b[0].localeCompare(a[0])).forEach(([key,group])=>{
       const section=document.createElement('section');section.className='dw-inbox-group';section.dataset.date=key;
       const heading=document.createElement('h3');heading.className='dw-inbox-date';heading.textContent=group.label;
       const grid=document.createElement('div');grid.className='dw-inbox-items';
       group.items.forEach(entry=>grid.append(entry));
       section.append(heading,grid);fragment.append(section);
     });
     const extras=Array.from(list.children).filter(el=>!el.classList.contains('entry')&&!el.classList.contains('dw-inbox-group'));
     list.replaceChildren(fragment,...extras);
   }finally{queueMicrotask(()=>{grouping=false});}
 }
 if(list){
   const observer=new MutationObserver(()=>{
     if(grouping||!desktop.matches)return;
     if(list.querySelector(':scope > .entry'))requestAnimationFrame(regroup);
   });
   observer.observe(list,{childList:true});
   regroup();
   desktop.addEventListener('change',()=>{
     if(desktop.matches){regroup();return;}
     // Return notifications to the original flat list for the unchanged mobile layout.
     const all=[...list.querySelectorAll('.dw-inbox-group .entry')];
     if(all.length)list.replaceChildren(...all);
   });
 }
 document.addEventListener('click',event=>{
   if(!desktop.matches)return;
   if(event.target.closest('#nav-friends'))requestAnimationFrame(restoreFriends);
 });
 window.addEventListener('hashchange',()=>{if(location.hash==='#friends')requestAnimationFrame(restoreFriends)});
 if(location.hash==='#friends')requestAnimationFrame(restoreFriends);
})();
