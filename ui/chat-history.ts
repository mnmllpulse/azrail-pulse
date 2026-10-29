import {appendAssistantActions,type MessageActionHandlers} from './chat-actions';
import {fillMarkdownContent} from './chat-markdown';

export type ChatTurn={missionId:string;requestKey:string;user:string;reply:string;status:string};
export type ChatThread={id:string;title:string;projectId:string;missionId:string;draft:string;updatedAt:number;pinned:boolean;archived:boolean;customTitle:boolean;turns:ChatTurn[]};
export type RemoteConversation={id:string;project_id?:string|null;preview?:string|null;title?:string|null;pinned?:number|boolean|null;archived?:number|boolean|null;created_at?:string|number|null;last_message_at?:string|number|null;message_count?:number|null};
export type RemoteMessage={id?:string;role?:string;content?:string;created_at?:string|number|null};
type Snapshot={active:string;threads:ChatThread[]};
const str=(value:unknown,max=20000)=>typeof value==='string'?value.slice(0,max):'';

function stamp(value:unknown):number{
 if(typeof value==='number'&&Number.isFinite(value))return value<1e12?value*1000:value;
 if(typeof value==='string'&&value.trim()){
  const asNum=Number(value);
  if(Number.isFinite(asNum)&&/^\d+(\.\d+)?$/.test(value.trim()))return asNum<1e12?asNum*1000:asNum;
  const parsed=Date.parse(value);
  if(Number.isFinite(parsed))return parsed;
 }
 return 0;
}

/** First three words — ChatGPT-style sidebar title. */
export function autoChatTitle(text:string):string{
 const words=text.replace(/\s+/g,' ').trim().split(' ').filter(Boolean).slice(0,3);
 return words.join(' ')||'Новый чат';
}

/** Pair server messages into Chat turns (user → assistant). */
export function messagesToTurns(messages:RemoteMessage[]):ChatTurn[]{
 const turns:ChatTurn[]=[];
 for(const row of messages){
  const role=String(row.role??'');
  const content=str(row.content);
  if(!content)continue;
  if(role==='user'){
   turns.push({missionId:'',requestKey:str(row.id,128)||crypto.randomUUID(),user:content,reply:'',status:'completed'});
   continue;
  }
  if(role==='assistant'){
   const open=[...turns].reverse().find(t=>t.user&&!t.reply);
   if(open){open.reply=content;open.status='completed';}
  }
 }
 return turns.slice(-40);
}

function sortThreads(threads:ChatThread[]){
 threads.sort((a,b)=>{
  if(a.archived!==b.archived)return a.archived?1:-1;
  if(a.pinned!==b.pinned)return a.pinned?-1:1;
  return b.updatedAt-a.updatedAt;
 });
}

/** Tab cache + account scope. Server conversations are the cross-device source of truth. */
export function createChatHistory(storage:Storage|undefined,onStorageError:()=>void=()=>{}) {
 let scope='',state:Snapshot={active:'',threads:[]},warned=false;
 const key=()=>`pulse.chats.v1.${encodeURIComponent(scope)}`;
 function save(){try{storage?.setItem(key(),JSON.stringify(state));}catch{if(!warned){warned=true;onStorageError();}}}
 function current(){return state.threads.find(t=>t.id===state.active);}
 function create(id?:string){
  const thread:ChatThread={id:id&&!state.threads.some(t=>t.id===id)?id:crypto.randomUUID(),title:'Новый чат',projectId:'',missionId:'',draft:'',updatedAt:Date.now(),pinned:false,archived:false,customTitle:false,turns:[]};
  state.threads.unshift(thread);sortThreads(state.threads);state.threads=state.threads.slice(0,50);state.active=thread.id;save();return thread;
 }
 function touch(thread:ChatThread){thread.updatedAt=Date.now();sortThreads(state.threads);save();}
 function ensure(id:string,seed:Partial<ChatThread>={}){
  let thread=state.threads.find(t=>t.id===id);
  if(!thread){
   thread={id,title:str(seed.title,90)||'Новый чат',projectId:str(seed.projectId,128),missionId:str(seed.missionId,128),draft:str(seed.draft),updatedAt:Number.isFinite(seed.updatedAt)?Number(seed.updatedAt):Date.now(),pinned:!!seed.pinned,archived:!!seed.archived,customTitle:!!seed.customTitle,turns:[]};
   state.threads.unshift(thread);state.threads=state.threads.slice(0,50);
  }
  return thread;
 }
 return {
  current,list:()=>state.threads,
  setScope(value:string){
   if(scope===value)return;scope=value;state={active:'',threads:[]};warned=false;
   try{
    const raw=JSON.parse(storage?.getItem(key())??'null');
    if(raw&&Array.isArray(raw.threads)){
     state.threads=raw.threads.slice(0,50).filter((t:any)=>t&&typeof t.id==='string').map((t:any)=>({
      id:str(t.id,128),title:str(t.title,90)||'Новый чат',projectId:str(t.projectId,128),missionId:str(t.missionId,128),draft:str(t.draft),updatedAt:Number.isFinite(t.updatedAt)?t.updatedAt:0,
      pinned:!!t.pinned,archived:!!t.archived,customTitle:!!t.customTitle,
      turns:(Array.isArray(t.turns)?t.turns:[]).slice(-40).filter((v:any)=>v&&typeof v.missionId==='string').map((v:any)=>({missionId:str(v.missionId,128),requestKey:str(v.requestKey,128),user:str(v.user),reply:str(v.reply),status:str(v.status,40)})),
     }));sortThreads(state.threads);state.active=state.threads.some(t=>t.id===raw.active)?raw.active:'';
    }
   }catch{/* A malformed or unavailable cache must not prevent opening the app. */}
  },
  create,
  ensure,
  select(id:string){const thread=state.threads.find(t=>t.id===id);if(thread){state.active=id;save();}return thread;},
  attach(projectId:string,missionId:string){
   let thread=current();
   if(projectId&&thread?.projectId&&thread.projectId!==projectId){thread=state.threads.find(t=>t.projectId===projectId);if(thread)state.active=thread.id;}
   thread??=create();thread.projectId=projectId;thread.missionId=missionId;save();return thread;
  },
  setDraft(value:string){let thread=current();if(!thread&&!value.trim())return;thread??=create();thread.draft=value.slice(0,20000);save();},
  rename(id:string,title:string){
   const thread=state.threads.find(t=>t.id===id);if(!thread)return;
   const next=title.replace(/\s+/g,' ').trim().slice(0,90);
   if(!next)return;thread.title=next;thread.customTitle=true;touch(thread);
  },
  setPinned(id:string,pinned:boolean){
   const thread=state.threads.find(t=>t.id===id);if(!thread)return;
   thread.pinned=pinned;touch(thread);
  },
  setArchived(id:string,archived:boolean){
   const thread=state.threads.find(t=>t.id===id);if(!thread)return;
   thread.archived=archived;if(archived)thread.pinned=false;touch(thread);
  },
  remove(id:string){
   state.threads=state.threads.filter(t=>t.id!==id);
   if(state.active===id)state.active=state.threads[0]?.id??'';
   save();
  },
  setProject(id:string,projectId:string){
   const thread=state.threads.find(t=>t.id===id);if(!thread)return;
   thread.projectId=str(projectId,128);touch(thread);
  },
  accepted(requestKey:string,message:string,projectId:string,missionId:string){
   const thread=this.attach(projectId,missionId);
   if(!thread.turns.some(t=>t.requestKey===requestKey))thread.turns.push({missionId,requestKey,user:message.slice(0,20000),reply:'',status:'queued'});
   thread.turns=thread.turns.slice(-40);
   if(!thread.customTitle)thread.title=autoChatTitle(thread.turns[0]?.user||message);
   thread.draft='';touch(thread);return thread;
  },
  report(id:string,reply:string,status:string){
   let thread=state.threads.find(t=>t.turns.some(turn=>turn.requestKey===id));
   let turn=thread?.turns.find(t=>t.requestKey===id);
   if(!turn){
    thread=state.threads.find(t=>t.turns.some(t2=>t2.missionId===id));
    const matches=thread?.turns.filter(t2=>t2.missionId===id)??[];
    turn=[...matches].reverse().find(t2=>!t2.reply||t2.status==='queued'||t2.status==='failed')??matches.at(-1);
   }
   if(thread&&turn&&(turn.reply!==reply||turn.status!==status)){turn.reply=reply.slice(0,20000);turn.status=status;touch(thread);}
  },
  mergeRemote(conversations:RemoteConversation[]){
   for(const row of conversations){
    if(!row||typeof row.id!=='string'||!row.id)continue;
    const preview=str(row.preview,200),previewTitle=autoChatTitle(preview);
    const serverTitle=str(row.title,90).trim();
    const updatedAt=stamp(row.last_message_at)||stamp(row.created_at)||Date.now();
    const thread=ensure(row.id,{title:previewTitle,projectId:str(row.project_id,128),updatedAt,pinned:!!row.pinned,archived:!!row.archived});
    if(row.project_id&&!thread.projectId)thread.projectId=str(row.project_id,128);
    thread.pinned=!!row.pinned;
    thread.archived=!!row.archived;
    if(!thread.customTitle){
     const defaults=new Set(['','AZRAIL Chat','Новый чат','Чат']);
     if(serverTitle&&!defaults.has(serverTitle)){
      const fullPreview=preview.replace(/\s+/g,' ').trim().slice(0,90);
      // Renamed on another device if title is not the auto 3-word / raw preview form.
      if(serverTitle!==previewTitle&&serverTitle!==fullPreview){thread.title=serverTitle;thread.customTitle=true;}
      else thread.title=previewTitle||serverTitle;
     }else thread.title=previewTitle||thread.title||'Новый чат';
    }
    thread.updatedAt=Math.max(thread.updatedAt||0,updatedAt);
   }
   sortThreads(state.threads);state.threads=state.threads.slice(0,50);
   if(!state.active&&state.threads[0])state.active=state.threads[0].id;
   save();
  },
  hydrate(id:string,messages:RemoteMessage[]){
   const thread=ensure(id);
   const serverTurns=messagesToTurns(messages);
   const queued=thread.turns.filter(t=>t.status==='queued'&&t.user&&!serverTurns.some(s=>s.requestKey===t.requestKey||(s.user===t.user&&!s.reply)));
   thread.turns=[...serverTurns,...queued].slice(-40);
   if(!thread.customTitle&&serverTurns[0]?.user)thread.title=autoChatTitle(serverTurns[0].user);
   thread.updatedAt=Math.max(thread.updatedAt,Date.now());
   sortThreads(state.threads);save();
   return thread;
  },
  clearScope(){try{storage?.removeItem(key());}catch{}state={active:'',threads:[]};},
 };
}

export function renderChatMessages(host:HTMLElement,thread:ChatThread|undefined,liveMission:string,handlers:MessageActionHandlers={}) {
 host.replaceChildren();
 const doc=host.ownerDocument;
 function message(role:'user'|'assistant',content:string,status?:string){
  const item=doc.createElement('article');item.className='chat-message';item.dataset.role=role;
  const heading=doc.createElement('h3');heading.className='message-heading';heading.textContent=role==='user'?'Вы':(handlers.assistantLabel||'AZRAIL');
  item.append(heading);
  if(role==='assistant'&&content){
   const body=doc.createElement('div');
   fillMarkdownContent(body,content);
   item.append(body);
   if(status!=='queued'&&status!=='failed')appendAssistantActions(item,content,handlers);
  }else{
   const text=doc.createElement('p');text.className='message-content';text.textContent=content;item.append(text);
  }
  if(status==='queued'){const info=doc.createElement('span');info.className='message-status';info.textContent='Думаю…';item.append(info);}
  else if(status==='failed'){const info=doc.createElement('span');info.className='message-status';info.textContent='Ошибка';item.append(info);}
  host.append(item);
 }
 for(const turn of thread?.turns??[]){
  message('user',turn.user);
  const liveMissionTurn=!!liveMission&&turn.missionId===liveMission&&!turn.reply&&turn.status!=='queued'&&turn.status!=='failed';
  if(liveMissionTurn)continue;
  if(turn.reply)message('assistant',turn.reply);
  else if(turn.status==='queued')message('assistant','', 'queued');
  else if(turn.status==='failed')message('assistant',turn.reply||'Не удалось получить ответ.','failed');
 }
}
