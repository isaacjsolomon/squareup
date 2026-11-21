(function(){
'use strict';
const wrap=document.querySelector('body > .wrap');
const sheet=document.getElementById('sq-mobile-more-sheet');
if(!wrap||!sheet)return;
const small=()=>matchMedia('(max-width:900px)').matches;
const dashboard=document.getElementById('tracker-dashboard');
const standaloneViews=['settings-view','about-view','analytics-view','notifications-view','sqev-page-open','friends-view','help-view','sq-help-view','chat-view','dw-mobile-legal-view','dw-mobile-social-view','dw-mobile-more-workspace-open'];
let savedDisplay=null;
function syncVisibility(){
 if(!dashboard)return;
 const isolated=small()&&standaloneViews.some(name=>document.body.classList.contains(name));
 if(isolated){
  if(!savedDisplay)savedDisplay={value:dashboard.style.getPropertyValue('display'),priority:dashboard.style.getPropertyPriority('display')};
  if(dashboard.style.getPropertyValue('display')!=='none'||dashboard.style.getPropertyPriority('display')!=='important')
   dashboard.style.setProperty('display','none','important');
 }else if(savedDisplay){
  if(savedDisplay.value)dashboard.style.setProperty('display',savedDisplay.value,savedDisplay.priority);
  else dashboard.style.removeProperty('display');
  savedDisplay=null;
 }
}
// Existing Home CSS can force the tracker visible even in unrelated views.
// This route-aware guard wins over that rule without affecting desktop.
if(dashboard){
 const observer=new MutationObserver(syncVisibility);
 observer.observe(document.body,{attributes:true,attributeFilter:['class']});
 observer.observe(dashboard,{attributes:true,attributeFilter:['style']});
 syncVisibility();
}

function panel(id,title){
 const el=document.createElement('section');el.id=id;el.className='dw-mobile-more-page';el.hidden=true;el.setAttribute('aria-label',title);
 const back=document.createElement('button');back.type='button';back.className='dw-mobile-more-back';back.textContent='← Back';
 back.onclick=()=>{close();document.getElementById('sq-mobile-more')?.click()};
 const h=document.createElement('h1');h.textContent=title;h.tabIndex=-1;
 const items=document.createElement('div');items.className='dw-mobile-more-page-card';el.append(back,h,items);wrap.append(el);
 return {el,h,items};
}
const legal=panel('dw-mobile-legal-page','Privacy and Terms');
const social=panel('dw-mobile-social-page','Social');
for(const [name,url] of [['Privacy Policy','/privacy/'],['Terms of Service','/terms/']]){
 const a=document.createElement('a');a.href=url;a.textContent=name;legal.items.append(a);
}
for(const [name,id] of [['Friends','nav-friends'],['Chat','nav-chat']]){
 const button=document.createElement('button');button.type='button';button.textContent=name;
 button.onclick=()=>{close();document.getElementById(id)?.click();requestAnimationFrame(()=>scrollTo(0,0))};
 social.items.append(button);
}
function removeFinance(){sheet.querySelectorAll('[data-sq-destination="sq-finance-nav"]').forEach(el=>el.remove())}


/* iOS Safari cannot invoke the native Add to Home Screen action from JavaScript.
   Offer the real Safari steps in mobile More without changing the 4x2 tile grid. */
const iosSafari=()=>{
 const ua=navigator.userAgent||'';
 const ios=/iPad|iPhone|iPod/.test(ua)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
 return ios&&/Version\//.test(ua)&&/Safari\//.test(ua)&&!/CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo|GSA\//.test(ua);
};
const installed=()=>matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
let installCTA=null,installOverlay=null,installClose=null,installDone=null,installReturnFocus=null;
function closeInstallGuide(){
 if(!installOverlay||installOverlay.hidden)return;
 installOverlay.hidden=true;
 if(installReturnFocus?.isConnected&&!installReturnFocus.hidden)installReturnFocus.focus({preventScroll:true});
 installReturnFocus=null;
}
function ensureInstallButton(){
 if(!iosSafari())return;
 const layout=sheet.querySelector(':scope > .sq-balanced-sheet');
 const logout=layout?.querySelector('#sq-mobile-more-logout');
 if(!layout||!logout)return;
 if(!installCTA){
  installCTA=document.createElement('button');
  installCTA.id='dw-ios-install-trigger';
  installCTA.type='button';
  installCTA.className='dw-ios-install-trigger';
  const icon=document.createElementNS('http://www.w3.org/2000/svg','svg');
  for(const [key,value] of Object.entries({viewBox:'0 0 24 24',fill:'none',stroke:'currentColor','stroke-width':'2','stroke-linecap':'round','stroke-linejoin':'round','aria-hidden':'true'}))icon.setAttribute(key,value);
  const outline=document.createElementNS('http://www.w3.org/2000/svg','path');
  outline.setAttribute('d','M12 16V3m-5 5 5-5 5 5M5 13v7h14v-7');
  icon.append(outline);
  const labels=document.createElement('span');
  labels.className='dw-ios-install-labels';
  const title=document.createElement('strong');title.textContent='Add to Home Screen';
  const subtitle=document.createElement('small');subtitle.textContent='Keep DoWeo one tap away';
  labels.append(title,subtitle);
  const chevron=document.createElement('span');chevron.className='dw-ios-install-chevron';chevron.textContent='›';chevron.setAttribute('aria-hidden','true');
  installCTA.append(icon,labels,chevron);
  logout.before(installCTA);

  installOverlay=document.createElement('div');
  installOverlay.id='dw-ios-install-guide';
  installOverlay.className='dw-ios-install-overlay';
  installOverlay.hidden=true;
  const dialog=document.createElement('section');
  dialog.className='dw-ios-install-dialog';
  dialog.setAttribute('role','dialog');
  dialog.setAttribute('aria-modal','true');
  dialog.setAttribute('aria-labelledby','dw-ios-install-title');
  dialog.setAttribute('aria-describedby','dw-ios-install-description');
  installClose=document.createElement('button');
  installClose.type='button';
  installClose.className='dw-ios-install-close';
  installClose.setAttribute('aria-label','Close guide');
  installClose.textContent='×';
  const heading=document.createElement('h2');heading.id='dw-ios-install-title';heading.textContent='Add DoWeo to Home Screen';
  const description=document.createElement('p');description.id='dw-ios-install-description';description.textContent='Safari needs a few taps to install DoWeo as an app.';
  const steps=document.createElement('ol');steps.className='dw-ios-install-steps';
  for(const value of [
   'Tap Safari’s Share button. If it is inside the page menu, open that menu and tap Share.',
   'Scroll down and select Add to Home Screen.',
   'Keep Open as Web App turned on, if shown, then tap Add.'
  ]){
   const item=document.createElement('li');item.textContent=value;steps.append(item);
  }
  const note=document.createElement('p');note.className='dw-ios-install-note';
  note.textContent='Apple requires these steps; websites cannot install themselves automatically.';
  installDone=document.createElement('button');
  installDone.type='button';installDone.className='dw-ios-install-done';installDone.textContent='Got it';
  dialog.append(installClose,heading,description,steps,note,installDone);
  installOverlay.append(dialog);document.body.append(installOverlay);
  installCTA.addEventListener('click',()=>{
   if(installCTA.hidden)return;
   installReturnFocus=document.activeElement;
   installOverlay.hidden=false;
   installClose.focus({preventScroll:true});
   document.dispatchEvent(new Event('doweo:uiupdated'));
  });
  installClose.addEventListener('click',closeInstallGuide);
  installDone.addEventListener('click',closeInstallGuide);
  installOverlay.addEventListener('click',event=>{if(event.target===installOverlay)closeInstallGuide()});
  document.addEventListener('keydown',event=>{
   if(installOverlay.hidden)return;
   if(event.key==='Escape'){event.preventDefault();closeInstallGuide();return;}
   if(event.key==='Tab'){
    if(event.shiftKey&&document.activeElement===installClose){event.preventDefault();installDone.focus()}
    else if(!event.shiftKey&&document.activeElement===installDone){event.preventDefault();installClose.focus()}
   }
  });
 }
 installCTA.hidden=!small()||installed();
 if(installCTA.hidden)closeInstallGuide();
}
window.addEventListener('pageshow',ensureInstallButton);

function buildMoreGrid(){
 const grid=sheet.querySelector(':scope .sq-balanced-sheet > .sq-balanced-more-grid');
 if(!grid)return;
 // Notifications remain available from the persistent top-right bell.
 grid.querySelectorAll('[data-sq-destination="sq-mobile-notifications"],[data-sq-destination="sq-finance-nav"]').forEach(el=>el.remove());
 const svgNS='http://www.w3.org/2000/svg';
 const makeTile=(id,label,shape)=>{
  let tile=grid.querySelector('[data-sq-destination="'+id+'"]');
  if(tile)return tile;
  tile=document.createElement('button');
  tile.type='button';tile.dataset.sqDestination=id;
  const icon=document.createElement('span');icon.className='sq-balanced-icon';
  const svg=document.createElementNS(svgNS,'svg');
  for(const [name,value] of Object.entries({viewBox:'0 0 24 24',fill:'none',stroke:'currentColor','stroke-width':'1.9','stroke-linecap':'round','stroke-linejoin':'round','aria-hidden':'true'}))svg.setAttribute(name,value);
  for(const part of shape){
   const node=document.createElementNS(svgNS,part[0]);
   for(const [name,value] of Object.entries(part[1]))node.setAttribute(name,value);
   svg.append(node);
  }
  icon.append(svg);
  const title=document.createElement('strong');title.textContent=label;
  tile.append(icon,title);grid.append(tile);
  return tile;
 };
 makeTile('dw-mobile-trips','Trips',[
   ['rect',{x:'5',y:'6',width:'14',height:'16',rx:'2'}],
   ['path',{d:'M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M9 10v8m6-8v8M5 14h14'}]
 ]);
 makeTile('dw-mobile-households','Households',[
   ['path',{d:'m3 11 9-8 9 8v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z'}],
   ['path',{d:'M9 21v-8h6v8'}]
 ]);
 // Keep the original two columns and exactly four rows.
 for(const selector of [
   '[data-sq-social-open]',
   '[data-sq-destination="sqev-nav"]',
   '[data-sq-destination="dw-mobile-trips"]',
   '[data-sq-destination="dw-mobile-households"]',
   '[data-sq-destination="nav-analytics"]',
   '[data-sq-destination="nav-profile"]',
   '[data-sq-destination="nav-about"]',
   '[data-sq-destination="nav-privacy-terms"]'
 ]){
  const tile=grid.querySelector(':scope > '+selector);
  if(tile)grid.append(tile);
 }
}
function closeWorkspacePage(){
 document.body.classList.remove('dw-mobile-more-workspace-open');
 const hub=document.getElementById('sq-nextgen');
 if(!hub)return;
 hub.removeAttribute('data-dw-mobile-more-workspace');
 const back=hub.querySelector('#sq-ng-back');
 if(back){
  back.setAttribute('aria-label','Back to Home');
  const label=back.querySelector('span');if(label)label.textContent='Home';
 }
}
function openWorkspacePage(which){
 if(!small())return;
 const openHub=window.squareUpOpenFinanceHub;
 if(typeof openHub!=='function')return;
 close();
 sheet.hidden=true;
 sheet.querySelector('#sq-mobile-social-options')?.setAttribute('hidden','');
 const grid=sheet.querySelector(':scope .sq-balanced-sheet > .sq-balanced-more-grid');
 if(grid)grid.hidden=false;
 document.body.classList.remove('sq-balanced-sheet-open');
 // Reuse the actual Trip/Household workspace, records and event handlers.
 openHub(which);
 const hub=document.getElementById('sq-nextgen');
 if(!hub)return;
 hub.dataset.dwMobileMoreWorkspace=which;
 document.body.classList.add('dw-mobile-more-workspace-open');
 const title=hub.querySelector('#sq-ng-title');
 if(title)title.textContent=which==='trip'?'Trips':'Households';
 const kicker=hub.querySelector('.sq-ng-kicker');
 if(kicker)kicker.textContent='DOWEO / TRACKERS';
 const back=hub.querySelector('#sq-ng-back');
 if(back){
  back.setAttribute('aria-label','Back to More');
  const label=back.querySelector('span');if(label)label.textContent='More';
 }
 hub.scrollTop=0;
 document.dispatchEvent(new Event('doweo:uiupdated'));
}

function close(){legal.el.hidden=true;social.el.hidden=true;document.body.classList.remove('dw-mobile-legal-view','dw-mobile-social-view')}
function open(which){
 if(!small())return;
 close();
 sheet.hidden=true;document.body.classList.remove('sq-balanced-sheet-open');
 sheet.querySelector('#sq-mobile-social-options')?.setAttribute('hidden','');
 const grid=sheet.querySelector(':scope .sq-balanced-sheet > .sq-balanced-more-grid');if(grid)grid.hidden=false;
 const page=which==='legal'?legal:social;
 page.el.hidden=false;document.body.classList.add(which==='legal'?'dw-mobile-legal-view':'dw-mobile-social-view');
 scrollTo(0,0);requestAnimationFrame(()=>{scrollTo(0,0);page.h.focus({preventScroll:true});document.dispatchEvent(new Event('doweo:uiupdated'))});
}
removeFinance();
buildMoreGrid();
ensureInstallButton();
sheet.addEventListener('click',e=>{
 if(!small())return;
 const target=e.target.closest('[data-sq-destination]');
 if(target&&['dw-mobile-trips','dw-mobile-households'].includes(target.dataset.sqDestination)){
  e.preventDefault();e.stopImmediatePropagation();
  openWorkspacePage(target.dataset.sqDestination==='dw-mobile-trips'?'trip':'home');
  return;
 }
 if(target?.dataset.sqDestination==='nav-privacy-terms'||e.target.closest('[data-sq-social-open]')){
  e.preventDefault();e.stopImmediatePropagation();open(target?'legal':'social');return;
 }
 if(target){close();requestAnimationFrame(()=>scrollTo(0,0))}
},true);
document.addEventListener('click',e=>{
 if(!small())return;
 const button=e.target.closest('.sq-mobile-nav button, #nav-home, #nav-trackers, #nav-profile, #nav-about, #nav-analytics, #sqev-nav, #sq-mobile-notifications, #sq-mobile-more');
 if(button){
  if(document.body.classList.contains('dw-mobile-more-workspace-open')){
   closeWorkspacePage();
   document.getElementById('nav-home')?.click();
  }
  close();
  if(button.id==='sq-mobile-more'){removeFinance();buildMoreGrid();ensureInstallButton()}
 }
},true);
// Return to More, not to the retired Finance Hub, from either workspace.
document.getElementById('sq-ng-back')?.addEventListener('click',e=>{
 if(!small()||!document.body.classList.contains('dw-mobile-more-workspace-open'))return;
 e.preventDefault();e.stopImmediatePropagation();
 closeWorkspacePage();
 document.getElementById('nav-home')?.click();
 document.getElementById('sq-mobile-more')?.click();
},true);
matchMedia('(max-width:900px)').addEventListener('change',e=>{
 if(!e.matches){close();closeWorkspacePage()}
 ensureInstallButton();
 syncVisibility();
});
})();
