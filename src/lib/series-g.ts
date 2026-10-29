export type SystemSurface='chat'|'web'|'image'|'music'|'video'|'audio'|'als'|'data'|'ledger'|'lab'|'prose';
export type SystemSuggestion={id:string;label:string;prompt:string;reason:string;score:number;kind?:'primary'|'secondary'};
export type SystemSuggestionContext={
 surface:SystemSurface;lastUserMessage?:string;hasResult?:boolean;errors?:string[];budgetState?:'ok'|'warning'|'blocked';
 missionStatus?:string;recentEventTypes?:string[];memoryScopes?:string[];assetKinds?:string[];uncertainEffects?:number;
};

const BASE:Record<SystemSurface,SystemSuggestion[]>={
 chat:[
  {id:'chat-audit',label:'Проанализировать проект',prompt:'Проведи архитектурный анализ текущего проекта и перечисли приоритетные улучшения.',reason:'Универсальный безопасный следующий шаг.',score:50,kind:'primary'},
  {id:'chat-errors',label:'Найти ошибки',prompt:'Проверь текущий проект на синтаксические, логические, типизационные и UX ошибки.',reason:'Подходит для неизвестного состояния проекта.',score:44},
  {id:'chat-continue',label:'Продолжить миссию',prompt:'Продолжи последнюю незавершённую миссию с последней безопасной точки.',reason:'Использует durable mission state.',score:42},
 ],
 web:[
  {id:'web-qa',label:'Запустить Browser QA',prompt:'Проведи browser QA: console errors, failed requests, формы, responsive и keyboard navigation.',reason:'Проверка пользовательского пути перед публикацией.',score:55,kind:'primary'},
  {id:'web-a11y',label:'Проверить доступность',prompt:'Проведи accessibility review текущего интерфейса: клавиатура, focus, contrast, labels и формы.',reason:'Снижает UX-риск.',score:48},
 ],
 image:[
  {id:'image-review',label:'Проверить результат',prompt:'Проведи professional review текущего изображения: critical, major, minor, improvement.',reason:'Закрывает качество перед export.',score:52,kind:'primary'},
  {id:'image-compare',label:'Сравнить A/B',prompt:'Сравни оригинал и текущую версию изображения по композиции, бренду и техническому качеству.',reason:'Использует Compare Mode.',score:47},
 ],
 music:[
  {id:'music-key',label:'Найти тональность',prompt:'Определи глобальную и локальную тональность, Camelot и confidence на измеренном аудио.',reason:'Базовый измеримый анализ.',score:55,kind:'primary'},
  {id:'music-compare',label:'Сравнить reference',prompt:'Сравни текущий трек с reference по измеримым параметрам и подготовь production brief.',reason:'Связывает analysis и production workflow.',score:48},
 ],
 video:[
  {id:'video-continuity',label:'Проверить continuity',prompt:'Проверь continuity между shots: character, clothing, lighting, location, camera, props и color palette.',reason:'Ключевой риск AI-video.',score:55,kind:'primary'},
  {id:'video-preview',label:'Render preview',prompt:'Собери безопасный proxy preview и проведи Video QA до финального render.',reason:'Дешёвый QA до финального рендера.',score:50},
 ],
 audio:[{id:'audio-loudness',label:'Измерить loudness',prompt:'Проанализируй LUFS, true peak, dynamics, clipping и stereo width.',reason:'Измеримый технический QA.',score:55,kind:'primary'}],
 als:[{id:'als-plugins',label:'Проверить plugins',prompt:'Проверь plugin compatibility по данным проекта без выдумывания локальной установки.',reason:'Fail-closed compatibility workflow.',score:55,kind:'primary'}],
 data:[{id:'data-quality',label:'Проверить данные',prompt:'Проведи schema/validation/nulls/outliers/duplicates/type conflicts.',reason:'Базовый data quality gate.',score:55,kind:'primary'}],
 ledger:[{id:'ledger-cost',label:'Найти перерасход',prompt:'Проверь spend, reservations, retries, uncertain outcomes и budget headroom.',reason:'Resource Ledger safety.',score:55,kind:'primary'}],
 prose:[{id:'prose-draft',label:'Собрать три варианта',prompt:'Собери три оригинальных варианта текущего запроса в выбранном режиме Prose Studio.',reason:'Короткий текст перед сохранением.',score:55,kind:'primary'}],
 lab:[
  {id:'lab-failed',label:'Разобрать failed step',prompt:'Найди последний failed/blocking signal и безопасный следующий шаг.',reason:'Mission recovery.',score:55,kind:'primary'},
  {id:'lab-trace',label:'Открыть trace',prompt:'Покажи trace mission → agent → tool → provider → response.',reason:'Observability before retry.',score:50},
 ],
};

function boost(item:SystemSuggestion,amount:number,reason:string){return {...item,score:item.score+amount,reason:`${item.reason} ${reason}`.trim()};}
export function rankSystemSuggestions(context:SystemSuggestionContext):SystemSuggestion[]{
 const text=(context.lastUserMessage??'').toLowerCase();
 let rows=[...(BASE[context.surface]??BASE.chat)];
 if(context.errors?.length||/(ошиб|error|failed|exception)/.test(text)){
  rows.unshift({id:'system-fix-error',label:'Исправить ошибку',prompt:'Найди корневую причину текущей ошибки, исправь минимально необходимое и проверь связанные регрессии.',reason:'Контекст содержит ошибку/failed signal.',score:92,kind:'primary'});
 }
 if(context.uncertainEffects&&context.uncertainEffects>0){
  rows.unshift({id:'system-reconcile',label:'Сверить uncertain effect',prompt:'Останови автоматический retry и проведи reconciliation внешнего результата по evidence.',reason:'Есть uncertain external effect; повтор запрещён до reconciliation.',score:100,kind:'primary'});
 }
 if(context.missionStatus&&['failed','paused','waiting_approval','unverified'].includes(context.missionStatus)){
  rows.unshift({id:'system-recover-mission',label:'Продолжить безопасно',prompt:'Открой Metatron, найди последний безопасный checkpoint и предложи recovery без повторения внешних эффектов.',reason:`Mission status=${context.missionStatus}.`,score:88,kind:'primary'});
 }
 if(context.budgetState==='blocked')rows=rows.filter(item=>!/render|generate|созда|рендер/i.test(item.prompt)).map(item=>boost(item,3,'Budget blocked: expensive generation hidden.'));
 if(context.hasResult)rows.push({id:'system-review',label:'Professional Review',prompt:'Проведи professional review результата и классифицируй findings как Critical / Major / Minor / Improvement.',reason:'Есть результат, следующий шаг — проверка качества.',score:58});
 if((context.assetKinds?.length??0)>0)rows.push({id:'system-assets',label:'Открыть связанные assets',prompt:'Покажи связанные с текущим проектом assets, их metadata, tags, versions, analysis и usage history.',reason:'В проекте есть Asset Intelligence evidence.',score:46});
 if((context.memoryScopes?.length??0)>0)rows.push({id:'system-memory',label:'Проверить память проекта',prompt:'Покажи использованную Global Memory с scope, TTL, source, confidence и причиной сохранения.',reason:'Доступна иерархическая память.',score:45});
 const seen=new Set<string>();return rows.sort((a,b)=>b.score-a.score).filter(row=>!seen.has(row.id)&&seen.add(row.id)).slice(0,8);
}

export const MEMORY_SCOPE_ORDER=['user','workspace','project','music','image','video','agent','session'] as const;
export type GlobalMemoryScope=typeof MEMORY_SCOPE_ORDER[number];
export type GlobalMemoryRecord={id:string;scope:GlobalMemoryScope;projectId?:string;studio?:string;key:string;value:unknown;source:string;whyStored:string;confidence:number;expiresAt?:number|null;createdAt:number;updatedAt:number};

export type UnifiedHistoryEntry={id:string;source:'event'|'task';type:string;domain:string;createdAt:number|string;summary:string;undoable:boolean;undoHint?:string};
export function undoContract(type:string):{undoable:boolean;hint?:string}{
 const contextual=/workspace|project|studio/i.test(type)
  ?' Open the subsystem history/snapshot surface to create a new restore revision when one exists.'
  :'';
 return{undoable:false,hint:`No proven event-level inverse is registered for this immutable evidence.${contextual}`};
}

export const REAL_E2E_JOURNEYS=[
 {id:'auth-project',label:'Authenticate → open project',requires:['live-url','auth']},
 {id:'studio-history',label:'Open studio → run bounded action → history evidence',requires:['live-url','auth']},
 {id:'mission-control',label:'Run mission → Metatron → trace/checkpoint',requires:['live-url','auth']},
 {id:'connector-read',label:'Connector Gateway read-only call → trace/ledger',requires:['live-url','auth','connector']},
 {id:'browser-qa',label:'Web Studio preview → real browser QA evidence',requires:['live-url','auth','browser']},
] as const;
export const BROWSER_QA_REQUIRED_CHECKS=['console-errors','failed-requests','forms','responsive','keyboard','accessibility','visual-overflow'] as const;
