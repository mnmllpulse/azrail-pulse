import { describe, it, expect, vi } from 'vitest';
import { sqliteD1 } from './stubs/sqlite-d1';
import type { Env } from '../src/types';
import { publishWorkspace } from '../src/lib/workspace-head';
import { withProjectLock } from '../src/lib/project-control';
import { reapStaleMissions } from '../src/lib/mission-state';
import { loadAttachments } from '../src/lib/attachments';
import { handleUpload } from '../src/lib/upload';

const bytes=(value:string)=>new TextEncoder().encode(value);

describe('RC6 R2/D1 consistency',()=>{
  it('removes an unpublished workspace version when the head flip fails',async()=>{
    const objects=new Map<string,Uint8Array>();
    const put=vi.fn(async(key:string,value:unknown)=>{objects.set(key,typeof value==='string'?bytes(value):value as Uint8Array);});
    const del=vi.fn(async(key:string)=>{objects.delete(key);});
    const env={
      AZRAIL_R2:{put,delete:del},
      AZRAIL_D1:{prepare:(sql:string)=>({bind(){return this;},async first(){return sql.startsWith('SELECT prefix')?null:null;},async run(){throw Error('D1 unavailable');}})},
    } as unknown as Env;
    await expect(publishWorkspace(env,'p',[{path:'a.txt',content:'a'},{path:'b.txt',content:'b'}])).rejects.toThrow('D1 unavailable');
    expect(objects.size).toBe(0);
    expect(del).toHaveBeenCalledTimes(2);
  });

  it('does not turn a successful mutation into a retryable failure when only lock release fails',async()=>{
    const {db}=sqliteD1();
    const env={AZRAIL_D1:db} as unknown as Env;
    const original=db.batch.bind(db);let calls=0;
    (env.AZRAIL_D1 as unknown as {batch:typeof db.batch}).batch=async(stmts)=>{
      calls++;const out=await original(stmts);
      if(calls===2)throw Error('release outage after commit');
      return out;
    };
    await expect(withProjectLock(env,'p','m',async()=>42)).resolves.toBe(42);
  });
});

describe('RC6 stale lock recovery',()=>{
  it('removes a reaped mission lease and an old orphan lease while preserving an active mission lease',async()=>{
    const {db,sqlite}=sqliteD1();
    const env={AZRAIL_D1:db} as Env,old=new Date(Date.now()-2*60*60_000).toISOString(),now=Date.now();
    sqlite.prepare("INSERT INTO missions(id,project_id,goal,status,created_at,updated_at) VALUES('dead','p1','g','executing',?,?)").run(old,old);
    sqlite.prepare("INSERT INTO missions(id,project_id,goal,status,created_at,updated_at) VALUES('live','p2','g','executing',?,?)").run(new Date(now).toISOString(),new Date(now).toISOString());
    sqlite.prepare("INSERT INTO operation_locks VALUES('p1','dead',?)").run(now-2*60*60_000);
    sqlite.prepare("INSERT INTO operation_locks VALUES('p2','live',?)").run(now-2*60*60_000);
    sqlite.prepare("INSERT INTO operation_locks VALUES('p3','zip:orphan',?)").run(now-2*60*60_000);
    const result=await reapStaleMissions(env,now);
    expect(result.ids).toContain('dead');
    expect(sqlite.prepare("SELECT owner FROM operation_locks WHERE project_id='p1'").get()).toBeUndefined();
    expect(sqlite.prepare("SELECT owner FROM operation_locks WHERE project_id='p3'").get()).toBeUndefined();
    expect(sqlite.prepare("SELECT owner FROM operation_locks WHERE project_id='p2'").get()?.owner).toBe('live');
  });
});

describe('RC6 bounded attachment reads',()=>{
  it('uses an R2 ranged read instead of materializing an oversized text object',async()=>{
    const calls:unknown[]=[];
    const large={size:50*1024*1024,text:async()=>{throw Error('full object should not be read');}};
    const prefix={size:256*1024,text:async()=> 'x'.repeat(16)};
    const env={AZRAIL_R2:{get:vi.fn(async(_key:string,options?:unknown)=>{calls.push(options);return options?prefix:large;})}} as unknown as Env;
    const out=await loadAttachments(env,[{r2Key:'uploads/a/1-file.txt',fileName:'file.txt',mimeType:'text/plain',inputType:'text'}]);
    expect(calls).toEqual([undefined,{range:{offset:0,length:256*1024}}]);
    expect(out[0].text).toHaveLength(16);
    expect(out[0].bytes).toBe(50*1024*1024);
    expect(out[0].skipped).toContain('первые');
  });
});

describe('RC6 upload ownership atomicity',()=>{
  it('deletes the R2 object when ownership persistence fails',async()=>{
    const deleted:string[]=[];
    const d1={prepare:(sql:string)=>({bind(){return this;},async first(){return null;},async run(){if(sql.includes("INSERT INTO resource_owners(kind,resource_id,account_id) VALUES('upload'"))throw Error('D1 down');return {meta:{changes:1}};}})};
    const env={AZRAIL_D1:d1,AZRAIL_R2:{list:async()=>({objects:[]}),put:async()=>{},delete:async(key:string)=>{deleted.push(key);}}} as unknown as Env;
    const form=new FormData();form.set('projectId','p1');form.set('file',new File([bytes('hello')],'a.txt',{type:'text/plain'}));
    await expect(handleUpload(new Request('https://app.test/api/upload',{method:'POST',body:form}),env,{id:'a',role:'editor',name:'A'})).rejects.toThrow('D1 down');
    expect(deleted).toHaveLength(1);
    expect(deleted[0]).toContain('uploads/p1/');
  });

  it('rejects a supplied malformed projectId instead of silently using inbox',async()=>{
    const env={AZRAIL_R2:{put:vi.fn()},AZRAIL_D1:{prepare:vi.fn()}} as unknown as Env;
    const form=new FormData();form.set('projectId','../other');form.set('file',new File([bytes('hello')],'a.txt',{type:'text/plain'}));
    const result=await handleUpload(new Request('https://app.test/api/upload',{method:'POST',body:form}),env,{id:'a',role:'editor',name:'A'});
    expect(result).toMatchObject({status:400});
    expect(env.AZRAIL_R2.put).not.toHaveBeenCalled();
  });
});

import { authRoute } from '../src/unified/oidc';

describe('RC6 OIDC network boundary',()=>{
  it('forbids redirects for both discovery and token exchange',async()=>{
    const {db}=sqliteD1();
    const env={AZRAIL_D1:db,PUBLIC_ORIGINS:'https://app.example.com',OIDC_ISSUER:'https://login.example.com',OIDC_CLIENT_ID:'client'} as Env;
    const calls:Array<{url:string;init:RequestInit|undefined}>=[];
    vi.stubGlobal('fetch',vi.fn(async(input:RequestInfo|URL,init?:RequestInit)=>{
      const url=String(input);calls.push({url,init});
      if(url.includes('.well-known'))return new Response(JSON.stringify({issuer:'https://login.example.com',authorization_endpoint:'https://login.example.com/authorize',token_endpoint:'https://login.example.com/token',jwks_uri:'https://login.example.com/jwks'}),{status:200});
      return new Response('{}',{status:200});
    }));
    const login=await authRoute(new Request('https://app.example.com/auth/login'),env);
    expect(login?.status).toBe(302);
    const location=new URL(login!.headers.get('Location')!);const state=location.searchParams.get('state')!;
    const callback=await authRoute(new Request(`https://app.example.com/auth/callback?code=abc&state=${state}`,{headers:{Cookie:`__Host-pulse-state=${state}`}}),env);
    expect(callback?.status).toBe(401);
    expect(calls.filter(c=>c.url.includes('.well-known')).every(c=>c.init?.redirect==='error')).toBe(true);
    expect(calls.find(c=>c.url.endsWith('/token'))?.init?.redirect).toBe('error');
    vi.unstubAllGlobals();
  });
});
