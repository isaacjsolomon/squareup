(function(){
'use strict';
const wrap=document.querySelector('body > .wrap');
const sheet=document.getElementById('sq-mobile-more-sheet');
if(!wrap||!sheet)return;
const small=()=>matchMedia('(max-width:900px)').matches;
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
sheet.addEventListener('click',e=>{
 if(!small())return;
 const target=e.target.closest('[data-sq-destination]');
 if(target?.dataset.sqDestination==='nav-privacy-terms'||e.target.closest('[data-sq-social-open]')){
  e.preventDefault();e.stopImmediatePropagation();open(target?'legal':'social');return;
 }
 if(target){close();requestAnimationFrame(()=>scrollTo(0,0))}
},true);
document.addEventListener('click',e=>{
 if(!small())return;
 const button=e.target.closest('.sq-mobile-nav button, #nav-home, #nav-trackers, #nav-profile, #nav-about, #nav-analytics, #sqev-nav, #sq-mobile-notifications, #sq-mobile-more');
 if(button){close();if(button.id==='sq-mobile-more')removeFinance()}
},true);
matchMedia('(max-width:900px)').addEventListener('change',e=>{if(!e.matches)close()});
})();
