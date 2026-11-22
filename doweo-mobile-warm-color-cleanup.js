/* Mobile-only color correction for legacy and dynamically injected surfaces.
   Converts warm yellow/beige computed fills; respects photos, tracker wallpapers,
   mint controls, desktop, and application event handlers. */
(()=>{
'use strict';
const media=window.matchMedia('(max-width:900px)');
const NAVY='#142f49', LINE='#46667b', INK='#eaf4fb';
const exclusions='svg,svg *,img,canvas,video,picture,option,[id="backdrop"],[class*="wallpaper"],[class*="backdrop"],[class*="photo"],[class*="avatar"],[class*="banner"],[class*="logo"],[class*="icon"]';
const parse=(s)=>{
  const m=s&&s.match(/^rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/i);
  return m?[+m[1],+m[2],+m[3]]:null;
};
const warm=(c)=>{
  if(!c)return false;
  const [r,g,b]=c;
  // Cream, tan, khaki, pale gold and beige. Excludes cyan/mint/blue.
  return r>=150&&g>=112&&r>=g&&g>=b+7&&r>=b+16&&
    ((r-g)<=90 || (r>=215&&g>=145))&&!(g>r);
};
let queued=false, working=false;
function repaint(){
  queued=false;
  if(!media.matches||working||!document.body)return;
  working=true;
  try {
    for(const el of document.body.querySelectorAll('*')){
      if(el.matches(exclusions)||el.closest('[id="backdrop"],[class*="wallpaper"],[class*="backdrop"],[class*="photo"],[class*="avatar"]'))continue;
      const rect=el.getBoundingClientRect();
      if(rect.width<26||rect.height<16||rect.bottom<0||rect.top>innerHeight+250)continue;
      const cs=getComputedStyle(el);
      if(cs.backgroundImage&&cs.backgroundImage.includes('url('))continue;
      if(warm(parse(cs.backgroundColor))){
        if(el.style.getPropertyValue('background-color')!==NAVY)el.style.setProperty('background-color',NAVY,'important');
        if(cs.backgroundImage&&cs.backgroundImage!=='none'&&/gradient\(/i.test(cs.backgroundImage))el.style.setProperty('background-image','none','important');
        if(el.children.length===0&&warm(parse(cs.color)))el.style.setProperty('color',INK,'important');
      }
      // Beige gradient fills do not expose a beige background-color.
      const gradient=cs.backgroundImage;
      if(gradient&&gradient!=='none'&&/gradient\(/i.test(gradient)&&!el.hasAttribute('data-dw-warm-fixed')){
        const stops=[...gradient.matchAll(/rgba?\([^)]*\)/gi)].map(x=>parse(x[0]));
        if(stops.some(warm)&&rect.width>65&&rect.height>28){
          el.style.setProperty('background-image','none','important');
          el.style.setProperty('background-color',NAVY,'important');
          el.dataset.dwWarmFixed='1';
        }
      }
    }
  }finally{working=false;}
}
function schedule(){
  if(queued||!media.matches)return;
  queued=true;
  requestAnimationFrame(repaint);
}
function start(){
  if(!document.body)return;
  schedule();
  const obs=new MutationObserver(schedule);
  obs.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','hidden','style']});
  document.addEventListener('click',schedule,{passive:true,capture:true});
  window.addEventListener('pageshow',schedule);
  window.addEventListener('resize',schedule,{passive:true});
  media.addEventListener('change',schedule);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
