import type {StudioId,StudioMeta} from './studio-types';

// Brand Governance Directive: canonical English names are immutable without owner approval.
// Russian text stays in the descriptor so the user immediately understands the studio purpose.
export const studioManifest = [
 {id:'web',icon:'code',title:'Web Studio',description:'Сайты, веб-приложения, интерфейсы, исходный код, адаптивность, проверка качества и подготовка к развёртыванию.',type:'AZRAIL',action:'Создать проект',cloud:true,capabilities:['mission','cloud-write']},
 {id:'image',icon:'image',title:'Image Studio',description:'Генерация и редактирование изображений, варианты, референсы, повышение качества, проверка и экспорт.',type:'WORKERS AI',action:'Создать изображение',cloud:true,capabilities:['image-generation','cloud-write']},
 {id:'music',icon:'music',title:'Music Studio',description:'Создание и анализ музыки, MIDI, структура, Camelot, референсы, WAV/MIDI и продакшн-процесс.',type:'LOCAL ENGINE',action:'Создать музыку',cloud:false,capabilities:['music-generation']},
 {id:'video',icon:'video',title:'Video Studio',description:'Раскадровка, сцены, таймлайн, медиа, звук, быстрый предпросмотр, очередь рендера, проверка и экспорт.',type:'ГИБРИД',action:'Создать видео',cloud:false,capabilities:['video-generation']},
 {id:'lab',icon:'pulse',title:'Pulse Lab',description:'Системный контроль: среда выполнения, доступ, хранилища, AI, доказательства релиза, состояние и восстановление без синтетических платных запросов.',type:'SYSTEM CONTROL',action:'Обновить систему',cloud:false,capabilities:['system-diagnostics']},
 {id:'ledger',icon:'ledger',title:'Ledger Studio',description:'Расходы, бюджеты, токены, медиа, инструменты, задержки, повторы, сверка эффектов и аномалии.',type:'ОБЛАКО',action:'Обновить Ledger',cloud:true,capabilities:['ledger-read']},
 {id:'data',icon:'table',title:'Data Studio',description:'Данные, определение схемы, валидация, фильтрация, сортировка, статистика, графики, преобразования и экспорт.',type:'НА УСТРОЙСТВЕ',action:'Анализировать данные',cloud:false,capabilities:['data-analysis']},
 {id:'als',icon:'ableton',title:'Ableton Lab',description:'Анализ Ableton Live Set: дорожки, клипы, устройства и плагины, маршрутизация, сэмплы, мастер-цепь и отчёт о недостающих ресурсах.',type:'ОБЛАКО',action:'Анализировать ALS',cloud:true,capabilities:['ableton-analysis','cloud-write']},
 {id:'audio',icon:'waveform',title:'Audio Lab',description:'Измеряемый анализ аудио: LUFS, true peak, динамика, стерео, BPM и тональность, форма волны, спектр и A/B-сравнение.',type:'НА УСТРОЙСТВЕ',action:'Анализировать аудио',cloud:false,capabilities:['audio-analysis']},
] as const satisfies readonly StudioMeta[];

export function studioMeta(id:StudioId):StudioMeta {
 const studio=studioManifest.find(item=>item.id===id);
 if(!studio)throw new Error(`Unknown studio: ${id}`);
 return studio;
}
export function studioById(id:string):StudioMeta|undefined { return studioManifest.find(studio=>studio.id===id); }
