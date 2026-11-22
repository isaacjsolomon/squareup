// In-app feedback launcher. Uses DoWeo's existing authenticated api() client.
export function initBetaFeedback({api,getUser}) {
  if (document.getElementById('dw-beta-launch')) return;
  const style=document.createElement('style');
  style.textContent=`
  #dw-beta-launch{position:fixed;right:18px;bottom:100px;z-index:8000;display:none;align-items:center;gap:8px;border:1px solid #ABC6D7;border-radius:999px;background:#173750;color:#F3F8FC;padding:11px 17px;box-shadow:0 8px 26px color-mix(in srgb, #0A1B2E 33.3%, transparent);font:700 13px system-ui;cursor:pointer}
  #dw-beta-launch:focus-visible,#dw-beta-modal button:focus-visible,#dw-beta-modal input:focus-visible,#dw-beta-modal textarea:focus-visible{outline:3px solid #F3F8FC;outline-offset:2px}
  #dw-beta-modal[hidden]{display:none!important}
  #dw-beta-modal{position:fixed;inset:0;z-index:100000;display:grid;place-items:center;background:color-mix(in srgb, #0A1B2E 74.1%, transparent);padding:16px;color:#F3F8FC;font:14px system-ui}
  #dw-beta-modal *{box-sizing:border-box}
  #dw-beta-modal .dw-panel{width:min(100%,510px);max-height:min(90dvh,760px);overflow:auto;border:1px solid #355E72;border-radius:22px;background:linear-gradient(150deg,#173750,#0A1B2E);padding:25px;box-shadow:0 24px 70px color-mix(in srgb, #0A1B2E 53.3%, transparent)}
  #dw-beta-modal .dw-top{display:flex;justify-content:space-between;gap:12px;align-items:start}
  #dw-beta-modal h2{margin:0 0 6px;font-size:23px;color:#F3F8FC}
  #dw-beta-modal p{color:#ABC6D7;line-height:1.5}
  #dw-beta-modal .dw-close{border:0;background:transparent;color:#F3F8FC;font-size:26px;cursor:pointer}
  #dw-beta-modal .dw-types{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin:20px 0}
  #dw-beta-modal .dw-types button{padding:12px 6px;border:1px solid #355E72;border-radius:11px;background:#204158;color:#F3F8FC;cursor:pointer}
  #dw-beta-modal .dw-types button[aria-pressed=true]{background:#F3F8FC;color:#0A1B2E;border-color:#F3F8FC;font-weight:800}
  #dw-beta-modal label{display:block;margin:14px 0 6px;font-weight:650}
  #dw-beta-modal input,#dw-beta-modal textarea{display:block;width:100%;background:#0A1B2E;color:#F3F8FC;border:1px solid #355E72;border-radius:10px;padding:12px;font:inherit}
  #dw-beta-modal textarea{resize:vertical;min-height:112px}
  #dw-beta-modal .dw-stars{display:flex;gap:6px;margin:10px 0}
  #dw-beta-modal .dw-stars button{border:0;background:transparent;color:#ABC6D7;font-size:32px;cursor:pointer;padding:3px}
  #dw-beta-modal .dw-stars button[aria-pressed=true]{color:#F3F8FC}
  #dw-beta-modal .dw-submit{width:100%;padding:13px;border:0;border-radius:11px;background:#F3F8FC;color:#102B40;font-weight:800;cursor:pointer;margin-top:18px}
  #dw-beta-modal .dw-submit:disabled{opacity:.55;cursor:wait}
  #dw-beta-modal .dw-message{min-height:20px;font-size:13px;margin:10px 0 0}
  #sq-mobile-more-sheet #dw-beta-more-action{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;min-height:60px;margin-top:12px;padding:14px 20px;border:1px solid #F3F8FC;border-radius:15px;background:linear-gradient(120deg,#ABC6D7,#ABC6D7);color:#102B40;font:inherit;font-size:16px;font-weight:800;cursor:pointer;box-shadow:0 8px 20px color-mix(in srgb, #355E72 16%, transparent)}
  #sq-mobile-more-sheet #dw-beta-more-action span[aria-hidden="true"]{font-size:40px;line-height:1;display:grid;place-items:center;flex:0 0 44px;width:44px;height:44px;transform:translateY(-1px)}
  #sq-mobile-more-sheet #dw-beta-more-action span:not([aria-hidden]){display:inline-flex;align-items:center;line-height:1.2}
  #sq-mobile-more-sheet #dw-beta-more-action:active{transform:translateY(1px);background:#ABC6D7}
  #sq-mobile-more-sheet #dw-beta-more-action:focus-visible{outline:3px solid #F3F8FC;outline-offset:3px}
  /* Standalone desktop sidebar destination below (not inside) the More dropdown. */
  @media(min-width:901px){
    .sidebar .squareup-nav #dw-beta-launch{
      position:relative;left:auto;right:auto;top:auto;bottom:auto;z-index:auto;
      width:100%;max-width:100%;min-height:47px;box-sizing:border-box;
      margin:3px 0 2px;padding:12px 9px;justify-content:center;
      border:1px solid color-mix(in srgb, #ABC6D7 40%, transparent);border-radius:13px;
      background:linear-gradient(120deg,#173750,#355E72);color:#F3F8FC;box-shadow:0 5px 16px color-mix(in srgb, #0A1B2E 20%, transparent);
      font:700 13px system-ui;line-height:1.25;white-space:normal;
    }
    .sidebar .squareup-nav #dw-beta-launch:hover{background:linear-gradient(120deg,#173750,#355E72);filter:brightness(1.15)}
    body.side-collapsed .sidebar .squareup-nav #dw-beta-launch{
      min-height:42px;padding:8px 3px;font-size:0;
    }
    body.side-collapsed .sidebar .squareup-nav #dw-beta-launch:before{
      content:'✦';font-size:21px;line-height:1;
    }
  }
  @media(max-width:900px){#dw-beta-launch{display:none!important}#dw-beta-modal .dw-panel{padding:19px}}
  @media(min-width:901px){#dw-beta-more-action{display:none!important}}
  `;
  document.head.appendChild(style);
  const launcher=document.createElement('button');
  launcher.id='dw-beta-launch';
  launcher.type='button';
  launcher.textContent='✦ Beta Feedback';
  launcher.setAttribute('aria-haspopup','dialog');
  const modal=document.createElement('div');
  modal.id='dw-beta-modal';
  modal.hidden=true;
  modal.innerHTML=`<div class="dw-panel" role="dialog" aria-modal="true" aria-labelledby="dw-beta-title">
    <div class="dw-top"><div><h2 id="dw-beta-title">Help improve DoWeo</h2><p>Report a bug, share an idea, or rate your experience.</p></div><button class="dw-close" type="button" aria-label="Close feedback">×</button></div>
    <form id="dw-beta-form">
      <div class="dw-types" role="group" aria-label="Feedback type">
        <button type="button" data-kind="bug" aria-pressed="true">Bug report</button>
        <button type="button" data-kind="idea" aria-pressed="false">Feature idea</button>
        <button type="button" data-kind="rating" aria-pressed="false">Rate DoWeo</button>
      </div>
      <div id="dw-beta-stars-wrap" hidden><label>Your rating</label><div class="dw-stars" role="group" aria-label="Rating from 1 to 5">
        <button type="button" data-rating="1" aria-label="1 star">★</button><button type="button" data-rating="2" aria-label="2 stars">★</button><button type="button" data-rating="3" aria-label="3 stars">★</button><button type="button" data-rating="4" aria-label="4 stars">★</button><button type="button" data-rating="5" aria-label="5 stars">★</button>
      </div></div>
      <label for="dw-beta-subject">Subject</label><input id="dw-beta-subject" maxlength="120" minlength="3" required placeholder="A short description">
      <label for="dw-beta-details">Details</label><textarea id="dw-beta-details" maxlength="2000" minlength="3" required placeholder="What happened? What would you like to see?"></textarea>
      <p style="font-size:12px">Submissions are saved for DoWeo support and emailed to help.doweo@gmail.com. Don't include passwords, payment details, or other sensitive information.</p>
      <button class="dw-submit" type="submit">Send feedback</button>
      <p class="dw-message" id="dw-beta-message" role="status" aria-live="polite"></p>
    </form></div>`;
  document.body.append(launcher,modal);
  // Grouped desktop sidebar: put the existing launcher directly below More.
  // Do not move it inside <details>, which would hide it when More is collapsed.
  const desktopNav=document.querySelector('.sidebar .squareup-nav');
  const moreGroup=desktopNav?.querySelector('.dw-nav-group[data-dw-nav-group="more"]');
  if(moreGroup) moreGroup.insertAdjacentElement('afterend',launcher);
  else if(desktopNav) desktopNav.appendChild(launcher);
  const form=modal.querySelector('form');
  const message=modal.querySelector('#dw-beta-message');
  let category='bug',rating=0,previousFocus=null;
  const close=()=>{modal.hidden=true;document.body.style.removeProperty('overflow');(previousFocus||launcher).focus();};
  const open=(returnFocus)=>{
    if (!getUser?.()) return;
    previousFocus=returnFocus||document.activeElement;
    modal.hidden=false;
    document.body.style.overflow='hidden';
    message.textContent='';
    modal.querySelector('.dw-close').focus();
  };
  launcher.addEventListener('click',()=>open());
  modal.querySelector('.dw-close').addEventListener('click',close);
  modal.addEventListener('click',e=>{if(e.target===modal)close();});
  modal.addEventListener('keydown',e=>{
    if(e.key==='Escape'){e.preventDefault();close();}
    if(e.key==='Tab'){
      const nodes=[...modal.querySelectorAll('button:not([disabled]),input,textarea')].filter(el=>el.offsetParent!==null);
      if(!nodes.length)return;
      if(e.shiftKey&&document.activeElement===nodes[0]){e.preventDefault();nodes[nodes.length-1].focus();}
      if(!e.shiftKey&&document.activeElement===nodes[nodes.length-1]){e.preventDefault();nodes[0].focus();}
    }
  });
  modal.querySelectorAll('[data-kind]').forEach(btn=>btn.addEventListener('click',()=>{
    category=btn.dataset.kind;
    modal.querySelectorAll('[data-kind]').forEach(b=>b.setAttribute('aria-pressed',String(b===btn)));
    modal.querySelector('#dw-beta-stars-wrap').hidden=category!=='rating';
    message.textContent='';
  }));
  modal.querySelectorAll('[data-rating]').forEach(btn=>btn.addEventListener('click',()=>{
    rating=Number(btn.dataset.rating);
    modal.querySelectorAll('[data-rating]').forEach(b=>{b.setAttribute('aria-pressed',String(Number(b.dataset.rating)<=rating));});
  }));
  form.addEventListener('submit',async e=>{
    e.preventDefault();
    if(category==='rating'&&!rating){message.textContent='Choose a star rating first.';return;}
    const submit=form.querySelector('.dw-submit');
    submit.disabled=true;message.textContent='Sending…';
    try {
      const result=await api('beta-feedback','POST',{
        category,rating:category==='rating'?rating:null,
        title:form.querySelector('#dw-beta-subject').value,
        details:form.querySelector('#dw-beta-details').value,
        page_path:location.pathname,
        device_info:navigator.userAgent.slice(0,160)
      });
      form.reset();rating=0;
      modal.querySelectorAll('[data-rating]').forEach(b=>b.setAttribute('aria-pressed','false'));
      message.textContent=result?.notice || (result?.email_sent?'Thanks! Your feedback was emailed to DoWeo support.':'Your feedback was saved; email delivery is pending.');
    }catch(error){message.textContent=error?.message||'Unable to send feedback right now.';}
    finally{submit.disabled=false;}
  });
  let emailReady=false;
  let mobileAction=null;
  // The actual mobile "More" sheet is rendered in index.html.
  // Attach after its existing Log out button; no separate floating mobile pill.
  const ensureMobileAction=()=>{
    if(mobileAction?.isConnected)return;
    const logout=document.getElementById('sq-mobile-more-logout');
    if(!logout)return;
    mobileAction=document.getElementById('dw-beta-more-action');
    if(mobileAction)return;
    mobileAction=document.createElement('button');
    mobileAction.id='dw-beta-more-action';
    mobileAction.type='button';
    mobileAction.innerHTML='<span aria-hidden="true">✦</span><span>Beta Feedback</span>';
    mobileAction.style.display='none';
    logout.insertAdjacentElement('afterend',mobileAction);
    mobileAction.addEventListener('click',()=>{
      const more=document.getElementById('sq-mobile-more-sheet');
      if(more)more.hidden=true;
      document.body.classList.remove('sq-balanced-sheet-open');
      open(document.getElementById('sq-mobile-more'));
    });
  };
  const updateVisibility=()=>{
    ensureMobileAction();
    const ai=document.getElementById('sq-ai-launch');
    const aiChatOpen=ai?.getAttribute('aria-expanded')==='true';
    const canSubmit=Boolean(getUser?.() && emailReady);
    launcher.style.display=canSubmit&&!aiChatOpen?'inline-flex':'none';
    // CSS hides the floating button on mobile, irrespective of inline display.
    // The More-sheet entry is only available to signed-in users when email works.
    if(mobileAction)mobileAction.style.display=canSubmit?'flex':'none';
    if(!canSubmit&&!modal.hidden)close();
  };
  async function checkEmailReady(){
    try{
      const response=await fetch('/api/beta-feedback',{method:'GET',credentials:'same-origin',cache:'no-store'});
      const data=response.ok?await response.json():{};
      emailReady=data.ready===true;
    }catch(_){emailReady=false;}
    updateVisibility();
  }
  updateVisibility();
  checkEmailReady();
  const interval=setInterval(updateVisibility,1800);
  const statusInterval=setInterval(checkEmailReady,120000);
  window.addEventListener('pagehide',()=>{
    clearInterval(interval);
    clearInterval(statusInterval);
  },{once:true});
}
