export function missionFailureLine(raw:string):string{
 const reason=raw.replace(/^Результат шага неопределён; повтор остановлен:\s*/i,'').replace(/\s+/g,' ').trim();
 if(/search обязателен|фрагмент для замены/i.test(reason))return 'Правка файла не началась: не был указан фрагмент для замены. Файл не изменён. Уже сделанные шаги сохранены. Продолжить можно из Mission Control.';
 if(!reason)return 'Миссия остановлена. Причина не записана. Уже сделанные шаги сохранены. Продолжить можно из Mission Control.';
 return `Миссия остановлена. ${reason.slice(0,280)} Уже сделанные шаги сохранены. Продолжить можно из Mission Control.`;
}
export function visibleMissionText(summary:string,error:string):string{
 if(summary.includes('внутренней ошибки')&&error)return missionFailureLine(error);
 if(summary)return summary;
 if(error)return missionFailureLine(error);
 return '';
}
