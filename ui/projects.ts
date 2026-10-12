import { escapeHtml as esc, formatBytes as bytes } from '../src/shared/format';
import type {StudioId} from './studio-types';

export type ProjectSummary={
 id:string;name:string;description:string;status:'active'|'archived'|'deleted';pinned:boolean;studioId:StudioId|null;tags:string[];
 ownerId:string;ownerName:string;createdAt:string;updatedAt:string;lastActivityAt:number;
 missionId:string|null;missionStatus:string|null;missionCount:number;artifactsCount:number;versionsCount:number;
};

type ProjectDetails={
 project:ProjectSummary;
 missions:Array<{id:string;goal:string;status:string;progress:number;created_at:string;updated_at:string}>;
 versions:Array<{id:string;version_number:number;summary:string|null;created_by_agent:string|null;created_at:string}>;
 artifacts:Array<{id:string;name:string;mime:string;bytes:number;created_at:number;studio_id:string|null}>;
 activity:Array<{seq:number;domain:string;type:string;actor:string|null;created_at:number}>;
};

type Account={id:string;name:string;role?:'viewer'|'editor'|'admin'};
type Api=(path:string,options?:RequestInit)=>Promise<any>;
type Deps={
 account:Account|null;local:boolean;selectedProjectId:string;api:Api;blobAPI:(path:string)=>Promise<Blob>;
 onOpen:(project:ProjectSummary)=>void;notice:(message:string,persist?:boolean)=>void;failure:(error:unknown)=>void;
 dialog:(title:string,html:string)=>HTMLElement;closeDialog:()=>void;
};

const studioNames:Record<string,string>={web:'Web Studio',image:'Image Studio',music:'Music Studio',video:'Video Studio',audio:'Audio Lab',als:'Ableton Lab',data:'Data Studio',ledger:'Ledger',lab:'Pulse Lab'};
let searchTimer=0;
const $=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T;

function relativeTime(ts:number){
 if(!ts)return 'Нет активности';const delta=Math.max(0,Date.now()-ts),minute=60000,hour=60*minute,day=24*hour;
 if(delta<minute)return 'только что';if(delta<hour)return `${Math.max(1,Math.floor(delta/minute))} мин назад`;if(delta<day)return `${Math.floor(delta/hour)} ч назад`;if(delta<7*day)return `${Math.floor(delta/day)} дн назад`;return new Date(ts).toLocaleDateString();
}
function runtimeStatus(item:ProjectSummary){
 if(item.status==='archived')return {label:'Архив',kind:'muted'};if(item.status==='deleted')return {label:'Удалён',kind:'danger'};
 if(['queued','planning','executing','verifying','waiting_approval'].includes(item.missionStatus??''))return {label:'В работе',kind:'live'};
 if(item.missionStatus==='failed')return {label:'Ошибка',kind:'danger'};if(item.missionStatus==='unverified')return {label:'Нужна проверка',kind:'warn'};
 if(item.missionStatus==='completed')return {label:'Готов',kind:'ok'};return {label:'Активный',kind:'ok'};
}
function studioName(id:string|null){return id?studioNames[id]??id:'AZRAIL Core';}

function queryString(){
 const q=new URLSearchParams();const search=$<HTMLInputElement>('project-search').value.trim(),sort=$<HTMLSelectElement>('project-sort').value,status=$<HTMLSelectElement>('project-status-filter').value,studio=$<HTMLSelectElement>('project-studio-filter').value;
 if(search)q.set('search',search);if(sort)q.set('sort',sort);if(status)q.set('status',status);if(studio)q.set('studio',studio);return q.toString();
}

function projectCard(item:ProjectSummary,deps:Deps,refresh:()=>Promise<void>){
 const card=document.createElement('article');card.className='project-card';card.dataset.projectId=item.id;if(item.id===deps.selectedProjectId)card.dataset.selected='true';
 const head=document.createElement('div');head.className='project-card-head';
 const badge=document.createElement('span'),status=runtimeStatus(item);badge.className=`project-status ${status.kind}`;badge.textContent=status.label;
 const pin=document.createElement('button');pin.className='project-pin';pin.type='button';pin.textContent=item.pinned?'★':'☆';pin.setAttribute('aria-label',item.pinned?'Убрать из избранного':'Добавить в избранное');pin.title=pin.getAttribute('aria-label')!;
 if(deps.account?.role==='viewer')pin.disabled=true;else pin.onclick=()=>deps.api(`/api/projects/${encodeURIComponent(item.id)}`,{method:'PATCH',body:JSON.stringify({pinned:!item.pinned})}).then(refresh).catch(deps.failure);
 head.append(badge,pin);
 const title=document.createElement('h3');title.textContent=item.name;
 const description=document.createElement('p');description.className='project-description';description.textContent=item.description||'Без описания. Добавьте контекст, чтобы быстрее ориентироваться в работе.';
 const meta=document.createElement('div');meta.className='project-meta';
 const studio=document.createElement('span');studio.textContent=studioName(item.studioId);const updated=document.createElement('span');updated.textContent=`Обновлён ${relativeTime(item.lastActivityAt)}`;meta.append(studio,updated);
 const counts=document.createElement('div');counts.className='project-counts';counts.innerHTML=`<span>${item.artifactsCount} артеф.</span><span>${item.versionsCount} версий</span><span>${item.missionCount} миссий</span>`;
 const tags=document.createElement('div');tags.className='project-tags';for(const tag of item.tags.slice(0,4)){const chip=document.createElement('span');chip.textContent=tag;tags.append(chip);}if(item.tags.length>4){const chip=document.createElement('span');chip.textContent=`+${item.tags.length-4}`;tags.append(chip);}
 const actions=document.createElement('div');actions.className='project-actions';
 const open=document.createElement('button');open.className='primary';open.type='button';open.textContent='Открыть ↗';open.onclick=()=>deps.onOpen(item);
 const menu=document.createElement('button');menu.className='project-menu';menu.type='button';menu.textContent='⋯';menu.setAttribute('aria-label',`Действия проекта ${item.name}`);menu.onclick=()=>void openProjectDialog(item,deps,refresh);
 actions.append(open,menu);card.append(head,title,description,meta,counts);if(item.tags.length)card.append(tags);card.append(actions);return card;
}

async function openProjectDialog(item:ProjectSummary,deps:Deps,refresh:()=>Promise<void>){
 const root=deps.dialog(item.name,'<div id="project-detail-body" class="project-detail-body"><p class="muted">Загрузка…</p></div>');
 try{
  const details=await deps.api(`/api/projects/${encodeURIComponent(item.id)}`) as ProjectDetails;if(!document.body.contains(root))return;
  const p=details.project,status=runtimeStatus(p),recent=details.activity.slice(-8).reverse();
  root.innerHTML=`<div class="project-detail-grid"><div><small>СТАТУС</small><strong>${esc(status.label)}</strong></div><div><small>СТУДИЯ</small><strong>${esc(studioName(p.studioId))}</strong></div><div><small>ВЛАДЕЛЕЦ</small><strong>${esc(p.ownerName)}</strong></div><div><small>СОЗДАН</small><strong>${esc(new Date(p.createdAt).toLocaleDateString())}</strong></div></div><p>${esc(p.description||'Описание пока не добавлено.')}</p><div class="project-tags">${p.tags.map(t=>`<span>${esc(t)}</span>`).join('')}</div><div class="project-detail-stats"><span>${p.artifactsCount} артефактов</span><span>${p.versionsCount} версий</span><span>${p.missionCount} миссий</span></div><h3>Последняя активность</h3><div class="project-activity">${recent.length?recent.map(e=>`<div><span>${esc(e.type)}</span><time>${esc(relativeTime(e.created_at))}</time></div>`).join(''):'<p class="muted">Событий пока нет.</p>'}</div><div id="project-detail-actions" class="toolbar"></div>`;
  const actions=root.querySelector<HTMLElement>('#project-detail-actions')!;
  const exportButton=document.createElement('button');exportButton.textContent='Экспорт ZIP';exportButton.onclick=()=>deps.blobAPI(`/api/studio/project-zip?projectId=${encodeURIComponent(p.id)}`).then(async blob=>(await import('./media')).download(blob,`${p.name.replace(/[^\p{L}\p{N}._-]+/gu,'-')||'azrail-project'}.zip`)).catch(deps.failure);actions.append(exportButton);
  if(deps.account?.role!=='viewer'){
   const edit=document.createElement('button');edit.textContent='Изменить';edit.onclick=()=>editProject(p,deps,refresh);actions.append(edit);
   const duplicate=document.createElement('button');duplicate.textContent='Дублировать';duplicate.onclick=()=>duplicateProject(p,deps,refresh);actions.append(duplicate);
   const archive=document.createElement('button');archive.textContent=p.status==='archived'?'Вернуть из архива':'В архив';archive.onclick=()=>deps.api(`/api/projects/${encodeURIComponent(p.id)}`,{method:'PATCH',body:JSON.stringify({status:p.status==='archived'?'active':'archived'})}).then(async()=>{deps.closeDialog();await refresh();deps.notice(p.status==='archived'?'Проект возвращён из архива.':'Проект перемещён в архив.');}).catch(deps.failure);actions.append(archive);
   if(p.status==='deleted'){
    const restore=document.createElement('button');restore.textContent='Восстановить';restore.onclick=()=>deps.api(`/api/projects/${encodeURIComponent(p.id)}`,{method:'PATCH',body:JSON.stringify({status:'active'})}).then(async()=>{deps.closeDialog();await refresh();deps.notice('Проект восстановлен.');}).catch(deps.failure);actions.append(restore);
   } else {
    const remove=document.createElement('button');remove.className='danger-button';remove.textContent='Удалить…';remove.onclick=()=>deleteProject(p,deps,refresh);actions.append(remove);
   }
  }
 }catch(error){root.textContent=error instanceof Error?error.message:String(error);}
}

function editProject(project:ProjectSummary,deps:Deps,refresh:()=>Promise<void>){
 const root=deps.dialog('Параметры проекта',`<label for="project-edit-name">Название</label><input id="project-edit-name" maxlength="120"><label for="project-edit-description">Описание</label><textarea id="project-edit-description" rows="4" maxlength="1200"></textarea><label for="project-edit-studio">Основная студия</label><select id="project-edit-studio"><option value="">AZRAIL Core</option>${Object.entries(studioNames).map(([id,name])=>`<option value="${id}">${esc(name)}</option>`).join('')}</select><label for="project-edit-tags">Теги · через запятую</label><input id="project-edit-tags" maxlength="240" placeholder="production, website, label"><div class="toolbar"><button id="project-edit-save" class="primary">Сохранить</button></div>`);
 const name=root.querySelector<HTMLInputElement>('#project-edit-name')!,desc=root.querySelector<HTMLTextAreaElement>('#project-edit-description')!,studio=root.querySelector<HTMLSelectElement>('#project-edit-studio')!,tags=root.querySelector<HTMLInputElement>('#project-edit-tags')!;
 name.value=project.name;desc.value=project.description;studio.value=project.studioId??'';tags.value=project.tags.join(', ');name.focus();
 root.querySelector<HTMLButtonElement>('#project-edit-save')!.onclick=()=>{const button=root.querySelector<HTMLButtonElement>('#project-edit-save')!;if(button.disabled)return;button.disabled=true;const payload={name:name.value,description:desc.value,studioId:studio.value||null,tags:tags.value.split(',').map(v=>v.trim()).filter(Boolean)};deps.api(`/api/projects/${encodeURIComponent(project.id)}`,{method:'PATCH',body:JSON.stringify(payload)}).then(async()=>{deps.closeDialog();await refresh();deps.notice('Проект обновлён.');}).catch(deps.failure).finally(()=>button.disabled=false);};
}

function duplicateProject(project:ProjectSummary,deps:Deps,refresh:()=>Promise<void>){
 const root=deps.dialog('Дублировать проект',`<p>Будет скопировано текущее рабочее состояние проекта. История миссий и старые версии останутся у оригинала.</p><label for="project-duplicate-name">Название копии</label><input id="project-duplicate-name" maxlength="120"><div class="toolbar"><button id="project-duplicate-run" class="primary">Создать копию</button></div>`);const input=root.querySelector<HTMLInputElement>('#project-duplicate-name')!;input.value=`${project.name} — копия`;input.select();
 root.querySelector<HTMLButtonElement>('#project-duplicate-run')!.onclick=()=>{const button=root.querySelector<HTMLButtonElement>('#project-duplicate-run')!;button.disabled=true;deps.api(`/api/projects/${encodeURIComponent(project.id)}/duplicate`,{method:'POST',body:JSON.stringify({name:input.value})}).then(async(r:{project:ProjectSummary;copiedFiles:number})=>{deps.closeDialog();await refresh();deps.notice(`Копия создана · файлов: ${r.copiedFiles}.`);}).catch(deps.failure).finally(()=>button.disabled=false);};
}

function deleteProject(project:ProjectSummary,deps:Deps,refresh:()=>Promise<void>){
 const root=deps.dialog('Удалить проект',`<p>Проект исчезнет из активного списка, но данные не уничтожаются сразу: это безопасное удаление, которое можно восстановить через фильтр «Удалённые».</p><p>Для подтверждения введите точное название:</p><p><strong id="project-delete-name"></strong></p><input id="project-delete-confirm" autocomplete="off"><div class="toolbar"><button id="project-delete-run" class="danger-button">Удалить проект</button></div>`);root.querySelector<HTMLElement>('#project-delete-name')!.textContent=project.name;const input=root.querySelector<HTMLInputElement>('#project-delete-confirm')!,button=root.querySelector<HTMLButtonElement>('#project-delete-run')!;button.disabled=true;input.oninput=()=>button.disabled=input.value!==project.name;input.focus();button.onclick=()=>{if(input.value!==project.name)return;button.disabled=true;deps.api(`/api/projects/${encodeURIComponent(project.id)}`,{method:'DELETE',headers:{'X-AZRAIL-Confirm-Project':project.id},body:JSON.stringify({confirmName:project.name})}).then(async()=>{deps.closeDialog();await refresh();deps.notice('Проект перемещён в удалённые.');}).catch(deps.failure).finally(()=>button.disabled=false);};
}

async function loadArtifacts(deps:Deps){
 const list=$('artifact-list');list.replaceChildren();if(!deps.account){list.textContent='Файлы студий появятся после входа.';return;}
 const response=await deps.api('/api/studio/artifacts') as {artifacts:Array<{id:string;name:string;mime:string;bytes:number;created_at:number}>};
 for(const item of response.artifacts.slice(0,12)){const card=document.createElement('button');card.className='artifact-row';const title=document.createElement('span');title.textContent=item.name;const meta=document.createElement('small');meta.textContent=`${bytes(item.bytes)} · ${relativeTime(item.created_at)}`;card.append(title,meta);card.onclick=()=>deps.blobAPI(`/api/studio/artifacts/${item.id}`).then(async b=>(await import('./media')).download(b,item.name)).catch(deps.failure);list.append(card);}if(!response.artifacts.length)list.textContent='Здесь появятся сохранённые файлы студий.';
}

export async function renderProjectCenter(deps:Deps){
 const list=$('project-list'),summary=$('project-summary');
 const refresh=async()=>{
  if(!deps.account){list.textContent=deps.local?'Проекты доступны после развёртывания приложения и входа.':'Войдите, чтобы увидеть проекты.';summary.textContent='';await loadArtifacts(deps);return;}
  list.setAttribute('aria-busy','true');summary.textContent='Загрузка…';
  try{const q=queryString(),response=await deps.api(`/api/projects${q?'?'+q:''}`) as {projects:ProjectSummary[];total:number};list.replaceChildren();for(const item of response.projects)list.append(projectCard(item,deps,refresh));if(!response.projects.length)list.innerHTML='<div class="project-empty"><strong>Проекты не найдены.</strong><span>Измените фильтр или создайте новый проект.</span></div>';summary.textContent=`Показано проектов: ${response.total}`;await loadArtifacts(deps);}finally{list.setAttribute('aria-busy','false');}
 };
 const search=$<HTMLInputElement>('project-search');search.oninput=()=>{clearTimeout(searchTimer);searchTimer=window.setTimeout(()=>refresh().catch(deps.failure),260);};
 for(const id of ['project-sort','project-status-filter','project-studio-filter'])$<HTMLSelectElement>(id).onchange=()=>refresh().catch(deps.failure);
 $('refresh-projects').onclick=()=>refresh().catch(deps.failure);
 $('new-project').onclick=()=>{if(!deps.account){deps.failure(Error('Войдите, чтобы создать проект.'));return;}deps.api('/api/projects',{method:'POST',body:JSON.stringify({name:'Новый проект'})}).then((r:{project:ProjectSummary})=>{deps.notice('Новый проект создан.');deps.onOpen(r.project);}).catch(deps.failure);};
 await refresh();
}
