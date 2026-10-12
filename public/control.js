'use strict';
const el=id=>document.getElementById(id), val=id=>el(id).value.trim();
let credential=sessionStorage.getItem('azrail_control_token')||'';el('token').value=credential;
function notice(text){el('notice').textContent=text;}
async function api(path,body){const response=await fetch(path,{method:body===undefined?'GET':'POST',headers:{Authorization:'Bearer '+credential,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});const data=await response.json();if(!response.ok)throw Error(data.error||'Запрос не выполнен');return data;}
const act=(id,fn)=>el(id).addEventListener('click',async()=>{el(id).disabled=true;try{await fn();}catch(e){notice(e.message);}finally{el(id).disabled=false;}});
async function login(){credential=val('token');const me=await api('/api/me');sessionStorage.setItem('azrail_control_token',credential);el('identity').textContent=me.account.name+' · '+me.account.role;el('admin').classList.toggle('hidden',me.account.role!=='admin');for(const id of ['backup','restore','recover'])el(id).disabled=me.account.role==='viewer';notice('Доступ подтверждён. Выберите проект.');}
act('login',login);act('logout',()=>{credential='';sessionStorage.removeItem('azrail_control_token');el('token').value='';el('admin').classList.add('hidden');el('projectResult').textContent='';el('accountResult').textContent='';el('identity').textContent='Вы вышли.';notice('Ключ удалён из вкладки.');});
act('metrics',async()=>{const r=await api('/api/metrics?projectId='+encodeURIComponent(val('project')));el('projectResult').textContent=JSON.stringify(r,null,2);notice('Показатели обновлены. Неизвестная стоимость не считается нулевой.');});
act('backup',async()=>{const r=await api('/api/backups',{projectId:val('project')});el('backupId').value=r.id;notice('Копия создана: '+r.id+' · файлов: '+r.files);});
act('listBackups',async()=>{el('projectResult').textContent=JSON.stringify(await api('/api/backups?projectId='+encodeURIComponent(val('project'))),null,2);});
act('restore',async()=>{const r=await api('/api/backups/restore',{projectId:val('project'),backupId:val('backupId'),targetProjectId:val('target')});notice('Восстановлено файлов: '+r.restored+' · проект: '+r.projectId);});
act('recover',async()=>{const r=await api('/api/mission/recover',{missionId:val('mission')});notice(r.resumed?'Миссия поставлена на продолжение.':r.reason);});
const studioNames={answer:'Аналитическая студия',architect:'Архитектурная студия',code:'Студия разработки',ui:'Дизайн-студия',git:'Управление версиями',deploy:'Лаборатория публикации',security:'Лаборатория безопасности',qa:'Лаборатория качества',evolution:'Лаборатория развития'};
act('studios',async()=>{const r=await api('/api/agents');el('catalog').replaceChildren();for(const a of r.agents){const card=document.createElement('div');card.className='card';const title=document.createElement('strong');title.textContent=studioNames[a.id]||a.name;const text=document.createElement('span');text.textContent=(a.capabilities||[]).join(', ')+' · зарегистрирован';card.append(title,text);el('catalog').append(card);}notice('Каталог обновлён. Разрешения интеграций проверяются при выполнении.');});
act('createAccount',async()=>{const r=await api('/api/admin/accounts',{name:val('name'),role:val('role'),days:Number(val('days'))});el('accountId').value=r.account.id;el('accountResult').textContent=JSON.stringify(r.account,null,2);notice('Сохраните ключ сейчас: повторно он не возвращается.');});
act('accounts',async()=>{el('accountResult').textContent=JSON.stringify(await api('/api/admin/accounts'),null,2);});
act('revoke',async()=>{await api('/api/admin/accounts/revoke',{accountId:val('accountId')});notice('Доступ отозван.');});
for(const [id,enabled] of [['allow',true],['deny',false]])act(id,async()=>{await api('/api/admin/permissions',{projectId:val('project'),capability:val('capability'),enabled});notice(enabled?'Разрешение выдано.':'Разрешение отозвано.');});
act('assign',async()=>{await api('/api/admin/ownership',{kind:val('kind'),resourceId:val('resourceId'),accountId:val('accountId')});notice('Владелец назначен.');});
act('price',async()=>{await api('/api/admin/billing',{model:val('model'),inputRate:Number(val('inputRate')),outputRate:Number(val('outputRate'))});notice('Тариф сохранён.');});
act('limit',async()=>{await api('/api/admin/billing',{scope:val('scope'),usd:Number(val('usd'))});notice('Лимит сохранён.');});
if(credential)login().catch(e=>notice(e.message));
