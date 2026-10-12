export type CompareAsset={
 id:string;
 name:string;
 mime:string;
 studioId:string|null;
 kind:string|null;
 bytes:number;
 versionOf:string|null;
 projectLinks:string[];
 metadata:Record<string,unknown>;
 analysis:Record<string,unknown>;
 createdAt?:number;
};

type Deps={
 api:(path:string,options?:RequestInit)=>Promise<any>;
 blobAPI:(path:string)=>Promise<Blob>;
 dialog:(title:string,html:string)=>HTMLElement;
 notice:(message:string,persist?:boolean)=>void;
 projectId:string;
 studioId?:string;
};

const textLike=(mime:string)=>/^text\//i.test(mime)||/(json|xml|javascript|typescript|markdown|csv|svg)/i.test(mime);
const mediaKind=(asset:CompareAsset)=>asset.mime.startsWith('image/')?'image':asset.mime.startsWith('audio/')?'audio':asset.mime.startsWith('video/')?'video':textLike(asset.mime)?'text':'binary';
const sameFamily=(a:CompareAsset,b:CompareAsset)=>mediaKind(a)===mediaKind(b)||mediaKind(a)==='text'&&mediaKind(b)==='text';

function optionLabel(asset:CompareAsset){
 const kind=asset.kind??mediaKind(asset),studio=asset.studioId?` · ${asset.studioId}`:'';
 return `${asset.name} · ${kind}${studio}`;
}

async function renderAsset(host:HTMLElement,asset:CompareAsset,blobAPI:Deps['blobAPI'],urls:string[]){
 host.replaceChildren();
 const title=document.createElement('strong');title.textContent=asset.name;
 const meta=document.createElement('small');meta.className='muted';meta.textContent=`${asset.mime} · ${Math.max(1,Math.ceil(asset.bytes/1024))} KB${asset.versionOf?` · version of ${asset.versionOf.slice(0,8)}`:''}`;
 host.append(title,meta);
 const blob=await blobAPI(`/api/studio/artifacts/${encodeURIComponent(asset.id)}`);
 const kind=mediaKind(asset);
 if(kind==='image'){
  const url=URL.createObjectURL(blob);urls.push(url);const img=document.createElement('img');img.src=url;img.alt=asset.name;host.append(img);
 }else if(kind==='audio'){
  const url=URL.createObjectURL(blob);urls.push(url);const audio=document.createElement('audio');audio.controls=true;audio.src=url;host.append(audio);
 }else if(kind==='video'){
  const url=URL.createObjectURL(blob);urls.push(url);const video=document.createElement('video');video.controls=true;video.playsInline=true;video.src=url;host.append(video);
 }else if(kind==='text'){
  const pre=document.createElement('pre');const raw=await blob.text();pre.textContent=raw.length>200_000?raw.slice(0,200_000)+'\n… [preview truncated]':raw;host.append(pre);
 }else{
  const note=document.createElement('p');note.className='context-note';note.textContent='Для этого бинарного формата нет безопасного встроенного preview. Сравнение ограничено metadata/evidence.';host.append(note);
 }
 const evidence=document.createElement('details');const summary=document.createElement('summary');summary.textContent='Evidence / metadata';const pre=document.createElement('pre');pre.textContent=JSON.stringify({kind:asset.kind,studioId:asset.studioId,projectLinks:asset.projectLinks,metadata:asset.metadata,analysis:asset.analysis},null,2);evidence.append(summary,pre);host.append(evidence);
}

export async function openUniversalCompareCenter(deps:Deps){
 const root=deps.dialog('Compare Mode · A | B','<p class="muted">Загрузка Asset Intelligence…</p>');
 const query=deps.projectId?`?projectId=${encodeURIComponent(deps.projectId)}`:'';
 const response=await deps.api('/api/studio/assets/intelligence'+query) as {items:CompareAsset[]};
 const assets=(response.items??[]).filter(item=>item&&item.id&&item.mime);
 root.replaceChildren();
 const note=document.createElement('p');note.className='context-note';note.textContent='Universal A|B работает только с реальными сохранёнными assets. Источники не изменяются. Web source сравнивается точнее через Web Studio → Changes/Versions.';root.append(note);
 if(assets.length<2){const empty=document.createElement('p');empty.textContent='Для A|B нужны минимум два сохранённых asset. Сначала сохраните две версии результата.';root.append(empty);return;}
 const toolbar=document.createElement('div');toolbar.className='compare-center-controls';
 const makeSelect=(label:string)=>{const wrap=document.createElement('label');wrap.textContent=label;const select=document.createElement('select');for(const asset of assets){const option=document.createElement('option');option.value=asset.id;option.textContent=optionLabel(asset);select.append(option);}wrap.append(select);toolbar.append(wrap);return select;};
 const aSelect=makeSelect('A'),bSelect=makeSelect('B');bSelect.selectedIndex=Math.min(1,assets.length-1);
 const compare=document.createElement('button');compare.type='button';compare.className='primary';compare.textContent='Сравнить A | B';toolbar.append(compare);root.append(toolbar);
 const warning=document.createElement('p');warning.className='muted';root.append(warning);
 const grid=document.createElement('div');grid.className='compare-mode-grid';const left=document.createElement('section'),right=document.createElement('section');left.className='compare-side';right.className='compare-side';grid.append(left,right);root.append(grid);
 let urls:string[]=[];const revoke=()=>{for(const url of urls)URL.revokeObjectURL(url);urls=[];};
 const dialog=root.closest('dialog');dialog?.addEventListener('close',revoke,{once:true});
 const run=async()=>{revoke();const a=assets.find(item=>item.id===aSelect.value),b=assets.find(item=>item.id===bSelect.value);if(!a||!b)return;if(a.id===b.id){warning.textContent='A и B должны быть разными версиями/артефактами.';left.replaceChildren();right.replaceChildren();return;}warning.textContent=sameFamily(a,b)?'Сравнение одинакового media family.':'Форматы A и B различаются: показываю каждый источник в его нативном preview; метрики нельзя напрямую считать эквивалентными.';await Promise.all([renderAsset(left,a,deps.blobAPI,urls),renderAsset(right,b,deps.blobAPI,urls)]);deps.notice(`Compare Mode: ${a.name} ↔ ${b.name}`);};
 compare.onclick=()=>void run().catch(error=>{warning.textContent=error instanceof Error?error.message:String(error);});
 await run();
}
