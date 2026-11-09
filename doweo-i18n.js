/* DoWeo language foundation, Phase 1. No payment or user-created content translation. */
(function(root, factory) {
  const api=factory();
  if(typeof module==='object' && module.exports)module.exports=api;
  if(root && root.document){root.DoWeoI18n=api;api.init(root);}
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const STORAGE_KEY='doweo-ui-language-v1';
 const LOCALES=[
  ['en','English'],['es','Español'],['fr','Français'],['he','עברית'],
  ['zh-Hans','简体中文'],['pt','Português'],['de','Deutsch'],['it','Italiano'],
  ['ja','日本語'],['ar','العربية'],['ko','한국어'],['hi','हिन्दी']
 ];
 const messages={
  en:{language:'Language',languageHint:'Choose the language used for DoWeo navigation and account setup. More screens will be translated in future updates.',welcome:'Welcome to DoWeo!',setup:'Set up your new profile before you get started.',display:'Display name *',username:'Username *',continue:'Continue to DoWeo →',settings:'Language preferences',settingsHint:'Changes take effect immediately on this device.',saved:'Language preference saved.',profile:'Edit Profile'},
  es:{language:'Idioma',welcome:'¡Bienvenido a DoWeo!',setup:'Configura tu perfil antes de empezar.',display:'Nombre para mostrar *',username:'Nombre de usuario *',continue:'Continuar a DoWeo →',settings:'Preferencias de idioma',profile:'Editar perfil'},
  fr:{language:'Langue',welcome:'Bienvenue sur DoWeo !',setup:'Configurez votre profil pour commencer.',display:'Nom affiché *',username:"Nom d’utilisateur *",continue:'Continuer vers DoWeo →',settings:'Préférences linguistiques',profile:'Modifier le profil'},
  he:{language:'שפה',welcome:'ברוכים הבאים ל-DoWeo!',setup:'הגדירו את הפרופיל שלכם כדי להתחיל.',display:'שם תצוגה *',username:'שם משתמש *',continue:'המשך ל-DoWeo →',settings:'העדפות שפה',profile:'עריכת פרופיל'},
  'zh-Hans':{language:'语言',welcome:'欢迎使用 DoWeo！',setup:'请先设置个人资料。',display:'显示名称 *',username:'用户名 *',continue:'继续使用 DoWeo →',settings:'语言偏好',profile:'编辑个人资料'},
  pt:{language:'Idioma',welcome:'Boas-vindas ao DoWeo!',setup:'Configure seu perfil antes de começar.',display:'Nome de exibição *',username:'Nome de usuário *',continue:'Continuar para DoWeo →',settings:'Preferências de idioma',profile:'Editar perfil'},
  de:{language:'Sprache',welcome:'Willkommen bei DoWeo!',setup:'Richte zuerst dein Profil ein.',display:'Anzeigename *',username:'Benutzername *',continue:'Weiter zu DoWeo →',settings:'Spracheinstellungen',profile:'Profil bearbeiten'},
  it:{language:'Lingua',welcome:'Benvenuto su DoWeo!',setup:'Configura il tuo profilo prima di iniziare.',display:'Nome visualizzato *',username:'Nome utente *',continue:'Continua su DoWeo →',settings:'Preferenze lingua',profile:'Modifica profilo'},
  ja:{language:'言語',welcome:'DoWeoへようこそ！',setup:'始める前にプロフィールを設定しましょう。',display:'表示名 *',username:'ユーザー名 *',continue:'DoWeoへ進む →',settings:'言語設定',profile:'プロフィールを編集'},
  ar:{language:'اللغة',welcome:'مرحبًا بك في DoWeo!',setup:'أعدّ ملفك الشخصي قبل البدء.',display:'اسم العرض *',username:'اسم المستخدم *',continue:'المتابعة إلى DoWeo →',settings:'تفضيلات اللغة',profile:'تعديل الملف الشخصي'},
  ko:{language:'언어',welcome:'DoWeo에 오신 것을 환영합니다!',setup:'시작하기 전에 프로필을 설정하세요.',display:'표시 이름 *',username:'사용자 이름 *',continue:'DoWeo로 계속 →',settings:'언어 설정',profile:'프로필 편집'},
  hi:{language:'भाषा',welcome:'DoWeo में आपका स्वागत है!',setup:'शुरू करने से पहले अपनी प्रोफ़ाइल सेट करें।',display:'प्रदर्शित नाम *',username:'उपयोगकर्ता नाम *',continue:'DoWeo पर जारी रखें →',settings:'भाषा प्राथमिकताएँ',profile:'प्रोफ़ाइल संपादित करें'}
 };
 function normalize(input){
  const code=String(input||'').trim().replace(/_/g,'-').toLowerCase();
  if(code==='zh'||code.startsWith('zh-'))return 'zh-Hans';
  const base=code.split('-')[0];
  return LOCALES.some(x=>x[0]===base)?base:'en';
 }
 function detect(list){
  for(const tag of (Array.isArray(list)?list:[])){
   const code=normalize(tag);
   if(code!=='en'||String(tag).toLowerCase().startsWith('en'))return code;
  }
  return 'en';
 }
 function direction(code){return ['he','ar'].includes(normalize(code))?'rtl':'ltr';}
 function translate(code,key){return (messages[normalize(code)]||{})[key]||messages.en[key]||key;}
 function readSaved(storage){
  try{const value=storage&&storage.getItem(STORAGE_KEY);return value&&LOCALES.some(x=>x[0]===value)?value:null;}catch(_){return null;}
 }
 function choose(storage,languages){return readSaved(storage)||detect(languages);}
 function init(win){
  const doc=win.document;
  const langSelects=()=>Array.from(doc.querySelectorAll('[data-dw-language-select]'));
  let locale=choose(win.localStorage,win.navigator&&win.navigator.languages||[win.navigator&&win.navigator.language]);
  function update(){
   doc.documentElement.lang=locale;
   doc.documentElement.dataset.dwLanguageDirection=direction(locale);
   // Phase 1 translates explicitly marked UI only; it does not flip the
   // entire dashboard layout, financial figures or user-generated text.
   doc.querySelectorAll('[data-dw-i18n]').forEach(node=>{
    node.textContent=translate(locale,node.getAttribute('data-dw-i18n'));
   });
   langSelects().forEach(select=>{select.value=locale;select.setAttribute('dir','auto');});
   doc.querySelectorAll('[data-dw-language-area]').forEach(area=>{
    area.dir=direction(locale);
   });
  }
  function setLanguage(code){
   locale=normalize(code);
   try{win.localStorage.setItem(STORAGE_KEY,locale);}catch(_){}
   update();
   doc.dispatchEvent(new win.CustomEvent('doweo:languagechange',{detail:{language:locale}}));
   return locale;
  }
  langSelects().forEach(select=>select.addEventListener('change',()=>setLanguage(select.value)));
  update();
  Object.assign(api,{getLanguage:()=>locale,setLanguage,refresh:update});
  // Translate newly mounted marked labels without watching the entire app.
 }
 const api={LOCALES,STORAGE_KEY,normalize,detect,direction,translate,readSaved,choose,init};
 return api;
});
