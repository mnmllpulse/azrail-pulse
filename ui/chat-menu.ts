import type {createChatHistory} from './chat-history';
import {shareText} from './chat-actions';

export type ChatMenuDeps={
 chatHistory:ReturnType<typeof createChatHistory>;
 api:(path:string,options?:RequestInit)=>Promise<any>;
 /** есть аккаунт и приложение не открыто локально */
 signedIn:()=>boolean;
 notice:(message:string,persist?:boolean)=>void;
 syncChatUI:(messages?:boolean)=>void;
 openChat:(id:string)=>void;
 newChat:()=>void;
 getProject:()=>string;
 /** меняет проект текущего чата и сохраняет состояние устройства */
 setProject:(id:string)=>void;
};

export function createChatMenu(deps:ChatMenuDeps){
 const chatHistory=deps.chatHistory;
async function persistChatMeta(id:string,patch:{title?:string;pinned?:boolean;archived?:boolean;projectId?:string|null}){
 if(!deps.signedIn())return;
 try{await deps.api('/api/conversations',{method:'PATCH',body:JSON.stringify({id,...patch})});}catch{/* Local rename/pin still kept. */}
}
 function renameChat(id:string){
 const thread=chatHistory.list().find(t=>t.id===id);if(!thread)return;
 const next=window.prompt('Название чата',thread.title);
 if(next===null)return;
 const title=next.replace(/\s+/g,' ').trim().slice(0,90);if(!title){deps.notice('Название не может быть пустым.',true);return;}
 chatHistory.rename(id,title);deps.syncChatUI(false);void persistChatMeta(id,{title});
}
 function togglePinChat(id:string){
 const thread=chatHistory.list().find(t=>t.id===id);if(!thread)return;
 const pinned=!thread.pinned;chatHistory.setPinned(id,pinned);deps.syncChatUI(false);void persistChatMeta(id,{pinned});
}
 function toggleArchiveChat(id:string){
 const thread=chatHistory.list().find(t=>t.id===id);if(!thread)return;
 const archived=!thread.archived;chatHistory.setArchived(id,archived);deps.syncChatUI(false);void persistChatMeta(id,{archived});
 deps.notice(archived?'Чат в архиве.':'Чат возвращён из архива.');
}
 async function deleteChat(id:string){
 const thread=chatHistory.list().find(t=>t.id===id);if(!thread)return;
 if(!window.confirm(`Удалить чат «${thread.title}»?`))return;
 chatHistory.remove(id);
 if(deps.signedIn()){try{await deps.api(`/api/chat?conversationId=${encodeURIComponent(id)}`,{method:'DELETE'});}catch{/* Local removal still applies. */}}
 if(chatHistory.current())deps.openChat(chatHistory.current()!.id);else deps.newChat();
 deps.notice('Чат удалён.');
}
 async function shareChat(id:string){
 const thread=chatHistory.list().find(t=>t.id===id);if(!thread)return;
 const lines=thread.turns.flatMap(t=>[`Вы: ${t.user}`,t.reply?`AZRAIL: ${t.reply}`:null]).filter(Boolean) as string[];
 const text=`${thread.title}\n\n${lines.join('\n\n')}\n\n${location.origin}/?chat=${encodeURIComponent(id)}`;
 const ok=await shareText(text,thread.title);
 deps.notice(ok?'Чат готов к отправке / скопирован.':'Не удалось поделиться чатом.',!ok);
}
 function addChatToProject(id:string){
 const thread=chatHistory.list().find(t=>t.id===id);if(!thread)return;
 const next=window.prompt('ID проекта (оставьте пустым, чтобы отвязать)',thread.projectId||deps.getProject()||'');
 if(next===null)return;
 const projectId=next.trim()||null;
 chatHistory.setProject(id,projectId??'');
 if(thread.id===chatHistory.current()?.id){deps.setProject(projectId??'');}
 deps.syncChatUI(false);void persistChatMeta(id,{projectId});
 deps.notice(projectId?'Чат добавлен в проект.':'Чат отвязан от проекта.');
}
 let deferredInstallPrompt:any=null;
 window.addEventListener('beforeinstallprompt',(e)=>{e.preventDefault();deferredInstallPrompt=e;});
 async function addChatToHomeScreen(){
 if(deferredInstallPrompt){
  deferredInstallPrompt.prompt();
  try{await deferredInstallPrompt.userChoice;}catch{/* cancelled */}
  deferredInstallPrompt=null;
  deps.notice('Ярлык AZRAIL можно добавить на главный экран.');
  return;
 }
 const isIos=/iphone|ipad|ipod/i.test(navigator.userAgent);
 deps.notice(isIos
  ?'На iPhone: «Поделиться» → «На экран Домой».'
  :'В меню браузера выберите «Установить приложение» / «Добавить на главный экран».',true);
}
 function closeChatMenus(){document.querySelectorAll('.chat-menu').forEach(el=>el.remove());}
 function placeFloatingMenu(menu:HTMLElement,anchor:HTMLElement){
 document.body.append(menu);
 const rect=anchor.getBoundingClientRect();
 const width=Math.min(280,window.innerWidth-24);
 menu.style.position='fixed';
 menu.style.width=`${width}px`;
 menu.style.maxHeight='min(46dvh,280px)';
 menu.style.overflow='auto';
 menu.style.zIndex='80';
 menu.style.left=`${Math.max(12,Math.min(rect.left,window.innerWidth-width-12))}px`;
 if(rect.bottom+200>window.innerHeight-12){menu.style.top='auto';menu.style.bottom=`${Math.max(12,window.innerHeight-rect.top+6)}px`;}
 else{menu.style.top=`${rect.bottom+6}px`;menu.style.bottom='auto';}
}
 function openChatMenu(id:string,anchor:HTMLElement){
 closeChatMenus();
 const thread=chatHistory.list().find(t=>t.id===id);if(!thread)return;
 const menu=document.createElement('div');menu.className='chat-menu';menu.setAttribute('role','menu');
 const item=(label:string,action:()=>void,danger=false)=>{
  const btn=document.createElement('button');btn.type='button';btn.className=danger?'chat-menu-item danger':'chat-menu-item';btn.setAttribute('role','menuitem');btn.textContent=label;
  btn.onclick=(e)=>{e.stopPropagation();closeChatMenus();action();};
  menu.append(btn);
 };
 item('Переименовать чат',()=>renameChat(id));
 item('Удалить чат',()=>{void deleteChat(id);},true);
 item(thread.archived?'Разархивировать чат':'Архивировать чат',()=>toggleArchiveChat(id));
 item('Поделиться чатом',()=>{void shareChat(id);});
 item(thread.pinned?'Открепить чат':'Закрепить чат',()=>togglePinChat(id));
 item('Добавить в проект',()=>addChatToProject(id));
 item('Добавить на главный экран',()=>{void addChatToHomeScreen();});
 const row=anchor.closest('.chat-row')||anchor.parentElement;if(row)row.append(menu);
 const onDoc=(e:MouseEvent)=>{if(!menu.contains(e.target as Node)&&e.target!==anchor){closeChatMenus();document.removeEventListener('click',onDoc,true);}};
 window.setTimeout(()=>document.addEventListener('click',onDoc,true),0);
}
 return {open:openChatMenu,close:closeChatMenus,place:placeFloatingMenu};
}
export type ChatMenu=ReturnType<typeof createChatMenu>;
