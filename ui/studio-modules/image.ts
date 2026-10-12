import {readPendingImage,requestImage,type ImageOperation} from '../image-request';
import {studioMeta} from '../studio-manifest';
import type {StudioModule,StudioModuleContext} from '../studio-types';
import {fieldValue} from './shared';
import {errorMessage,renderPanelError,renderPanelLoading} from '../components/panel-state';
import {mountCompareMode,type CompareItem} from '../components/compare-mode';
import {imageStudio2Markup,mountImageStudio2,type ImageWorkbenchItem} from '../image-studio-2';
const meta=studioMeta('image');
type ImageHistory=ImageWorkbenchItem & {aspectRatio:string;seed:number|null;model:string;variationIndex?:number;};
let referenceId:string|null=null,operation:ImageOperation='generate',compare:ReturnType<typeof mountCompareMode>|null=null,workbench:ReturnType<typeof mountImageStudio2>|null=null;
const preparedReferences=new Map<string,string>();

const escape=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
function number(context:StudioModuleContext,id:string){const value=Number(fieldValue(context,id));return Number.isFinite(value)?value:0;}
function compareItem(item:ImageHistory):CompareItem{return{id:item.id,label:`${item.operation.toUpperCase()} · ${item.width}×${item.height}`,render:host=>{const img=document.createElement('img');img.src=item.url;img.alt=item.prompt||'Image comparison';const p=document.createElement('p');p.className='muted';p.textContent=`${item.style} · ${item.model}`;host.append(img,p);}};}
function addCompareButtons(actions:HTMLElement,item:ImageHistory){if(!compare)return;const a=document.createElement('button');a.type='button';a.textContent='Set A';a.onclick=()=>compare?.setA(compareItem(item));const b=document.createElement('button');b.type='button';b.textContent='Set B';b.onclick=()=>compare?.setB(compareItem(item));actions.append(a,b);}
function setMode(context:StudioModuleContext,next:ImageOperation,ref:string|null,label?:string){operation=next;referenceId=ref;const badge=context.controls.querySelector<HTMLElement>('#image-reference');if(badge){badge.hidden=!ref&&next==='generate';badge.textContent=ref?`${label??'Reference'} · ${next}`:next!=='generate'?`Mode · ${next}`:'';}context.notice(ref?`Reference выбран: ${label??ref.slice(0,8)}.`:next==='generate'?'Reference очищен.':`Режим: ${next}.`);}
async function prepareReference(context:StudioModuleContext,item:ImageWorkbenchItem,next:ImageOperation){
 const cached=preparedReferences.get(item.artifactId);if(cached){setMode(context,next,cached,item.name);return;}
 context.notice('Готовлю безопасную reference-копию до 512 px…');
 const source=await context.blobAPI(item.url),bitmap=await createImageBitmap(source);
 const scale=Math.min(1,512/Math.max(bitmap.width,bitmap.height));
 const width=Math.max(1,Math.floor(bitmap.width*scale)),height=Math.max(1,Math.floor(bitmap.height*scale));
 const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
 const ctx=canvas.getContext('2d');if(!ctx){bitmap.close();throw Error('Canvas 2D недоступен.');}
 ctx.drawImage(bitmap,0,0,width,height);bitmap.close();
 const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(v=>v?resolve(v):reject(Error('Не удалось подготовить reference image.')),'image/jpeg',0.92));
 const saved=await context.api('/api/studio/artifacts',{method:'POST',headers:{'Content-Type':'image/jpeg','X-Filename':encodeURIComponent(`reference-${item.artifactId}.jpg`),'X-Project-Id':context.projectId??'','X-Studio-Id':'image'},body:blob,signal:context.signal}) as {id:string};
 preparedReferences.set(item.artifactId,saved.id);setMode(context,next,saved.id,item.name);
}
async function loadHistory(context:StudioModuleContext){
 const list=context.controls.querySelector<HTMLElement>('#image-history');if(!list)return;renderPanelLoading(list,'Загружаю историю изображений…');if(!context.account){list.innerHTML='<p class="muted">Войдите, чтобы видеть сохранённые изображения.</p>';return;}
 const q=context.projectId?`?projectId=${encodeURIComponent(context.projectId)}`:'';
 const r=await context.api('/api/studio/image/history'+q) as {items:ImageHistory[]};list.replaceChildren();workbench?.renderVersionHistory(r.items);
 if(!r.items.length){list.innerHTML='<p class="muted">История изображений пока пуста.</p>';return;}
 for(const item of r.items){const card=document.createElement('article');card.className='image-history-card';card.innerHTML=`<img src="${escape(item.url)}" alt=""><div><strong>${escape(item.operation.toUpperCase())}</strong><small>${escape(item.aspectRatio)} · ${item.width}×${item.height} · ${escape(item.style)}</small><p>${escape(item.prompt)}</p></div>`;
  const actions=document.createElement('div');actions.className='image-mini-actions';
  const ref=document.createElement('button');ref.type='button';ref.textContent='Use as reference';ref.onclick=()=>prepareReference(context,item,'edit').catch(context.failure);
  const variation=document.createElement('button');variation.type='button';variation.textContent='Variation';variation.onclick=()=>prepareReference(context,item,'variation').catch(context.failure);
  const upscale=document.createElement('button');upscale.type='button';upscale.textContent='Upscale';upscale.onclick=()=>prepareReference(context,item,'upscale').catch(context.failure);
  const board=document.createElement('button');board.type='button';board.textContent='Add to board';board.onclick=()=>{workbench?.addReference(item);context.notice('Добавлено в Reference Board.');};
  const meta=document.createElement('button');meta.type='button';meta.textContent='Metadata';meta.onclick=()=>context.dialog?.('Image metadata',`<div class="project-detail-grid"><div><small>MODEL</small><strong>${escape(item.model)}</strong></div><div><small>SEED</small><strong>${item.seed??'auto'}</strong></div><div><small>SIZE</small><strong>${item.width}×${item.height}</strong></div><div><small>STYLE</small><strong>${escape(item.style)}</strong></div></div><p>${escape(item.prompt)}</p>`);
  actions.append(ref,variation,upscale,board,meta);addCompareButtons(actions,item);card.append(actions);list.append(card);
 }
}
async function refreshHistory(context:StudioModuleContext):Promise<void>{const host=context.controls.querySelector<HTMLElement>('#image-history');if(!host)return;try{await loadHistory(context);}catch(error){renderPanelError(host,errorMessage(error),()=>refreshHistory(context));context.failure(error);}}
function renderResults(context:StudioModuleContext,items:ImageHistory[]){
 context.result.replaceChildren();const grid=document.createElement('div');grid.className='image-result-grid';
 for(const item of items){const card=document.createElement('article');card.className='image-result-card';const img=document.createElement('img');img.src=item.url;img.alt='Сгенерированное изображение';
  const actions=document.createElement('div');actions.className='image-result-actions';
  const download=document.createElement('button');download.textContent='Download';download.onclick=()=>context.blobAPI(item.url).then(blob=>import('../media').then(m=>m.download(blob,item.name))).catch(context.failure);
  const ref=document.createElement('button');ref.textContent='Use as reference';ref.onclick=()=>prepareReference(context,item,'edit').catch(context.failure);
  const variation=document.createElement('button');variation.textContent='Create variation';variation.onclick=()=>prepareReference(context,item,'variation').catch(context.failure);
  const edit=document.createElement('button');edit.textContent='Edit';edit.onclick=()=>prepareReference(context,item,'edit').catch(context.failure);
  const upscale=document.createElement('button');upscale.textContent='Upscale';upscale.onclick=()=>prepareReference(context,item,'upscale').catch(context.failure);
  const board=document.createElement('button');board.textContent='Add to board';board.onclick=()=>{workbench?.addReference(item);context.notice('Добавлено в Reference Board.');};
  const metadata=document.createElement('button');metadata.textContent='Metadata';metadata.onclick=()=>context.dialog?.('Image metadata',`<div class="project-detail-grid"><div><small>MODEL</small><strong>${escape(item.model)}</strong></div><div><small>SEED</small><strong>${item.seed??'auto'}</strong></div><div><small>SIZE</small><strong>${item.width}×${item.height}</strong></div><div><small>STYLE</small><strong>${escape(item.style)}</strong></div></div><p>${escape(item.prompt)}</p>`);
  actions.append(download,ref,variation,edit,upscale,board,metadata);addCompareButtons(actions,item);card.onclick=(event)=>{if((event.target as HTMLElement).tagName!=='BUTTON')workbench?.setActive(item);};card.append(img,actions);grid.append(card);
 }
 context.result.append(grid);
}
export const studioModule:StudioModule={
 ...meta,
 async mount(context){
  referenceId=null;operation='generate';preparedReferences.clear();
  context.controls.innerHTML=`<div class="image-studio-shell"><div class="image-form"><label for="studio-text">Промпт</label><textarea id="studio-text" rows="4" maxlength="4000" placeholder="Обложка минимал-техно релиза: скульптурная форма, тёмный фон, фиолетовый свет"></textarea><div class="image-options"><label>Aspect ratio<select id="image-aspect"><option>1:1</option><option>16:9</option><option>9:16</option><option>4:3</option><option>3:4</option><option>3:2</option><option>2:3</option></select></label><label>Resolution<select id="image-resolution"><option value="512">512</option><option value="768">768</option><option value="1024" selected>1024</option></select></label><label>Style<select id="image-style"><option value="auto">Auto</option><option value="cinematic">Cinematic</option><option value="editorial">Editorial</option><option value="minimal">Minimal</option><option value="product">Product</option><option value="illustration">Illustration</option><option value="3d">3D</option><option value="dark-techno">Dark Techno</option></select></label><label>Image model<select id="image-model"><option value="">AUTO router</option><option value="@cf/black-forest-labs/flux-2-klein-4b">FLUX.2 Klein 4B · Fast</option><option value="@cf/black-forest-labs/flux-2-klein-9b">FLUX.2 Klein 9B · Quality/Reference</option></select></label><label>Seed<input id="image-seed" inputmode="numeric" placeholder="Auto" maxlength="10"></label><label>Variations<select id="image-variations"><option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option></select></label></div><div id="image-reference" class="image-reference" hidden></div><div class="toolbar"><button id="studio-run" class="primary" type="button">Generate</button><button id="image-clear-reference" type="button">Clear reference</button></div><p class="muted image-model-note">AUTO uses the existing approved Cloudflare image route. Manual switch is limited to the two already-reviewed FLUX.2 providers; the separate 243-model catalog is intentionally deferred.</p></div><section class="image-history"><div class="section-heading"><h3>History / Variants</h3><button id="image-refresh-history" type="button">Refresh</button></div><div id="image-history"></div></section></div>${imageStudio2Markup()}`;
  compare?.destroy();compare=mountCompareMode(context.controls);workbench?.destroy();workbench=mountImageStudio2(context,{setOperation:next=>setMode(context,next,referenceId),useReference:(item,next)=>prepareReference(context,item,next)});
  context.controls.querySelector<HTMLButtonElement>('#image-clear-reference')!.onclick=()=>setMode(context,'generate',null);
  context.controls.querySelector<HTMLButtonElement>('#image-refresh-history')!.onclick=()=>void refreshHistory(context);
  if(context.account){const restore=document.createElement('button');restore.textContent='Вернуть предыдущий запрос';restore.onclick=()=>{const pending=readPendingImage(context.account!.id);if(!pending){context.notice('Незавершённых запросов изображения в этой вкладке нет.');return;}try{const parsed=JSON.parse(pending.body);const input=context.controls.querySelector<HTMLTextAreaElement>('#studio-text')!;input.value=parsed.prompt;operation=parsed.operation??'generate';referenceId=parsed.referenceArtifactId??null;context.notice('Предыдущий запрос восстановлен. Повтор пойдёт с тем же Idempotency-Key.');}catch(error){context.failure(error);}};context.controls.querySelector('.toolbar')?.append(restore);}
  context.mountDraft(!!context.account,{scope:context.account?.id??'local',writable:context.account?.role!=='viewer'});
  await refreshHistory(context);
 },
 async run(context){
  if(!context.account)throw Error('Для Image Studio войдите в развёрнутое приложение.');
  const seedText=fieldValue(context,'image-seed').trim();
  const advanced=workbench?.getEnhancements();
  const result=await requestImage(context.account.id,{prompt:fieldValue(context,'studio-text'),projectId:context.projectId||undefined,aspectRatio:fieldValue(context,'image-aspect'),resolution:number(context,'image-resolution'),style:fieldValue(context,'image-style'),seed:seedText?number(context,'image-seed'):null,variations:number(context,'image-variations'),operation,referenceArtifactId:referenceId,...advanced},(path,options)=>context.api(path,{...options,signal:context.signal})) as {items:ImageHistory[]};
  if(!context.current())return;renderResults(context,result.items);for(const item of result.items)workbench?.addReference(item);workbench?.renderVersionHistory(result.items);await refreshHistory(context);operation='generate';referenceId=null;const badge=context.controls.querySelector<HTMLElement>('#image-reference');if(badge)badge.hidden=true;
 },
 cleanup(){compare?.destroy();compare=null;workbench?.destroy();workbench=null;}
};
