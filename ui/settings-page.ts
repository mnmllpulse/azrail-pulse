import type {Route} from './navigation';
import {APIError} from './api-error';
import {removeAvatar,uploadAvatar} from './avatar-upload';
import {resetNickname,saveNickname} from './nickname';
import {renderDataControls,type MemoryItem} from './data-controls';
import {agentSettings} from './local-agent';
import {permissionSettings} from './permission-settings';
import {renderProviderPage,type Routing} from './settings-providers';
import {applyDisplayPrefs,readDisplayPrefs,saveDisplayPrefs,FONT_OPTIONS,type Density,type FontFamily,type TextScale} from './display-preferences';
import {renderDiagnostics,type Health} from './settings-diagnostics';
import {mountSettingsCenter,type SettingsSection} from './settings-center';
import {saveBytes} from './zip-site';

export type SettingsAccount={id:string;name:string;nickname?:string;picture?:string;operator?:boolean;role?:'viewer'|'editor'|'admin'};
export type SettingsVoice='lumen'|'shade'|'aria';
export type SettingsContext={
 $:<T extends HTMLElement=HTMLElement>(id:string)=>T;
 local:boolean;
 notice:(message:string,persist?:boolean)=>void;
 failure:(error:unknown)=>void;
 api:(path:string,options?:RequestInit)=>Promise<any>;
 setAccountLabel:()=>void;
 navigation:{navigate:(route:Route)=>void};
 chatHistory:any;
 VOICES:Record<SettingsVoice,{name:string;line:string}>;
 expertOn:()=>boolean;
 setChatVoice:(voice:SettingsVoice)=>void;
 refreshMode:()=>Promise<any>;
 openModelPicker:(...args:any[])=>any;
 openGlobalMemory:(...args:any[])=>Promise<any>;
 openAssetIntelligence:(...args:any[])=>Promise<any>;
 loadConnections:(host?:HTMLElement)=>Promise<any>;
 currentModelLabel:()=>string;
 account:()=>SettingsAccount|null;
 chatVoice:()=>SettingsVoice;
 preferredModel:()=>string;
 chatStorage:()=>Storage|undefined;
};

export function createSettingsPage(ctx:SettingsContext){
const {$,local,notice,failure,api,setAccountLabel,navigation,chatHistory,VOICES,expertOn,setChatVoice,refreshMode,openModelPicker,openGlobalMemory,openAssetIntelligence,loadConnections,currentModelLabel}=ctx;
function settingsText(host:HTMLElement,text:string,className='muted'){
 const p=document.createElement('p');p.className=className;p.textContent=text;host.append(p);return p;
}
function settingsHeading(host:HTMLElement,title:string,description?:string){
 if(host.id==='settings-content'){const lead=document.querySelector('.settings-page-heading .settings-description');if(lead&&description)lead.textContent=description;return;}
 const h=document.createElement('h2');h.textContent=title;host.append(h);
 if(description)settingsText(host,description);
}
function settingsButton(host:HTMLElement,label:string,action:()=>void,primary=false){
 const button=document.createElement('button');button.type='button';button.textContent=label;
 if(primary)button.className='primary';button.addEventListener('click',action);host.append(button);return button;
}

function renderSettingsPage(route:Extract<Route,{page:'settings'}>){
 const account=ctx.account();
 const content=mountSettingsCenter($('settings-root'),route.section,route.provider,destination=>{
  if('page' in destination){navigation.navigate(destination);return;}
  navigation.navigate({page:'settings',section:destination.section,provider:destination.provider});
 });
 const section=route.section as SettingsSection|undefined;
 if(!section)return;

 if(section==='account'){
  settingsHeading(content,'Аккаунт','Профиль и доступ к AZRAIL.');
  if(!account){
   settingsText(content,'Вы ещё не вошли. Войдите, чтобы синхронизировать чаты, проекты и подключения.','context-note');
   settingsButton(content,'Войти в аккаунт',()=>$('account-action').click(),true);
  }else{
   const photo=document.createElement('div');photo.className='settings-avatar-row';
   const preview=document.createElement('span');preview.className='account-avatar settings-avatar';
   const paintPreview=()=>{preview.replaceChildren();if(account?.picture){const img=document.createElement('img');img.alt='';img.referrerPolicy='no-referrer';img.src=account.picture;preview.append(img);}else preview.textContent=(account?.name.trim()[0]||'A').toUpperCase();};
   paintPreview();
   const picker=document.createElement('input');picker.type='file';picker.accept='image/*';picker.hidden=true;
   picker.onchange=async()=>{const file=picker.files?.[0];picker.value='';if(!file||!account)return;try{account.picture=await uploadAvatar(file);paintPreview();setAccountLabel();notice('Фото профиля обновлено.');}catch(e){failure(e);}};
   const upload=document.createElement('button');upload.type='button';upload.textContent='Загрузить фото';upload.onclick=()=>picker.click();
   const drop=document.createElement('button');drop.type='button';drop.textContent='Удалить фото';drop.onclick=async()=>{try{await removeAvatar();if(account)account.picture=undefined;paintPreview();setAccountLabel();notice('Фото профиля удалено.');}catch(e){failure(e);}};
   photo.append(preview,upload,drop,picker);content.append(photo);
   const card=document.createElement('section');card.className='settings-info-card';
   const row=(label:string,value:string)=>{const line=document.createElement('div');line.className='settings-info-row';const key=document.createElement('span');key.textContent=label;const val=document.createElement('strong');val.textContent=value;line.append(key,val);card.append(line);};
   const nickLine=document.createElement('div');nickLine.className='settings-info-row settings-nick-row';
   const nickKey=document.createElement('span');nickKey.textContent='Ник';
   const nickBox=document.createElement('div');nickBox.className='settings-nick-box';
   const nickInput=document.createElement('input');nickInput.type='text';nickInput.maxLength=32;nickInput.value=account.nickname||'';nickInput.placeholder='Как тебя называть';nickInput.setAttribute('aria-label','Ник');
   const nickSave=document.createElement('button');nickSave.type='button';nickSave.textContent='Сохранить';
   const nickReset=document.createElement('button');nickReset.type='button';nickReset.textContent='Сбросить';nickReset.hidden=!account.nickname;
   const applyNick=(name:string,nick?:string)=>{if(!account)return;account.name=name;account.nickname=nick;nickInput.value=nick||'';nickReset.hidden=!nick;setAccountLabel();};
   nickSave.onclick=async()=>{try{const nick=await saveNickname(nickInput.value);applyNick(nick,nick);notice('Ник сохранён.');}catch(e){failure(e);}};
   nickInput.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();nickSave.click();}};
   nickReset.onclick=async()=>{try{applyNick(await resetNickname(),undefined);notice('Ник сброшен.');}catch(e){failure(e);}};
   nickBox.append(nickInput,nickSave,nickReset);nickLine.append(nickKey,nickBox);card.append(nickLine);
   row('ID аккаунта',account.id);row('Роль',account.role??'Не указана');row('Уровень оператора',account.operator?'Да':'Нет');
   content.append(card);
   settingsButton(content,'Управление входом и выходом',()=>$('account-action').click());
  }
  return;
 }

 if(section==='appearance'){
  settingsHeading(content,'Внешний вид','Предпочтения сохраняются только в этом браузере и применяются сразу после загрузки.');
  const prefs=readDisplayPrefs();
  const field=(text:string,control:HTMLElement)=>{const label=document.createElement('label');label.textContent=text;if(control.id)label.htmlFor=control.id;return [label,control];};
  const select=(id:string,options:ReadonlyArray<readonly [string,string]>,value:string)=>{const el=document.createElement('select');el.id=id;for(const [v,l] of options){const option=document.createElement('option');option.value=v;option.textContent=l;el.append(option);}el.value=value;return el;};
  const density=select('settings-density',[['comfortable','Комфортная'],['compact','Компактная'],['spacious','Свободная']],prefs.density);
  const textScale=select('settings-text-scale',[['normal','Обычный'],['large','Увеличенный (110%)']],prefs.textScale);
  const font=select('settings-font',FONT_OPTIONS,prefs.font);
  const current=()=>({...prefs,density:density.value as Density,textScale:textScale.value as TextScale,font:font.value as FontFamily});
  const preview=()=>applyDisplayPrefs(current());
  density.onchange=preview;textScale.onchange=preview;font.onchange=preview;
  const expert=document.createElement('button');expert.type='button';expert.className='settings-choice';expert.setAttribute('role','switch');
  const paintExpert=(on=expertOn())=>{expert.setAttribute('aria-checked',String(on));expert.textContent=`${on?'✓ ':''}Режим эксперта: ${on?'включён':'выключен'}`;};
  expert.onclick=()=>{const next=!expertOn();$('expert-mode').click();paintExpert(next);};paintExpert();
  settingsText(content,'Режим эксперта показывает «Ход задачи», «Студии», «Метатрон», панель контекста и поиск команд.');content.append(expert);
  const form=document.createElement('div');form.className='settings-form-grid';form.append(...field('Плотность интерфейса',density),...field('Размер текста',textScale),...field('Шрифт',font));content.append(form);
  settingsText(content,'Цветовая тема AZRAIL — только Dark Premium: светлой темы в продукте нет, в интерфейсе ~770 жёстко заданных цветов, их перевод на токены отдельный этап. Шрифты — только установленные в системе, внешние шрифты не загружаются.');
  settingsButton(content,'Сохранить внешний вид',()=>{
   const next=current();
   if(!saveDisplayPrefs(next)){notice('Браузер не разрешил сохранить предпочтения.',true);return;}
   applyDisplayPrefs(next);notice('Внешний вид сохранён на этом устройстве.');
  },true);
  return;
 }

 if(section==='voice'){
  settingsHeading(content,'Голос','Выбор применяется к следующему озвученному ответу.');
  for(const id of Object.keys(VOICES) as SettingsVoice[]){
   const button=document.createElement('button');button.type='button';button.className='settings-choice';
   button.textContent=(ctx.chatVoice()===id?'✓ ':'')+VOICES[id].name+' · '+VOICES[id].line;
   if(ctx.chatVoice()===id)button.setAttribute('aria-current','true');
   button.onclick=()=>{setChatVoice(id);renderSettingsPage(route);};
   content.append(button);
  }
  return;
 }

 if(section==='models'){
  settingsHeading(content,'AI и модели','Каталог моделей, автовыбор и модель для текущего чата.');
  const card=document.createElement('section');card.className='settings-info-card';
  const current=document.createElement('strong');current.textContent='Сейчас выбрана: '+currentModelLabel();card.append(current);
  settingsText(card,ctx.preferredModel()?'Выбор модели хранится в этой вкладке.':'Включён автоматический выбор AZRAIL.');
  content.append(card);
  settingsButton(content,account?'Открыть каталог моделей':'Войдите, чтобы открыть каталог',()=>{
   if(!account){notice('Войдите, чтобы открыть каталог моделей.',true);return;}
   openModelPicker();
  },true);
  if(account?.role==='admin'){
   const orCard=document.createElement('section');orCard.className='settings-info-card';
   const orTitle=document.createElement('strong');orTitle.textContent='Бесплатные модели OpenRouter';orCard.append(orTitle);
   const orInfo=document.createElement('p');orInfo.className='muted';orCard.append(orInfo);
   const show=(st:{checkedAt:number;total:number;added:string[];gone:string[]}|null,configured:boolean)=>{
    orInfo.textContent=(configured?'Ключ задан. ':'Ключ не задан: модели недоступны. ')+(st?`Сверка ${new Date(st.checkedAt).toLocaleString('ru-RU')}: в каталоге ${st.total}, новых ${st.added.length}, неактуальных ${st.gone.length}.`+(st.gone.length?` Неактуальны: ${st.gone.join(', ')}.`:''):'Каталог ещё не сверялся (сверка идёт автоматически раз в 6 часов).');
   };
   void api('/api/openrouter-status').then(r=>show(r.status??null,!!r.configured)).catch(()=>{});
   content.append(orCard);
   settingsButton(content,'Обновить список OpenRouter',async()=>{
    try{const r=await api('/api/admin/openrouter-refresh',{method:'POST',body:'{}'});show(r.status,true);notice(`Список обновлён: ${r.status.total} бесплатных, неактуальных ${r.status.gone.length}.`);}catch(e){failure(e);}
   });
  }
  return;
 }

 if(section==='providers'){
  if(!route.provider)return;
  renderProviderPage(content,{
   providerId:route.provider,
   loadCatalog:async()=>{if(!account)throw Error('Нужен вход.');const r=await api('/api/model-catalog');return Array.isArray(r.models)?r.models:[];},
   loadRouting:async()=>{if(!account)return null;return await api('/api/routing-settings') as Routing;},
   notice,failure,
   back:()=>navigation.navigate({page:'settings',section:'providers'}),
  });
  return;
 }

 if(section==='connections'){
  void loadConnections(content).catch(failure);
  return;
 }

 if(section==='permissions'){
  settingsHeading(content,'Безопасность и разрешения','Кто и какие действия может выполнять в рабочем пространстве.');
  if(account?.role==='admin')content.append(permissionSettings(api,notice,failure));
  else settingsText(content,'Настройка режима разрешений доступна администраторам. Здесь она не показывается пользователям с обычной ролью.','context-note');
  return;
 }

 if(section==='agent'){
  settingsHeading(content,'Локальный агент','Безопасный доступ к одной папке на твоём компьютере.');
  if(account?.role==='admin')content.append(agentSettings(api,notice,failure));
  else settingsText(content,'Управление локальным агентом доступно администраторам.','context-note');
  return;
 }

 if(section==='usage'){
  settingsHeading(content,'Использование и лимиты','Сводка текущего плана и доступных ограничений.');
  if(!account){settingsText(content,'Войдите, чтобы посмотреть лимиты аккаунта.','context-note');return;}
  const trial=document.createElement('section');trial.className='settings-info-card';trial.append(document.createElement('p'));
  trial.firstElementChild!.textContent='Загружаю пробные возможности…';content.append(trial);
  void Promise.all([api('/api/trial'),refreshMode()]).then(([trialState,routing])=>{
   trial.replaceChildren();
   settingsHeading(trial,'Пробные возможности');
   settingsText(trial,'Озвучка: '+(trialState.speech?'включена':'выключена')+' · осталось '+trialState.speechLeft+' из '+trialState.limits.speech+'.');
   settingsText(trial,'Тесты в контейнере: '+(trialState.sandbox?'включены':'выключены')+' · осталось '+trialState.sandboxLeft+' из '+trialState.limits.sandbox+'.');
   settingsText(trial,'Выкладка из чата выключена. Лимит — 0.');
   if(account?.role==='admin'||account?.operator){
    const speechLabel=document.createElement('label');const speech=document.createElement('input');speech.type='checkbox';speech.checked=!!trialState.speech;speechLabel.append(speech,document.createTextNode(' Озвучка ElevenLabs'));
    const sandboxLabel=document.createElement('label');const sandbox=document.createElement('input');sandbox.type='checkbox';sandbox.checked=!!trialState.sandbox;sandboxLabel.append(sandbox,document.createTextNode(' Тесты в контейнере'));
    const save=document.createElement('button');save.type='button';save.textContent='Сохранить пробные лимиты';save.onclick=()=>{save.disabled=true;void api('/api/admin/trial',{method:'POST',body:JSON.stringify({speech:speech.checked,sandbox:sandbox.checked})}).then(()=>{notice('Пробные лимиты сохранены.');renderSettingsPage(route);}).catch(failure).finally(()=>{save.disabled=false;});};
    trial.append(speechLabel,sandboxLabel,save);
   }
   const budget=document.createElement('section');budget.className='settings-info-card';
   settingsHeading(budget,'Бюджет маршрутизации');
   settingsText(budget,'План: '+routing.workersPlan+' · учтено и зарезервировано: $'+Number(routing.committedUsd).toFixed(4)+'.');
   settingsText(budget,'Сторонние модели: '+(routing.policy.allowThirdPartyModels?'разрешены политикой':'заблокированы политикой')+'.');
   if(account?.operator){
    const allowLabel=document.createElement('label');const allow=document.createElement('input');allow.type='checkbox';allow.checked=!!routing.policy.allowThirdPartyModels;allowLabel.append(allow,document.createTextNode(' Разрешить сторонние AI-модели'));
    const amountLabel=document.createElement('label');amountLabel.textContent='Месячный бюджет платных моделей, USD';
    const amount=document.createElement('input');amount.type='number';amount.min='0';amount.step='1';amount.value=String(routing.policy.monthlyBudgetUsd);amountLabel.append(amount);
    const save=document.createElement('button');save.type='button';save.textContent='Сохранить бюджет';save.onclick=()=>{save.disabled=true;void api('/api/admin/routing-settings',{method:'POST',body:JSON.stringify({allowThirdPartyModels:allow.checked,monthlyBudgetUsd:Number(amount.value)})}).then(()=>{notice('Бюджет сохранён.');renderSettingsPage(route);}).catch(failure).finally(()=>{save.disabled=false;});};
    budget.append(allowLabel,amountLabel,save);
   }
   content.append(budget);
  }).catch(error=>{trial.replaceChildren();settingsText(trial,error instanceof Error?error.message:'Не удалось загрузить лимиты.','context-note');});
  return;
 }

 if(section==='data'){
  settingsHeading(content,'Данные и память','Текущие инструменты управления файлами и контекстом проекта.');
  if(!account){settingsText(content,'Войдите, чтобы открывать библиотеку файлов и память проекта.','context-note');return;}
  settingsButton(content,'Открыть библиотеку файлов',()=>{void openAssetIntelligence().catch(failure);});
  settingsButton(content,'Открыть Global Memory',()=>{void openGlobalMemory().catch(failure);});
  settingsText(content,'История чатов и проекты управляются из основной навигации.','context-note');
  renderDataControls(content,{storage:ctx.chatStorage(),accountName:()=>account?.name??'',threads:()=>chatHistory.list(),keepId:()=>chatHistory.current()?.id??'',removeThread:id=>chatHistory.remove(id),loadMemory:async()=>((await api('/api/studio/intelligence/memory?scope=all')) as {items?:MemoryItem[]}).items??[],save:saveBytes,notice,failure});
  return;
 }

 if(section==='shortcuts'){
  settingsHeading(content,'Управление и доступность','Клавиатура, анимации, контраст и язык интерфейса.');
  for(const line of ['Ctrl / ⌘ + K — поиск команд.','Enter или Ctrl / ⌘ + Enter — отправить. Shift + Enter — новая строка.','Alt + 1 — чат. Alt + 2 — проекты. Alt + 3 — студии.','Escape — закрыть диалог или боковую панель.'])settingsText(content,line,'settings-shortcut-row');
  const prefs=readDisplayPrefs();
  const toggle=(text:string,checked:boolean)=>{const label=document.createElement('label');label.className='settings-toggle';const box=document.createElement('input');box.type='checkbox';box.checked=checked;label.append(box,document.createTextNode(' '+text));content.append(label);return box;};
  const motion=toggle('Уменьшить анимации',prefs.reduceMotion);
  const contrast=toggle('Повышенный контраст',prefs.highContrast);
  const collect=()=>({...readDisplayPrefs(),reduceMotion:motion.checked,highContrast:contrast.checked});
  motion.onchange=contrast.onchange=()=>applyDisplayPrefs(collect());
  settingsText(content,'Язык интерфейса: русский. Других локализаций в продукте нет.','context-note');
  settingsButton(content,'Сохранить доступность',()=>{
   const next=collect();
   if(!saveDisplayPrefs(next)){notice('Браузер не разрешил сохранить предпочтения.',true);return;}
   applyDisplayPrefs(next);notice('Настройки доступности сохранены на этом устройстве.');
  },true);
  return;
 }

 if(section==='about'){
  settingsHeading(content,'AZRAIL × MNMLL PULSE','Мультиагентное ядро AZRAIL и творческие инструменты PULSE в одном рабочем пространстве.');
  settingsText(content,'Текст и голос → миссия → файлы проекта → проверка. Результат не получает статус готовности к публикации без успешной проверки кода.');
  settingsText(content,'Музыка здесь — локальный procedural synthesis. Video Studio использует AI для Scene Builder, а preview/WebM рендерит локально через Canvas + MediaRecorder.');
  settingsText(content,'Система не выдаёт Cloudflare Stream или Veo за подключённые, пока соответствующий binding не настроен и не проверен.');
  if(local)settingsText(content,'Диагностика доступна в развёрнутом приложении.','context-note');
  else renderDiagnostics(content,{failure,loadHealth:async()=>{
   if(!account){const live=await api('/health/live') as Health;return {version:live.version};}
   try{return await api('/health') as Health;}catch(error){if(error instanceof APIError&&error.body&&Array.isArray(error.body.services))return error.body as Health;throw error;}
  }});
 }
}
return renderSettingsPage;
}
