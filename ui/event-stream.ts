export type StreamEvent={
 seq:number;id:string;schemaVersion:1;domain:string;type:string;
 accountId?:string;projectId?:string;missionId?:string;taskId?:string;approvalId?:string;
 subjectType:string;subjectId:string;actor?:string;payload?:unknown;createdAt:number;
};

type Api=(path:string,options?:RequestInit)=>Promise<any>;

export function createProjectEventClient(options:{
 api:Api;projectId:string;onEvent:(event:StreamEvent)=>void;onStatus?:(status:'connecting'|'live'|'offline')=>void;
}){
 const {api,projectId,onEvent,onStatus}=options;
 const key=`pulse.events.${projectId}`;
 let stopped=false,ws:WebSocket|null=null,retry=0,timer=0;
 let cursor=0;
 try{const saved=Number(sessionStorage.getItem(key)??'0');if(Number.isSafeInteger(saved)&&saved>=0)cursor=saved;}catch{}
 function accept(event:StreamEvent){
  if(!event||event.projectId!==projectId||!Number.isSafeInteger(event.seq)||event.seq<=cursor)return;
  cursor=event.seq;try{sessionStorage.setItem(key,String(cursor));}catch{};onEvent(event);
 }
 async function replay(){
  for(let page=0;page<20&&!stopped;page++){
   const r=await api(`/api/projects/${encodeURIComponent(projectId)}/events?after=${cursor}&limit=250`) as {events:StreamEvent[];cursor:number;hasMore:boolean};
   for(const event of r.events??[])accept(event);
   if(!r.hasMore)return;
  }
  throw Error('Event replay window exceeded; refresh the project before continuing.');
 }
 async function connect(){
  if(stopped||typeof WebSocket==='undefined')return;
  onStatus?.('connecting');
  try{
   await replay();if(stopped)return;
   const ticket=await api('/api/stream/ticket',{method:'POST',body:JSON.stringify({projectId})});
   const proto=location.protocol==='https:'?'wss:':'ws:';
   ws=new WebSocket(`${proto}//${location.host}/api/stream?ticket=${encodeURIComponent(ticket.ticket)}&projectId=${encodeURIComponent(projectId)}`);
   ws.onopen=()=>{retry=0;onStatus?.('live');};
   ws.onmessage=(message)=>{let frame:any;try{frame=JSON.parse(String(message.data));}catch{return;}if(frame?.type==='event_stream')accept(frame.event as StreamEvent);};
   ws.onerror=()=>{};
   ws.onclose=()=>{ws=null;if(stopped)return;onStatus?.('offline');clearTimeout(timer);timer=window.setTimeout(()=>void connect(),Math.min(15000,1000*2**Math.min(retry++,4)));};
  }catch{if(stopped)return;onStatus?.('offline');clearTimeout(timer);timer=window.setTimeout(()=>void connect(),Math.min(15000,1000*2**Math.min(retry++,4)));}
 }
 void connect();
 return ()=>{stopped=true;clearTimeout(timer);try{ws?.close(1000,'project changed');}catch{}ws=null;};
}
