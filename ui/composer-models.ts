import {applyPicker,modelBadge,PICKER_FILTERS,type PickerFilter} from './model-picker';
import {groupModelsByProvider,isChatCapableModel,isNeuronPaidModel,modelDisplayName,providerFromSlug,providerIconPath,providerInitial,resolveModelIcon} from './model-display';

export type CatalogModel={slug:string;displayName?:string;freeAllowlisted?:boolean;reviewed?:boolean;hosted?:boolean;task?:string;capabilities?:string[];availability?:string;provider?:string;icon?:string|null;description?:string};

export type ComposerModelsDeps={
 $:<T extends HTMLElement=HTMLElement>(id:string)=>T;
 preferred:()=>string;
 setPreferred:(slug:string)=>void;
 dialog:(title:string,html:string)=>HTMLElement;
 notice:(message:string,persist?:boolean)=>void;
 loadCatalog:()=>Promise<{models?:unknown}>;
 /** id вошедшего аккаунта или null */
 identity:()=>string|null;
 local:()=>boolean;
};

export function createComposerModels(deps:ComposerModelsDeps){
 const $=deps.$,preferred=deps.preferred;
 let catalogModels:CatalogModel[]=[];
/** Full registry for the Models picker (exactly the server catalog, no truncation). */
function pickerModels(){return catalogModels.filter(m=>m.availability!=='unavailable'&&typeof m.slug==='string');}
function modelLabel(m:CatalogModel){return m.displayName||modelDisplayName(m.slug);}
function syncModelsButton(){
 const current=$('composer-models-current'),icon=$<HTMLImageElement>('composer-models-icon');
 const hit=preferred()?catalogModels.find(m=>m.slug===preferred()):undefined;
 current.textContent=hit?modelLabel(hit):(preferred()?modelDisplayName(preferred()):'Auto · AZRAIL');
 const src=hit?resolveModelIcon(hit):(preferred()?providerIconPath(providerFromSlug(preferred())):undefined);
 if(src){icon.src=src;icon.hidden=false;}else{icon.removeAttribute('src');icon.hidden=true;}
 $<HTMLSelectElement>('composer-model').value=preferred();
}
function modelPickerMark(provider:string,icon?:string){
 const mark=document.createElement('span');mark.className='model-picker-mark';mark.setAttribute('aria-hidden','true');
 if(icon){const img=document.createElement('img');img.alt='';img.width=18;img.height=18;img.src=icon;img.onerror=()=>{img.remove();mark.dataset.fallback='';mark.textContent=providerInitial(provider);};mark.append(img);}
 else{mark.dataset.fallback='';mark.textContent=providerInitial(provider);}
 return mark;
}
function fillComposerModels(){
 const select=$<HTMLSelectElement>('composer-model');select.replaceChildren();
 const auto=document.createElement('option');auto.value='';auto.textContent='Auto · AZRAIL';select.append(auto);
 for(const model of pickerModels()){
  if(typeof model.slug!=='string'||Array.from(select.options).some(o=>o.value===model.slug))continue;
  const option=document.createElement('option');
  option.value=model.slug; // full slug in code/value
  option.textContent=`${isNeuronPaidModel(model.slug)?'Нейроны':model.freeAllowlisted?'Free':'Paid'} · ${modelLabel(model)}`;
  option.title=model.slug;
  select.append(option);
 }
 if(preferred()&&!Array.from(select.options).some(o=>o.value===preferred())){
  const option=document.createElement('option');option.value=preferred();option.textContent=modelDisplayName(preferred());option.title=preferred();select.append(option);
 }
 select.value=preferred();syncModelsButton();
}
let pickerFilter:PickerFilter='chat';let pickerShowLocked=false;
function openModelPicker(){
 const all=catalogModels.filter(m=>typeof m.slug==='string');
 const chips=PICKER_FILTERS.map(f=>`<button type="button" class="model-picker-chip" data-filter="${f.id}" aria-pressed="false">${f.label}</button>`).join('');
 deps.dialog('Models',`<div class="model-picker"><div class="model-picker-toolbar"><input id="model-picker-search" class="model-picker-search" type="search" placeholder="Поиск модели…" maxlength="120"><span id="model-picker-count" class="model-picker-count"></span></div><div class="model-picker-filters">${chips}<label class="model-picker-locked"><input id="model-picker-locked" type="checkbox"> Недоступные</label></div><div id="model-picker-list" class="model-picker-list"></div></div>`);
 const list=$('model-picker-list'),search=$<HTMLInputElement>('model-picker-search'),count=$('model-picker-count'),locked=$<HTMLInputElement>('model-picker-locked');
 locked.checked=pickerShowLocked;
 const paint=()=>{
  list.replaceChildren();
  document.querySelectorAll<HTMLElement>('.model-picker-chip').forEach(chip=>chip.setAttribute('aria-pressed',String(chip.dataset.filter===pickerFilter)));
  const auto=document.createElement('button');auto.type='button';auto.className='model-picker-item';if(!preferred())auto.setAttribute('aria-current','true');
  const autoBody=document.createElement('span');autoBody.className='model-picker-body';
  autoBody.innerHTML='<strong>Auto · AZRAIL</strong><small>Подберём сами</small>';
  const autoBadge=document.createElement('span');autoBadge.className='model-picker-badge free';autoBadge.textContent='Auto';
  auto.append(modelPickerMark('AZRAIL'),autoBody,autoBadge);
  auto.onclick=()=>{deps.setPreferred('');$<HTMLDialogElement>('dialog').close();syncModelsButton();};
  list.append(auto);
  const found=applyPicker(all,{filter:pickerFilter,query:search.value,showLocked:pickerShowLocked},modelLabel);
  let shown=0;
  for(const group of groupModelsByProvider(found)){
   const visible=group.models as CatalogModel[];
   const section=document.createElement('div');section.className='model-picker-group';
   const heading=document.createElement('div');heading.className='model-picker-group-title';heading.textContent=`${group.provider} · ${visible.length}`;
   section.append(heading);
   for(const model of visible){
    const label=modelLabel(model),provider=model.provider||providerFromSlug(model.slug);
    const chatOk=isChatCapableModel(model);
    const badgeInfo=modelBadge(model);
    const row=document.createElement('button');row.type='button';row.className='model-picker-item';
    if(preferred()===model.slug)row.setAttribute('aria-current','true');
    row.title=badgeInfo.hint;
    if(badgeInfo.kind==='locked'){row.disabled=true;row.dataset.locked='';}
    const body=document.createElement('span');body.className='model-picker-body';
    const title=document.createElement('strong');title.textContent=label;
    const meta=document.createElement('small');meta.textContent=`${provider}${model.task?` · ${model.task}`:''}${badgeInfo.kind==='neuron'?' · лимит 10 000 нейронов в сутки':''}${chatOk||badgeInfo.kind==='locked'?'':' · не для чата'}`;
    body.append(title,meta);
    const badge=document.createElement('span');badge.className=`model-picker-badge ${badgeInfo.kind}`;badge.textContent=badgeInfo.text;
    row.append(modelPickerMark(provider,resolveModelIcon(model)),body,badge);
    row.onclick=()=>{
     deps.setPreferred(model.slug);
     $<HTMLDialogElement>('dialog').close();
     syncModelsButton();
     if(badgeInfo.kind==='neuron')deps.notice('Это одна из 7 моделей Workers Paid. AZRAIL её не вызывает: после 10 000 нейронов в сутки идёт доплата.',true);
     else if(badgeInfo.kind==='external')deps.notice('Сторонняя модель: вызов идёт через AI Gateway и только если включены платные модели и есть бюджет.',true);
     else if(!chatOk)deps.notice('Модель выбрана. Для чата AZRAIL подставит текстовую модель автоматически.',true);
    };
    section.append(row);shown++;
   }
   list.append(section);
  }
  count.textContent=`${shown} из ${all.length}`;
  if(!shown){const empty=document.createElement('p');empty.className='muted';empty.textContent=pickerFilter==='free'?'Бесплатных моделей по этому поиску нет.':'Ничего не найдено. Попробуй фильтр «Все» или «Недоступные».';list.append(empty);}
 };
 document.querySelectorAll<HTMLElement>('.model-picker-chip').forEach(chip=>{chip.onclick=()=>{pickerFilter=chip.dataset.filter as PickerFilter;paint();};});
 locked.onchange=()=>{pickerShowLocked=locked.checked;paint();};
 search.oninput=paint;paint();search.focus();
}
async function refreshComposerModels(){
 if(!deps.identity()||deps.local()){catalogModels=[];fillComposerModels();$('composer-models-open').title='Автовыбор. Каталог моделей доступен после входа.';return;}
 const identity=deps.identity();
 try{
  const catalog=await deps.loadCatalog();if(deps.identity()!==identity)return;
  catalogModels=Array.isArray(catalog.models)?catalog.models:[];
  fillComposerModels();
  $('composer-models-open').title=`Models · ${pickerModels().length}`;
 }catch{$('composer-models-open').title='Каталог недоступен. Вы можете выбрать Auto.';fillComposerModels();}
}
 return {
  models:()=>catalogModels,
  find:(slug:string)=>catalogModels.find(m=>m.slug===slug),
  pickable:pickerModels,label:modelLabel,sync:syncModelsButton,fill:fillComposerModels,open:openModelPicker,refresh:refreshComposerModels,
 };
}
export type ComposerModels=ReturnType<typeof createComposerModels>;
