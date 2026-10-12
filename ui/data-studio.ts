import { formatBytes as bytes } from '../src/shared/format';
import type {StudioModuleContext} from './studio-types';
import {cleanupDataset,filterDataRows,parseDataNumber,parseDataset,serializeCSV,sortDataRows,type CleanupOptions,type DataAnalysis,type DataColumn,type DataSet} from './data';
import {download} from './media';
import {makeElement as make} from './components/dom';
import {errorMessage,renderPanelError,renderPanelLoading} from './components/panel-state';

export type DataHistoryItem={
 id:string;projectId:string;artifactId:string|null;fileName:string;delimiter:string;rowCount:number;columnCount:number;issueCount:number;
 transformations:string[];schema:Array<Partial<DataColumn>&{name:string;type:string}>;summary:Record<string,number>;createdAt:number;
};
let original:DataSet|null=null,current:DataSet|null=null,sourceName='dataset.csv',viewRows:string[][]=[];
const $=<T extends Element=HTMLElement>(host:ParentNode,selector:string)=>host.querySelector(selector) as T|null;
const fmt=(value:number|null|undefined,digits=3)=>typeof value==='number'&&Number.isFinite(value)?new Intl.NumberFormat(undefined,{maximumFractionDigits:digits}).format(value):'—';

function table(headers:string[],rows:string[][],className=''){
 const wrap=make('div');wrap.className=`table-wrap ${className}`.trim();const table=make('table'),head=make('thead'),tr=make('tr');
 headers.forEach(value=>tr.append(make('th',value)));head.append(tr);table.append(head);const body=make('tbody');
 rows.forEach(values=>{const row=make('tr');values.forEach(value=>row.append(make('td',value)));body.append(row);});table.append(body);wrap.append(table);return wrap;
}
function metric(label:string,value:string,note=''){const card=make('div');card.className='data-metric';card.append(make('small',label),make('strong',value));if(note)card.append(make('span',note));return card;}
function reportBlob(dataset:DataSet){return new Blob([JSON.stringify({analysis:dataset.analysis,transformations:dataset.transformations},null,2)],{type:'application/json'});}
function exportRows(dataset:DataSet,rows:string[][],suffix:string){download(new Blob([serializeCSV(dataset.header,rows,dataset.delimiter)],{type:'text/csv;charset=utf-8'}),`${sourceName.replace(/\.csv$/i,'')}-${suffix}.csv`);}

function drawChart(canvas:HTMLCanvasElement,column:DataColumn,dataset:DataSet){
 const ctx=canvas.getContext('2d');if(!ctx)return;const dpr=Math.max(1,Math.min(2,devicePixelRatio||1)),w=Math.max(360,canvas.clientWidth||760),h=240;canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);ctx.scale(dpr,dpr);ctx.clearRect(0,0,w,h);ctx.font='11px system-ui';ctx.fillStyle='#a99cc0';ctx.fillText(`${column.name} · ${column.type}`,12,18);
 const values=dataset.rows.map(row=>(row[column.index]??'').trim()).filter(Boolean);if(!values.length){ctx.fillText('Нет данных для графика.',12,48);return;}
 let labels:string[]=[],counts:number[]=[];
 if(column.type==='number'){
  const nums=values.map(value=>parseDataNumber(value,dataset.delimiter)).filter((value):value is number=>value!==null);if(!nums.length){ctx.fillText('Нет числовых значений.',12,48);return;}let min=nums[0],max=nums[0];for(const n of nums){if(n<min)min=n;if(n>max)max=n;}const bins=10,span=max-min||1,arr=Array(bins).fill(0);for(const n of nums)arr[Math.min(bins-1,Math.floor((n-min)/span*bins))]++;counts=arr;labels=arr.map((_,i)=>fmt(min+span*(i+.5)/bins,2));
 }else{const map=new Map<string,number>();for(const value of values)map.set(value,(map.get(value)??0)+1);const top=[...map].sort((a,b)=>b[1]-a[1]).slice(0,10);labels=top.map(v=>v[0]);counts=top.map(v=>v[1]);}
 const maxCount=Math.max(...counts,1),left=42,base=h-32,chartW=w-left-12,barW=Math.max(8,chartW/counts.length-8);ctx.strokeStyle='#3b3346';ctx.beginPath();ctx.moveTo(left,30);ctx.lineTo(left,base);ctx.lineTo(w-10,base);ctx.stroke();
 counts.forEach((count,i)=>{const x=left+i*(chartW/counts.length)+4,bh=(base-48)*(count/maxCount),y=base-bh;ctx.fillStyle='#76569d';ctx.fillRect(x,y,barW,bh);ctx.fillStyle='#9e91ae';ctx.fillText(String(count),x,Math.max(42,y-5));const label=labels[i].length>12?`${labels[i].slice(0,11)}…`:labels[i];ctx.save();ctx.translate(x+2,base+12);ctx.rotate(-.35);ctx.fillText(label,0,0);ctx.restore();});
}

function issueSection(analysis:DataAnalysis){const section=make('section');section.className='data-section';const heading=make('div');heading.className='section-heading';heading.append(make('h3','Validation'),make('span',analysis.issues.length?`${analysis.issues.length} issue types`:'No structural issues'));section.append(heading);if(!analysis.issues.length){section.append(make('p','Структурных проблем не найдено.'));return section;}const grid=make('div');grid.className='data-issue-grid';for(const item of analysis.issues){const card=make('div');card.className='data-issue';const top=make('div');top.className='data-issue-head';top.append(make('strong',item.message),make('span',String(item.count)));card.append(top,make('small',item.severity==='warning'?'Требует проверки':'Информационно'));grid.append(card);}section.append(grid);return section;}

function schemaSection(dataset:DataSet){const section=make('section');section.className='data-section';const heading=make('div');heading.className='section-heading';heading.append(make('h3','Schema inference'),make('span','Type · completeness · uniqueness'));section.append(heading,table(['Column','Type','Filled','Missing','Unique','Mean','Median','Std dev'],dataset.analysis.columns.map(c=>[c.name,c.type,String(c.filled),String(c.missing),String(c.unique),fmt(c.mean),fmt(c.median),fmt(c.stddev)]),'data-schema-table'));return section;}

function cleanupOptions(host:HTMLElement):CleanupOptions{return {trimCells:!!$<HTMLInputElement>(host,'#data-trim')?.checked,dropEmptyRows:!!$<HTMLInputElement>(host,'#data-drop-empty-rows')?.checked,removeDuplicates:!!$<HTMLInputElement>(host,'#data-dedupe')?.checked,normalizeHeaders:!!$<HTMLInputElement>(host,'#data-normalize-headers')?.checked,dropEmptyColumns:!!$<HTMLInputElement>(host,'#data-drop-empty-columns')?.checked};}

function historySummary(item:DataHistoryItem){return `${item.rowCount} rows · ${item.columnCount} columns · ${item.issueCount} issues`;}
export async function renderDataHistory(context:StudioModuleContext){
 const host=$<HTMLElement>(context.controls,'#data-history');if(!host)return;renderPanelLoading(host,'Загружаю историю datasets…');if(!context.account||!context.projectId){host.append(make('p','Выберите Project и войдите, чтобы сохранять историю datasets.'));return;}
 const response=await context.api(`/api/studio/data/reports?projectId=${encodeURIComponent(context.projectId)}`,{signal:context.signal}) as {items:DataHistoryItem[]};
 if(!response.items.length){host.append(make('p','Сохранённых datasets пока нет.'));return;}
 for(const item of response.items){const card=make('article');card.className='data-history-card';const info=make('div');info.append(make('strong',item.fileName),make('small',historySummary(item)),make('span',new Date(item.createdAt).toLocaleString()));const actions=make('div');actions.className='data-history-actions';const meta=make('button','Report');meta.onclick=()=>context.dialog?.('Data Studio report',`<div class="project-detail-grid"><div><small>ROWS</small><strong>${item.rowCount}</strong></div><div><small>COLUMNS</small><strong>${item.columnCount}</strong></div><div><small>ISSUES</small><strong>${item.issueCount}</strong></div><div><small>TRANSFORMS</small><strong>${item.transformations.length}</strong></div></div>`);actions.append(meta);if(item.artifactId){const file=make('button','CSV');file.onclick=()=>context.blobAPI(`/api/studio/artifacts/${item.artifactId}`).then(blob=>download(blob,item.fileName)).catch(context.failure);actions.append(file);}card.append(info,actions);host.append(card);}
}

async function refreshDataHistory(context:StudioModuleContext):Promise<void>{
 const host=$<HTMLElement>(context.controls,'#data-history');if(!host)return;
 try{await renderDataHistory(context);}catch(error){renderPanelError(host,errorMessage(error),()=>refreshDataHistory(context));context.failure(error);}
}

async function saveDataset(context:StudioModuleContext,dataset:DataSet,button:HTMLButtonElement){
 if(!context.account)throw Error('Войдите, чтобы сохранить dataset.');if(context.account.role==='viewer')throw Error('Ваш аккаунт разрешает только просмотр.');if(!context.projectId)throw Error('Выберите Project перед сохранением dataset.');
 button.disabled=true;const csv=serializeCSV(dataset.header,dataset.rows,dataset.delimiter),blob=new Blob([csv],{type:'text/csv;charset=utf-8'}),fileName=sourceName.replace(/\.[^.]+$/,'')+'-dataset.csv';
 try{
  const artifact=await context.api('/api/studio/artifacts',{method:'POST',headers:{'Content-Type':'text/csv','X-Filename':encodeURIComponent(fileName),'X-Project-Id':context.projectId,'X-Studio-Id':'data'},body:blob,signal:context.signal}) as {id:string};
  const schema=dataset.analysis.columns.map(c=>({name:c.name,type:c.type,missing:c.missing,unique:c.unique,min:c.min,max:c.max,mean:c.mean,median:c.median,stddev:c.stddev,typeMismatches:c.typeMismatches}));
  await context.api('/api/studio/data/reports',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({projectId:context.projectId,artifactId:artifact.id,fileName,delimiter:dataset.delimiter,rowCount:dataset.analysis.rows,columnCount:dataset.analysis.columnCount,issueCount:dataset.analysis.issueCount,transformations:dataset.transformations,schema,summary:{missingCells:dataset.analysis.missingCells,duplicateRows:dataset.analysis.duplicateRows,emptyRows:dataset.analysis.emptyRows,raggedRows:dataset.analysis.raggedRows}}),signal:context.signal});
  context.notice('Dataset и анализ сохранены в Project.');await refreshDataHistory(context);
 }finally{button.disabled=false;}
}

function renderWorkbench(context:StudioModuleContext,dataset:DataSet){
 current=dataset;viewRows=[...dataset.rows];const host=context.result;host.replaceChildren();const root=make('div');root.className='data-report';
 const head=make('div');head.className='data-report-head';const title=make('div');title.append(make('small','DATASET'),make('strong',sourceName));const detail=make('div');detail.append(make('small','DELIMITER'),make('strong',dataset.analysis.delimiterLabel));head.append(title,detail);root.append(head);
 const metrics=make('div');metrics.className='data-metric-grid';metrics.append(metric('ROWS',String(dataset.analysis.rows)),metric('COLUMNS',String(dataset.analysis.columnCount)),metric('MISSING',String(dataset.analysis.missingCells)),metric('DUPLICATES',String(dataset.analysis.duplicateRows)),metric('ISSUES',String(dataset.analysis.issueCount)),metric('TRANSFORMS',String(dataset.transformations.length),dataset.transformations.join(', ')||'none'));root.append(metrics,issueSection(dataset.analysis));

 const explore=make('section');explore.className='data-section';const exploreHead=make('div');exploreHead.className='section-heading';exploreHead.append(make('h3','Table explorer'),make('span','Filter · sort · bounded preview'));explore.append(exploreHead);
 const toolbar=make('div');toolbar.className='data-toolbar';toolbar.innerHTML='<label>Filter<input id="data-filter" type="search" maxlength="120" placeholder="Search all columns"></label><label>Sort<select id="data-sort-column"><option value="">None</option></select></label><label>Direction<select id="data-sort-direction"><option value="asc">Ascending</option><option value="desc">Descending</option></select></label><button id="data-reset-view" type="button">Reset view</button>';explore.append(toolbar);const tableHost=make('div');tableHost.id='data-table-host';explore.append(tableHost);root.append(explore,schemaSection(dataset));

 const chartSection=make('section');chartSection.className='data-section';const chartHead=make('div');chartHead.className='section-heading';chartHead.append(make('h3','Chart'),make('span','Histogram or top categories'));const chartSelect=make('select');chartSelect.id='data-chart-column';dataset.analysis.columns.forEach((c,i)=>{const option=make('option',`${c.name} · ${c.type}`);option.value=String(i);chartSelect.append(option);});const chartControls=make('div');chartControls.className='data-chart-controls';chartControls.append(chartSelect);const canvas=make('canvas');canvas.className='data-chart';chartSection.append(chartHead,chartControls,canvas);root.append(chartSection);

 const transform=make('section');transform.className='data-section';const transformHead=make('div');transformHead.className='section-heading';transformHead.append(make('h3','Transformations'),make('span','Explicit, local and reversible until export/save'));transform.append(transformHead);const checks=make('div');checks.className='data-transform-grid';checks.innerHTML='<label><input id="data-trim" type="checkbox" checked> Trim whitespace</label><label><input id="data-drop-empty-rows" type="checkbox" checked> Drop empty rows</label><label><input id="data-dedupe" type="checkbox"> Remove duplicate rows</label><label><input id="data-normalize-headers" type="checkbox"> Normalize headers</label><label><input id="data-drop-empty-columns" type="checkbox"> Drop empty columns</label>';const transformActions=make('div');transformActions.className='toolbar';const apply=make('button','Apply transformations');apply.id='data-apply';const reset=make('button','Reset dataset');reset.id='data-reset';transformActions.append(apply,reset);transform.append(checks,transformActions);root.append(transform);

 const actions=make('div');actions.className='toolbar data-actions';const exportView=make('button','Export filtered CSV'),exportAll=make('button','Export dataset CSV'),exportReport=make('button','Export report JSON');actions.append(exportView,exportAll,exportReport);if(context.account&&context.account.role!=='viewer'){const save=make('button','Save dataset to Project');save.className='primary';save.disabled=!context.projectId;save.title=context.projectId?'Save current dataset and analysis':'Choose a Project first';save.onclick=()=>current&&saveDataset(context,current,save).catch(context.failure);actions.append(save);}root.append(actions);host.append(root);

 const sortSelect=$<HTMLSelectElement>(root,'#data-sort-column')!;dataset.analysis.columns.forEach((c,i)=>{const option=make('option',c.name);option.value=String(i);sortSelect.append(option);});
 const redrawTable=()=>{if(!current)return;const query=$<HTMLInputElement>(root,'#data-filter')!.value;let rows=filterDataRows(current.rows,query);const index=sortSelect.value===''?-1:Number(sortSelect.value);if(index>=0){const column=current.analysis.columns[index],direction=$<HTMLSelectElement>(root,'#data-sort-direction')!.value as 'asc'|'desc';rows=sortDataRows(rows,column,direction,current.delimiter);}viewRows=rows;const preview=rows.slice(0,200),body=table(current.header,preview,'data-preview-table');tableHost.replaceChildren(body,make('p',`${rows.length} matching rows${rows.length>200?' · showing first 200':''}.`));};
 $<HTMLInputElement>(root,'#data-filter')!.oninput=redrawTable;sortSelect.onchange=redrawTable;$<HTMLSelectElement>(root,'#data-sort-direction')!.onchange=redrawTable;$<HTMLButtonElement>(root,'#data-reset-view')!.onclick=()=>{$<HTMLInputElement>(root,'#data-filter')!.value='';sortSelect.value='';redrawTable();};
 chartSelect.onchange=()=>{if(current)drawChart(canvas,current.analysis.columns[Number(chartSelect.value)],current);};
 apply.onclick=()=>{if(!current)return;current=cleanupDataset(current,cleanupOptions(root));renderWorkbench(context,current);context.notice('Transformations применены локально. Исходный файл не изменён.');};reset.onclick=()=>{if(original){current=original;renderWorkbench(context,original);context.notice('Dataset возвращён к исходному состоянию.');}};
 exportView.onclick=()=>current&&exportRows(current,viewRows,'filtered');exportAll.onclick=()=>current&&exportRows(current,current.rows,'export');exportReport.onclick=()=>current&&download(reportBlob(current),`${sourceName.replace(/\.csv$/i,'')}-report.json`);
 redrawTable();requestAnimationFrame(()=>{if(current&&current.analysis.columns.length)drawChart(canvas,current.analysis.columns[0],current);});
}

export function mountDataStudio(context:StudioModuleContext){
 original=null;current=null;sourceName='dataset.csv';viewRows=[];
 context.controls.innerHTML='<div class="data-studio-shell"><section class="data-input"><label for="studio-file">CSV / delimited dataset</label><input id="studio-file" type="file" accept=".csv,.tsv,text/csv,text/tab-separated-values"><p class="context-note">До 2 МБ, 50 000 строк, 256 столбцов и 250 000 ячеек. Анализ, фильтры, сортировка, chart и transformations выполняются локально. Cloud save — только по отдельной кнопке.</p><div class="toolbar"><button id="studio-run" class="primary" type="button"></button></div></section><section class="data-history"><div class="section-heading"><h3>Project history</h3><span>Saved datasets</span></div><div id="data-history"></div></section></div>';
 context.mountDraft(false,{scope:context.account?.id??'local',writable:false});void refreshDataHistory(context);
 return ()=>{original=null;current=null;viewRows=[];};
}
export async function runDataStudio(context:StudioModuleContext&{signal:AbortSignal}){
 const file=$<HTMLInputElement>(context.controls,'#studio-file')?.files?.[0];if(!file)throw Error('Выберите CSV/TSV файл.');if(file.size>2_000_000)throw Error('Dataset должен быть не больше 2 МБ.');
 sourceName=file.name||'dataset.csv';context.notice(`Data Studio: читаю ${bytes(file.size)} и строю schema/statistics…`);const text=await file.text();if(context.signal.aborted)throw new DOMException('Aborted','AbortError');const dataset=parseDataset(text);original=dataset;current=dataset;if(context.current())renderWorkbench(context,dataset);
}
export function cleanupDataStudio(){original=null;current=null;viewRows=[];}
