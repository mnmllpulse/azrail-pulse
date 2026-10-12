export const DATA_TEXT_LIMIT=2_000_000;
export const DATA_ROW_LIMIT=50_000;
export const DATA_COLUMN_LIMIT=256;
export const DATA_CELL_LIMIT=250_000;

export type DataType='number'|'boolean'|'date'|'category'|'text'|'empty';
export type DataSeverity='info'|'warning';
export type DataIssue={code:string;severity:DataSeverity;message:string;count:number};
export type DataColumn={
 index:number;
 name:string;
 type:DataType;
 filled:number;
 missing:number;
 unique:number;
 numeric:number;
 typeMismatches:number;
 min:number|null;
 max:number|null;
 mean:number|null;
 median:number|null;
 stddev:number|null;
 topValues:Array<{value:string;count:number}>;
};
export type DataAnalysis={
 rows:number;
 columnCount:number;
 delimiter:string;
 delimiterLabel:string;
 columns:DataColumn[];
 raggedRows:number;
 duplicateRows:number;
 emptyRows:number;
 missingCells:number;
 issueCount:number;
 issues:DataIssue[];
};
export type DataSet={delimiter:string;header:string[];rows:string[][];analysis:DataAnalysis;transformations:string[]};
export type CleanupOptions={trimCells?:boolean;dropEmptyRows?:boolean;removeDuplicates?:boolean;normalizeHeaders?:boolean;dropEmptyColumns?:boolean};

function delimiter(text:string):string {
 const counts:Record<string,number>={',':0,';':0,'\t':0};let quoted=false;
 for(let i=0;i<text.length;i++){
  const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"')i++;else quoted=!quoted;}
  else if(!quoted){if(c==='\n'||c==='\r')break;if(Object.hasOwn(counts,c))counts[c]++;}
 }
 return Object.entries(counts).sort((a,b)=>b[1]-a[1])[0][0];
}
export function detectDelimiter(text:string){return delimiter(text.replace(/^\uFEFF/,''));}

/** Bounded RFC-style parsing with common spreadsheet separators and BOM support. */
export function parseCSV(source:string):string[][] {
 if(source.length>DATA_TEXT_LIMIT)throw Error('CSV должен быть меньше 2 МБ.');
 const text=source.replace(/^\uFEFF/,''),separator=delimiter(text),rows:string[][]=[];
 let row:string[]=[],value='',quoted=false,closed=false,cells=0;
 const cell=()=>{if(row.length>=DATA_COLUMN_LIMIT||++cells>DATA_CELL_LIMIT)throw Error('Слишком большая таблица: до 256 столбцов и 250 000 ячеек.');row.push(value);value='';closed=false;};
 const endRow=()=>{cell();if(rows.length>=DATA_ROW_LIMIT)throw Error('CSV должен содержать до 50 000 строк.');rows.push(row);row=[];};
 for(let i=0;i<text.length;i++){
  const c=text[i];
  if(quoted){if(c==='"'){if(text[i+1]==='"'){value+='"';i++;}else{quoted=false;closed=true;}}else value+=c;continue;}
  if(c===separator){cell();continue;}
  if(c==='\n'||c==='\r'){if(c==='\r'&&text[i+1]==='\n')i++;endRow();continue;}
  if(c==='"'){if(value!==''||closed)throw Error('Кавычка внутри незаключённой в кавычки ячейки CSV.');quoted=true;continue;}
  if(closed)throw Error('После закрывающей кавычки нужен разделитель или конец строки.');value+=c;
 }
 if(quoted)throw Error('Незакрытая кавычка CSV.');if(row.length||value||closed)endRow();return rows;
}

export function parseDataNumber(value:string,separator:string):number|null{
 const trimmed=value.trim();if(!trimmed)return null;
 let normalized=trimmed.replace(/\u00A0/g,' ').replace(/\s+/g,'');
 if(separator!==','&&normalized.includes(',')&&!normalized.includes('.')&&/^[-+]?\d+(?:,\d+)?(?:[eE][-+]?\d+)?$/.test(normalized))normalized=normalized.replace(',','.');
 const n=Number(normalized);return Number.isFinite(n)?n:null;
}
function isBoolean(value:string){return /^(?:true|false|yes|no)$/i.test(value.trim());}
function isIsoDate(value:string){const v=value.trim();if(!/^\d{4}-\d{2}-\d{2}(?:[T ][0-2]\d:[0-5]\d(?::[0-5]\d(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/.test(v))return false;return Number.isFinite(Date.parse(v));}
function safeMean(numbers:number[]){let mean=0,count=0;for(const n of numbers){count++;mean+=(n-mean)/count;}return count?mean:null;}
function median(numbers:number[]){if(!numbers.length)return null;const sorted=[...numbers].sort((a,b)=>a-b),mid=Math.floor(sorted.length/2);return sorted.length%2?sorted[mid]:(sorted[mid-1]+sorted[mid])/2;}
function standardDeviation(numbers:number[]){if(!numbers.length)return null;let mean=0,m2=0,n=0;for(const x of numbers){n++;const d=x-mean;mean+=d/n;m2+=d*(x-mean);}return Math.sqrt(m2/n);}
function topValues(values:string[]){const counts=new Map<string,number>();for(const value of values){const key=value.trim();if(!key)continue;counts.set(key,(counts.get(key)??0)+1);}return [...counts].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,8).map(([value,count])=>({value,count}));}
function inferType(values:string[],separator:string):{type:DataType;mismatches:number;numbers:number[]}{
 const nonEmpty=values.map(v=>v.trim()).filter(Boolean);if(!nonEmpty.length)return {type:'empty',mismatches:0,numbers:[]};
 const numbers=nonEmpty.map(v=>parseDataNumber(v,separator)),numeric=numbers.filter((n):n is number=>n!==null);
 const boolCount=nonEmpty.filter(isBoolean).length,dateCount=nonEmpty.filter(isIsoDate).length;
 const threshold=Math.max(1,Math.ceil(nonEmpty.length*.9));
 if(numeric.length>=threshold)return {type:'number',mismatches:nonEmpty.length-numeric.length,numbers:numeric};
 if(boolCount>=threshold)return {type:'boolean',mismatches:nonEmpty.length-boolCount,numbers:[]};
 if(dateCount>=threshold)return {type:'date',mismatches:nonEmpty.length-dateCount,numbers:[]};
 const unique=new Set(nonEmpty).size,categoryLimit=Math.max(8,Math.min(50,Math.ceil(nonEmpty.length*.2)));
 if(unique<=categoryLimit)return {type:'category',mismatches:0,numbers:[]};
 return {type:'text',mismatches:0,numbers:[]};
}
function delimiterLabel(value:string){return value==='\t'?'TAB':value===';'?'Semicolon':value===','?'Comma':value;}
function issue(code:string,message:string,count:number,severity:DataSeverity='warning'):DataIssue{return {code,message,count,severity};}

export function analyzeRows(header:string[],rows:string[][],separator=','):DataAnalysis{
 const width=header.length,raggedRows=rows.filter(r=>r.length!==width).length;
 const emptyRows=rows.filter(r=>r.every(v=>!v?.trim())).length;
 const seenRows=new Set<string>();let duplicateRows=0;for(const row of rows){const key=row.map(v=>v??'').join('\u001f');if(seenRows.has(key))duplicateRows++;else seenRows.add(key);}
 const names=header.map(v=>v.trim()),nameCounts=new Map<string,number>();for(const name of names.filter(Boolean))nameCounts.set(name,(nameCounts.get(name)??0)+1);
 const duplicateHeaders=[...nameCounts.values()].reduce((n,count)=>n+Math.max(0,count-1),0),emptyHeaders=names.filter(v=>!v).length;
 let missingCells=0,totalTypeMismatches=0;
 const columns=header.map((name,index)=>{
  const values=rows.map(r=>r[index]??''),filled=values.filter(v=>v.trim()!=='').length,missing=rows.length-filled;missingCells+=missing;
  const nonEmpty=values.filter(v=>v.trim()!==''),unique=new Set(nonEmpty.map(v=>v.trim())).size,inferred=inferType(values,separator);totalTypeMismatches+=inferred.mismatches;
  const numbers=inferred.type==='number'?inferred.numbers:[];
  let min:number|null=null,max:number|null=null;for(const n of numbers){min=min===null||n<min?n:min;max=max===null||n>max?n:max;}
  return {index,name:name.trim()||`Column ${index+1}`,type:inferred.type,filled,missing,unique,numeric:numbers.length,typeMismatches:inferred.mismatches,min,max,mean:safeMean(numbers),median:median(numbers),stddev:standardDeviation(numbers),topValues:topValues(nonEmpty)} satisfies DataColumn;
 });
 const issues:DataIssue[]=[];
 if(emptyHeaders)issues.push(issue('empty_headers','Есть пустые заголовки столбцов.',emptyHeaders));
 if(duplicateHeaders)issues.push(issue('duplicate_headers','Есть повторяющиеся заголовки столбцов.',duplicateHeaders));
 if(raggedRows)issues.push(issue('ragged_rows','В строках различается число ячеек.',raggedRows));
 if(missingCells)issues.push(issue('missing_values','Есть пропущенные значения.',missingCells,'info'));
 if(duplicateRows)issues.push(issue('duplicate_rows','Есть полностью повторяющиеся строки.',duplicateRows,'info'));
 if(totalTypeMismatches)issues.push(issue('mixed_types','Часть значений не соответствует определённому типу столбца.',totalTypeMismatches));
 return {rows:rows.length,columnCount:width,delimiter:separator,delimiterLabel:delimiterLabel(separator),columns,raggedRows,duplicateRows,emptyRows,missingCells,issueCount:issues.reduce((n,v)=>n+v.count,0),issues};
}

export function parseDataset(text:string):DataSet{
 const separator=detectDelimiter(text),parsed=parseCSV(text),header=parsed.shift()??[];
 if(!header.length)throw Error('CSV не содержит заголовка.');
 return {delimiter:separator,header,rows:parsed,analysis:analyzeRows(header,parsed,separator),transformations:[]};
}
export function analyzeCSV(text:string){return parseDataset(text).analysis;}

function normalizedHeader(value:string,index:number,used:Set<string>){
 const base=(value.trim()||`column_${index+1}`).normalize('NFKC').replace(/[^\p{L}\p{N}_-]+/gu,'_').replace(/^_+|_+$/g,'').toLowerCase()||`column_${index+1}`;
 let next=base,suffix=2;while(used.has(next))next=`${base}_${suffix++}`;used.add(next);return next;
}
export function cleanupDataset(input:DataSet,options:CleanupOptions):DataSet{
 let header=[...input.header],rows=input.rows.map(row=>[...row]),transformations=[...input.transformations];
 if(options.trimCells){header=header.map(v=>v.trim());rows=rows.map(row=>row.map(v=>v.trim()));transformations.push('trim_cells');}
 if(options.dropEmptyRows){const before=rows.length;rows=rows.filter(row=>row.some(v=>v.trim()!==''));if(rows.length!==before)transformations.push('drop_empty_rows');}
 if(options.removeDuplicates){const seen=new Set<string>(),before=rows.length;rows=rows.filter(row=>{const key=row.map(v=>v??'').join('\u001f');if(seen.has(key))return false;seen.add(key);return true;});if(rows.length!==before)transformations.push('remove_duplicates');}
 if(options.dropEmptyColumns){const keep=header.map((_,i)=>rows.some(row=>(row[i]??'').trim()!=='')).map((keep,i)=>keep?i:-1).filter(i=>i>=0);if(keep.length>0&&keep.length!==header.length){header=keep.map(i=>header[i]);rows=rows.map(row=>keep.map(i=>row[i]??''));transformations.push('drop_empty_columns');}}
 if(options.normalizeHeaders){const used=new Set<string>();header=header.map((v,i)=>normalizedHeader(v,i,used));transformations.push('normalize_headers');}
 return {delimiter:input.delimiter,header,rows,analysis:analyzeRows(header,rows,input.delimiter),transformations:[...new Set(transformations)]};
}

function quoteCell(value:string,separator:string){const text=String(value??'');return /["\r\n]/.test(text)||text.includes(separator)?`"${text.replace(/"/g,'""')}"`:text;}
export function serializeCSV(header:string[],rows:string[][],separator=','){
 return [header,...rows].map(row=>row.map(value=>quoteCell(value,separator)).join(separator)).join('\r\n')+'\r\n';
}

export function sortDataRows(rows:string[][],column:DataColumn,direction:'asc'|'desc',separator=','){
 const sign=direction==='asc'?1:-1,index=column.index;
 return [...rows].sort((a,b)=>{
  const av=(a[index]??'').trim(),bv=(b[index]??'').trim();if(!av&&!bv)return 0;if(!av)return 1;if(!bv)return -1;
  if(column.type==='number'){const an=parseDataNumber(av,separator),bn=parseDataNumber(bv,separator);if(an!==null&&bn!==null)return (an-bn)*sign;}
  if(column.type==='date'){const at=Date.parse(av),bt=Date.parse(bv);if(Number.isFinite(at)&&Number.isFinite(bt))return (at-bt)*sign;}
  return av.localeCompare(bv,undefined,{numeric:true,sensitivity:'base'})*sign;
 });
}

export function filterDataRows(rows:string[][],query:string){const q=query.trim().toLocaleLowerCase();if(!q)return [...rows];return rows.filter(row=>row.some(value=>String(value??'').toLocaleLowerCase().includes(q)));}
