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
    en:{language:'Language',auto:'Automatic (browser language)',hint:'Choose the language used throughout DoWeo.',saved:'Language preference saved.',welcome:'Welcome to DoWeo!',continue:'Continue to DoWeo'},
    es:{language:'Idioma',auto:'Automático (idioma del navegador)',hint:'Elige el idioma que se utilizará en DoWeo.',saved:'Preferencia de idioma guardada.',welcome:'¡Bienvenido a DoWeo!',continue:'Continuar a DoWeo'},
    fr:{language:'Langue',auto:'Automatique (langue du navigateur)',hint:'Choisissez la langue utilisée dans DoWeo.',saved:'Préférence de langue enregistrée.',welcome:'Bienvenue sur DoWeo !',continue:'Continuer vers DoWeo'}
  });

  // The flags are visual country examples; languages may be used in many countries.
  const LANGUAGE_CHOICES=Object.freeze([
    {code:'en',flag:'🇺🇸',name:'English',subtitle:'English'},
    {code:'es',flag:'🇪🇸',name:'Español',subtitle:'Spanish'},
    {code:'fr',flag:'🇫🇷',name:'Français',subtitle:'French'},
    {code:'he',flag:'🇮🇱',name:'עברית',subtitle:'Hebrew'},
    {code:'zh-Hans',flag:'🇨🇳',name:'简体中文',subtitle:'Simplified Chinese'},
    {code:'pt',flag:'🇧🇷',name:'Português',subtitle:'Portuguese'},
    {code:'de',flag:'🇩🇪',name:'Deutsch',subtitle:'German'},
    {code:'it',flag:'🇮🇹',name:'Italiano',subtitle:'Italian'},
    {code:'ja',flag:'🇯🇵',name:'日本語',subtitle:'Japanese'},
    {code:'ar',flag:'🇸🇦',name:'العربية',subtitle:'Arabic'},
    {code:'ko',flag:'🇰🇷',name:'한국어',subtitle:'Korean'},
    {code:'hi',flag:'🇮🇳',name:'हिन्दी',subtitle:'Hindi'}
  ]);
  const PICKER_STYLES=`
  .dw-language-preference.dw-language-grid-mode{display:block!important;padding:0!important;border:0!important;background:transparent!important;margin:12px 0!important}
  .dw-language-grid-mode [data-dw-language-select]{display:none!important}
  .dw-language-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;width:100%;direction:ltr}
  .dw-language-grid label.dw-language-tile{display:flex!important;align-items:center;gap:10px;position:relative;min-width:0;min-height:66px;padding:10px 12px;border:1px solid #315269;border-radius:13px;background:#112b40;color:#eff8ff;cursor:pointer;transition:background .15s,border-color .15s,box-shadow .15s;box-sizing:border-box}
  .dw-language-grid label.dw-language-tile:hover{background:#183b4c;border-color:#60bea9}
  .dw-language-grid .dw-language-tile:has(input:checked){background:#133f45;border-color:#39e2c5;box-shadow:inset 0 0 0 1px #39e2c5}
  .dw-language-grid .dw-language-tile:has(input:focus-visible){outline:3px solid #77baff;outline-offset:3px}
  .dw-language-grid .dw-language-radio{position:absolute;opacity:0;width:1px;height:1px;pointer-events:none}
  .dw-language-grid .dw-language-flag{font-size:24px;line-height:1;flex:0 0 29px;display:inline-flex;justify-content:center}
  .dw-language-grid .dw-language-info{min-width:0;display:flex;flex:1;flex-direction:column;gap:3px;overflow-wrap:anywhere}
  .dw-language-grid .dw-language-native{font-size:14px;line-height:1.25;font-weight:700}
  .dw-language-grid .dw-language-english{font-size:11px;line-height:1.25;font-weight:400;color:#b6cbd8}
  .dw-language-grid .dw-language-check{flex:0 0 auto;font-size:17px;font-weight:800;color:#4ce4c7;visibility:hidden}
  .dw-language-grid .dw-language-tile:has(input:checked) .dw-language-check{visibility:visible}
  .dw-language-grid .dw-language-auto{grid-column:1/-1;min-height:61px!important}
  #settings-language-panel [data-dw-language-hint]{display:none!important}
  /* Account + Delete account share a balanced first row; Language uses full width. */
  html body #settings-content-account > .settings-tab-grid{
    display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;
    grid-template-rows:auto auto!important;align-items:stretch!important;gap:22px!important;
  }
  html body #settings-content-account > .settings-tab-grid > div:first-child{
    grid-column:1!important;grid-row:1!important;display:flex;min-width:0;
  }
  html body #settings-content-account > .settings-tab-grid > div:nth-child(3){
    grid-column:2!important;grid-row:1!important;display:flex;min-width:0;
  }
  html body #settings-content-account > .settings-tab-grid > div:nth-child(2){
    grid-column:1 / -1!important;grid-row:2!important;min-width:0;
  }
  html body #settings-content-account > .settings-tab-grid > div:first-child > .settings-panel,
  html body #settings-content-account > .settings-tab-grid > div:nth-child(3) > .settings-panel{
    flex:1 1 auto;box-sizing:border-box;min-width:0;margin:0!important;
  }
  html body #settings-language-panel{width:100%;box-sizing:border-box}
  html body #settings-language-panel .dw-language-grid{grid-template-columns:repeat(3,minmax(0,1fr));}
  @media(max-width:940px){
    html body #settings-language-panel .dw-language-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
  }
  @media(max-width:780px){
    html body #settings-content-account > .settings-tab-grid{grid-template-columns:minmax(0,1fr)!important;grid-template-rows:auto!important}
    html body #settings-content-account > .settings-tab-grid > div:first-child,
    html body #settings-content-account > .settings-tab-grid > div:nth-child(3),
    html body #settings-content-account > .settings-tab-grid > div:nth-child(2){
      grid-column:1!important;grid-row:auto!important;
    }
  }
  @media(max-width:330px){
    html body #settings-language-panel .dw-language-grid{grid-template-columns:1fr}
  }

  @media(max-width:430px){.dw-language-grid{gap:7px}.dw-language-grid label.dw-language-tile{padding:9px 8px;gap:6px;min-height:64px}.dw-language-grid .dw-language-flag{font-size:21px;flex-basis:25px}.dw-language-grid .dw-language-native{font-size:12px}.dw-language-grid .dw-language-english{font-size:10px}}
  @media(max-width:330px){.dw-language-grid{grid-template-columns:1fr}}
  `;
  function installPickerStyle(win){
    if(win.document.getElementById('dw-language-grid-style'))return;
    const style=win.document.createElement('style');
    style.id='dw-language-grid-style';style.textContent=PICKER_STYLES;
    (win.document.head||win.document.documentElement).appendChild(style);
  }
  function createLanguageGrid(win,select){
    const parent=select.closest('[data-dw-language-scope]');
    if(!parent||parent.querySelector('.dw-language-grid'))return;
    const doc=win.document;
    parent.classList.add('dw-language-grid-mode');
    const label=parent.querySelector('[data-dw-language-title]');
    if(label)label.hidden=true;
    const grid=doc.createElement('div');
    grid.className='dw-language-grid';
    grid.setAttribute('data-dw-language-grid','');
    grid.setAttribute('role','group');
    grid.setAttribute('aria-label',t(resolve(win),'language'));
    const groupName=select.id||'doweo-language';
    const options=[{code:'auto',flag:'🌐',name:t(resolve(win),'auto'),subtitle:''},...LANGUAGE_CHOICES];
    for(const option of options){
      const tile=doc.createElement('label');
      tile.className='dw-language-tile'+(option.code==='auto'?' dw-language-auto':'');
      const input=doc.createElement('input');
      input.type='radio';input.name=groupName+'-grid';input.value=option.code;
      input.className='dw-language-radio';
      input.setAttribute('aria-label',option.name);
      input.addEventListener('change',()=>{if(input.checked)set(win,input.value);});
      const flag=doc.createElement('span');flag.className='dw-language-flag';flag.textContent=option.flag;flag.setAttribute('aria-hidden','true');
      const info=doc.createElement('span');info.className='dw-language-info';
      const native=doc.createElement('span');native.className='dw-language-native';native.textContent=option.name;native.dir='auto';
      info.appendChild(native);
      if(option.subtitle&&option.subtitle!==option.name){
        const english=doc.createElement('span');english.className='dw-language-english';english.textContent=option.subtitle;
        info.appendChild(english);
      }
      const tick=doc.createElement('span');tick.className='dw-language-check';tick.textContent='✓';tick.setAttribute('aria-hidden','true');
      tile.append(input,flag,info,tick);grid.appendChild(tile);
    }
    select.insertAdjacentElement('afterend',grid);
  }
  function syncLanguageGrids(win){
    const selected=read(win)||'auto';
    win.document.querySelectorAll('.dw-language-grid').forEach(grid=>{
      grid.setAttribute('aria-label',t(resolve(win),'language'));
      grid.querySelectorAll('input[type="radio"]').forEach(input=>{
        input.checked=input.value===selected;
        if(input.value==='auto'){
          const label=input.closest('.dw-language-tile');
          const name=label?.querySelector('.dw-language-native');
          if(name)name.textContent=t(resolve(win),'auto');
          input.setAttribute('aria-label',t(resolve(win),'auto'));
        }
      });
    });
  }

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
    syncLanguageGrids(win);
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
      installPickerStyle(win);
      win.document.querySelectorAll('[data-dw-language-select]').forEach(el=>{
        if(el.dataset.dwLanguageBound)return;
        el.dataset.dwLanguageBound='true';
        el.addEventListener('change',()=>set(win,el.value));
        createLanguageGrid(win,el);
      });
      apply(win);
    };
    if(win.document.readyState==='loading')win.document.addEventListener('DOMContentLoaded',start,{once:true});
    else start();
  }
  return Object.freeze({SUPPORTED,NAMES,LANGUAGE_CHOICES,KEY,normalize,detect,resolve,t,read,apply,set,init});
});
