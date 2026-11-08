// In-app feedback launcher. Uses DoWeo's existing authenticated api() client.
export function initBetaFeedback({api,getUser}) {
  if (document.getElementById('dw-beta-launch')) return;
  const style=document.createElement('style');
  style.textContent=`
  #dw-beta-launch{position:fixed;right:18px;bottom:calc(20px + env(safe-area-inset-bottom));z-index:8000;display:none;align-items:center;gap:8px;border:1px solid #6a8fb0;border-radius:999px;background:#0b2a52;color:white;padding:11px 17px;box-shadow:0 8px 26px #0005;font:700 13px system-ui;cursor:pointer}
  #dw-beta-launch:focus-visible,#dw-beta-modal button:focus-visible,#dw-beta-modal input:focus-visible,#dw-beta-modal textarea:focus-visible{outline:3px solid #ffb04c;outline-offset:2px}
  #dw-beta-modal[hidden]{display:none!important}
  #dw-beta-modal{position:fixed;inset:0;z-index:100000;display:grid;place-items:center;background:#020d23bd;padding:16px;color:#eef5ff;font:14px system-ui}
  #dw-beta-modal *{box-sizing:border-box}
  #dw-beta-modal .dw-panel{width:min(100%,510px);max-height:min(90dvh,760px);overflow:auto;border:1px solid #40638b;border-radius:22px;background:linear-gradient(150deg,#123561,#091b39);padding:25px;box-shadow:0 24px 70px #0008}
  #dw-beta-modal .dw-top{display:flex;justify-content:space-between;gap:12px;align-items:start}
  #dw-beta-modal h2{margin:0 0 6px;font-size:23px;color:#fff}
  #dw-beta-modal p{color:#b7cee7;line-height:1.5}
  #dw-beta-modal .dw-close{border:0;background:transparent;color:#fff;font-size:26px;cursor:pointer}
  #dw-beta-modal .dw-types{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin:20px 0}
  #dw-beta-modal .dw-types button{padding:12px 6px;border:1px solid #456a91;border-radius:11px;background:#153a65;color:#f0f6ff;cursor:pointer}
  #dw-beta-modal .dw-types button[aria-pressed=true]{background:#e99c32;color:#081a32;border-color:#ffc16d;font-weight:800}
  #dw-beta-modal label{display:block;margin:14px 0 6px;font-weight:650}
  #dw-beta-modal input,#dw-beta-modal textarea{display:block;width:100%;background:#071b35;color:#fff;border:1px solid #58759b;border-radius:10px;padding:12px;font:inherit}
  #dw-beta-modal textarea{resize:vertical;min-height:112px}
  #dw-beta-modal .dw-stars{display:flex;gap:6px;margin:10px 0}
  #dw-beta-modal .dw-stars button{border:0;background:transparent;color:#8ba7c6;font-size:32px;cursor:pointer;padding:3px}
  #dw-beta-modal .dw-stars button[aria-pressed=true]{color:#ffb449}
  #dw-beta-modal .dw-submit{width:100%;padding:13px;border:0;border-radius:11px;background:#f3a23a;color:#10213b;font-weight:800;cursor:pointer;margin-top:18px}
  #dw-beta-modal .dw-submit:disabled{opacity:.55;cursor:wait}
  #dw-beta-modal .dw-message{min-height:20px;font-size:13px;margin:10px 0 0}
  @media(max-width:650px){#dw-beta-launch{right:12px;bottom:calc(84px + env(safe-area-inset-bottom));padding:10px 13px}#dw-beta-modal .dw-panel{padding:19px}}
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
      <p style="font-size:12px">Please don't include passwords, payment details, or other sensitive information.</p>
      <button class="dw-submit" type="submit">Send feedback</button>
      <p class="dw-message" id="dw-beta-message" role="status" aria-live="polite"></p>
    </form></div>`;
  document.body.append(launcher,modal);
  const form=modal.querySelector('form');
  const message=modal.querySelector('#dw-beta-message');
  let category='bug',rating=0,previousFocus=null;
  const close=()=>{modal.hidden=true;document.body.style.removeProperty('overflow');(previousFocus||launcher).focus();};
  const open=()=>{
    if (!getUser?.()) return;
    previousFocus=document.activeElement;
    modal.hidden=false;
    document.body.style.overflow='hidden';
    message.textContent='';
    modal.querySelector('.dw-close').focus();
  };
  launcher.addEventListener('click',open);
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
      await api('beta-feedback','POST',{
        category,rating:category==='rating'?rating:null,
        title:form.querySelector('#dw-beta-subject').value,
        details:form.querySelector('#dw-beta-details').value,
        page_path:location.pathname,
        device_info:navigator.userAgent.slice(0,160)
      });
      form.reset();rating=0;
      modal.querySelectorAll('[data-rating]').forEach(b=>b.setAttribute('aria-pressed','false'));
      message.textContent='Thanks! Your feedback was saved.';
    }catch(error){message.textContent=error?.message||'Unable to send feedback right now.';}
    finally{submit.disabled=false;}
  });
  const updateVisibility=()=>{launcher.style.display=getUser?.()?'inline-flex':'none';if(!getUser?.()&&!modal.hidden)close();};
  updateVisibility();
  const interval=setInterval(updateVisibility,1800);
  window.addEventListener('pagehide',()=>clearInterval(interval),{once:true});
}
