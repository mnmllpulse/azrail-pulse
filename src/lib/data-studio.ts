import {AccessError} from './accounts';

const TRANSFORMS=new Set(['trim_cells','drop_empty_rows','remove_duplicates','normalize_headers','drop_empty_columns']);
const DATA_TYPES=new Set(['number','boolean','date','category','text','empty']);
const DELIMITERS=new Set([',',';','\t']);
const UUID=/^[a-f0-9-]{36}$/i;

export type DataReportRequest={
 projectId:string;
 artifactId:string;
 fileName:string;
 delimiter:string;
 rowCount:number;
 columnCount:number;
 issueCount:number;
 transformations:string[];
 schema:Array<{name:string;type:string;missing:number;unique:number;min:number|null;max:number|null;mean:number|null;median:number|null;stddev:number|null;typeMismatches:number}>;
 summary:{missingCells:number;duplicateRows:number;emptyRows:number;raggedRows:number};
};

const asString=(value:unknown)=>typeof value==='string'?value.trim():'';
function boundedInt(value:unknown,label:string,max:number){const n=Number(value);if(!Number.isSafeInteger(n)||n<0||n>max)throw new AccessError(`Некорректный ${label}.`,400);return n;}
function finiteOrNull(value:unknown,label:string){if(value===null||value===undefined||value==='')return null;const n=Number(value);if(!Number.isFinite(n))throw new AccessError(`Некорректный ${label}.`,400);return n;}
function cleanFileName(value:unknown){const raw=asString(value).replace(/[\x00-\x1f/\\]/g,'_').slice(0,160);return raw||'dataset.csv';}

export function parseDataReportRequest(body:Record<string,unknown>):DataReportRequest{
 const projectId=asString(body.projectId);if(!UUID.test(projectId))throw new AccessError('Нужен корректный Project.',400);
 const artifactId=asString(body.artifactId);if(!UUID.test(artifactId))throw new AccessError('Нужен корректный dataset artifact.',400);
 const delimiter=typeof body.delimiter==='string'?body.delimiter:'';if(!DELIMITERS.has(delimiter))throw new AccessError('Некорректный delimiter.',400);
 const rowCount=boundedInt(body.rowCount,'row count',50_000),columnCount=boundedInt(body.columnCount,'column count',256),issueCount=boundedInt(body.issueCount,'issue count',1_000_000);
 if(columnCount<1)throw new AccessError('Dataset должен содержать хотя бы один столбец.',400);
 if(!Array.isArray(body.transformations)||body.transformations.length>12)throw new AccessError('Некорректный список transformations.',400);
 const transformations=[...new Set(body.transformations.map(asString).filter(Boolean))];if(transformations.some(v=>!TRANSFORMS.has(v)))throw new AccessError('Неизвестная transformation.',400);
 if(!Array.isArray(body.schema)||body.schema.length!==columnCount||body.schema.length>256)throw new AccessError('Schema не соответствует числу столбцов.',400);
 const schema=body.schema.map((raw,index)=>{
  if(!raw||typeof raw!=='object')throw new AccessError('Некорректная schema.',400);const row=raw as Record<string,unknown>,name=asString(row.name).slice(0,160),type=asString(row.type);
  if(!name)throw new AccessError(`Столбец ${index+1} без имени.`,400);if(!DATA_TYPES.has(type))throw new AccessError(`Некорректный тип столбца ${index+1}.`,400);
  return {name,type,missing:boundedInt(row.missing,'missing count',50_000),unique:boundedInt(row.unique,'unique count',50_000),min:finiteOrNull(row.min,'min'),max:finiteOrNull(row.max,'max'),mean:finiteOrNull(row.mean,'mean'),median:finiteOrNull(row.median,'median'),stddev:finiteOrNull(row.stddev,'stddev'),typeMismatches:boundedInt(row.typeMismatches,'type mismatch count',50_000)};
 });
 const rawSummary=body.summary;if(!rawSummary||typeof rawSummary!=='object')throw new AccessError('Нужен summary.',400);const summaryRecord=rawSummary as Record<string,unknown>;
 const summary={missingCells:boundedInt(summaryRecord.missingCells,'missing cells',250_000),duplicateRows:boundedInt(summaryRecord.duplicateRows,'duplicate rows',50_000),emptyRows:boundedInt(summaryRecord.emptyRows,'empty rows',50_000),raggedRows:boundedInt(summaryRecord.raggedRows,'ragged rows',50_000)};
 return {projectId,artifactId,fileName:cleanFileName(body.fileName),delimiter,rowCount,columnCount,issueCount,transformations,schema,summary};
}
