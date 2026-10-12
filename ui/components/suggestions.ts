import type {StudioCapability,StudioId} from '../studio-types';

export type Suggestion={id:string;label:string;prompt:string;kind?:'primary'|'secondary';reason?:string;score?:number};
export type SuggestionContext={
 surface:'chat'|StudioId;
 projectId?:string;
 selectedFiles?:readonly string[];
 lastUserMessage?:string;
 lastAgentResult?:string;
 activeModel?:string;
 capabilities?:readonly StudioCapability[];
 errors?:readonly string[];
 budgetState?:'ok'|'warning'|'blocked';
 hasResult?:boolean;
 remoteSuggestions?:readonly Suggestion[];
};

const suggestions:Record<StudioId,readonly Suggestion[]>={
 web:[
  {id:'web-mobile',label:'Проверить мобильную версию',prompt:'Проверь текущий интерфейс на мобильных ширинах и исправь overflow, touch targets и адаптивность.',kind:'primary'},
  {id:'web-a11y',label:'Проверить доступность',prompt:'Проведи accessibility review текущего интерфейса: клавиатура, focus, contrast, labels и формы.'},
  {id:'web-compact',label:'Сделать дизайн компактнее',prompt:'Сделай выбранный интерфейс компактнее, сохранив иерархию, адаптивность и читаемость.'},
  {id:'web-qa',label:'Запустить browser QA',prompt:'Проведи browser QA: console errors, failed requests, формы, responsive и keyboard navigation.'},
  {id:'web-code',label:'Проверить код компонента',prompt:'Найди исходный компонент выбранного элемента и проверь его логику, стили и состояния.'},
  {id:'web-deploy',label:'Подготовить deploy',prompt:'Проверь готовность проекта к staging deploy без выполнения production mutation.'},
 ],
 image:[
  {id:'image-variants',label:'Сделать варианты',prompt:'Создай контролируемые варианты текущего изображения, сохранив ключевую композицию и визуальную идентичность.',kind:'primary'},
  {id:'image-bg',label:'Поменять фон',prompt:'Подготовь edit текущего изображения с заменой фона, не изменяя основной объект.'},
  {id:'image-upscale',label:'Поднять качество',prompt:'Подготовь upscale текущего изображения с сохранением композиции, цвета и идентичности объекта.'},
  {id:'image-style',label:'Зафиксировать стиль',prompt:'Опиши визуальный стиль текущего изображения как reusable style brief для следующих генераций.'},
  {id:'image-review',label:'Проверить артефакты',prompt:'Проведи QA изображения: артефакты, текст, края, контраст, crop и разрешение.'},
 ],
 music:[
  {id:'music-structure',label:'Проанализировать структуру',prompt:'Проанализируй структуру трека: intro, groove, build, breakdown, drop, bridge и outro.',kind:'primary'},
  {id:'music-midi',label:'Создать MIDI-план',prompt:'Подготовь MIDI и arrangement plan для Melodic House & Techno на основе текущих параметров.'},
  {id:'music-loudness',label:'Проверить громкость',prompt:'Проведи измеримый анализ loudness/dynamics и укажи, какие параметры требуют коррекции.'},
  {id:'music-camelot',label:'Показать Camelot',prompt:'Определи гармонический контекст и представь тональность в Camelot notation.'},
  {id:'music-reference',label:'Сравнить с reference',prompt:'Сравни текущую версию с reference по темпу, структуре, энергии, гармонии и балансу, не копируя исходный материал.'},
  {id:'music-prompt',label:'Собрать production prompt',prompt:'Собери профессиональный production brief: tempo, key, Camelot, structure, energy, rhythm, bass, harmony, mix и master targets.'},
 ],
 video:[
  {id:'video-next',label:'Создать следующий shot',prompt:'Предложи следующий shot, согласованный с текущим storyboard и visual continuity.',kind:'primary'},
  {id:'video-continuity',label:'Проверить continuity',prompt:'Проверь continuity персонажей, света, локации, камеры, props и цветовой палитры между сценами.'},
  {id:'video-voice',label:'Добавить voice-over',prompt:'Подготовь voice-over plan и тайминг для текущего видео.'},
  {id:'video-preview',label:'Render preview',prompt:'Подготовь безопасный proxy preview перед финальным render.'},
  {id:'video-qa',label:'Проверить видео',prompt:'Проведи QA: flicker, continuity, frame errors, captions и audio clipping.'},
 ],
 audio:[
  {id:'audio-loudness',label:'Измерить LUFS',prompt:'Проанализируй loudness, true peak, dynamics и clipping текущего аудио.',kind:'primary'},
  {id:'audio-key',label:'Проверить BPM / Key',prompt:'Определи BPM, key и confidence без выдуманных значений.'},
  {id:'audio-compare',label:'Сравнить reference',prompt:'Сравни текущий файл с reference по измеримым аудиопараметрам.'},
 ],
 als:[
  {id:'als-plugins',label:'Проверить plugins',prompt:'Проверь missing/inactive plugins и предложи безопасные варианты восстановления.',kind:'primary'},
  {id:'als-routing',label:'Проверить routing',prompt:'Проверь routing, sidechain topology и потенциальные циклы проекта.'},
  {id:'als-arrangement',label:'Разобрать arrangement',prompt:'Проанализируй arrangement проекта по секциям, tracks, clips и сценам.'},
 ],
 data:[
  {id:'data-quality',label:'Проверить качество данных',prompt:'Проведи validation данных: schema, nulls, outliers, duplicates и type conflicts.',kind:'primary'},
  {id:'data-summary',label:'Сделать сводку',prompt:'Сделай краткую аналитическую сводку текущего набора данных.'},
 ],
 ledger:[
  {id:'ledger-cost',label:'Найти перерасход',prompt:'Проверь spend, reserved cost, retries и uncertain calls на аномалии.',kind:'primary'},
  {id:'ledger-latency',label:'Проверить latency',prompt:'Найди модели/агентов с повышенной latency и ошибками.'},
 ],
 lab:[
  {id:'lab-failed',label:'Разобрать failed step',prompt:'Найди последний failed/blocking signal и объясни безопасный следующий шаг.',kind:'primary'},
  {id:'lab-trace',label:'Открыть trace',prompt:'Покажи trace цепочку mission → agent → tool → provider → result для последней проблемы.'},
  {id:'lab-checkpoint',label:'Продолжить с checkpoint',prompt:'Определи последний безопасный checkpoint и план продолжения без повторения внешних эффектов.'},
  {id:'lab-cost',label:'Снизить стоимость',prompt:'Найди безопасные способы снизить стоимость миссии без потери критичных проверок.'},
 ],
};

function chatSuggestions(context:SuggestionContext):Suggestion[]{
 const text=(context.lastUserMessage??'').toLowerCase();
 if(context.errors?.length||/(ошиб|error|failed|exception)/.test(text))return [
  {id:'chat-fix',label:'Исправить ошибку',prompt:'Найди причину текущей ошибки, исправь минимально необходимый код и проверь связанные сценарии.',kind:'primary'},
  {id:'chat-explain',label:'Объяснить причину',prompt:'Объясни корневую причину ошибки и какие файлы/состояния с ней связаны.'},
  {id:'chat-related',label:'Проверить связанные файлы',prompt:'Проверь связанные с ошибкой файлы и найди вторичные регрессии.'},
  {id:'chat-rollback',label:'Подготовить безопасный откат',prompt:'Определи последнюю стабильную точку и подготовь безопасный план отката без выполнения необратимых действий.'},
 ];
 return [
  {id:'chat-audit',label:'Проанализировать проект',prompt:'Проведи архитектурный анализ текущего проекта и перечисли приоритетные улучшения.',kind:'primary'},
  {id:'chat-errors',label:'Найти ошибки',prompt:'Проверь текущий проект на синтаксические, логические, типизационные и UX ошибки.'},
  {id:'chat-feature',label:'Создать функцию',prompt:'Помоги спроектировать и реализовать следующую функцию проекта без заглушек.'},
  {id:'chat-continue',label:'Продолжить последнюю миссию',prompt:'Продолжи последнюю незавершённую миссию с последней безопасной точки.'},
 ];
}

function getSuggestions(context:SuggestionContext):Suggestion[]{
 const base=context.surface==='chat'?chatSuggestions(context):[...suggestions[context.surface]];
 const merged=[...(context.remoteSuggestions??[]),...base],seen=new Set<string>();
 const unique=merged.filter(item=>!seen.has(item.id)&&seen.add(item.id));
 if(context.budgetState==='blocked')return unique.filter(item=>!/render|generation|созда|рендер/i.test(item.prompt)).slice(0,6);
 return unique.slice(0,6);
}

export function mountSuggestionBar(host:HTMLElement,context:SuggestionContext,onSelect:(suggestion:Suggestion)=>void){
 const render=(next:SuggestionContext)=>{
  host.replaceChildren();host.className='suggestion-bar';host.setAttribute('aria-label','Рекомендуемые следующие действия');
  const head=document.createElement('div');head.className='suggestion-head';const title=document.createElement('strong');title.textContent='Следующий шаг';const note=document.createElement('span');note.textContent='Контекстные подсказки';head.append(title,note);host.append(head);
  const row=document.createElement('div');row.className='suggestion-chips';for(const suggestion of getSuggestions(next)){const button=document.createElement('button');button.type='button';button.className='suggestion-chip';if(suggestion.kind==='primary')button.dataset.kind='primary';button.textContent=suggestion.label;if(suggestion.reason)button.title=suggestion.reason;button.onclick=()=>onSelect(suggestion);row.append(button);}host.append(row);
 };
 render(context);return {update:render,destroy:()=>host.replaceChildren()};
}
