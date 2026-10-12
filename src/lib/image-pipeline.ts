export type ImageJobStatus='queued'|'running'|'completed'|'failed'|'cancelled';
export type ImagePipelineConfig={prompt:string;referenceArtifactIds:string[];maskArtifactId:string|null;width:number;height:number;style:string;styleLock:boolean;identityConsistency:boolean;brandConstraints:string[];structuralMode:boolean;restoration:boolean;provider:string;seed:number|null;operation:'generate'|'variation'|'edit'|'upscale'|'inpaint'|'outpaint'|'remove'|'replace'|'background-replace';};
export type ImageJob={id:string;projectId:string|null;status:ImageJobStatus;config:ImagePipelineConfig;outputs:string[];createdAt:number;startedAt?:number;finishedAt?:number;error?:string};
export function createImageJob(id:string,projectId:string|null,config:ImagePipelineConfig):ImageJob{return{id,projectId,status:'queued',config,outputs:[],createdAt:Date.now()};}
export function transitionImageJob(job:ImageJob,status:ImageJobStatus,patch:Partial<ImageJob>={}):ImageJob{
 const allowed:Record<ImageJobStatus,ImageJobStatus[]>={queued:['running','cancelled'],running:['completed','failed','cancelled'],completed:[],failed:['queued'],cancelled:['queued']};
 if(status!==job.status&&!allowed[job.status].includes(status))throw new Error(`Invalid image job transition ${job.status} -> ${status}`);return{...job,...patch,status};
}
