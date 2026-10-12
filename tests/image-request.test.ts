import {afterEach,expect,it,vi} from 'vitest';
import {readPendingImage,requestImage,type ImageRequestBody} from '../ui/image-request';

afterEach(()=>vi.unstubAllGlobals());

it('reuses the exact image operation after a lost response, blocks payload edits, and clears after success',async()=>{
 const values=new Map<string,string>();
 vi.stubGlobal('sessionStorage',{
  getItem:(k:string)=>values.get(k)??null,
  setItem:(k:string,v:string)=>values.set(k,v),
  removeItem:(k:string)=>values.delete(k),
 });
 const input:ImageRequestBody={prompt:'Orbit',aspectRatio:'1:1',resolution:1024,style:'dark-techno',seed:42,variations:2,operation:'generate',referenceArtifactId:null};
 const api=vi.fn(async()=>{throw Error('Network disconnected');});
 await expect(requestImage('alice',input,api)).rejects.toThrow('Network disconnected');
 const pending=readPendingImage('alice');expect(pending).not.toBeNull();expect(readPendingImage('bob')).toBeNull();
 await expect(requestImage('alice',{...input,prompt:'Another prompt'},api)).rejects.toThrow('Предыдущая генерация');
 expect(api).toHaveBeenCalledTimes(1);
 const retry=vi.fn(async()=>({items:[{artifactId:'known-id'}]}));
 await requestImage('alice',input,retry);
 expect(retry.mock.calls[0]).toEqual(api.mock.calls[0]);
 expect(readPendingImage('alice')).toBeNull();
});
