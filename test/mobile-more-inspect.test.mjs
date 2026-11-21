import test from 'node:test';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
test('inspect current mobile More routing and page containers before changing navigation',()=>{
 const ids=['sq-mobile-more-sheet','sq-mobile-more-logout','sq-mobile-more','sq-balanced-mobile-script','doweo-grouped-navigation-init-20261108','nav-profile','nav-about','nav-privacy-terms','sq-mobile-notifications','sqev-nav','nav-analytics','nav-chat','nav-friends','settings-page','settings-content-profile','about-page','privacy-terms-page','notifications-page','sqev-page','analytics-page','tracker-dashboard','nav-home'];
 for(const id of ids){
  const k=html.indexOf('id="'+id+'"');
  console.log('MOBILE_MORE_INSPECT',id,'position',k,'context',k>=0?html.slice(Math.max(0,k-350),k+1050).replace(/\s+/g,' '):'absent');
 }
 const a=html.indexOf('<script id="doweo-grouped-navigation-init-20261108"');
 console.log('GROUPED_NAV_SCRIPT',html.slice(a,a+12500));
 const b=html.indexOf('<script id="sq-balanced-mobile-script"');
 console.log('BALANCED_MOBILE_SCRIPT',html.slice(b,b+10500));
 const patterns=['sq-balanced-more-grid','data-sq-destination','mobile-more-sheet','function showPage','function showSection','classList.add(\'settings-view\')','function switchView'];
 for(const p of patterns){let n=0,i=-1;while((i=html.indexOf(p,i+1))>=0&&n<6){console.log('FIND',p,i,html.slice(Math.max(0,i-130),i+340).replace(/\s+/g,' '));n++}}
});
