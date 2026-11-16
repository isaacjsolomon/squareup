/* Optional Finance Hub payment requests and exchange-rate estimates. */
(function(){
 'use strict';
 const root=document.getElementById('sq-nextgen'),tabs=root?.querySelector('.sq-ng-tabs'),shell=root?.querySelector('.sq-ng-shell');
 if(!root||!tabs||!shell||document.getElementById('dw-paylink-launch'))return;
 function toolsBar(){
  let host=document.getElementById('dw-finance-extras');
  if(!host){
   host=document.createElement('div');host.id='dw-finance-extras';host.setAttribute('aria-label','Additional finance tools');
   host.style.cssText='display:flex;flex-wrap:wrap;gap:9px;align-items:center;margin:10px 0 13px;max-width:100%;';
   tabs.after(host);
   host.addEventListener('click',event=>{
    const active=event.target.closest('button')?.id;
    const panels={'dw-planning-launch':'dw-planning-pane','dw-trip-plus-launch':'dw-trip-plus','dw-paylink-launch':'dw-paylink-pane'};
    for(const [launcher,panel] of Object.entries(panels)){
     if(launcher===active)continue;
     const el=document.getElementById(panel),button=document.getElementById(launcher);
     if(el)el.hidden=true;
     button?.setAttribute('aria-pressed','false');
    }
   });
  }
  return host;
 }
 const style=document.createElement('style');style.textContent=`
 #dw-paylink-launch{border:1px solid #487784;border-radius:12px;background:#12354a;color:#e9faff;min-height:44px;padding:10px 14px;font-weight:750;cursor:pointer}
 #dw-paylink-launch[aria-pressed=true]{background:#138781;border-color:#4ad5c2}
 #dw-paylink-pane[hidden],#dw-paylink-pane [hidden]{display:none!important}
 #dw-paylink-pane{background:#0d2a3e;color:#f3feff;border:1px solid #426a7b;border-radius:19px;padding:19px;margin:16px 0;max-width:100%;box-sizing:border-box}
 #dw-paylink-pane h2{font-size:22px;margin:0 0 8px;color:#f5ffff}
 #dw-paylink-pane p{font-size:13px;line-height:1.5;color:#b1cbd6;margin:6px 0 14px}
 #dw-paylink-pane .dw-pay-row{display:flex;gap:11px;align-items:center;flex-wrap:wrap;margin-bottom:10px}
 #dw-paylink-pane label{display:flex;flex-direction:column;gap:5px;font-size:12px;color:#c0dce7;font-weight:750;flex:1;min-width:120px}
 #dw-paylink-pane input,#dw-paylink-pane select,#dw-paylink-pane button{font:inherit;padding:10px 12px;min-height:43px;border-radius:11px;border:1px solid #426f80;background:#123649;color:#f2ffff;max-width:100%;box-sizing:border-box}
 #dw-paylink-pane button{cursor:pointer;font-weight:750}
 #dw-paylink-pane button.dw-pay-primary{background:#2ad4bf;color:#072e37;border-color:#2ad4bf}
 #dw-paylink-pane button:disabled{opacity:.6;cursor:wait}
 #dw-paylink-pane .dw-pay-card{background:#153a4e;border:1px solid #365e70;border-radius:12px;padding:12px;margin:10px 0;overflow-wrap:anywhere}
 #dw-paylink-pane .dw-pay-card a{color:#70e9d9;overflow-wrap:anywhere}
 #dw-paylink-pane .dw-pay-qr{display:grid;place-items:center;max-width:210px;background:#fff;padding:8px;border-radius:9px;margin:10px 0}
 #dw-paylink-pane .dw-pay-qr:empty{display:none}
 #dw-paylink-pane .dw-pay-status{min-height:22px;color:#b8ecdf;font-size:12px}
 #dw-weo-finance-control{display:flex;align-items:center;gap:7px;padding:6px 12px;color:#bedbe6;font-size:12px;cursor:pointer}
 #dw-weo-finance-control input{accent-color:#36dcc5;width:17px;height:17px}
 @media(max-width:700px){#dw-paylink-pane{padding:13px;margin:12px 0}#dw-paylink-pane .dw-pay-row>*{width:100%;flex:1 1 100%}}
 `;document.head.append(style);
 const btn=document.createElement('button');btn.id='dw-paylink-launch';btn.type='button';btn.textContent='Payment Links & FX';btn.setAttribute('aria-pressed','false');toolsBar().append(btn);
 const pane=document.createElement('section');pane.id='dw-paylink-pane';pane.hidden=true;
 pane.innerHTML=`<div class="dw-pay-row"><h2>Payment links & currencies</h2><button id="dw-pay-close" type="button">Close</button></div>
 <div class="dw-pay-row"><label>Tracker<select id="dw-pay-tracker"></select></label><button class="dw-pay-primary" id="dw-pay-requests-tab" type="button">Payment requests</button><button id="dw-pay-fx-tab" type="button">Currency calculator</button></div>
 <section id="dw-pay-request-section"><p>Generate an expiring, shareable payment request. The link does not process or confirm payments. Never include sensitive details in the public note.</p>
 <form id="dw-pay-new"><div class="dw-pay-row"><label>Amount in tracker currency<input name="amount" type="number" min=".01" step=".01" max="99999999" required></label><label>Public note<input name="note" maxlength="120" placeholder="Dinner reimbursement"></label></div><button class="dw-pay-primary" type="submit">Create payment link</button></form>
 <div id="dw-pay-created" class="dw-pay-card" hidden><strong>Ready to share</strong><p id="dw-pay-link-url"></p><div id="dw-pay-qrcode" class="dw-pay-qr" aria-label="Payment request QR code"></div><button type="button" id="dw-pay-copy">Copy link</button></div>
 <div id="dw-pay-list"></div></section>
 <section id="dw-pay-fx-section" hidden><p>Exchange-rate estimates are informative and do not change existing tracker balances.</p>
 <form id="dw-pay-fx-form"><div class="dw-pay-row"><label>Amount<input name="amount" type="number" min=".01" step=".01" max="99999999" required></label><label>From<select name="from"></select></label><label>To<select name="to"></select></label></div><button type="submit" class="dw-pay-primary">Get exchange rate</button></form><div class="dw-pay-card" id="dw-pay-quote" role="status" aria-live="polite"></div></section>
 <p id="dw-pay-status" class="dw-pay-status" role="status" aria-live="polite"></p>`;
 shell.append(pane);
 const $=id=>document.getElementById(id),api=(path,method,body)=>{if(typeof window.squareUpApi!=='function')throw Error('Sign in to use finance tools.');return window.squareUpApi(path,method,body)};
 const status=text=>{$('dw-pay-status').textContent=text||''};
 const fmt=(num,code)=>{try{return new Intl.NumberFormat(undefined,{style:'currency',currency:code}).format(Number(num))}catch{return String(num)+' '+code}};
 let mode='requests',link='',busy=false;
 const currencies=['USD','EUR','GBP','CAD','AUD','JPY','CHF','CNY','INR','MXN','BRL','KRW','SGD','HKD','NZD','SEK','NOK','DKK','ILS','ZAR'];
 for(const code of currencies)for(const name of ['from','to']){const option=document.createElement('option');option.value=code;option.textContent=code;$('dw-pay-fx-form').elements[name].append(option)}
 $('dw-pay-fx-form').elements.to.value='EUR';
 function setMode(next){
  mode=next;$('dw-pay-request-section').hidden=mode!=='requests';$('dw-pay-fx-section').hidden=mode!=='fx';
  $('dw-pay-requests-tab').classList.toggle('dw-pay-primary',mode==='requests');$('dw-pay-fx-tab').classList.toggle('dw-pay-primary',mode==='fx');if(mode==='requests')refresh();
 }
 $('dw-pay-requests-tab').onclick=()=>setMode('requests');$('dw-pay-fx-tab').onclick=()=>setMode('fx');
 $('dw-pay-close').onclick=()=>{pane.hidden=true;btn.setAttribute('aria-pressed','false');btn.focus()};
 tabs.addEventListener('click',event=>{if(event.target!==btn&&event.target.closest('button'))$('dw-pay-close').click()});
 async function loadTrackers(){
  const rows=await api('trackers');const select=$('dw-pay-tracker');select.replaceChildren();
  for(const tracker of Array.isArray(rows)?rows:[]){const option=document.createElement('option');option.value=tracker.id;option.textContent=tracker.name+' · '+(tracker.currency||'USD');select.append(option)}
 }
 async function refresh(){
  if(pane.hidden||mode!=='requests'||!$('dw-pay-tracker').value)return;
  const box=$('dw-pay-list');box.replaceChildren();
  try{
   const list=await api('finance-plus/payment-requests?tracker_id='+encodeURIComponent($('dw-pay-tracker').value));
   if(!list.length){const p=document.createElement('p');p.textContent='No payment links yet.';box.append(p)}
   for(const req of list){
    const card=document.createElement('div');card.className='dw-pay-card';
    const p=document.createElement('p');p.textContent=fmt(req.amount,req.currency)+' · '+(req.revoked_at?'Revoked':new Date(req.expires_at)<new Date()?'Expired':'Expires '+new Date(req.expires_at).toLocaleDateString());card.append(p);
    if(!req.revoked_at&&new Date(req.expires_at)>new Date()){
     const a=document.createElement('a');a.href='/pay/?token='+encodeURIComponent(req.token);a.target='_blank';a.rel='noopener noreferrer';a.textContent='Open request link';card.append(a);
     const revoke=document.createElement('button');revoke.type='button';revoke.textContent='Revoke link';
     revoke.onclick=async()=>{revoke.disabled=true;try{await api('finance-plus/payment-requests/revoke','POST',{tracker_id:req.tracker_id,id:req.id});await refresh()}catch(e){status(e.message)}finally{revoke.disabled=false}};card.append(revoke);
    }
    box.append(card);
   }
  }catch(e){status(e.message||'Could not load requests.')}
 }
 $('dw-pay-tracker').onchange=refresh;
 $('dw-pay-new').onsubmit=async function(event){
  event.preventDefault();if(busy)return;busy=true;const button=this.querySelector('[type=submit]');button.disabled=true;
  try{
   const created=await api('finance-plus/payment-requests','POST',{tracker_id:$('dw-pay-tracker').value,amount:Number(this.elements.amount.value),public_note:this.elements.note.value});
   link=created.url;$('dw-pay-created').hidden=false;$('dw-pay-link-url').textContent=link;
   const qr=$('dw-pay-qrcode');qr.replaceChildren();
   if(window.QRCode)new window.QRCode(qr,{text:link,width:176,height:176,correctLevel:window.QRCode.CorrectLevel.M});
   else{const note=document.createElement('p');note.textContent='QR generator unavailable. Copy the link instead.';qr.append(note)}
   this.reset();status('Request generated. Sharing the link reveals its amount and public note.');await refresh();
  }catch(e){status(e.message||'Could not generate request.')}finally{button.disabled=false;busy=false}
 };
 $('dw-pay-copy').onclick=async()=>{try{await navigator.clipboard.writeText(link);status('Link copied.')}catch{status('Copy the link shown above.')}};
 $('dw-pay-fx-form').onsubmit=async function(event){
  event.preventDefault();if(busy)return;busy=true;const button=this.querySelector('[type=submit]');button.disabled=true;
  try{
   const fields=this.elements;
   const data=await api('finance-plus/currency-quote?from='+encodeURIComponent(fields.from.value)+'&to='+encodeURIComponent(fields.to.value)+'&amount='+encodeURIComponent(fields.amount.value));
   $('dw-pay-quote').textContent=fmt(data.amount,data.from)+' ≈ '+fmt(data.converted,data.to)+' (1 '+data.from+' ≈ '+data.rate+' '+data.to+'). Rate as of '+(data.as_of||'latest provider update')+'. Estimate only.';
   status('');
  }catch(e){status(e.message||'Rate unavailable.')}finally{button.disabled=false;busy=false}
 };
 btn.onclick=async()=>{pane.hidden=!pane.hidden;btn.setAttribute('aria-pressed',String(!pane.hidden));if(pane.hidden)return;try{await loadTrackers();await refresh()}catch(e){status(e.message||'Could not load trackers.')}};
 // Weo financial context is off by default and must be explicitly selected.
 const ai=document.getElementById('sq-ai-window'),form=document.getElementById('sq-ai-form');
 if(ai&&form&&!document.getElementById('dw-weo-financial-context')){
  const label=document.createElement('label');label.id='dw-weo-finance-control';label.title='Only share recent personal transactions with Weo when you opt in for this conversation.';
  const input=document.createElement('input');input.type='checkbox';input.id='dw-weo-financial-context';input.checked=false;
  const text=document.createElement('span');text.textContent='Allow Weo to use my personal finance summary';label.append(input,text);
  form.before(label);
 }
})();
