import {studioMeta} from '../studio-manifest';
import type {StudioModule} from '../studio-types';
import {renderAbletonHistory,renderAbletonReport,type AbletonReport} from '../ableton-lab';
import {inputFile,requiredFile,runButton} from './shared';
import {download} from '../media';
const meta=studioMeta('als');
const MAX_ALS=12*1024*1024;
export const studioModule:StudioModule={
 ...meta,
 async mount(context){
  context.controls.innerHTML='<div class="ableton-lab-shell"><div class="ableton-input">'+inputFile('.als,.xml')+'<p class="context-note">До 12 МБ compressed / 24 МБ unpacked XML. Source не изменяется. Если открыт Project, analysis + source ALS сохраняются в private project artifacts.</p>'+runButton+'</div><section class="ableton-history"><div class="section-heading"><h3>Analysis history</h3><span>Project-bound</span></div><div id="ableton-history"></div></section></div>';
  context.mountDraft(false,{scope:context.account?.id??'local',writable:false});
  await renderAbletonHistory(context).catch(context.failure);
 },
 async run(context){
  const source=requiredFile(context);if(source.size>MAX_ALS)throw Error('ALS должен быть не больше 12 МБ.');
  const headers:Record<string,string>={'Content-Type':'application/octet-stream','X-Filename':encodeURIComponent(source.name)};if(context.projectId)headers['X-Project-Id']=context.projectId;
  const result=await context.api('/api/studio/als',{method:'POST',headers,body:source,signal:context.signal}) as AbletonReport;
  if(!context.current())return;const rendered=renderAbletonReport(context.result,result,source.name);if(rendered.sourceButton&&result.sourceArtifactId)rendered.sourceButton.onclick=()=>context.blobAPI(`/api/studio/artifacts/${result.sourceArtifactId}`).then(blob=>download(blob,source.name)).catch(context.failure);
  if(result.saved){context.notice('ALS analysis сохранён в проекте.');await renderAbletonHistory(context).catch(context.failure);}
 }
};
