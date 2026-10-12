'use strict';
(()=>{
const $=id=>document.getElementById(id);
const localView=!['http:','https:'].includes(location.protocol);
const cached=(key,value)=>{try{if(value!==undefined)sessionStorage.setItem(key,value);return sessionStorage.getItem(key)||'';}catch{return '';}};
const uuid=()=>typeof crypto?.randomUUID==='function'?crypto.randomUUID():Array.from(crypto.getRandomValues(new Uint8Array(16)),b=>b.toString(16).padStart(2,'0')).join('');
let token=localView?'':cached('azrail_ultimate_token');
let project=cached('azrail_ultimate_project')||'p_'+uuid();
let mission=cached('azrail_ultimate_mission'),pendingKey=cached('azrail_ultimate_pending_key'),pendingBody=cached('azrail_ultimate_pending_body');
let role='',enabled=false,busy=false,timer,policyReady=false,canEditMode=false,polling=false,lastResult=null,pollFailures=0,epoch=0;
cached('azrail_ultimate_project',project);$('access').value=token;
const notice=t=>{$('notice').textContent=t;$('settingsNotice').textContent=t;};
function controls(){
  $('createButton').disabled=busy||role==='viewer';
  $('createButton').textContent=pendingBody?'Повторить отправку ↗':'Создать ↗';
  $('idea').readOnly=!!pendingBody;$('files').disabled=!!pendingBody||busy;
  $('saveMode').disabled=localView||!policyReady||role!=='admin';
  $('thirdParty').disabled=localView||!policyReady||!canEditMode;
  $('monthly').disabled=localView||!policyReady||role!=='admin';
  $('catalogRefresh').disabled=localView||!token;
  $('cancel').disabled=localView||!token||role==='viewer'||!busy;
  $('sendHint').disabled=localView||!token||role==='viewer'||!busy;
}
async function api(path,body,key){
  if(localView)throw Error('Это локальный просмотр. Откройте адрес вашего AZRAIL, чтобы запустить задачу.');
  if(!token)throw Error('Подключите ключ AZRAIL в настройках.');
  const headers={Authorization:'Bearer '+token};if(body!==undefined)headers['Content-Type']='application/json';if(key)headers['Idempotency-Key']=key;
  const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),25000);
  try{
    const r=await fetch(path,{method:body===undefined?'GET':'POST',headers,body:body===undefined?undefined:JSON.stringify(body),signal:controller.signal});
    let d;try{d=await r.json();}catch{throw Error('Сервер вернул ответ, который AZRAIL не смог прочитать. Проверьте адрес и развёртывание.');}
    if(!r.ok){const e=Error(d.error||'Сервис временно недоступен.');e.status=r.status;e.code=d.code;throw e;}return d;
  }finally{clearTimeout(timeout);}
}
const act=(id,fn)=>$(id).addEventListener('click',async()=>{if($(id).disabled)return;$(id).disabled=true;try{await fn();}catch(e){notice(e.message);}finally{$(id).disabled=false;controls();}});
function open(id){if(!$(id).open)$(id).showModal();}
for(const button of document.querySelectorAll('[data-close]'))button.addEventListener('click',()=>$(button.dataset.close).close());
for(const id of ['settingsOpen','modeOpen'])$(id).addEventListener('click',()=>open('settings'));
$('studiosOpen').addEventListener('click',()=>open('studios'));
$('historyOpen').addEventListener('click',()=>{$('projectSummary').textContent='Текущий проект: '+project+(mission?' · миссия '+mission:'');open('projects');});
$('newProject').addEventListener('click',()=>{
  if(busy||pendingBody){notice('Сначала проверьте результат текущей отправки или дождитесь остановки миссии.');return;}
  epoch++;clearTimeout(timer);project='p_'+uuid();mission='';lastResult=null;
  cached('azrail_ultimate_project',project);cached('azrail_ultimate_mission','');
  $('projects').close();$('work').hidden=true;$('result').textContent='';$('idea').value='';$('files').value='';$('fileCount').textContent='Добавьте детали, если нужно';$('idea').focus();controls();
});
$('voiceInfo').addEventListener('click',()=>notice('В этой сборке используйте диктовку клавиатуры телефона. Отдельный голосовой адаптер AZRAIL ещё не подключён.'));
for(const b of document.querySelectorAll('[data-prompt]'))b.addEventListener('click',()=>{if(pendingBody){notice('Повторная отправка сохраняет исходную задачу, чтобы не создать дубль.');return;}$('idea').value=b.dataset.prompt;$('idea').focus();});
$('files').addEventListener('change',()=>{$('fileCount').textContent=$('files').files.length?'Файлов: '+$('files').files.length:'Добавьте детали, если нужно';});
$('attachButton').addEventListener('click',()=>$('files').click());
async function loadSettings(){
  const requestEpoch=epoch;
  const [me,s]=await Promise.all([api('/api/me'),api('/api/routing-settings')]);if(requestEpoch!==epoch)return;
  role=me.account.role;enabled=s.policy.allowThirdPartyModels;policyReady=true;
  canEditMode=role==='admin'&&!s.policy.forceFree&&s.gatewayConfigured;
  $('identity').textContent=me.account.name+' · '+(role==='admin'?'Владелец':role==='viewer'?'Просмотр':'Участник');
  $('modeLabel').textContent=enabled?'Сторонние модели · Вкл':'Сторонние модели · Выкл';
  $('thirdParty').setAttribute('aria-checked',String(enabled));$('monthly').value=s.policy.monthlyBudgetUsd||'';
  $('budgetNote').textContent='Учтено и зарезервировано за месяц: $'+Number(s.committedUsd||0).toFixed(4)+'. '+(s.policy.forceFree?'Этот профиль закреплён в режиме Free.':!s.gatewayConfigured?'AI Gateway ещё не настроен.':'Бюджет задаёт владелец.');controls();
}
act('connect',async()=>{
  epoch++;token=$('access').value.trim();policyReady=false;role='';
  try{await loadSettings();cached('azrail_ultimate_token',token);notice('AZRAIL подключён. Опишите, что нужно создать.');if(mission)await poll();}
  catch(e){token='';cached('azrail_ultimate_token','');policyReady=false;role='';throw e;}
});
$('forget').addEventListener('click',()=>{epoch++;token='';lastResult=null;$('work').hidden=true;$('result').textContent='';cached('azrail_ultimate_token','');$('access').value='';role='';policyReady=false;clearTimeout(timer);$('identity').textContent='Ключ удалён из вкладки.';$('modeLabel').textContent='Режим не загружен';notice('Вы вышли. Уже запущенная миссия продолжает работу на сервере.');controls();});
$('thirdParty').addEventListener('click',()=>{enabled=!enabled;$('thirdParty').setAttribute('aria-checked',String(enabled));});
act('saveMode',async()=>{await api('/api/admin/routing-settings',{allowThirdPartyModels:enabled,monthlyBudgetUsd:Number($('monthly').value)});await loadSettings();notice(enabled?'Платные модели разрешены в пределах вашего бюджета.':'Сторонние и платные маршруты выключены.');});
act('catalogRefresh',async()=>{const d=await api('/api/model-catalog');$('catalogCount').textContent='Ответ API: '+d.returnedCount+' моделей. '+(d.complete?'Все страницы ответа прочитаны.':'Ответ частичный.')+' Проверено для AZRAIL: '+d.models.filter(m=>m.reviewed).length+'. '+new Date(d.fetchedAt).toLocaleString('ru-RU');});
const statuses={accepted:'Задача принята',queued:'В очереди',pending:'Ожидает',running:'В работе',planning:'Составляю план',executing:'Выполняю план',checking:'Проверяю результат',waiting_approval:'Нужно ваше решение',done:'Готово',completed:'Готово',failed:'Нужно внимание',blocked:'Нужен доступ',cancelled:'Остановлено',cancelling:'Останавливаю'};
async function poll(){
  clearTimeout(timer);if(localView||!token||!mission||document.hidden)return;
  if(polling){timer=setTimeout(poll,500);return;}
  polling=true;const requestEpoch=epoch,requestMission=mission;let repeat=true;
  try{
    const d=await api('/api/mission?missionId='+encodeURIComponent(mission));if(requestEpoch!==epoch||requestMission!==mission)return;
    pollFailures=0;$('work').hidden=false;$('workTitle').textContent=statuses[d.mission.status]||d.mission.status;
    $('workState').textContent=d.mission.goal||'Миссия';$('missionRef').textContent='Миссия: '+mission;$('steps').replaceChildren();
    for(const s of d.plan||[]){const li=document.createElement('li');li.textContent=s.title+' · '+(statuses[s.status]||s.status);$('steps').append(li);}
    lastResult=d.result;const r=d.result;$('result').textContent=typeof r==='string'?r:[r?.summary,r?.error,r?.questions?.join('\n')].filter(Boolean).join('\n\n');
    $('downloadResult').disabled=!r;
    busy=!d.done;$('cancel').hidden=!!d.done;$('hintRow').hidden=!!d.done;
    if(d.done){repeat=false;notice(d.mission.status==='completed'?'Миссия завершена. Результат сохранён.':'Миссия остановлена. Посмотрите результат и замечания ниже.');}
  }catch(e){
    if(requestEpoch!==epoch)return;pollFailures++;
    if([401,403,404].includes(e.status)){repeat=false;notice(e.message+' Автоматическая проверка остановлена.');}
    else notice(e.message+' Проверю статус повторно.');
  }finally{
    polling=false;controls();
    if(repeat&&requestEpoch===epoch&&mission&&!document.hidden)timer=setTimeout(poll,Math.min(30000,4000*Math.max(1,pollFailures)));
  }
}
function clearPending(){pendingBody='';pendingKey='';cached('azrail_ultimate_pending_body','');cached('azrail_ultimate_pending_key','');}
$('composer').addEventListener('submit',async e=>{
  e.preventDefault();if(busy||role==='viewer')return;if(localView||!token){open('settings');return;}busy=true;controls();
  try{
    if(!pendingBody){let message=$('idea').value.trim();if(!message)throw Error('Опишите задачу.');const files=[...$('files').files];
      if(files.length>5||files.reduce((s,f)=>s+f.size,0)>100000)throw Error('Прикрепите до 5 текстовых файлов общим размером до 100 КБ. Для архивов откройте полную панель.');
      for(const file of files)message+='\n\nМатериал пользователя: '+file.name+'\n'+await file.text();
      pendingBody=JSON.stringify({message,projectId:project,maxIterations:8});pendingKey=uuid();
      cached('azrail_ultimate_pending_body',pendingBody);cached('azrail_ultimate_pending_key',pendingKey);
    }
    notice('Отправляю задачу…');const d=await api('/api/mission',JSON.parse(pendingBody),pendingKey);
    if(typeof d.missionId!=='string'||!d.missionId)throw Error('Не получен номер миссии.');
    mission=d.missionId;cached('azrail_ultimate_mission',mission);clearPending();
    $('work').hidden=false;notice('Задача принята. Сервер продолжит работу, если вы закроете страницу. Сохраните номер миссии.');await poll();
  }catch(err){busy=false;
    if(err.status>=400&&err.status<500&&err.status!==408&&err.code!=='idempotency_pending')clearPending();
    notice(err.message+(pendingBody?' Нажмите «Повторить отправку»: будет отправлена та же задача с тем же ключом.':''));
  }finally{controls();}
});
act('cancel',async()=>{if(mission){await api('/api/mission/cancel',{missionId:mission});notice('Остановка запрошена. Текущий вызов инструмента может завершиться.');await poll();}});
act('sendHint',async()=>{const text=$('hint').value.trim();if(!text)throw Error('Напишите уточнение.');await api('/api/mission/hint',{missionId:mission,text});$('hint').value='';notice('Уточнение передано. Оно будет прочитано на следующем шаге.');});
act('refreshStatus',poll);
$('downloadResult').addEventListener('click',()=>{if(!lastResult)return;const url=URL.createObjectURL(new Blob([JSON.stringify({missionId:mission,result:lastResult},null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='azrail-result-'+mission+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&mission)poll();else clearTimeout(timer);});
$('openHosted').addEventListener('click',()=>{
  try{const target=new URL($('siteAddress').value.trim());
    if(target.protocol!=='https:'||target.username||target.password)throw Error('Укажите полный HTTPS-адрес вашего AZRAIL.');
    target.pathname='/ultimate.html';target.search='';target.hash='';location.assign(target.href);
  }catch(e){notice(e.message==='Invalid URL'?'Укажите адрес, например https://azrail.example.com':e.message);}
});
if(localView){
  $('localBanner').hidden=false;$('localConnect').hidden=false;$('hostedConnect').hidden=true;$('modeLabel').textContent='Локальный просмотр';
  for(const a of document.querySelectorAll('[data-hosted-link]'))a.addEventListener('click',e=>{e.preventDefault();open('settings');notice('Откройте адрес развёрнутого AZRAIL — там доступны файлы, история и управление.');});
  notice('Дизайн доступен без сервера. Чтобы создавать проекты, откройте свой AZRAIL по HTTPS.');
}
if(pendingBody){try{const saved=JSON.parse(pendingBody);if(!pendingKey||typeof saved.message!=='string')throw Error();$('idea').value=saved.message;}catch{clearPending();}}
controls();
if(token){busy=!!mission;controls();loadSettings().then(()=>{notice('AZRAIL подключён.');if(mission)poll();}).catch(e=>{busy=false;controls();notice(e.message);});}
})();
