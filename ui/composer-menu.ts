import {iconElement} from './icons';

export type EffortLevel='low'|'medium'|'high'|'max';
export type ModelDot='free'|'neuron';
export type MenuModel={slug:string;label:string;description?:string;dot?:ModelDot};
export const DOT_TITLE:Record<ModelDot,string>={free:'Бесплатная модель',neuron:'Workers Paid: тратит лимит нейронов'};
export type ModelMenuDeps={
 root:HTMLElement;
 button:HTMLButtonElement;
 current:()=>MenuModel;
 others:()=>MenuModel[];
 select:(slug:string)=>void;
 openAll:()=>void;
};

export const EFFORT_LEVELS:{id:EffortLevel;label:string}[]=[
 {id:'low',label:'Низкий'},
 {id:'medium',label:'Средний'},
 {id:'high',label:'Высокий'},
 {id:'max',label:'Максимальный'},
];
export const EFFORT_DEFAULT:EffortLevel='medium';
export const EFFORT_NOTE='Чем выше уровень усилий, тем более тщательные ответы — но это занимает больше времени и быстрее расходует лимиты использования';
const KEY='pulse.effort';

export function readEffort():EffortLevel{
 try{const v=sessionStorage.getItem(KEY);return EFFORT_LEVELS.some(l=>l.id===v)?v as EffortLevel:EFFORT_DEFAULT;}catch{return EFFORT_DEFAULT;}
}
export function effortLabel(level:EffortLevel){return EFFORT_LEVELS.find(l=>l.id===level)!.label;}

export function createModelMenu(deps:ModelMenuDeps){
 let effort=readEffort();
 let menu:HTMLElement|null=null;
 const doc=deps.root.ownerDocument;
 const el=(tag:string,cls?:string,text?:string)=>{const e=doc.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;};
 function paintButton(){
  const slot=doc.getElementById('composer-models-effort');
  if(slot)slot.textContent=effortLabel(effort);
 }
 function setEffort(next:EffortLevel){
  effort=next;
  try{sessionStorage.setItem(KEY,next);}catch{}
  paintButton();
 }
 function row(title:string,sub:string|undefined,trailing:string|null,onClick:()=>void,checked=false,dot?:ModelDot|null){
  const b=el('button','composer-menu-item') as HTMLButtonElement;b.type='button';b.setAttribute('role','menuitem');
  if(dot!==undefined){const d=el('span','composer-menu-dot');if(dot){d.dataset.dot=dot;d.title=DOT_TITLE[dot];d.setAttribute('role','img');d.setAttribute('aria-label',DOT_TITLE[dot]);}else d.setAttribute('aria-hidden','true');b.append(d);}
  const body=el('span','composer-menu-body');body.append(el('strong',undefined,title));
  if(sub)body.append(el('small',undefined,sub));
  b.append(body);
  if(trailing)b.append(el('span','composer-menu-trail',trailing));
  if(checked){const c=iconElement('check',16,doc);c.classList.add('composer-menu-check');b.append(c);}
  b.onclick=onClick;
  return b;
 }
 function head(title:string,back:()=>void){
  const b=el('button','composer-menu-back') as HTMLButtonElement;b.type='button';
  b.append(iconElement('back',16,doc),el('span',undefined,title));
  b.onclick=back;
  return b;
 }
 function show(view:'root'|'effort'|'models'){
  if(!menu)return;
  menu.replaceChildren();
  if(view==='root'){
   const cur=deps.current();
   menu.append(row(cur.label,undefined,null,close,true,cur.dot??null));
   menu.append(el('hr','composer-menu-sep'));
   menu.append(row('Уровень усилий',undefined,`${effortLabel(effort)} ›`,()=>show('effort')));
   menu.append(row('Другие модели',undefined,'›',()=>show('models')));
  }else if(view==='effort'){
   menu.append(head('Уровень усилий',()=>show('root')));
   for(const level of EFFORT_LEVELS){
    menu.append(row(level.label,undefined,level.id===EFFORT_DEFAULT?'Рекомендуется':null,()=>{setEffort(level.id);show('effort');},level.id===effort));
   }
   menu.append(el('p','composer-menu-note',EFFORT_NOTE));
  }else{
   menu.append(head('Другие модели',()=>show('root')));
   const list=deps.others().slice(0,300);
   if(!list.length)menu.append(el('p','composer-menu-note','Каталог моделей доступен после входа.'));
   for(const m of list)menu.append(row(m.label,undefined,null,()=>{deps.select(m.slug);close();},false,m.dot??null));
   menu.append(row('Все модели…',undefined,null,()=>{close();deps.openAll();}));
  }
 }
 function onDoc(e:Event){if(menu&&!deps.root.contains(e.target as Node))close();}
 function onKey(e:KeyboardEvent){if(e.key==='Escape'&&menu){close();deps.button.focus();}}
 function open(){
  if(menu){close();return;}
  menu=el('div','composer-menu');menu.setAttribute('role','menu');
  deps.root.append(menu);deps.button.setAttribute('aria-expanded','true');
  show('root');
  doc.addEventListener('pointerdown',onDoc);doc.addEventListener('keydown',onKey);
 }
 function close(){
  menu?.remove();menu=null;deps.button.setAttribute('aria-expanded','false');
  doc.removeEventListener('pointerdown',onDoc);doc.removeEventListener('keydown',onKey);
 }
 deps.button.setAttribute('aria-haspopup','menu');deps.button.setAttribute('aria-expanded','false');
 deps.button.onclick=open;
 paintButton();
 return {open,close,effort:()=>effort,setEffort,paintButton};
}
