/* DoWeo language preferences, Phase 1. No financial data is translated or modified. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.DoWeoI18n=api;
  if(root&&root.document)api.init(root);
})(typeof globalThis!=='undefined'?globalThis:null,function(){
  'use strict';
  const KEY='doweo-language-preference-v1';
  const SUPPORTED=Object.freeze(['en','es','fr','he','he-script','zh-Hans','pt','de','it','ja','ar','ko','hi','ru','tr','vi','nl','pl','sv','bn']);
  const NAMES=Object.freeze({'en':'English','es':'Español','fr':'Français','he':'עברית','he-script':'עברית (כתב יד)','zh-Hans':'简体中文','pt':'Português','de':'Deutsch','it':'Italiano','ja':'日本語','ar':'العربية','ko':'한국어','hi':'हिन्दी','ru':'Русский','tr':'Türkçe','vi':'Tiếng Việt','nl':'Nederlands','pl':'Polski','sv':'Svenska','bn':'বাংলা'});
  const RTL=new Set(['he','ar']);
  const strings=Object.freeze({
    en:{language:'Language',auto:'Automatic (browser language)',hint:'Choose the language used throughout DoWeo.',saved:'Language preference saved.',welcome:'Welcome to DoWeo!',continue:'Continue to DoWeo'},
    es:{language:'Idioma',auto:'Automático (idioma del navegador)',hint:'Elige el idioma que se utilizará en DoWeo.',saved:'Preferencia de idioma guardada.',welcome:'¡Bienvenido a DoWeo!',continue:'Continuar a DoWeo'},
    fr:{language:'Langue',auto:'Automatique (langue du navigateur)',hint:'Choisissez la langue utilisée dans DoWeo.',saved:'Préférence de langue enregistrée.',welcome:'Bienvenue sur DoWeo !',continue:'Continuer vers DoWeo'},
    ru:{language:'Язык',auto:'Автоматически (язык браузера)',hint:'Выберите язык интерфейса DoWeo.',saved:'Язык сохранён.',welcome:'Добро пожаловать в DoWeo!',continue:'Перейти в DoWeo'},
    tr:{language:'Dil',auto:'Otomatik (tarayıcı dili)',hint:'DoWeo uygulamasının dilini seçin.',saved:'Dil tercihi kaydedildi.',welcome:'DoWeo’ya hoş geldiniz!',continue:'DoWeo’ya devam et'},
    vi:{language:'Ngôn ngữ',auto:'Tự động (ngôn ngữ trình duyệt)',hint:'Chọn ngôn ngữ sử dụng trong DoWeo.',saved:'Đã lưu tùy chọn ngôn ngữ.',welcome:'Chào mừng đến với DoWeo!',continue:'Tiếp tục vào DoWeo'},
    nl:{language:'Taal',auto:'Automatisch (browsertaal)',hint:'Kies de taal voor DoWeo.',saved:'Taalvoorkeur opgeslagen.',welcome:'Welkom bij DoWeo!',continue:'Verder naar DoWeo'},
    pl:{language:'Język',auto:'Automatycznie (język przeglądarki)',hint:'Wybierz język używany w DoWeo.',saved:'Zapisano preferencje językowe.',welcome:'Witaj w DoWeo!',continue:'Przejdź do DoWeo'},
    sv:{language:'Språk',auto:'Automatiskt (webbläsarens språk)',hint:'Välj språk för DoWeo.',saved:'Språkvalet har sparats.',welcome:'Välkommen till DoWeo!',continue:'Fortsätt till DoWeo'},
    bn:{language:'ভাষা',auto:'স্বয়ংক্রিয় (ব্রাউজারের ভাষা)',hint:'DoWeo-এর ভাষা বেছে নিন।',saved:'ভাষার পছন্দ সংরক্ষিত হয়েছে।',welcome:'DoWeo-তে স্বাগতম!',continue:'DoWeo-তে এগিয়ে যান'}
  });

  const DIALOG_LABELS=Object.freeze({"en":["Language","Close language selector"],"es":["Idioma","Cerrar selector de idioma"],"fr":["Langue","Fermer le sélecteur de langue"],"he":["שפה","סגירת בחירת שפה"],"zh-Hans":["语言","关闭语言选择器"],"pt":["Idioma","Fechar seletor de idioma"],"de":["Sprache","Sprachauswahl schließen"],"it":["Lingua","Chiudi selettore della lingua"],"ja":["言語","言語選択を閉じる"],"ar":["اللغة","إغلاق اختيار اللغة"],"ko":["언어","언어 선택 닫기"],"hi":["भाषा","भाषा चयन बंद करें"],"ru":["Язык","Закрыть выбор языка"],"tr":["Dil","Dil seçimini kapat"],"vi":["Ngôn ngữ","Đóng chọn ngôn ngữ"],"nl":["Taal","Taalkiezer sluiten"],"pl":["Język","Zamknij wybór języka"],"sv":["Språk","Stäng språkval"],"bn":["ভাষা","ভাষা নির্বাচন বন্ধ করুন"]});
  function dialogLabel(lang,index){return (DIALOG_LABELS[lang]||DIALOG_LABELS.en)[index];}
  // The flags are visual country examples; languages may be used in many countries.
  const LANGUAGE_CHOICES=Object.freeze([
    {code:'en',flag:'🇺🇸',name:'English',subtitle:'English'},
    {code:'es',flag:'🇪🇸',name:'Español',subtitle:'Spanish'},
    {code:'fr',flag:'🇫🇷',name:'Français',subtitle:'French'},
    {code:'zh-Hans',flag:'🇨🇳',name:'简体中文',subtitle:'Simplified Chinese'},
    {code:'pt',flag:'🇧🇷',name:'Português',subtitle:'Portuguese'},
    {code:'de',flag:'🇩🇪',name:'Deutsch',subtitle:'German'},
    {code:'it',flag:'🇮🇹',name:'Italiano',subtitle:'Italian'},
    {code:'ja',flag:'🇯🇵',name:'日本語',subtitle:'Japanese'},
    {code:'he-script',flag:'🇮🇱',name:'עברית (כתב יד)',subtitle:'Hebrew · Script'},
    {code:'he',flag:'🇮🇱',name:'עברית',subtitle:'Hebrew · Print'},
    {code:'ar',flag:'🇸🇦',name:'العربية',subtitle:'Arabic'},
    {code:'ko',flag:'🇰🇷',name:'한국어',subtitle:'Korean'},
    {code:'hi',flag:'🇮🇳',name:'हिन्दी',subtitle:'Hindi'},
    {code:'ru',flag:'🇷🇺',name:'Русский',subtitle:'Russian'},
    {code:'tr',flag:'🇹🇷',name:'Türkçe',subtitle:'Turkish'},
    {code:'vi',flag:'🇻🇳',name:'Tiếng Việt',subtitle:'Vietnamese'},
    {code:'nl',flag:'🇳🇱',name:'Nederlands',subtitle:'Dutch'},
    {code:'pl',flag:'🇵🇱',name:'Polski',subtitle:'Polish'},
    {code:'sv',flag:'🇸🇪',name:'Svenska',subtitle:'Swedish'},
    {code:'bn',flag:'🇧🇩',name:'বাংলা',subtitle:'Bengali'}
  ]);
  const PICKER_STYLES=`
  .dw-language-preference.dw-language-grid-mode{display:block!important;padding:0!important;border:0!important;background:transparent!important;margin:12px 0!important}
  .dw-language-grid-mode [data-dw-language-select]{display:none!important}

  .dw-language-grid-mode .dw-language-picker-toggle{display:flex;width:100%;min-height:66px;align-items:center;gap:13px;padding:13px 17px;background:#132f44;color:#f0f8ff;border:1px solid #385c70;border-radius:14px;cursor:pointer;text-align:left;box-sizing:border-box;font:inherit}
  .dw-language-grid-mode .dw-language-picker-toggle:hover{border-color:#43d9c2;background:#173b4b}
  .dw-language-grid-mode .dw-language-picker-toggle:focus-visible{outline:3px solid #67e5d3;outline-offset:2px}
  .dw-language-picker-toggle .dw-language-picker-flag{font-size:26px;line-height:1;flex:0 0 32px;text-align:center}
  .dw-language-picker-toggle .dw-language-picker-info{flex:1;min-width:0;display:flex;flex-direction:column;align-items:flex-start;gap:3px;direction:ltr;text-align:left}
  .dw-language-picker-toggle .dw-language-picker-name{font-weight:700;font-size:16px;line-height:1.3;unicode-bidi:isolate}
  .dw-language-picker-toggle .dw-language-picker-subtitle{font-size:12px;color:#bdd2df;line-height:1.25}
  .dw-language-picker-toggle .dw-language-picker-chevron{width:20px;height:20px;flex:0 0 auto;transition:transform .18s;color:#61e2d0}
  .dw-language-picker-toggle[aria-expanded="true"] .dw-language-picker-chevron{transform:rotate(180deg)}
  .dw-language-modal[hidden]{display:none!important}
  .dw-language-modal{position:fixed!important;inset:0!important;z-index:2147483000!important;display:flex;align-items:center;justify-content:center;padding:18px;box-sizing:border-box;direction:ltr}
  .dw-language-modal-backdrop{position:absolute;inset:0;background:rgba(2,12,26,.75);backdrop-filter:blur(5px)}
  .dw-language-modal-card{position:relative;display:flex;flex-direction:column;width:min(760px,100%);max-height:min(88dvh,820px);overflow:hidden;background:#0b2438;color:#f0f8ff;border:1px solid #42677a;border-radius:22px;box-shadow:0 24px 90px rgba(0,0,0,.5);direction:ltr}
  .dw-language-modal-header{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:22px 24px 16px;border-bottom:1px solid #2a4b60}
  .dw-language-modal-title{font-weight:750;font-size:23px;line-height:1.3;text-align:left}
  .dw-language-modal-close{display:grid;place-items:center;flex:0 0 46px;width:46px;height:46px;border:1px solid #42677a;border-radius:12px;background:#183b51;color:#fff;font:inherit;font-size:28px;cursor:pointer}
  .dw-language-modal-close:hover{background:#24536b;border-color:#51dbc8}
  .dw-language-modal-close:focus-visible{outline:3px solid #69ead5;outline-offset:2px}
  .dw-language-modal-scroll{padding:20px 24px 24px;overflow-y:auto;overscroll-behavior:contain;min-height:0}
  .dw-language-modal .dw-language-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}
  .dw-language-modal .dw-language-grid[hidden]{display:none!important}
  @media(max-width:520px){.dw-language-modal{padding:10px}.dw-language-modal-card{max-height:90dvh;border-radius:17px}.dw-language-modal-header{padding:16px}.dw-language-modal-title{font-size:19px}.dw-language-modal-scroll{padding:14px}.dw-language-modal .dw-language-grid{gap:8px}}
  @media(max-width:350px){.dw-language-modal .dw-language-grid{grid-template-columns:1fr!important}}
  

  .dw-language-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;width:100%;direction:ltr}
  .dw-language-grid label.dw-language-tile{display:flex!important;align-items:center;gap:10px;position:relative;min-width:0;min-height:66px;padding:10px 12px;border:1px solid #315269;border-radius:13px;background:#112b40;color:#eff8ff;cursor:pointer;transition:background .15s,border-color .15s,box-shadow .15s;box-sizing:border-box}
  .dw-language-grid label.dw-language-tile:hover{background:#183b4c;border-color:#60bea9}
  .dw-language-grid .dw-language-tile:has(input:checked){background:#133f45;border-color:#39e2c5;box-shadow:inset 0 0 0 1px #39e2c5}
  .dw-language-grid .dw-language-tile:has(input:focus-visible){outline:3px solid #77baff;outline-offset:3px}
  .dw-language-grid .dw-language-radio{position:absolute;opacity:0;width:1px;height:1px;pointer-events:none}
  .dw-language-grid .dw-language-flag{font-size:24px;line-height:1;flex:0 0 29px;display:inline-flex;justify-content:center}
  .dw-language-grid .dw-language-info{min-width:0;display:flex;flex:1;flex-direction:column;gap:3px;overflow-wrap:anywhere;direction:ltr;text-align:left;align-items:flex-start}
  .dw-language-grid .dw-language-native{font-size:14px;line-height:1.25;font-weight:700;text-align:left;unicode-bidi:isolate}
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
  /* The full language grid now lives inside the centered popup. */
  @media(max-width:940px){
    .dw-language-modal .dw-language-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}
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
    // Load open-source Hebrew webfonts without shipping font binaries.
    const fontLink=win.document.createElement('link');
    fontLink.rel='stylesheet';
    fontLink.id='dw-hebrew-typefaces';
    fontLink.href='https://fonts.googleapis.com/css2?family=Rubik:wght@300;400;500;600;700;800;900&family=Gveret+Levin&display=swap';
    (win.document.head||win.document.documentElement).appendChild(fontLink);
    const fontStyle=win.document.createElement('style');
    fontStyle.id='dw-hebrew-typeface-style';
    fontStyle.textContent=`
    /* Typography applies only in Hebrew; no visual changes to other locales. */
    html[data-dw-hebrew-font="rubik"] body,
    html[data-dw-hebrew-font="rubik"] body :is(h1,h2,h3,h4,h5,h6,p,span,div,button,input,textarea,select,label,small,strong,b,em,a,li,td,th,summary,blockquote):not(.fa):not(.fas):not(.far):not(.fab):not(.material-icons):not([class*="icon-font"]):not([class*="iconify"]) {
      font-family: 'Rubik', Arial, sans-serif !important;
    }
    html[data-dw-hebrew-font="script"] body,
    html[data-dw-hebrew-font="script"] body :is(h1,h2,h3,h4,h5,h6,p,span,div,button,input,textarea,select,label,small,strong,b,em,a,li,td,th,summary,blockquote):not(.fa):not(.fas):not(.far):not(.fab):not(.material-icons):not([class*="icon-font"]):not([class*="iconify"]) {
      font-family: 'Gveret Levin', 'Rubik', Arial, sans-serif !important;
    }
    /* User-entered handles and numerical inputs must remain readable in both styles. */
    html[data-dw-hebrew-font] :is(input[type="email"],input[type="number"],input[type="tel"],#settings-venmo,#settings-cashapp,#settings-username,#settings-applecash) {
      font-family: 'Rubik', Arial, sans-serif !important;
    }
    `;
    (win.document.head||win.document.documentElement).appendChild(fontStyle);
  }
  function createLanguageGrid(win,select){
    const parent=select.closest('[data-dw-language-scope]');
    if(!parent||parent.querySelector('.dw-language-grid'))return;
    const doc=win.document;
    parent.classList.add('dw-language-grid-mode');
    const label=parent.querySelector('[data-dw-language-title]');
    if(label)label.hidden=true;
    const toggle=doc.createElement('button');
    toggle.type='button';toggle.className='dw-language-picker-toggle';
    toggle.setAttribute('aria-expanded','false');
    toggle.setAttribute('data-dw-language-grid','');
    const flagDisplay=doc.createElement('span');flagDisplay.className='dw-language-picker-flag';flagDisplay.setAttribute('aria-hidden','true');
    const summary=doc.createElement('span');summary.className='dw-language-picker-info';
    const currentName=doc.createElement('span');currentName.className='dw-language-picker-name';
    const currentSubtitle=doc.createElement('span');currentSubtitle.className='dw-language-picker-subtitle';
    summary.append(currentName,currentSubtitle);
    const chevron=doc.createElement('span');chevron.className='dw-language-picker-chevron';chevron.textContent='⌄';chevron.setAttribute('aria-hidden','true');
    toggle.append(flagDisplay,summary,chevron);
    const modal=doc.createElement('div');
    modal.className='dw-language-modal';
    modal.hidden=true;
    modal.setAttribute('data-dw-language-grid','');
    modal.setAttribute('role','dialog');
    modal.setAttribute('aria-modal','true');
    const modalId=(select.id||'doweo-language')+'-modal';
    modal.id=modalId;
    toggle.setAttribute('aria-controls',modalId);
    const backdrop=doc.createElement('div');backdrop.className='dw-language-modal-backdrop';backdrop.setAttribute('aria-hidden','true');
    const card=doc.createElement('div');card.className='dw-language-modal-card';
    const header=doc.createElement('div');header.className='dw-language-modal-header';
    const title=doc.createElement('span');title.className='dw-language-modal-title';
    title.id=modalId+'-title';title.textContent=dialogLabel(resolve(win),0);
    modal.setAttribute('aria-labelledby',title.id);
    const close=doc.createElement('button');close.type='button';close.className='dw-language-modal-close';
    close.textContent='×';close.setAttribute('aria-label',dialogLabel(resolve(win),1));
    header.append(title,close);
    const scroll=doc.createElement('div');scroll.className='dw-language-modal-scroll';
    const grid=doc.createElement('div');
    grid.className='dw-language-grid';
    grid.id=modalId+'-choices';
    grid.setAttribute('data-dw-language-grid','');
    function dismiss(){
      if(modal.hidden)return;
      modal.hidden=true;
      toggle.setAttribute('aria-expanded','false');
      toggle.focus();
    }
    function open(){
      // Close other language dialogs if onboarding and Settings both exist.
      doc.querySelectorAll('.dw-language-modal:not([hidden])').forEach(other=>{
        if(other!==modal){other.hidden=true;const previous=doc.querySelector('[aria-controls="'+other.id+'"]');previous?.setAttribute('aria-expanded','false');}
      });
      syncLanguageGrids(win);
      modal.hidden=false;
      toggle.setAttribute('aria-expanded','true');
      close.focus();
    }
    toggle.addEventListener('click',open);
    close.addEventListener('click',dismiss);
    backdrop.addEventListener('click',dismiss);
    modal.addEventListener('keydown',event=>{
      if(event.key==='Escape'){event.preventDefault();dismiss();return;}
      if(event.key!=='Tab')return;
      const focusable=[close,...Array.from(grid.querySelectorAll('input[type="radio"]'))];
      const first=focusable[0],last=focusable[focusable.length-1];
      if(event.shiftKey&&doc.activeElement===first){event.preventDefault();last.focus();}
      else if(!event.shiftKey&&doc.activeElement===last){event.preventDefault();first.focus();}
    });
    grid.setAttribute('role','group');
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
      input.addEventListener('change',()=>{if(input.checked){set(win,input.value);dismiss();}});
      const flag=doc.createElement('span');flag.className='dw-language-flag';flag.textContent=option.flag;flag.setAttribute('aria-hidden','true');
      const info=doc.createElement('span');info.className='dw-language-info';
      const native=doc.createElement('span');native.className='dw-language-native';native.textContent=option.name;native.dir=(option.code==='he'||option.code==='he-script'||option.code==='ar')?'rtl':'auto';
      info.appendChild(native);
      if(option.subtitle&&option.subtitle!==option.name){
        const english=doc.createElement('span');english.className='dw-language-english';english.textContent=option.subtitle;
        info.appendChild(english);
      }
      const tick=doc.createElement('span');tick.className='dw-language-check';tick.textContent='✓';tick.setAttribute('aria-hidden','true');
      tile.append(input,flag,info,tick);grid.appendChild(tile);
    }
    scroll.appendChild(grid);card.append(header,scroll);modal.append(backdrop,card);
    doc.body.appendChild(modal);
    select.insertAdjacentElement('afterend',toggle);
  }
  function syncLanguageGrids(win){
    const selected=read(win)||'auto';
    win.document.querySelectorAll('.dw-language-grid').forEach(grid=>{
      grid.setAttribute('aria-label',t(resolve(win),'language'));
      const modal=grid.closest('.dw-language-modal');
      const toggle=modal?win.document.querySelector('[aria-controls="'+modal.id+'"]'):null;
      if(toggle?.classList.contains('dw-language-picker-toggle')){
        modal.querySelector('.dw-language-modal-title').textContent=dialogLabel(resolve(win),0);
        modal.querySelector('.dw-language-modal-close').setAttribute('aria-label',dialogLabel(resolve(win),1));
        const choice=LANGUAGE_CHOICES.find(option=>option.code===selected);
        const auto=selected==='auto';
        const detected=LANGUAGE_CHOICES.find(option=>option.code===resolve(win));
        toggle.querySelector('.dw-language-picker-flag').textContent=auto?'🌐':(choice?.flag||'🌐');
        const name=toggle.querySelector('.dw-language-picker-name');
        name.textContent=auto?t(resolve(win),'auto'):(choice?.name||t(resolve(win),'auto'));
        name.dir=choice&&(choice.code==='he'||choice.code==='he-script'||choice.code==='ar')?'rtl':'auto';
        toggle.querySelector('.dw-language-picker-subtitle').textContent=auto?(detected?.name||''):(choice?.subtitle!==choice?.name?choice?.subtitle||'':'');
        toggle.setAttribute('aria-label',t(resolve(win),'language')+': '+name.textContent);
      }
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
    if(value==='he-script')return 'he-script';
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
    const selected=preference&&preference!=='auto'?preference:detect(browser.languages||[browser.language]);
    // Both Hebrew typography choices share the same translations, pluralization and RTL behavior.
    return selected==='he-script'?'he':selected;
  }
  function t(lang,key){
    return (strings[lang]&&strings[lang][key])||strings.en[key]||key;
  }
  function apply(win){
    const lang=resolve(win);
    win.document.documentElement.lang=lang;
    const selected=read(win);
    if(lang==='he')win.document.documentElement.setAttribute('data-dw-hebrew-font',selected==='he-script'?'script':'rubik');
    else win.document.documentElement.removeAttribute('data-dw-hebrew-font');
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
      // Inject the alternate display option into both Settings and onboarding
      // without changing the underlying Hebrew locale or translation dictionaries.
      win.document.querySelectorAll('[data-dw-language-select]').forEach(el=>{
        if(!el.querySelector('option[value="he-script"]')){
          const option=win.document.createElement('option');
          option.value='he-script';option.textContent='עברית (כתב יד)';
          const existing=el.querySelector('option[value="he"]');
          if(existing)existing.after(option);else el.appendChild(option);
        }
      });
      // The native selector and the visual language grid must use identical order.
      // Moving existing options retains their values and saved preference.
      win.document.querySelectorAll('[data-dw-language-select]').forEach(el=>{
        const saved=el.value;
        for(const choice of LANGUAGE_CHOICES){
          const option=Array.from(el.options).find(item=>item.value===choice.code);
          if(option)el.appendChild(option);
        }
        el.value=saved;
      });
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
