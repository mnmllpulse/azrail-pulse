type Item = Record<string, unknown>;
export interface MissionReport {
 mission?: Item; status?: string; result?: Item | null;
 plan?: Item[]; calls?: Item[]; checks?: Item[]; events?: Item[];
}
const labels: Record<string,string> = {queued:'Задача принята',planning:'Составляю план',executing:'Выполняю задачу',verifying:'Проверяю результат',waiting_approval:'Нужно ваше действие',completed:'Проверено · завершено',unverified:'Завершено без подтверждения',failed:'Работа остановлена',cancelling:'Останавливаю задачу',cancelled:'Задача отменена'};
const tools: Record<string,string> = {read_file:'Чтение файла',write_file:'Создание файла',edit_file:'Правка файла',apply_patch:'Изменение кода',list_files:'Просмотр проекта',search_files:'Поиск в проекте',call_model:'Анализ задачи',sandbox_test:'Проверка проекта',sandbox_exec:'Выполнение команды',run_tests:'Запуск тестов',connector_call:'Внешний инструмент',connector_search:'Поиск инструмента'};
const text=(value:unknown,fallback='')=>typeof value==='string'?value.slice(0,10000):fallback;
export function renderMission(root: Document, report: MissionReport, operator=false) {
 const get=(id:string)=>root.getElementById(id)!;
 const m=report.mission??report, status=text(m.status,'queued');
 get('mission-panel').hidden=false;
 get('mission-status').textContent=labels[status]??'Обновляю состояние';
 const summary=text(report.result?.summary)||text(report.result?.error)||({queued:'Можно закрыть страницу. Состояние задачи сохраняется на сервере.',planning:'Разбиваю вашу идею на конкретные шаги.',executing:'Результат появится здесь. Можно вернуться к задаче позже.',verifying:'Проверяю созданные файлы и доступные тесты.',waiting_approval:'Откройте детали ниже, чтобы узнать причину остановки.',failed:'Откройте детали ошибки. Продолжение доступно, если сервер подтвердит возможность восстановления.',cancelled:'Дальнейшие шаги остановлены. Уже отправленные внешние операции могут завершиться.',completed:'Все обязательные проверки подтверждены. Результат готов.',unverified:'Работа сохранена, но обязательные проверки подтверждены не полностью. Не публикуйте результат как проверенный.'} as Record<string,string>)[status]||'Состояние получено с сервера.';
 get('mission-summary').textContent=summary;
 const plan=Array.isArray(report.plan)?report.plan:[], list=get('mission-plan');list.replaceChildren();
 for(const step of plan.slice(0,12)) {const li=root.createElement('li');const state=text(step.status);li.dataset.state=state;li.textContent=`${state==='done'?'✓':state==='doing'?'→':state==='skipped'?'—':'○'} ${text(step.title,'Шаг')}`;if(state==='doing')li.setAttribute('aria-current','step');list.append(li);}
 const done=plan.filter(s=>s.status==='done'||s.status==='skipped').length;
 const progress=get('mission-progress') as HTMLProgressElement;progress.hidden=!plan.length;progress.max=plan.length||1;progress.value=done;
 get('mission-progress-label').textContent=plan.length?`Завершено шагов: ${done} из ${plan.length}`:'';
 const activity=get('mission-activity');activity.replaceChildren();
 for(const call of (report.calls??[]).slice(-5)){const p=root.createElement('p');p.className='muted';p.textContent=`${tools[text(call.tool)]??'Инструмент'} · ${call.status==='done'?'готово':call.status==='failed'?'ошибка':'в работе'}`;activity.append(p);}
 // A permissive/unavailable model checker is not a successful code test.
 const check=(report.events??[]).filter(e=>['check.passed','check.unverified','check.rejected'].includes(text(e.type))).at(-1);
 const tests=(report.events??[]).filter(e=>['tests.verified','tests.failed','tests.unavailable'].includes(text(e.type))).at(-1);
 const assessment=check?.type==='check.passed'?'Оценка результата: принята.':check?.type==='check.rejected'?'Оценка результата: отклонена.':'Оценка результата: не подтверждена.';
 const quality=report.result?.quality&&typeof report.result.quality==='object'?report.result.quality as Item:null;
 const qualityStatus=text(quality?.status).toLowerCase();
 const qualityLabel=qualityStatus==='verified'?'Quality Gate: VERIFIED.':qualityStatus==='failed'?'Quality Gate: FAILED.':qualityStatus==='blocked'?'Quality Gate: BLOCKED.':qualityStatus==='unverified'?'Quality Gate: UNVERIFIED.':'';
 get('mission-checks').textContent=(qualityLabel?qualityLabel+' ':'')+assessment+' '+(tests?.type==='tests.verified'?'Запуск тестов: успешен.':tests?.type==='tests.failed'?'Запуск тестов: обнаружены ошибки.':'Подтверждённого результата тестов пока нет.');
 get('mission-output').textContent=JSON.stringify(report,null,2);
 const terminal=['completed','unverified','failed','cancelled'].includes(status);
 get('cancel').hidden=terminal;
 get('recover').hidden=!['failed','waiting_approval'].includes(status);
 get('permit-sandbox').hidden=!(operator&&status==='waiting_approval');
 get('mission-connection').textContent='';
 return {status,active:!terminal&&status!=='waiting_approval'};
}
