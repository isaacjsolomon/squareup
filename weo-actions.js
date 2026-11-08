/* Weo Quick Actions: use the existing authenticated tracker, chat, poll, and expense flows.
   Images are opt-in, compressed locally, and sent once to Workers AI with the user's prompt.
   Nothing is automatically posted to a tracker or saved as a financial transaction. */
(() => {
  'use strict';
  const panel=document.getElementById('sq-ai-window');
  const form=document.getElementById('sq-ai-form');
  const prompt=document.getElementById('sq-ai-question');
  const support=document.getElementById('sq-ai-contact');
  if(!panel||!form||!prompt||!support||document.getElementById('weo-quick-actions'))return;

  const icons={
    image:'<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="2"/><path d="m4.5 17 5-5 3.5 3 3-3 4.5 5"/>',
    poll:'<path d="M5 20V11M10 20V5M15 20v-8M20 20v-5"/><path d="M3 20h19"/>',
    chat:'<path d="M20 11.5a8.5 8.5 0 0 1-8.5 8.5 9 9 0 0 1-4-.95L3 21l1.55-4.5A8.5 8.5 0 1 1 20 11.5Z"/>',
    expense:'<rect x="5" y="2.5" width="14" height="19" rx="2"/><path d="M8 8h8M8 12h8M8 16h4"/><path d="m14 16 2 2 3-3"/>'
  };
  const actions=[
    ['image','Add image','Choose a photo to ask Weo about'],
    ['poll','Create poll','Open your tracker’s poll composer'],
    ['chat','Group chat','Chat with members in a tracker'],
    ['expense','Add expense','Open the tracker expense form']
  ];
  const area=document.createElement('section');
  area.id='weo-quick-actions';
  area.className='weo-quick-actions';
  area.setAttribute('aria-label','Do more with Weo');
  const heading=document.createElement('div');
  heading.className='weo-actions-title';
  heading.innerHTML='<span class="weo-actions-title-spark" aria-hidden="true">✦</span><strong>Do more with Weo</strong>';
  const grid=document.createElement('div');
  grid.className='weo-actions-grid';
  for(const [kind,label,tip] of actions){
    const button=document.createElement('button');
    button.type='button';
    button.className='weo-action';
    button.dataset.weoAction=kind;
    button.title=tip;
    button.setAttribute('aria-label',label);
    button.innerHTML='<span class="weo-action-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">'+icons[kind]+'</svg></span><span class="weo-action-label">'+label+'</span>';
    grid.appendChild(button);
  }
  const status=document.createElement('p');
  status.className='weo-actions-status';
  status.setAttribute('role','status');
  status.setAttribute('aria-live','polite');
  status.hidden=true;
  area.append(heading,grid,status);
  support.insertAdjacentElement('afterend',area);

  // On phones, keep the composer visible and tuck secondary actions behind one + button.
  // The same action buttons and handlers are reused; nothing is duplicated.
  const moreButton=document.createElement('button');
  moreButton.type='button';
  moreButton.className='weo-more-toggle';
  moreButton.setAttribute('aria-label','More Weo actions');
  moreButton.setAttribute('aria-controls','weo-quick-actions');
  moreButton.setAttribute('aria-expanded','false');
  moreButton.title='More actions';
  moreButton.innerHTML='<svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>';
  form.insertBefore(moreButton,form.firstChild);
  const phoneLayout=window.matchMedia('(max-width:700px)');
  const closeActions=()=>{
    area.classList.remove('weo-menu-open');
    moreButton.setAttribute('aria-expanded','false');
    moreButton.setAttribute('aria-label','More Weo actions');
  };
  const syncActionPlacement=()=>{
    // A single compact + menu works consistently on desktop and mobile.
    // Never reserve a separate footer for tools below the chat composer.
    if(area.parentElement!==form)form.appendChild(area);
    closeActions();
  };
  moreButton.addEventListener('click',()=>{
    const opening=!area.classList.contains('weo-menu-open');
    area.classList.toggle('weo-menu-open',opening);
    moreButton.setAttribute('aria-expanded',String(opening));
    moreButton.setAttribute('aria-label',opening?'Close Weo actions':'More Weo actions');
  });
  document.addEventListener('pointerdown',event=>{
    if(!form.contains(event.target))closeActions();
  });
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape' && area.classList.contains('weo-menu-open')){
      closeActions();moreButton.focus();
    }
  });
  phoneLayout.addEventListener?.('change',syncActionPlacement);
  syncActionPlacement();

  const fileInput=document.createElement('input');
  fileInput.type='file';
  fileInput.accept='image/jpeg,image/png,image/webp,image/heic,image/heif';
  fileInput.hidden=true;
  fileInput.setAttribute('aria-label','Choose an image for Weo');
  area.append(fileInput);
  const preview=document.createElement('div');
  preview.id='weo-image-draft';
  preview.className='weo-image-draft';
  preview.hidden=true;
  const image=document.createElement('img');
  image.alt='Selected image preview';
  const details=document.createElement('div');
  details.className='weo-image-draft-info';
  const filename=document.createElement('strong');
  const subtitle=document.createElement('small');
  subtitle.textContent='Sent only with your next question · Not shared to a tracker';
  details.append(filename,subtitle);
  const remove=document.createElement('button');
  remove.type='button';remove.className='weo-remove-image';
  remove.textContent='Remove';
  remove.setAttribute('aria-label','Remove selected image');
  preview.append(image,details,remove);
  form.insertAdjacentElement('beforebegin',preview);

  const picker=document.createElement('div');
  picker.id='weo-tracker-picker';
  picker.className='weo-tracker-picker';
  picker.hidden=true;
  picker.innerHTML='<div class="weo-picker-card" role="dialog" aria-modal="true" aria-labelledby="weo-picker-title"><header><div><span class="weo-picker-kicker">YOUR TRACKERS</span><h2 id="weo-picker-title">Choose a tracker</h2><p id="weo-picker-description">Select where you want to continue.</p></div><button type="button" class="weo-picker-close" aria-label="Close tracker selection">×</button></header><div id="weo-picker-list" class="weo-picker-list" role="group" aria-label="Your trackers"></div><p id="weo-picker-status" role="status" aria-live="polite"></p></div>';
  panel.appendChild(picker);
  const pickerList=picker.querySelector('#weo-picker-list');
  const pickerStatus=picker.querySelector('#weo-picker-status');
  let choice=null;
  let pendingImage=null;
  let returnFocus=null;

  const showStatus=(message)=>{
    status.hidden=!message;
    status.textContent=message||'';
  };
  const clearImage=()=>{
    pendingImage=null;
    prompt.placeholder='Ask Weo anything…';
    image.removeAttribute('src');
    preview.hidden=true;
    fileInput.value='';
    window.WeoChat?.refreshSend?.();
  };
  remove.addEventListener('click',()=>{clearImage();prompt.focus();});

  async function compress(file){
    if(!file||!['image/jpeg','image/png','image/webp','image/heic','image/heif'].includes(file.type))throw Error('Choose a JPEG, PNG, WebP, or HEIC image.');
    if(file.size>8*1024*1024)throw Error('Choose an image smaller than 8 MB.');
    const src=URL.createObjectURL(file);
    let original;
    try{
      original=await new Promise((resolve,reject)=>{
        const picture=new Image();
        picture.onload=()=>resolve(picture);
        picture.onerror=()=>reject(Error('Could not open this image.'));
        picture.src=src;
      });
      if(original.naturalWidth*original.naturalHeight>45000000)throw Error('This image is too large. Choose a smaller photo.');
      const canvas=document.createElement('canvas');
      let blob=null;
      for(const [longEdge,quality] of [[1100,.78],[900,.65],[720,.56]]){
        const scale=Math.min(1,longEdge/Math.max(original.naturalWidth,original.naturalHeight));
        canvas.width=Math.max(1,Math.round(original.naturalWidth*scale));
        canvas.height=Math.max(1,Math.round(original.naturalHeight*scale));
        const context=canvas.getContext('2d');
        if(!context)throw Error('Your browser could not prepare this image.');
        context.drawImage(original,0,0,canvas.width,canvas.height);
        blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',quality));
        if(blob&&blob.size<=900000)break;
      }
      canvas.width=canvas.height=0;
      if(!blob||blob.size>900000)throw Error('This image could not be compressed enough.');
      return await new Promise((resolve,reject)=>{
        const reader=new FileReader();
        reader.onload=()=>resolve(String(reader.result||''));
        reader.onerror=()=>reject(Error('Could not read the image.'));
        reader.readAsDataURL(blob);
      });
    }finally{URL.revokeObjectURL(src);}
  }
  fileInput.addEventListener('change',async()=>{
    const file=fileInput.files?.[0];
    if(!file)return;
    showStatus('Preparing your image…');
    const imageButton=grid.querySelector('[data-weo-action="image"]');
    imageButton.disabled=true;
    try{
      const data=await compress(file);
      pendingImage={data,name:file.name||'Selected image'};
      image.src=data;
      filename.textContent=pendingImage.name.slice(0,70);
      preview.hidden=false;
      showStatus('');
      if(!prompt.value.trim())prompt.placeholder='Ask Weo about your image…';
      window.WeoChat?.refreshSend?.();
      prompt.focus();
    }catch(error){
      showStatus(error?.message||'Unable to prepare that image.');
      fileInput.value='';
    }finally{imageButton.disabled=false;}
  });

  const closePicker=()=>{
    picker.hidden=true;
    pickerStatus.textContent='';
    choice=null;
    if(returnFocus?.isConnected)returnFocus.focus({preventScroll:true});
  };
  picker.querySelector('.weo-picker-close').addEventListener('click',closePicker);
  picker.addEventListener('click',event=>{if(event.target===picker)closePicker();});
  picker.addEventListener('keydown',event=>{
    if(event.key==='Escape'){event.preventDefault();closePicker();return;}
    if(event.key!=='Tab')return;
    const controls=[...picker.querySelectorAll('button:not([disabled])')].filter(el=>el.offsetParent!==null);
    if(!controls.length)return;
    if(event.shiftKey&&document.activeElement===controls[0]){event.preventDefault();controls.at(-1).focus();}
    if(!event.shiftKey&&document.activeElement===controls.at(-1)){event.preventDefault();controls[0].focus();}
  });

  async function startPicker(kind,originButton){
    if(!window.squareUpApi){showStatus('Sign in to use your trackers.');return;}
    returnFocus=originButton;
    choice=kind;
    picker.hidden=false;
    pickerStatus.textContent='Loading your trackers…';
    pickerList.replaceChildren();
    picker.querySelector('.weo-picker-close').focus();
    picker.querySelector('#weo-picker-title').textContent={
      poll:'Choose a tracker for your poll',
      chat:'Choose a group to chat with',
      expense:'Choose a tracker for the expense'
    }[kind]||'Choose a tracker';
    try{
      const data=await window.squareUpApi('trackers');
      if(picker.hidden||choice!==kind)return;
      if(!Array.isArray(data))throw Error('Could not load trackers.');
      pickerStatus.textContent='';
      if(!data.length){
        const message=document.createElement('p');
        message.textContent='Create a tracker before using this action.';
        const create=document.createElement('button');
        create.type='button';create.textContent='Open Trackers';
        create.addEventListener('click',()=>{
          picker.hidden=true;
          window.WeoChat?.close?.();
          document.getElementById('nav-trackers')?.click();
        });
        pickerList.append(message,create);
        return;
      }
      const activeId=window.sqLastOpenedTrackerDetail?.id;
      for(const tracker of data){
        if(typeof tracker.id!=='string')continue;
        const button=document.createElement('button');
        button.type='button';button.className='weo-picker-tracker';
        const name=document.createElement('strong');
        name.textContent=String(tracker.name||'Untitled tracker').slice(0,100);
        const detail=document.createElement('small');
        detail.textContent=[tracker.memberCount===1?'1 member':(Number(tracker.memberCount)||0)+' members',tracker.id===activeId?'Currently open':null].filter(Boolean).join(' · ');
        const arrow=document.createElement('span');
        arrow.setAttribute('aria-hidden','true');arrow.textContent='→';
        const labels=document.createElement('span');labels.append(name,detail);
        button.append(labels,arrow);
        button.addEventListener('click',async()=>{
          pickerList.querySelectorAll('button').forEach(b=>b.disabled=true);
          pickerStatus.textContent='Opening tracker…';
          try{await navigate(kind,tracker.id);}
          catch(error){
            const message=error?.message||'Could not open that tracker.';
            if(panel.hidden){
              showStatus(message);
              window.document.getElementById('sq-ai-launch')?.click();
            }else{
              picker.hidden=false;
              choice=kind;
              pickerStatus.textContent=message;
            }
            pickerList.querySelectorAll('button').forEach(b=>b.disabled=false);
          }
        });
        pickerList.append(button);
      }
    }catch(error){pickerStatus.textContent=error?.message||'Could not load your trackers.';}
  }

  async function navigate(kind,id){
    // No expense or poll is posted automatically. The member reviews the existing form.
    if(typeof window.openTracker!=='function')throw Error('Tracker navigation is unavailable. Open it from Trackers.');
    // Clear the selector before closing Weo, so it doesn't reappear next time.
    picker.hidden=true;
    choice=null;
    window.WeoChat?.close?.();
    document.getElementById('nav-trackers')?.click();
    await window.openTracker(id);
    if(kind==='expense'){
      document.getElementById('nav-home')?.click();
      const card=document.getElementById('entry-card');
      if(!card?.classList.contains('entry-open')){
        const button=document.getElementById('quick-expense');
        if(!button)throw Error('Expense form is unavailable.');
        button.click();
      }
      card?.scrollIntoView({block:'center',behavior:'smooth'});
      return;
    }
    const chatNav=document.getElementById('nav-chat');
    if(!chatNav)throw Error('Group chat is unavailable.');
    chatNav.click();
    if(kind==='poll'){
      const expand=document.getElementById('sq-polls-expand');
      if(expand&&expand.getAttribute('aria-expanded')!=='true')expand.click();
      const compose=document.getElementById('sq-poll-compose');
      if(compose&&!compose.classList.contains('open'))document.getElementById('sq-poll-toggle')?.click();
      compose?.scrollIntoView({block:'center',behavior:'smooth'});
      document.getElementById('sq-poll-question')?.focus({preventScroll:true});
    }else{
      document.getElementById('tracker-chat-input')?.focus({preventScroll:true});
    }
  }

  grid.addEventListener('click',event=>{
    const button=event.target.closest('button[data-weo-action]');
    if(!button||button.disabled)return;
    showStatus('');
    const kind=button.dataset.weoAction;
    closeActions();
    if(kind==='image'){fileInput.click();return;}
    startPicker(kind,button);
  });

  const isMobile=()=>window.matchMedia('(max-width:700px)').matches;
  const hideWhenTyping=()=>{
    const editing=Boolean(isMobile()&&document.activeElement===prompt);
    const vv=window.visualViewport;
    const visibleHeight=vv?.height||window.innerHeight;
    const keyboardVisible=editing && visibleHeight < window.innerHeight-110;
    panel.classList.toggle('weo-typing',editing);
    panel.classList.toggle('weo-keyboard-open',keyboardVisible);
    if(keyboardVisible){
      panel.style.setProperty('--weo-visible-height',Math.round(visibleHeight)+'px');
      panel.style.setProperty('--weo-viewport-offset',Math.round(vv?.offsetTop||0)+'px');
    }else{
      panel.style.removeProperty('--weo-visible-height');
      panel.style.removeProperty('--weo-viewport-offset');
    }
    if(editing)closeActions();
    // Keep the welcome and suggestion buttons in the page's scrollable area.
  };
  prompt.addEventListener('focus',hideWhenTyping);
  prompt.addEventListener('blur',()=>setTimeout(hideWhenTyping,100));
  window.visualViewport?.addEventListener('resize',hideWhenTyping);
  window.visualViewport?.addEventListener('scroll',hideWhenTyping);
  window.addEventListener('resize',hideWhenTyping);

  // Give the welcome prompts a reliable, responsive layout regardless of
  // the older inline app stylesheet's card sizing and positioning rules.
  const arrangePrompts=()=>{
    const welcome=panel.querySelector('.sq-ai-welcome');
    if(!welcome)return;
    const titles=['Let’s talk',"Let's talk",'Make a plan','Brainstorm an idea','Get app help'];
    const buttons=[...panel.querySelectorAll('button')].filter(button=>
      titles.includes((button.textContent||'').trim())
    );
    if(buttons.length<4)return;
    let common=buttons[0].parentElement;
    while(common && !buttons.every(button=>common.contains(button)))common=common.parentElement;
    if(common && common!==panel && common!==form && !common.contains(form)){
      common.classList.add('weo-prompt-grid');
      buttons.forEach(button=>button.classList.add('weo-prompt-card'));
    }
  };
  arrangePrompts();
  const promptObserver=new MutationObserver(arrangePrompts);
  promptObserver.observe(panel,{childList:true,subtree:true});


  // Style the existing Instagram prompt's content, without changing
  // its closing or follow-link behavior.
  const centerInstagramPopup=()=>{
    for(const el of document.querySelectorAll('h1,h2,h3,p')){
      const copy=(el.textContent||'').replace(/\s+/g,' ').trim();
      if(copy.includes('Follow DoWeo on Instagram') ||
         (copy.includes('Get updates, new features') && copy.includes('@doweo.app'))){
        el.style.setProperty('text-align','center','important');
        el.style.setProperty('margin-left','auto','important');
        el.style.setProperty('margin-right','auto','important');
        el.style.setProperty('max-width','100%');
      }
    }
  };
  centerInstagramPopup();
  let instagramScanPending=false;
  new MutationObserver(()=>{
    if(instagramScanPending)return;
    instagramScanPending=true;
    requestAnimationFrame(()=>{
      instagramScanPending=false;
      centerInstagramPopup();
    });
  }).observe(document.body,{childList:true,subtree:true});


  // Weo is an app-level page, rather than a modal layered over Home.
  // The original chat instance and all of its message/action handlers stay intact.
  const pageLaunch=document.getElementById('sq-ai-launch');
  const routeKey='weo';
  const isWeoRoute=()=>new URL(location.href).searchParams.get('view')===routeKey;
  const routeUrl=(active)=>{
    const url=new URL(location.href);
    if(active)url.searchParams.set('view',routeKey);
    else if(url.searchParams.get('view')===routeKey)url.searchParams.delete('view');
    return url.pathname+url.search+url.hash;
  };
  let routeSyncing=false;

  // Move the full-page view directly under <body>. A transformed/scrolling
  // dashboard ancestor otherwise makes position:fixed behave like absolute,
  // exposing Home underneath the iOS keyboard during touch scrolling.
  const originalParent=panel.parentNode;
  const originalNext=panel.nextSibling;
  let pageScrollY=0;
  let pageLocked=false;
  const lockBackground=()=>{
    if(pageLocked)return;
    pageScrollY=window.scrollY||0;
    document.body.style.position='fixed';
    document.body.style.top=(-pageScrollY)+'px';
    document.body.style.width='100%';
    document.body.style.overflow='hidden';
    pageLocked=true;
  };
  const unlockBackground=()=>{
    if(!pageLocked)return;
    document.body.style.removeProperty('position');
    document.body.style.removeProperty('top');
    document.body.style.removeProperty('width');
    document.body.style.removeProperty('overflow');
    pageLocked=false;
    window.scrollTo(0,pageScrollY);
  };
  const movePanelToBody=()=>{
    if(panel.parentNode!==document.body)document.body.appendChild(panel);
  };
  const restorePanel=()=>{
    if(originalParent?.isConnected && panel.parentNode!==originalParent){
      originalParent.insertBefore(panel,originalNext?.parentNode===originalParent?originalNext:null);
    }
  };
  const isPanelVisible=()=>{
    if(panel.hidden || panel.getAttribute('aria-hidden')==='true')return false;
    const style=getComputedStyle(panel);
    return style.display!=='none'&&style.visibility!=='hidden'&&panel.getClientRects().length>0;
  };
  const activatePage=(push)=>{
    movePanelToBody();
    lockBackground();
    document.documentElement.classList.add('weo-page-active');
    document.body.classList.add('weo-page-active');
    panel.classList.add('weo-full-page');
    if(push&&!isWeoRoute()){
      history.pushState({...history.state,weoPage:true},'',routeUrl(true));
    }
  };
  const deactivatePage=(goHome)=>{
    document.documentElement.classList.remove('weo-page-active');
    document.body.classList.remove('weo-page-active');
    panel.classList.remove('weo-full-page','weo-keyboard-open','weo-typing');
    panel.style.removeProperty('--weo-visible-height');
    panel.style.removeProperty('--weo-viewport-offset');
    unlockBackground();
    restorePanel();
    if(isWeoRoute())history.replaceState({...history.state,weoPage:false},'',routeUrl(false));
    if(goHome)document.getElementById('nav-home')?.click();
  };
  const updatePageState=()=>{
    if(routeSyncing)return;
    if(isPanelVisible()){
      activatePage(!isWeoRoute());
    }else if(document.body.classList.contains('weo-page-active')){
      deactivatePage(false);
    }
  };
  // Existing launcher and close controls continue to operate normally.
  pageLaunch?.addEventListener('click',()=>{
    requestAnimationFrame(updatePageState);
  });
  const pageObserver=new MutationObserver(()=>{
    requestAnimationFrame(updatePageState);
  });
  pageObserver.observe(panel,{attributes:true,attributeFilter:['class','style','hidden','aria-hidden']});
  const closeControls=[...panel.querySelectorAll('.sq-ai-head button, .sq-ai-head [role="button"]')];
  const lastHeaderButton=closeControls.at(-1);
  for(const control of closeControls){
    const hint=((control.getAttribute('aria-label')||'')+' '+(control.title||'')+' '+(control.textContent||'')).toLowerCase();
    if(control===lastHeaderButton||control.id==='sq-ai-close'||hint.includes('close')||hint.includes('×')||hint.includes('✕')||hint.includes('✖')){
      control.addEventListener('click',()=>{
        requestAnimationFrame(()=>{
          deactivatePage(true);
        });
      });
    }
  }
  window.addEventListener('popstate',()=>{
    routeSyncing=true;
    if(isWeoRoute()){
      if(!isPanelVisible())pageLaunch?.click();
      activatePage(false);
    }else{
      if(isPanelVisible())window.WeoChat?.close?.();
      deactivatePage(false);
    }
    routeSyncing=false;
  });
  if(isWeoRoute()){
    requestAnimationFrame(()=>{
      if(!isPanelVisible())pageLaunch?.click();
      activatePage(false);
    });
  }else{
    requestAnimationFrame(updatePageState);
  }

  // Load account-specific chat history without rebuilding existing Weo behavior.
  const historyScript=document.createElement('script');
  historyScript.src='/weo-history.js';
  historyScript.defer=true;
  document.head.appendChild(historyScript);

  window.WeoActions=Object.freeze({
    hasImage:()=>Boolean(pendingImage),
    takeImage:()=>{
      const data=pendingImage?.data||null;
      clearImage();
      return data;
    },
    clearImage
  });
})();