import type {StudioId,StudioMeta} from '../studio-types';

const actions:Record<StudioId,readonly string[]>={
 web:['Новый сайт','Импорт проекта','Анализ существующего UI','Создать страницу','Исправить responsive'],
 image:['Product image','UI mockup','Social creative','Edit existing image','Generate from reference'],
 music:['Создать session','Загрузить reference','Проанализировать structure','Собрать production brief','Открыть Camelot'],
 video:['Создать storyboard','Добавить shots','Добавить assets','Preview','Render'],
 audio:['Загрузить аудио','Измерить LUFS','Проверить BPM/Key','Сравнить reference'],
 als:['Загрузить Ableton Set','Проверить plugins','Проверить routing','Проанализировать arrangement'],
 data:['Загрузить CSV/JSON','Проверить schema','Найти anomalies','Построить chart'],
 ledger:['Показать spend','Проверить budget','Найти retries','Проверить uncertain calls'],
 lab:['Проверить runtime','Открыть health','Проверить release evidence','Разобрать blockers'],
};

export function renderSmartEmptyState(host:HTMLElement,meta:StudioMeta){
 if(host.childElementCount||host.textContent?.trim())return;
 const shell=document.createElement('section');shell.className='studio-empty-state';const title=document.createElement('strong');title.textContent='Начните с понятного следующего шага';const note=document.createElement('p');note.textContent=`${meta.title}: выберите действие выше или используйте один из сценариев ниже.`;const list=document.createElement('div');list.className='studio-empty-actions';for(const label of actions[meta.id]){const chip=document.createElement('span');chip.textContent=label;list.append(chip);}shell.append(title,note,list);host.append(shell);
}
