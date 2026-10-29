export type StudioRoomTurn={id:string;role:'user'|'studio';text:string};
type Room={draft:string;turns:StudioRoomTurn[]};
const str=(value:unknown,max:number)=>typeof value==='string'?value.slice(0,max):'';

/** One conversation per studio. The home dialog stays in chat-history.ts. */
export function createStudioRooms(storage:Storage|undefined){
 let scope='guest';
 const cache=new Map<string,Room>();
 const storageKey=(room:string)=>`pulse.studio-room.v1.${encodeURIComponent(scope)}.${room}`;
 const bucket=(room:string)=>`${scope}:${room}`;
 function read(room:string):Room{
  try{
   const raw=JSON.parse(storage?.getItem(storageKey(room))??'null');
   if(!raw||typeof raw!=='object')return {draft:'',turns:[]};
   const turns=(Array.isArray(raw.turns)?raw.turns:[]).slice(-40).filter((turn:any)=>turn&&(turn.role==='user'||turn.role==='studio')&&typeof turn.id==='string').map((turn:any)=>({id:str(turn.id,80),role:turn.role as 'user'|'studio',text:str(turn.text,8000)}));
   return {draft:str(raw.draft,20000),turns};
  }catch{return {draft:'',turns:[]};}
 }
 function write(room:string,data:Room){try{storage?.setItem(storageKey(room),JSON.stringify(data));}catch{/* The room stays in memory when storage is full. */}}
 function room(id:string){
  const key=bucket(id);let data=cache.get(key);
  if(!data){data=read(id);cache.set(key,data);}
  return data;
 }
 return {
  setScope(value:string){if(scope===value)return;scope=value;cache.clear();},
  draft(id:string){return room(id).draft;},
  setDraft(id:string,value:string){const data=room(id);data.draft=value.slice(0,20000);write(id,data);},
  turns(id:string){return room(id).turns;},
  push(id:string,role:'user'|'studio',text:string){
   const data=room(id);
   const turn:StudioRoomTurn={id:crypto.randomUUID(),role,text:text.slice(0,8000)};
   data.turns=[...data.turns,turn].slice(-40);
   if(role==='user')data.draft='';
   write(id,data);
   return turn;
  },
  replace(id:string,turnId:string,text:string){
   const turn=room(id).turns.find(item=>item.id===turnId);
   if(turn)turn.text=text.slice(0,8000);
   write(id,room(id));
  },
 };
}
