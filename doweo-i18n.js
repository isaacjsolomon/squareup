/* DoWeo language preferences, Phase 1. No financial data is translated or modified. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.DoWeoI18n=api;
  if(root&&root.document)api.init(root);
})(typeof globalThis!=='undefined'?globalThis:null,function(){
  'use strict';
  const KEY='doweo-language-preference-v1';
  const SUPPORTED=Object.freeze(['en','es','fr','he','zh-Hans','pt','de','it','ja','ar','ko','hi']);
  const NAMES=Object.freeze({'en':'English','es':'Español','fr':'Français','he':'עברית','zh-Hans':'简体中文','pt':'Português','de':'Deutsch','it':'Italiano','ja':'日本語','ar':'العربية','ko':'한국어','hi':'हिन्दी'});
  const RTL=new Set(['he','ar']);
  const strings=Object.freeze({
    en:{language:'Language',auto:'Automatic (browser language)',hint:'Choose a language. More translations are coming soon.',saved:'Language preference saved.',welcome:'Welcome to DoWeo!',continue:'Continue to DoWeo'},
    es:{language:'Idioma',auto:'Automático (idioma del navegador)',hint:'Elige un idioma. Pronto habrá más traducciones.',saved:'Preferencia de idioma guardada.',welcome:'¡Bienvenido a DoWeo!',continue:'Continuar a DoWeo'},
    fr:{language:'Langue',auto:'Automatique (langue du navigateur)',hint:'Choisissez une langue. D’autres traductions arrivent bientôt.',saved:'Préférence de langue enregistrée.',welcome:'Bienvenue sur DoWeo !',continue:'Continuer vers DoWeo'}
  });
  function normalize(tag){
    if(typeof tag!=='string')return null;
    const value=tag.trim().replace(/_/g,'-').toLowerCase();
    if(!value)return null;
    const base=value.split('-')[0];
    if(base==='zh')return 'zh-Hans';
    if(base==='iw')return 'he';
    return SUPPORTED.includes(base)?base:null;
  }
  function detect(languages){
    for(const lang of languages||[]){const value=normalize(lang);if(value)return value;}
    return 'en';
  }
  function read(win){
    try{const raw=win.localStorage.getItem(KEY);return raw==='auto'?'auto':normalize(raw);}
    catch(_){return null;}
  }
  function resolve(win){
    const preference=read(win);
    const browser=win.navigator||{};
    return preference&&preference!=='auto'?preference:detect(browser.languages||[browser.language]);
  }
  function t(lang,key){
    return (strings[lang]&&strings[lang][key])||strings.en[key]||key;
  }
  function apply(win){
    const lang=resolve(win);
    win.document.documentElement.lang=lang;
    // Direction on language controls only until all legacy layouts are RTL-tested.
    win.document.querySelectorAll('[data-dw-language-scope]').forEach(el=>el.dir=RTL.has(lang)?'rtl':'ltr');
    win.document.querySelectorAll('[data-dw-language-title]').forEach(el=>el.textContent=t(lang,'language'));
    win.document.querySelectorAll('[data-dw-language-hint]').forEach(el=>el.textContent=t(lang,'hint'));
    win.document.querySelectorAll('[data-dw-language-select]').forEach(el=>{
      el.value=read(win)||'auto';
      const auto=el.querySelector('option[value="auto"]');
      if(auto)auto.textContent=t(lang,'auto');
    });
    win.document.dispatchEvent(new win.Event('doweo:languagechange',{bubbles:false}));
    return lang;
  }
  function set(win,choice){
    if(choice!=='auto'&&!SUPPORTED.includes(choice))throw new RangeError('Unsupported language');
    try{win.localStorage.setItem(KEY,choice);}catch(_){}
    return apply(win);
  }
  function init(win){
    if(!win.document)return;
    const start=()=>{
      apply(win);
      win.document.querySelectorAll('[data-dw-language-select]').forEach(el=>{
        if(el.dataset.dwLanguageBound)return;
        el.dataset.dwLanguageBound='true';
        el.addEventListener('change',()=>set(win,el.value));
      });
    };
    if(win.document.readyState==='loading')win.document.addEventListener('DOMContentLoaded',start,{once:true});
    else start();
  }
  return Object.freeze({SUPPORTED,NAMES,KEY,normalize,detect,resolve,t,read,apply,set,init});
});
