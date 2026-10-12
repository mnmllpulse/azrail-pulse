import {describe,it,expect,vi,afterEach} from 'vitest';
const mocks=vi.hoisted(()=>({exec:vi.fn(async()=>({exitCode:0,output:'ok'})),destroy:vi.fn(async()=>{})}));
vi.mock('@cloudflare/sandbox',()=>({Sandbox:class {ctx:any;constructor(ctx:any){this.ctx=ctx;}exec(...args:any[]){return (mocks.exec as any)(...args);}destroy(){return mocks.destroy();}}}));
import {Sandbox} from '../src/core/azrail-sandbox';
import {SANDBOX_LIMITS} from '../src/core/sandbox';
afterEach(()=>vi.useRealTimers());
describe('sandbox lifetime provider boundary',()=>{
  it('does not execute a command after destroying its working filesystem',async()=>{
    vi.useFakeTimers();vi.setSystemTime(1700000000000);const state=new Map();
    const ctx:any={storage:{get:async(k:string)=>state.get(k),put:async(k:string,v:any)=>state.set(k,v)}};
    const box=new Sandbox(ctx,{} as never);await box.exec('first');expect(mocks.exec).toHaveBeenCalledTimes(1);
    vi.setSystemTime(Date.now()+SANDBOX_LIMITS.MAX_LIFETIME_MS);
    await expect(box.exec('must not execute')).rejects.toThrow('Команда не выполнена');expect(mocks.destroy).toHaveBeenCalledOnce();expect(mocks.exec).toHaveBeenCalledTimes(1);
  });
});
