/* DoWeo mobile Chats / New Message navy-and-white visual refresh.
 * Preserves the existing chat controller, recipient picker, and mobile dock.
 */
(() => {
  'use strict';
  if (!window.matchMedia || !document.getElementById) return;
  const media=window.matchMedia('(max-width:900px)');
  const css=`
@media(max-width:900px){
  /* The chat viewport is navy. Intentionally DO NOT recolor .sq-mobile-nav. */
  body.dw-chats-open #dw-chats{background:#071b32!important;color:#f8fbff!important}
  body.dw-chats-open #dw-chat-list{box-sizing:border-box;min-height:0;overflow-y:auto!important;overscroll-behavior:contain;padding:12px 15px 18px!important;background:#071b32!important;color:#f8fbff!important}
  body.dw-chats-open #dw-chat-list>header{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:3px 0 16px!important;background:transparent!important;border:0!important;padding:0!important}
  body.dw-chats-open #dw-chat-list>header h2{font-size:clamp(26px,7vw,36px)!important;font-weight:800!important;color:#fff!important;letter-spacing:-.035em;margin:0!important;text-shadow:none!important}
  body.dw-chats-open #dw-chat-compose{background:#35dfb8!important;color:#08243d!important;border:0!important;border-radius:15px!important;flex:none!important;width:49px!important;height:49px!important}
  body.dw-chats-open #dw-chat-query{display:block;width:100%;box-sizing:border-box;min-height:51px!important;padding:12px 16px 12px 47px!important;color:#10233c!important;background:#fff!important;border:1px solid #e1e7f0!important;border-radius:15px!important;font-size:16px!important;box-shadow:none!important;outline-offset:3px}
  body.dw-chats-open #dw-chat-query::placeholder{color:#69798c!important;opacity:1!important}
  body.dw-chats-open #dw-chat-list{position:relative}
  body.dw-chats-open #dw-chat-list::before{content:'';position:absolute;top:calc(12px + 82px);left:30px;width:18px;height:18px;pointer-events:none;z-index:2;background:no-repeat center/contain url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23132b46' stroke-width='2.6' stroke-linecap='round'%3E%3Ccircle cx='10.5' cy='10.5' r='6.5'/%3E%3Cpath d='m16 16 5 5'/%3E%3C/svg%3E")}
  body.dw-chats-open #dw-chat-list .dw-chat-filters{display:flex!important;gap:7px!important;flex-wrap:nowrap!important;margin:15px 0 24px!important;padding:0!important;overflow-x:auto;scrollbar-width:none;background:transparent!important}
  body.dw-chats-open #dw-chat-list .dw-chat-filters::-webkit-scrollbar{display:none}
  body.dw-chats-open #dw-chat-list .dw-chat-filters button{flex:0 0 auto!important;padding:9px 14px!important;min-height:40px!important;border:1px solid #e7ecf4!important;border-radius:22px!important;background:#fff!important;color:#102643!important;font-size:14px!important;font-weight:750!important;box-shadow:none!important}
  body.dw-chats-open #dw-chat-list .dw-chat-filters button[aria-pressed=true],body.dw-chats-open #dw-chat-list .dw-chat-filters button.dw-active{background:#34dfb7!important;color:#062238!important;border-color:#34dfb7!important}
  body.dw-chats-open #dw-chat-rows{display:flex!important;flex-direction:column!important;gap:9px!important;padding:0 0 16px!important;background:transparent!important}
  body.dw-chats-open #dw-chat-rows>button{display:flex;align-items:center;gap:12px;min-height:82px!important;width:100%;box-sizing:border-box;text-align:left;padding:11px 12px!important;border:1px solid #e2e8f0!important;border-radius:16px!important;background:#fff!important;color:#0a2240!important;box-shadow:none!important}
  body.dw-chats-open #dw-chat-rows>button[hidden]{display:none!important}
  body.dw-chats-open #dw-chat-rows>button>i{display:grid;place-items:center;flex:none;width:51px!important;height:51px!important;border-radius:15px!important;background:#d7faef!important;color:#072744!important;font-size:19px!important;font-weight:800!important;font-style:normal!important}
  body.dw-chats-open #dw-chat-rows>button[data-dw-kind=direct]>i{border-radius:50%!important;background:#376b86!important;color:white!important}
  body.dw-chats-open #dw-chat-rows>button>span{flex:1;min-width:0}
  body.dw-chats-open #dw-chat-rows>button>span>b{display:block;color:#0b213d!important;font-size:16px!important;line-height:1.3!important;font-weight:800!important}
  body.dw-chats-open #dw-chat-rows>button small{color:#53657c!important;font-size:12px!important}
  body.dw-chats-open #dw-chat-rows>button>span>small{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  body.dw-chats-open #dw-chat-rows>button>small{display:flex;align-items:flex-end;flex-direction:column;gap:5px;white-space:nowrap}
  body.dw-chats-open #dw-chat-rows>button em{display:grid;place-items:center;width:22px;height:22px;border-radius:50%;background:#31e3b8!important;color:#082f3c!important;font-size:12px!important;font-style:normal;font-weight:800}
  body.dw-chats-open #dw-chat-rows>.dw-chat-section-label{display:flex;align-items:center;gap:9px;margin:15px 2px 5px!important;color:#fff;font-size:18px;font-weight:800}
  body.dw-chats-open #dw-chat-rows>.dw-chat-section-label small{margin-left:auto;font-size:13px;color:#d1dce7;font-weight:600}
  body.dw-chats-open #dw-chat-rows>.dw-chat-section-label svg{width:21px;height:21px;stroke:currentColor;flex:none}
  body.dw-chats-open #dw-chat-list.choosing>header{margin-bottom:6px!important}
  body.dw-chats-open #dw-chat-list.choosing>header h2{font-size:clamp(23px,6vw,33px)!important;letter-spacing:-.025em}
  body.dw-chats-open #dw-chat-list.choosing::after{content:'Message a friend or someone from your trackers.';display:block;position:absolute;left:15px;right:15px;top:68px;text-align:center;color:#dbe5ef;font-size:14px;pointer-events:none}
  body.dw-chats-open #dw-chat-list.choosing #dw-chat-query{margin-top:49px!important}
  body.dw-chats-open #dw-chat-list.choosing::before{top:calc(12px + 82px + 49px)}
  body.dw-chats-open #dw-people-back{display:inline-flex!important;align-items:center;justify-content:center;align-self:flex-start;min-height:39px!important;background:#fff!important;color:#102643!important;border:0!important;border-radius:20px!important;padding:8px 16px!important;font-size:14px!important;font-weight:700!important;margin:12px 0 4px!important}
  body.dw-chats-open #dw-chat-list:not(.choosing) #dw-people-back{display:none!important}
  body.dw-chats-open .dw-people-switch{display:flex;gap:0;border-radius:15px;background:#fff;padding:4px;margin:14px 0 8px;overflow:hidden}
  body.dw-chats-open .dw-people-switch button{flex:1;min-width:0;padding:11px 7px;border:0;border-radius:12px;color:#102643;background:#fff;font-size:13px;font-weight:750}
  body.dw-chats-open .dw-people-switch button[aria-pressed=true]{background:#32dfb7;color:#08233a}
  body.dw-chats-open .dw-people-section-label{display:flex;justify-content:space-between;gap:10px;align-items:baseline;margin:15px 1px 1px;color:#fff;font-size:19px;font-weight:800}
  body.dw-chats-open .dw-people-section-label small{font-size:13px;color:#d1dce7;font-weight:500}
  /* All page-layout overrides stop at #dw-chat-list. Keep the existing
     dark navy .sq-mobile-nav and the message-thread screen untouched. */
}
`;
  const style=document.createElement('style');style.id='dw-mobile-chat-white-cards';style.textContent=css;document.head.appendChild(style);
  const iconGroup='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="8" r="3"/><path d="M3 20v-2c0-3 2-5 6-5s6 2 6 5v2H3Z"/><path d="M17 5a3 3 0 0 1 0 6M17 14c3 0 4 2 4 4v2h-4"/></svg>';
  const iconPerson='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="7" r="4"/><path d="M4 21v-2c0-4 3-6 8-6s8 2 8 6v2"/></svg>';
  let contacts=[],groups=[],friends=null,filter='all',peopleTab='all',observer=null,queued=false,loading=false,rawButtons=[],generation=0,renderKey='';
  const el=id=>document.getElementById(id);
  const nameOf=b=>b.querySelector('span>b')?.textContent?.trim()||'';
  const normal=s=>(s||'').trim().toLocaleLowerCase();
  async function resolveData(){
    try{
      if(typeof supabase==='undefined'||typeof api==='undefined')return;
      const results=await Promise.allSettled([supabase.rpc('dw_dm_directory'),api('trackers'),supabase.from('sq_friendships').select('user_low,user_high').eq('status','accepted')]);
      const c=results[0].status==='fulfilled'?results[0].value:null;
      if(Array.isArray(c?.data))contacts=c.data;
      if(results[1].status==='fulfilled'&&Array.isArray(results[1].value))groups=results[1].value;
      const f=results[2].status==='fulfilled'?results[2].value:null;
      if(Array.isArray(f?.data)){
        const mine=typeof currentUser==='undefined'?null:currentUser?.id;
        if(mine)friends=new Set(f.data.filter(row=>row.user_low===mine||row.user_high===mine).map(row=>row.user_low===mine?row.user_high:row.user_low));
      }
    }catch{}
    schedule();
  }
  function typesFor(buttons,choosing){
    const groupNames=groups.map(x=>normal(x.name));
    const dmNames=contacts.map(x=>normal(x.name));
    let seenGroup=new Map(),seenDM=new Map();
    return buttons.map(b=>{
      const n=normal(nameOf(b));
      if(choosing){
        const matches=contacts.filter(c=>normal(c.name)===n);
        const match=matches[seenDM.get(n)||0];
        seenDM.set(n,(seenDM.get(n)||0)+1);
        return match&&friends?.has(match.peer)?'friend':match&&friends?'tracker':'contact';
      }
      const hasGroup=groupNames.includes(n),hasDM=dmNames.includes(n);
      if(hasGroup&&(!hasDM||(seenGroup.get(n)||0)<groups.filter(g=>normal(g.name)===n).length)){seenGroup.set(n,(seenGroup.get(n)||0)+1);return 'group'}
      if(hasDM){seenDM.set(n,(seenDM.get(n)||0)+1);return 'direct'}
      return 'group';
    });
  }
  function heading(text,count,isDirect){
    const h=document.createElement('div');h.className='dw-chat-section-label';h.innerHTML=(isDirect?iconPerson:iconGroup);
    const label=document.createElement('span');label.textContent=text;h.append(label);
    const countEl=document.createElement('small');countEl.textContent=String(count);h.append(countEl);
    return h;
  }
  function chooseControls(list){
    let wrap=list.querySelector('.dw-people-switch');
    if(!wrap){wrap=document.createElement('div');wrap.className='dw-people-switch';wrap.setAttribute('role','group');wrap.setAttribute('aria-label','People category');const rows=el('dw-chat-rows');rows.before(wrap);for(const [key,label] of [['all','All'],['friend','Friends'],['tracker','Shared Trackers']]){const b=document.createElement('button');b.type='button';b.dataset.peopleTab=key;b.textContent=label;b.addEventListener('click',()=>{peopleTab=key;paint();});wrap.append(b)}}
    wrap.hidden=!list.classList.contains('choosing');
    for(const b of wrap.querySelectorAll('button'))b.setAttribute('aria-pressed',String(b.dataset.peopleTab===peopleTab));
  }
  function paint(){
    if(loading||!media.matches)return;
    const list=el('dw-chat-list'),rows=el('dw-chat-rows');if(!list||!rows)return;
    loading=true;
    try{
      const choosing=list.classList.contains('choosing');
      const liveButtons=[...rows.children].filter(el=>el.tagName==='BUTTON');
      if(!liveButtons.length&&!rows.querySelector('.dw-chat-section-label,.dw-people-section-label')){rawButtons=[];renderKey='';return}
      if(liveButtons.some(b=>!b.dataset.dwKind)){rawButtons=liveButtons;generation++}
      const buttons=rawButtons.length?rawButtons:liveButtons;
      const nextKey=[generation,choosing,filter,peopleTab,contacts.length,groups.length,friends?.size??'unknown'].join(':');
      if(renderKey===nextKey)return;
      renderKey=nextKey;
      const types=typesFor(buttons,choosing);
      chooseControls(list);
      if(!choosing){
        const tabs=list.querySelector('.dw-chat-filters');
        if(tabs&&!tabs.querySelector('[data-dw-chat-filter]')){
          for(const [key,label] of [['group','Groups'],['direct','Direct']]){
            const b=document.createElement('button');b.type='button';b.dataset.dwChatFilter=key;b.textContent=label;
            b.addEventListener('click',()=>{const next=filter===key?'all':key;tabs.querySelector('button')?.click();filter=next;paint();});
            tabs.append(b);
          }
          tabs.querySelectorAll('button:not([data-dw-chat-filter])').forEach(b=>b.addEventListener('click',()=>{filter='all';schedule();}));
        }
        tabs?.querySelectorAll('[data-dw-chat-filter]').forEach(b=>b.setAttribute('aria-pressed',String(filter===b.dataset.dwChatFilter)));
      }
      const content=document.createDocumentFragment();
      const visible=buttons.map((b,i)=>({b,kind:types[i]})).filter(({kind})=>choosing?(peopleTab==='all'||friends===null||peopleTab===kind):(filter==='all'||filter===kind));
      if(choosing){
        if(friends===null){
          const h=heading('People you can message',visible.length,true);h.className='dw-people-section-label';h.replaceChildren('People you can message');const cnt=document.createElement('small');cnt.textContent=visible.length+' contacts';h.append(cnt);content.append(h);
        }else if(peopleTab==='all'){
          for(const [kind,label] of [['friend','Friends'],['tracker','Shared Trackers']]){
            const subset=visible.filter(x=>x.kind===kind);
            if(!subset.length)continue;
            const h=document.createElement('div');h.className='dw-people-section-label';h.textContent=label;const c=document.createElement('small');c.textContent=subset.length+' people';h.append(c);content.append(h);
            for(const x of subset)content.append(x.b);
          }
        }else{
          const h=document.createElement('div');h.className='dw-people-section-label';h.textContent=peopleTab==='friend'?'Friends':'Shared Trackers';const c=document.createElement('small');c.textContent=visible.length+' people';h.append(c);content.append(h);
          for(const x of visible)content.append(x.b);
        }
      }else if(filter==='all'){
        for(const [kind,label] of [['group','Group Chats'],['direct','Direct Messages']]){
          const subset=visible.filter(x=>x.kind===kind);
          if(!subset.length)continue;
          content.append(heading(label,subset.length,kind==='direct'));
          for(const x of subset)content.append(x.b);
        }
      }else{
        if(visible.length)content.append(heading(filter==='group'?'Group Chats':'Direct Messages',visible.length,filter==='direct'));
        for(const x of visible)content.append(x.b);
      }
      if(!visible.length&&buttons.length){const empty=document.createElement('p');empty.textContent='No matching conversations.';empty.style.cssText='color:#e5edf5;padding:12px';content.append(empty)}
      if(buttons.length){rows.replaceChildren(content);for(const {b,kind} of visible)b.dataset.dwKind=kind;}
    }finally{loading=false}
  }
  function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;paint()})}
  function start(){
    const list=el('dw-chat-list'),rows=el('dw-chat-rows');
    if(!list||!rows)return;
    observer=new MutationObserver(mutations=>{if(mutations.some(m=>[...m.addedNodes].some(n=>n.nodeType===1&&n.matches?.('button:not([data-dw-kind])'))))schedule();});
    observer.observe(rows,{childList:true});
    observer.observe(list,{attributes:true,attributeFilter:['class']});
    media.addEventListener?.('change',schedule);
    el('dw-chat-compose')?.addEventListener('click',()=>{peopleTab='all';schedule()});
    el('dw-people-back')?.addEventListener('click',()=>{filter='all';schedule()});
    resolveData();schedule();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
