import {AccessError} from './accounts';

export type MissionNodeStatus='waiting'|'ready'|'running'|'paused'|'blocked'|'succeeded'|'failed'|'cancelled';
export type MissionGraphNode={
 id:string;label:string;dependencies:string[];parallelGroup?:string|null;retryLimit:number;timeoutMs:number;
 resourceRequirements:Record<string,number>;estimatedMicroUsd:number;status:MissionNodeStatus;
};
export type MissionGraph={nodes:MissionGraphNode[];order:string[];parallelGroups:Record<string,string[]>;estimatedMicroUsd:number};

export function validateMissionGraph(nodes:MissionGraphNode[]):MissionGraph{
 if(!nodes.length)throw new AccessError('Mission graph пуст.',400);
 if(nodes.length>500)throw new AccessError('Mission graph превышает 500 узлов.',413);
 const byId=new Map<string,MissionGraphNode>();
 for(const node of nodes){
  if(!/^[A-Za-z0-9_.:-]{1,120}$/.test(node.id)||byId.has(node.id))throw new AccessError('Mission graph содержит некорректный или повторяющийся id.',400);
  if(!node.label.trim()||node.label.length>180)throw new AccessError('Некорректная подпись шага.',400);
  if(!Number.isSafeInteger(node.retryLimit)||node.retryLimit<0||node.retryLimit>10)throw new AccessError('retryLimit должен быть 0–10.',400);
  if(!Number.isSafeInteger(node.timeoutMs)||node.timeoutMs<1000||node.timeoutMs>30*60_000)throw new AccessError('timeoutMs должен быть 1s–30m.',400);
  if(!Number.isSafeInteger(node.estimatedMicroUsd)||node.estimatedMicroUsd<0)throw new AccessError('Некорректная оценка стоимости.',400);
  byId.set(node.id,node);
 }
 for(const node of nodes)for(const dep of node.dependencies)if(!byId.has(dep)||dep===node.id)throw new AccessError(`Некорректная dependency ${dep} → ${node.id}.`,400);
 const indegree=new Map<string,number>(nodes.map(node=>[node.id,0])),children=new Map<string,string[]>();
 for(const node of nodes)for(const dep of new Set(node.dependencies)){indegree.set(node.id,(indegree.get(node.id)??0)+1);const list=children.get(dep)??[];list.push(node.id);children.set(dep,list);}
 const queue=nodes.filter(node=>indegree.get(node.id)===0).map(node=>node.id),order:string[]=[];
 while(queue.length){const id=queue.shift()!;order.push(id);for(const child of children.get(id)??[]){const next=(indegree.get(child)??1)-1;indegree.set(child,next);if(next===0)queue.push(child);}}
 if(order.length!==nodes.length)throw new AccessError('Mission graph содержит цикл.',400);
 const parallelGroups:Record<string,string[]>={};
 for(const node of nodes)if(node.parallelGroup){(parallelGroups[node.parallelGroup]??=[]).push(node.id);}
 return {nodes,order,parallelGroups,estimatedMicroUsd:nodes.reduce((sum,node)=>sum+node.estimatedMicroUsd,0)};
}

