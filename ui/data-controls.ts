import type {ChatThread} from './chat-history';

export const RETENTION_KEY='pulse.chatRetentionDays';
export const RETENTION_OPTIONS:ReadonlyArray<{days:number;label:string}>=[
 {days:0,label:'Хранить без ограничения'},
 {days:30,label:'30 дней'},
 {days:90,label:'90 дней'},
 {days:365,label:'1 год'},
];
const DAY=86400000;

export function readRetention(storage:Pick<Storage,'getItem'>|undefined):number{
 try{const days=Number(storage?.getItem(RETENTION_KEY)??0);return RETENTION_OPTIONS.some(item=>item.days===days)?days:0;}catch{return 0;}
}
export function saveRetention(storage:Pick<Storage,'setItem'>|undefined,days:number):boolean{
 if(!RETENTION_OPTIONS.some(item=>item.days===days))return false;
 try{storage?.setItem(RETENTION_KEY,String(days));return !!storage;}catch{return false;}
}

/** Закреплённые, текущий чат и чаты моложе срока остаются. */
export function expiredThreads(threads:ChatThread[],days:number,now:number,keepId=''):string[]{
 if(!(days>0))return [];
 const edge=now-days*DAY;
 return threads.filter(thread=>!thread.pinned&&thread.id!==keepId&&Number.isFinite(thread.updatedAt)&&thread.updatedAt<edge).map(thread=>thread.id);
}

export type MemoryItem={id:string;scope:string;key:string;value:unknown;source?:string;whyStored?:string;confidence?:number;expiresAt?:number|null;createdAt?:number;updatedAt?:number};
export type ExportInput={account:string;threads:ChatThread[];memory:MemoryItem[];memoryError?:string;now:Date};

export function buildExport(input:ExportInput){
 return {
  format:'azrail-pulse-export',
  version:1,
  exportedAt:input.now.toISOString(),
  account:input.account,
  chats:input.threads.map(thread=>({id:thread.id,title:thread.title,projectId:thread.projectId,updatedAt:new Date(thread.updatedAt).toISOString(),pinned:thread.pinned,archived:thread.archived,turns:thread.turns.map(turn=>({user:turn.user,reply:turn.reply,status:turn.status}))})),
  memory:input.memory,
  ...(input.memoryError?{memoryError:input.memoryError}:{}),
  notes:['Чаты взяты с этого устройства.','Память получена с сервера на момент экспорта.','Файлы проектов скачиваются отдельно из раздела проектов (ZIP).'],
 };
}
export function exportFileName(now:Date):string{return `azrail-pulse-export-${now.toISOString().slice(0,10)}.json`;}

export type DataControlsDeps={
 storage:Storage|undefined;
 accountName:()=>string;
 threads:()=>ChatThread[];
 keepId:()=>string;
 removeThread:(id:string)=>void;
 loadMemory:()=>Promise<MemoryItem[]>;
 save:(name:string,bytes:Uint8Array)=>void;
 notice:(message:string,persist?:boolean)=>void;
 failure:(error:unknown)=>void;
 now?:()=>Date;
};

/** Удаляет локальные чаты старше срока. Возвращает число удалённых. */
export function applyRetention(deps:Pick<DataControlsDeps,'storage'|'threads'|'keepId'|'removeThread'|'now'>):number{
 const days=readRetention(deps.storage);
 const ids=expiredThreads(deps.threads(),days,(deps.now?.()??new Date()).getTime(),deps.keepId());
 for(const id of ids)deps.removeThread(id);
 return ids.length;
}

export function renderDataControls(host:HTMLElement,deps:DataControlsDeps){
 const make=<K extends keyof HTMLElementTagNameMap>(tag:K,text='',className='')=>{const el=document.createElement(tag);if(text)el.textContent=text;if(className)el.className=className;return el;};
 const exportBox=make('section','','card');
 exportBox.append(make('h3','Экспорт данных'),make('p','Один JSON-файл: чаты с этого устройства и память с сервера. Файлы проектов скачиваются отдельно ZIP-архивом из раздела проектов.','muted'));
 const exportButton=make('button','Скачать мои данные');
 exportButton.type='button';
 exportButton.className='primary';
 exportButton.onclick=()=>{
  exportButton.disabled=true;
  const now=(deps.now?.()??new Date());
  void deps.loadMemory().then(memory=>({memory,memoryError:undefined as string|undefined}),error=>({memory:[] as MemoryItem[],memoryError:error instanceof Error?error.message:'Память недоступна.'}))
   .then(({memory,memoryError})=>{
    const data=buildExport({account:deps.accountName(),threads:deps.threads(),memory,memoryError,now});
    deps.save(exportFileName(now),new TextEncoder().encode(JSON.stringify(data,null,2)));
    deps.notice(memoryError?`Экспорт сохранён без памяти: ${memoryError}`:'Экспорт сохранён.',!!memoryError);
   }).catch(deps.failure).finally(()=>{exportButton.disabled=false;});
 };
 exportBox.append(exportButton);

 const keepBox=make('section','','card');
 keepBox.append(make('h3','Срок хранения чатов'),make('p','Чаты старше срока удаляются на этом устройстве при запуске. Закреплённые и открытый чат остаются. Серверная копия не удаляется: её убирает «Удалить чат» в меню чата.','muted'));
 const select=make('select');
 select.setAttribute('aria-label','Срок хранения чатов');
 for(const option of RETENTION_OPTIONS){const el=make('option',option.label);el.value=String(option.days);select.append(el);}
 select.value=String(readRetention(deps.storage));
 const status=make('p','','muted');
 const show=()=>{const old=expiredThreads(deps.threads(),readRetention(deps.storage),(deps.now?.()??new Date()).getTime(),deps.keepId()).length;status.textContent=readRetention(deps.storage)?`Под удаление сейчас: ${old}.`:'Автоудаление выключено.';};
 select.onchange=()=>{
  if(!saveRetention(deps.storage,Number(select.value))){deps.notice('Браузер не разрешил сохранить срок хранения.',true);select.value=String(readRetention(deps.storage));}
  else deps.notice('Срок хранения сохранён на этом устройстве.');
  show();
 };
 const apply=make('button','Удалить старые чаты сейчас');
 apply.type='button';
 apply.onclick=()=>{
  const count=expiredThreads(deps.threads(),readRetention(deps.storage),(deps.now?.()??new Date()).getTime(),deps.keepId()).length;
  if(!count){deps.notice('Старых чатов нет.');return;}
  if(!window.confirm(`Удалить ${count} чат(ов) на этом устройстве?`))return;
  deps.notice(`Удалено чатов: ${applyRetention(deps)}.`);
  show();
 };
 show();
 keepBox.append(select,status,apply);
 host.append(exportBox,keepBox);
}
