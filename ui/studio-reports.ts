import type {analyzeCSV} from './data';
import {download} from './media';
import {makeElement as make} from './components/dom';
function table(headers:string[],rows:string[][]) {
 const wrap=make('div');wrap.className='table-wrap';const t=make('table'),thead=make('thead'),head=make('tr');
 headers.forEach(text=>head.append(make('th',text)));thead.append(head);t.append(thead);const body=make('tbody');
 rows.forEach(values=>{const row=make('tr');values.forEach(value=>row.append(make('td',value)));body.append(row);});t.append(body);wrap.append(t);return wrap;
}
function report(host:HTMLElement,value:unknown,name:string) {
 const details=make('details');details.append(make('summary','Полный отчёт JSON'),make('pre',JSON.stringify(value,null,2)));host.append(details);
 const button=make('button','Скачать отчёт JSON');button.onclick=()=>download(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}),name);host.append(button);
}
const number=(value:number|null|undefined)=>typeof value==='number'&&Number.isFinite(value)?String(Math.round(value*10000)/10000):'Нет данных';
export function renderCSV(host:HTMLElement,value:ReturnType<typeof analyzeCSV>) {
 host.replaceChildren(make('h2',`${value.rows} строк · ${value.columns.length} столбцов`));
 if(value.raggedRows)host.append(make('p',`Проверьте ${value.raggedRows} строк: число ячеек отличается от заголовка.`));
 host.append(table(['Столбец','Заполнено','Числа','Минимум','Максимум','Среднее'],value.columns.map(c=>[c.name,String(c.filled),String(c.numeric),number(c.min),number(c.max),number(c.mean)])));
 report(host,value,'pulse-data-analysis.json');
}
