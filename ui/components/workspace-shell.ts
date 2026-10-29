/** Layout only; requests, projects and credentials remain owned by app.ts. */
export function mountWorkspaceShell(onContextOpen:()=>void=()=>{}) {
 const get=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T;
 const shell=get('workspace'),sidebar=get('workspace-sidebar'),center=get('main').parentElement!;
 const panel=get('context-panel'),preview=get('preview-panel');
 const toggle=get('sidebar-toggle'),contextToggle=get('context-toggle'),previewToggle=get('preview-toggle');
 const backdrop=get('sidebar-backdrop'),prompt=get<HTMLTextAreaElement>('prompt');
 const scroll=get('chat-scroll'),jump=get('jump-latest'),dock=document.querySelector<HTMLElement>('.composer-dock')!;
 const mobile=window.matchMedia('(max-width: 760px)'),compact=window.matchMedia('(max-width: 1199px)');
 let sidebarOpen=!mobile.matches,contextOpen=false,previewOpen=false,following=true;
 try{const saved=localStorage.getItem('pulse.sidebar');if(saved!==null&&!mobile.matches)sidebarOpen=saved==='open';}catch{}
 function rightOpen(){return contextOpen||previewOpen;}
 function sync(){
  const visible=sidebarOpen&&!(compact.matches&&!mobile.matches&&rightOpen());
  shell.dataset.sidebarOpen=String(sidebarOpen);
  shell.dataset.contextOpen=String(contextOpen);
  shell.dataset.previewOpen=String(previewOpen);
  sidebar.inert=!visible;sidebar.setAttribute('aria-hidden',String(!visible));
  toggle.setAttribute('aria-expanded',String(visible));toggle.setAttribute('aria-label',visible?'Скрыть навигацию':'Показать навигацию');
  contextToggle.setAttribute('aria-expanded',String(contextOpen));panel.hidden=!contextOpen;
  previewToggle.setAttribute('aria-expanded',String(previewOpen));preview.hidden=!previewOpen;
  backdrop.hidden=!(mobile.matches&&visible);
  center.inert=mobile.matches&&visible;panel.inert=mobile.matches&&visible;preview.inert=mobile.matches&&visible;
  get('main').inert=mobile.matches&&rightOpen();
  dock.inert=mobile.matches&&(rightOpen()||visible);
  if(previewOpen)document.dispatchEvent(new CustomEvent('azrail:preview-open'));
 }
 function setSidebar(open:boolean,restoreFocus=false){
  sidebarOpen=open;if(open&&rightOpen()&&compact.matches&&!mobile.matches){contextOpen=false;previewOpen=false;}
  if(!mobile.matches)try{localStorage.setItem('pulse.sidebar',open?'open':'closed');}catch{}
  sync();if(restoreFocus)toggle.focus();else if(open&&mobile.matches)get('new-chat').focus();
 }
 function setContext(open:boolean,focus=false){
  contextOpen=open;if(open){previewOpen=false;if(mobile.matches)sidebarOpen=false;}
  sync();
  if(open){onContextOpen();if(focus)get('context-close').focus();}else if(focus)contextToggle.focus();
 }
 function setPreview(open:boolean,focus=false){
  previewOpen=open;if(open){contextOpen=false;if(mobile.matches)sidebarOpen=false;}
  sync();
  if(open&&focus)get('preview-close').focus();else if(focus)previewToggle.focus();
 }
 toggle.onclick=()=>setSidebar(toggle.getAttribute('aria-expanded')!=='true');
 get('sidebar-close').onclick=()=>setSidebar(false,true);backdrop.onclick=()=>setSidebar(false,true);
 contextToggle.onclick=()=>setContext(!contextOpen,true);get('context-close').onclick=()=>setContext(false,true);
 previewToggle.onclick=()=>setPreview(!previewOpen,true);get('preview-close').onclick=()=>setPreview(false,true);
 const resize=()=>{if(mobile.matches)sidebarOpen=false;sync();resizePrompt();};
 mobile.addEventListener('change',resize);compact.addEventListener('change',resize);
 function keydown(event:KeyboardEvent){
  if(event.defaultPrevented||document.querySelector('dialog[open]'))return;
  if(event.key==='Escape'){
   if(mobile.matches&&sidebarOpen){event.preventDefault();setSidebar(false,true);}
   else if(previewOpen){event.preventDefault();setPreview(false,true);}
   else if(contextOpen){event.preventDefault();setContext(false,true);}
  }
  if(event.key==='Tab'&&mobile.matches&&sidebarOpen){
   const focusable=Array.from(sidebar.querySelectorAll<HTMLElement>('a[href],button:not(:disabled),input')).filter(el=>!el.hidden);
   const first=focusable[0],last=focusable.at(-1);
   if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
   else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
  }
 }
 document.addEventListener('keydown',keydown);
 function resizePrompt(){prompt.style.height='auto';const limit=Math.max(48,Math.min(200,window.innerHeight*.25));prompt.style.height=Math.min(limit,Math.max(48,prompt.scrollHeight))+'px';prompt.style.overflowY=prompt.scrollHeight>limit?'auto':'hidden';}
 prompt.addEventListener('input',resizePrompt);
 const scrollListener=()=>{following=scroll.scrollHeight-scroll.scrollTop-scroll.clientHeight<100;jump.hidden=following;};
 scroll.addEventListener('scroll',scrollListener,{passive:true});
 function toLatest(){following=true;scroll.scrollTop=scroll.scrollHeight;jump.hidden=true;}
 jump.onclick=toLatest;
 const observer=typeof ResizeObserver==='undefined'?null:new ResizeObserver(()=>{shell.style.setProperty('--composer-height',`${dock.offsetHeight+12}px`);if(following)toLatest();});
 observer?.observe(dock);
 window.addEventListener('resize',resizePrompt);
 sync();resizePrompt();
 return {
  setContext,setPreview,resizePrompt,toLatest,
  contentChanged(){if(following)toLatest();else scrollListener();},
  routeChanged(){if(mobile.matches){setSidebar(false);if(contextOpen)setContext(false);if(previewOpen)setPreview(false);}get('main').scrollTop=0;resizePrompt();},
  destroy(){mobile.removeEventListener('change',resize);compact.removeEventListener('change',resize);document.removeEventListener('keydown',keydown);prompt.removeEventListener('input',resizePrompt);window.removeEventListener('resize',resizePrompt);scroll.removeEventListener('scroll',scrollListener);observer?.disconnect();},
 };
}
