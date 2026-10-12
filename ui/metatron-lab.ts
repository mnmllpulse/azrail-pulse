import {createProjectEventClient,type StreamEvent} from './event-stream';

type Api=(path:string,options?:RequestInit)=>Promise<any>;
type MissionListItem={id:string;goal:string;status:string;progress:number;created_at:string;updated_at:string;finished_at:string|null};
type MetatronSnapshot={
 mission:{id:string;project_id:string;goal:string;status:string;progress?:number;created_at?:string;updated_at?:string;finished_at?:string|null};
 control?:{desired_state?:string;generation?:number}|null;
 graph:{mode:string;warning?:string;nodes:Array<{id:string;label:string;status:string;dependencies:string[];note?:string|null}>};
 agentCards:{registered:Array<{id:string;name:string;capabilities:string[];status:string}>;runtime:Array<{agent_id:string;instance_id:string;capability:string;status:string;generation:number;heartbeat_at:number|null;last_error:string|null}>};
 live:{transport:string;events:Array<{id:string;type:string;data?:unknown;createdAt:string}>};
 traceExplorer:{links:Array<any>;toolCalls:Array<any>;modelCalls:Array<any>};
 resources:{promptTokens:number;completionTokens:number;reservedMicroUsd:number;actualMicroUsd:number;elapsedMs:number;risk:string;fenceToken:number|null};
 checkpoints:Array<{step:number;tool:string;status:string;receipt_status?:string|null;updated_at?:number}>;
 uncertainEffects:Array<{step:number;tool:string;status:string;result:unknown}>;
 reconciliationEngine:{mode:string;automaticRetry:boolean;checkpointRule:string;connector:{method:string;path:string;outcomes:string[];evidenceRequired:boolean};model:{method:string;path:string;fields:string[];evidenceRequired:boolean};note:string};
 approvals:Array<{id:string;action_type:string;status:string;risk:string;summary:string;requested_at:number}>;
 memoryInspector:Array<{memory_id:string;category:string;memory_key:string;source:string;created_at:number}>;
 decisions:Array<{id:string;step:number|null;decision_kind:string;choice:string;reason:string;evidence:unknown;created_at:number}>;
 faultInjection:Array<{id:string;scenario:string;simulation_only:number;status:string;created_at:number}>;
 replay:{mode:string;events:Array<any>;checkpoints:Array<any>;decisions:Array<any>};
 health?:Array<{id:string;name:string;status:string;storageReadable:boolean;error?:string}>;
};

type Options={
 root:HTMLElement;api:Api;local:boolean;account:{role?:string;operator?:boolean}|null;
 getProjectId:()=>string;getMissionId:()=>string;setMissionId:(id:string)=>void;
 notice:(message:string,persist?:boolean)=>void;failure:(error:unknown)=>void;
};

const el=<K extends keyof HTMLElementTagNameMap>(name:K,className?:string,text?:string)=>{
 const node=document.createElement(name);if(className)node.className=className;if(text!==undefined)node.textContent=text;return node;
};
const money=(micro:number)=>`$${(micro/1_000_000).toFixed(4)}`;
const duration=(ms:number)=>{const s=Math.max(0,Math.floor(ms/1000));return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;};
const jsonText=(value:unknown)=>{try{return JSON.stringify(value,null,2);}catch{return String(value);}};

export function mountMetatronLab(options:Options):()=>void{
 const {root,api,local,notice,failure}=options;
 let destroyed=false,selectedMission=options.getMissionId(),streamStop=()=>{},refreshTimer=0;
 root.replaceChildren();
 if(local){root.append(el('p','context-note','Metatron Lab требует развёрнутый Worker, D1 и Durable Objects. Локальный HTML не имитирует runtime health.'));return()=>{};}
 if(!options.account){root.append(el('p','context-note','Войдите, чтобы открыть Agent Operations Center.'));return()=>{};}
 const projectId=options.getProjectId();
 if(!projectId){root.append(el('p','context-note','Выберите проект — Metatron показывает миссии в контексте проекта.'));return()=>{};}

 const toolbar=el('div','metatron-toolbar');
 const missionSelect=el('select') as HTMLSelectElement;missionSelect.id='metatron-mission-select';missionSelect.setAttribute('aria-label','Миссия');
 const refreshButton=el('button','','Обновить');
 const status=el('span','metatron-live-status','Loading…');
 toolbar.append(missionSelect,refreshButton,status);root.append(toolbar);

 const control=el('div','metatron-controls');
 for(const [action,label] of [['start','Start'],['pause','Pause'],['resume','Resume'],['cancel','Cancel'],['terminate','Terminate']] as const){
  const button=el('button',action==='terminate'?'danger':'',label);button.dataset.metatronAction=action;control.append(button);
 }
 root.append(control);

 const summary=el('div','metatron-summary');root.append(summary);
 const graph=panel('Live Mission Graph');const agents=panel('Agent Cards');const logs=panel('Live Logs · durable replay');
 const trace=panel('Trace Explorer');const checkpoints=panel('Checkpoint System / Mission Replay');const effects=panel('uncertain_effect / Effect Reconciliation');
 const approvals=panel('Human Approval Nodes');const memory=panel('Memory Inspector');const decisions=panel('Decision Explanation Panel');const fault=panel('Fault Injection Lab · SIMULATION ONLY');
 for(const p of [graph,agents,logs,trace,checkpoints,effects,approvals,memory,decisions,fault])root.append(p.wrap);

 const scenario=el('select') as HTMLSelectElement;
 for(const key of ['timeout','provider_down','d1_failure','network_loss']){const option=el('option') as HTMLOptionElement;option.value=key;option.textContent=key;scenario.append(option);}
 const simulate=el('button','','Run safe simulation');const faultHint=el('p','context-note','Никакой реальный provider/D1/network не ломается. Проверяется только recovery contract.');
 fault.body.append(scenario,simulate,faultHint);

 function panel(title:string){const wrap=el('section','metatron-panel'),h=el('div','section-heading'),heading=el('h2','',title),body=el('div','metatron-panel-body');h.append(heading);wrap.append(h,body);return{wrap,body};}
 function badge(text:string){return el('span',`metatron-badge status-${text.replace(/[^a-z0-9_-]/gi,'-').toLowerCase()}`,text);}
 function renderList(host:HTMLElement,items:unknown[],empty='Нет данных.'){host.replaceChildren();if(!items.length){host.append(el('p','muted',empty));return;}const list=el('div','metatron-list');for(const item of items){const pre=el('pre');pre.textContent=jsonText(item);list.append(pre);}host.append(list);}

 async function controlMission(action:string,step?:number){
  if(!selectedMission)throw Error('Выберите миссию.');
  const body:any={missionId:selectedMission,projectId,action};if(step!==undefined)body.step=step;
  const response=await api('/api/metatron/control',{method:'POST',body:JSON.stringify(body)});
  notice(response.success===false?(response.reason??'Команда отклонена.'):`Metatron: ${action} принят.`);
  await refreshSnapshot();
 }

 async function refreshMissions(){
  const r=await api(`/api/metatron/missions?projectId=${encodeURIComponent(projectId)}`) as {items:MissionListItem[]};
  missionSelect.replaceChildren();
  for(const item of r.items){const option=el('option') as HTMLOptionElement;option.value=item.id;option.textContent=`${item.status.toUpperCase()} · ${item.goal.slice(0,72)}`;missionSelect.append(option);}
  if(selectedMission&&r.items.some(item=>item.id===selectedMission))missionSelect.value=selectedMission;
  else selectedMission=r.items[0]?.id??'';
  if(selectedMission){missionSelect.value=selectedMission;options.setMissionId(selectedMission);}
 }

 function renderSnapshot(data:MetatronSnapshot){
  status.replaceChildren(badge(data.mission.status));
  summary.replaceChildren();
  const cards:[string,string][]=[
   ['MISSION',data.mission.goal],['STATUS',data.mission.status.toUpperCase()],['COST',money(data.resources.actualMicroUsd||data.resources.reservedMicroUsd)],
   ['ELAPSED',duration(data.resources.elapsedMs)],['RISK',data.resources.risk],['FENCE',data.resources.fenceToken===null?'—':String(data.resources.fenceToken)],
   ['TOKENS',`${data.resources.promptTokens} in / ${data.resources.completionTokens} out`],['GRAPH',data.graph.mode],
  ];
  for(const [key,value] of cards){const card=el('article','metatron-stat');card.append(el('small','',key),el('strong','',value));summary.append(card);}

  graph.body.replaceChildren();const graphNote=el('p','context-note',`DAG mode: ${data.graph.mode}. ${data.graph.warning??''}`);graph.body.append(graphNote);
  const flow=el('div','mission-graph');for(const node of data.graph.nodes){const n=el('article','mission-node');n.append(badge(node.status),el('strong','',node.label),el('small','muted',node.dependencies.length?`depends on: ${node.dependencies.join(', ')}`:'root'));flow.append(n);}graph.body.append(flow);

  agents.body.replaceChildren();const agentGrid=el('div','metatron-agent-grid');
  const runtimeById=new Map(data.agentCards.runtime.map(item=>[item.agent_id,item]));
  const healthById=new Map((data.health??[]).map(item=>[item.id,item]));
  for(const registered of data.agentCards.registered){const live=runtimeById.get(registered.id),health=healthById.get(registered.id);const card=el('article','metatron-agent-card');card.append(el('strong','',registered.name),badge(live?.status??health?.status??registered.status),el('small','muted',registered.capabilities.join(' · ')));if(health)card.append(el('small','muted',`probe storage=${health.storageReadable?'readable':'failed'}`));if(live?.instance_id)card.append(el('code','',live.instance_id));if(live?.last_error||health?.error)card.append(el('p','error-text',live?.last_error??health?.error));agentGrid.append(card);}agents.body.append(agentGrid);

  logs.body.replaceChildren();const logList=el('ol','metatron-log');for(const event of data.live.events.slice(-80)){const li=el('li');li.append(el('code','',event.type),document.createTextNode(` · ${event.createdAt}`));if(event.data!==undefined){const details=el('pre');details.textContent=jsonText(event.data);li.append(details);}logList.append(li);}logs.body.append(el('p','muted',`Transport: ${data.live.transport}`),logList);

  trace.body.replaceChildren();trace.body.append(el('p','muted',`${data.traceExplorer.links.length} trace links · ${data.traceExplorer.toolCalls.length} tool calls · ${data.traceExplorer.modelCalls.length} model calls`));
  const traceRows=el('div','metatron-trace');for(const link of data.traceExplorer.links.slice(-80)){const row=el('div','metatron-trace-row');row.append(el('code','',String(link.entity_type??'trace')),el('span','',String(link.entity_id??'')),el('small','muted',String(link.trace_id??'')));traceRows.append(row);}trace.body.append(traceRows);

  checkpoints.body.replaceChildren();checkpoints.body.append(el('p','context-note','Mission Replay здесь read-only: он восстанавливает события/checkpoints и никогда повторно не вызывает provider/tool effects.'));
  const cpList=el('div','metatron-list');for(const point of data.checkpoints){const row=el('article','metatron-checkpoint');row.append(el('strong','',`#${point.step} · ${point.tool}`),badge(point.status));if(point.status==='failed'&&point.receipt_status==='failed'){const retry=el('button','','Retry step');retry.onclick=()=>controlMission('retry_step',point.step).catch(failure);row.append(retry);}cpList.append(row);}checkpoints.body.append(cpList,el('small','muted',`Replay: ${data.replay.events.length} events / ${data.replay.checkpoints.length} checkpoints / ${data.replay.decisions.length} decisions`));

  effects.body.replaceChildren();
  const reconciliation=el('article','metatron-reconciliation');
  reconciliation.append(
   badge(data.reconciliationEngine.mode),
   el('strong','','Effect Reconciliation Engine'),
   el('p','context-note',data.reconciliationEngine.note),
   el('code','',`${data.reconciliationEngine.connector.method} ${data.reconciliationEngine.connector.path}`),
   el('code','',`${data.reconciliationEngine.model.method} ${data.reconciliationEngine.model.path}`),
  );
  effects.body.append(reconciliation);
  if(!data.uncertainEffects.length)effects.body.append(el('p','muted','Нет uncertain_effect.'));else for(const effect of data.uncertainEffects){const row=el('article','metatron-warning');row.append(el('strong','',`Step ${effect.step} · ${effect.tool}`),badge('uncertain_effect'),el('pre','',jsonText(effect.result)),el('p','context-note','Автоматический retry запрещён. Сначала сверить внешний outcome через соответствующий Connector/Ledger reconciliation flow.'));effects.body.append(row);}

  approvals.body.replaceChildren();if(!data.approvals.length)approvals.body.append(el('p','muted','Approval nodes отсутствуют.'));else for(const approval of data.approvals){const row=el('article','metatron-checkpoint');row.append(el('strong','',approval.summary),badge(approval.status),el('small','muted',`${approval.action_type} · risk ${approval.risk}`));approvals.body.append(row);}
  renderList(memory.body,data.memoryInspector,'Эта миссия ещё не использовала Project Memory или аудит появился до rc.60.');
  decisions.body.replaceChildren();if(!data.decisions.length)decisions.body.append(el('p','muted','Decision receipts появятся у шагов, выполненных rc.60+.'));else for(const d of data.decisions.slice(-80)){const row=el('article','metatron-decision');row.append(badge(d.decision_kind),el('strong','',d.choice),el('p','',d.reason));decisions.body.append(row);}

  const dynamicFaults=fault.body.querySelector('.fault-results')??el('div','fault-results');dynamicFaults.replaceChildren();for(const run of data.faultInjection.slice(0,10))dynamicFaults.append(el('p','muted',`${run.scenario} · ${run.status} · simulation=${run.simulation_only===1}`));if(!dynamicFaults.parentElement)fault.body.append(dynamicFaults);
 }

 async function refreshSnapshot(probe=false){
  if(!selectedMission){summary.replaceChildren(el('p','context-note','В проекте пока нет миссий.'));return;}
  const data=await api(`/api/metatron/mission?missionId=${encodeURIComponent(selectedMission)}${probe?'&probe=1':''}`) as MetatronSnapshot;
  if(destroyed)return;renderSnapshot(data);
 }
 function scheduleRefresh(event:StreamEvent){if(event.missionId!==selectedMission)return;clearTimeout(refreshTimer);refreshTimer=window.setTimeout(()=>void refreshSnapshot().catch(failure),150);}
 async function boot(){
  await refreshMissions();await refreshSnapshot(true);
  streamStop=createProjectEventClient({api,projectId,onEvent:scheduleRefresh});
 }
 missionSelect.onchange=()=>{selectedMission=missionSelect.value;options.setMissionId(selectedMission);refreshSnapshot().catch(failure);};
 refreshButton.onclick=()=>Promise.all([refreshMissions(),refreshSnapshot(true)]).catch(failure);
 control.querySelectorAll<HTMLButtonElement>('button[data-metatron-action]').forEach(button=>button.onclick=()=>controlMission(button.dataset.metatronAction!).catch(failure));
 simulate.onclick=async()=>{if(!selectedMission)throw Error('Выберите миссию.');const r=await api('/api/metatron/fault-injection',{method:'POST',body:JSON.stringify({missionId:selectedMission,projectId,scenario:scenario.value})});notice(`Fault Injection simulation: ${r.run.status}`);await refreshSnapshot();};
 simulate.onclick=((handler=>()=>Promise.resolve(handler()).catch(failure))(simulate.onclick as any)) as any;
 boot().catch(failure);
 return()=>{destroyed=true;clearTimeout(refreshTimer);streamStop();};
}
