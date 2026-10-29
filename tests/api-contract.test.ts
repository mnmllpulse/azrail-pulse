import {describe,expect,it} from 'vitest';
import {API_CONTRACT,assertApiContract,unversionApiPath} from '../src/lib/api-contract';

describe('API contract v1',()=>{
 it('cards the versioned routes and rejects an empty field',()=>{
  expect(()=>assertApiContract()).not.toThrow();
  expect(API_CONTRACT.map(row=>row.path)).toEqual(['/api/v1/studio/contract','/api/v1/studio/music/generate']);
  expect(()=>assertApiContract([{...API_CONTRACT[0],audit:''}])).toThrow(/audit/);
 });
 it('strips one /api/v1 prefix and leaves the current paths alone',()=>{
  expect(unversionApiPath('/api/v1/studio/music/generate')).toBe('/api/studio/music/generate');
  expect(unversionApiPath('/api/v1')).toBe('/api');
  expect(unversionApiPath('/api/studio/capabilities')).toBe('/api/studio/capabilities');
  expect(unversionApiPath('/api/v1/v1/studio')).toBe('/api/v1/studio');
 });
});
