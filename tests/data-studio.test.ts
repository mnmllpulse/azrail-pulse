import {describe,expect,it} from 'vitest';
import {cleanupDataset,filterDataRows,parseDataset,serializeCSV,sortDataRows} from '../ui/data';
import {parseDataReportRequest} from '../src/lib/data-studio';

describe('Professional Data Studio',()=>{
 it('infers semicolon data and decimal-comma numbers without changing source rows',()=>{
  const data=parseDataset('name;value;active\nA;1,5;true\nB;2,5;false');
  expect(data.delimiter).toBe(';');expect(data.analysis.columns.map(c=>c.type)).toEqual(['category','number','boolean']);
  expect(data.analysis.columns[1].mean).toBe(2);expect(data.rows[0][1]).toBe('1,5');
 });
 it('reports missing, duplicate, ragged and mixed-type data',()=>{
  const data=parseDataset('id,value,value\n1,10,a\n1,10,a\n2,,b\n3,12x');
  expect(data.analysis.duplicateRows).toBe(1);expect(data.analysis.raggedRows).toBe(1);expect(data.analysis.missingCells).toBeGreaterThan(0);
  expect(data.analysis.issues.some(i=>i.code==='duplicate_headers')).toBe(true);
 });
 it('applies explicit cleanup transformations and keeps the original dataset reversible',()=>{
  const original=parseDataset(' Name ,Empty\n A ,\n A ,\n ,');
  const cleaned=cleanupDataset(original,{trimCells:true,dropEmptyRows:true,removeDuplicates:true,dropEmptyColumns:true,normalizeHeaders:true});
  expect(original.rows.length).toBe(3);expect(cleaned.header).toEqual(['name']);expect(cleaned.rows).toEqual([['A']]);
  expect(cleaned.transformations).toContain('remove_duplicates');
 });
 it('filters, sorts and exports RFC-style CSV',()=>{
  const data=parseDataset('name,score\nB,2\nA,10');const score=data.analysis.columns[1];
  const sorted=sortDataRows(filterDataRows(data.rows,'A'),score,'desc',data.delimiter);expect(sorted).toEqual([['A','10']]);
  expect(serializeCSV(['name','note'],[['A','x,y']],',')).toContain('"x,y"');
 });
 it('validates project-bound saved report contracts',()=>{
  const body={projectId:'11111111-1111-4111-8111-111111111111',artifactId:'22222222-2222-4222-8222-222222222222',fileName:'data.csv',delimiter:',',rowCount:2,columnCount:1,issueCount:0,transformations:['trim_cells'],schema:[{name:'score',type:'number',missing:0,unique:2,min:1,max:2,mean:1.5,median:1.5,stddev:.5,typeMismatches:0}],summary:{missingCells:0,duplicateRows:0,emptyRows:0,raggedRows:0}};
  expect(parseDataReportRequest(body).schema[0].type).toBe('number');
  expect(()=>parseDataReportRequest({...body,transformations:['arbitrary_sql']})).toThrow('transformation');
 });
});
