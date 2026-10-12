import {download} from './media';
import type {StudioModuleContext} from './studio-types';

type PulseStatus='healthy'|'warning'|'blocked'|'unknown';
type PulseItem={label:string;value:string;status:PulseStatus;detail:string};
type PulseSection={id:string;title:string;items:PulseItem[]};
type PulseReport={generatedAt:string;overall:PulseStatus;mutationFree:true;paidModelCalls:false;sections:PulseSection[]};

type LocalCheck={label:string;ok:boolean;detail:string};
const el=<K extends keyof HTMLElementTagNameMap>(tag:K,text='')=>{const node=document.createElement(tag);node.textContent=text;return node;};
const q=<T extends Element>(root:ParentNode,selector:string)=>root.querySelector(selector) as T;
const stateLabel:Record<PulseStatus,string>={healthy:'Healthy',warning:'Warning',blocked:'Blocked',unknown:'Unknown'};

function localChecks():LocalCheck[]{
 return [
  {label:'WAV synthesis',ok:typeof OfflineAudioContext!=='undefined',detail:'OfflineAudioContext'},
  {label:'Audio decode',ok:typeof AudioContext!=='undefined',detail:'AudioContext'},
  {label:'WebM recording',ok:typeof MediaRecorder!=='undefined'&&typeof HTMLCanvasElement.prototype.captureStream==='function',detail:'MediaRecorder + canvas.captureStream'},
  {label:'Microphone',ok:!!navigator.mediaDevices?.getUserMedia,detail:'navigator.mediaDevices.getUserMedia'},
  {label:'File download',ok:'download' in document.createElement('a'),detail:'HTMLAnchorElement.download'},
 ];
}
function sectionCard(section:PulseSection){
 const card=el('section');card.className='pulse-section';card.dataset.section=section.id;
 const head=el('div');head.className='pulse-section-head';head.append(el('h3',section.title),el('span',`${section.items.length} signals`));card.append(head);
 const grid=el('div');grid.className='pulse-signal-grid';
 for(const signal of section.items){
  const row=el('article');row.className='pulse-signal';row.dataset.state=signal.status;
  const top=el('div');top.className='pulse-signal-top';const labels=el('div');labels.append(el('small',signal.label),el('strong',signal.value));top.append(labels,el('span',stateLabel[signal.status]));
  row.append(top,el('p',signal.detail));grid.append(row);
 }
 card.append(grid);return card;
}
function browserSection():PulseSection{
 return {id:'browser',title:'DEVICE',items:localChecks().map(check=>({label:check.label,value:check.ok?'Supported':'Unavailable',status:check.ok?'healthy':'warning',detail:check.detail}))};
}
function render(context:StudioModuleContext,report:PulseReport|null){
 const host=context.result;host.replaceChildren();
 const shell=el('div');shell.className='pulse-control-report';
 const local=browserSection();
 const hero=el('section');hero.className='pulse-overview';
 const left=el('div');left.append(el('small','SYSTEM CONTROL CENTER'),el('strong',report?stateLabel[report.overall]:'Local diagnostics'));
 const badge=el('span',report?'READ ONLY · NO MODEL CALLS':'LOCAL ONLY');badge.className='runtime-chip';badge.dataset.state=report?.overall==='blocked'?'warn':report?.overall==='warning'?'warn':'ok';hero.append(left,badge);shell.append(hero);
 const truth=el('p',report?'This report uses authenticated read-only runtime probes. Workers AI, Gateway, Sandbox and Queue are never exercised synthetically; binding/config presence is labelled separately from proven health.':'Sign in to the deployed application to add server, release and runtime signals.');truth.className='context-note';shell.append(truth);
 const sections=report?[...report.sections,local]:[local];for(const section of sections)shell.append(sectionCard(section));
 const foot=el('section');foot.className='pulse-foot';const summary=el('div');summary.append(el('small','Evidence'),el('strong',report?new Date(report.generatedAt).toLocaleString():'Browser runtime'));const actions=el('div');actions.className='row';
 const exportButton=el('button','Export JSON');exportButton.type='button';exportButton.onclick=()=>download(new Blob([JSON.stringify({server:report,device:localChecks()},null,2)],{type:'application/json'}),'azrail-pulse-system-report.json');actions.append(exportButton);foot.append(summary,actions);shell.append(foot);host.append(shell);
}

export function mountPulseLab(context:StudioModuleContext){
 context.controls.innerHTML='<div class="pulse-control-head"><div><span class="workbench-kicker">PROFESSIONAL PULSE LAB</span><strong>System state without synthetic paid traffic</strong></div><span class="runtime-chip" data-state="ok">READ ONLY</span></div><div class="pulse-control-actions"><p class="context-note">SYSTEM · AUTH · STORAGE · AI · RUNTIME · RELEASE · HEALTH. A green binding means configured/present only when a real probe would create cost or side effects.</p><button id="studio-run" class="primary" type="button">Refresh System</button></div>';
 render(context,null);
}
export async function runPulseLab(context:StudioModuleContext & {signal:AbortSignal}){
 if(!context.account){render(context,null);context.notice('Server diagnostics require an authenticated deployed session. Local device checks are available now.');return;}
 const report=await context.api('/api/studio/pulse',{signal:context.signal}) as PulseReport;
 if(context.current())render(context,report);
}
