import {makeElement as make} from './dom';

export interface RecoveryActions {
  retry?:()=>void|Promise<void>;
  restore?:()=>void|Promise<void>;
  openLogs?:()=>void|Promise<void>;
  report?:()=>void|Promise<void>;
}

export function renderRecoveryError(host:HTMLElement,error:unknown,actions:RecoveryActions={}):void{
  const message=error instanceof Error?error.message:String(error||'Unknown error');
  host.replaceChildren();
  const box=make('section');box.className='studio-recovery';box.setAttribute('role','alert');
  box.append(make('strong','Studio encountered an error'),make('p','Your work and current parameters are preserved.'),make('pre',message));
  const bar=make('div');bar.className='toolbar';
  const add=(label:string,fn:RecoveryActions[keyof RecoveryActions])=>{if(!fn)return;const b=make('button',label);b.type='button';b.onclick=()=>void Promise.resolve(fn()).catch(()=>{});bar.append(b);};
  add('Retry',actions.retry);add('Restore last stable state',actions.restore);add('Open logs',actions.openLogs);add('Report',actions.report);
  box.append(bar);host.append(box);
}
