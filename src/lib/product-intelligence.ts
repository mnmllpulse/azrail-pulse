export type IntelligenceScope='user'|'workspace'|'project'|'music'|'image'|'video'|'agent'|'session';
export type AssetKind='audio'|'image'|'video'|'document'|'prompt'|'midi'|'stem'|'daw_project'|'model'|'preset'|'code';
export type ReviewSeverity='critical'|'major'|'minor'|'improvement';

export type MemoryRecord={id:string;scope:IntelligenceScope;projectId?:string;studio?:string;key:string;value:unknown;source:string;whyStored?:string;confidence:number;expiresAt?:number|null;ttlSeconds?:number;createdAt:number;updatedAt?:number};
export type IntelligentAsset={id:string;kind:AssetKind;name:string;projectIds:string[];tags:string[];metadata:Record<string,unknown>;embeddingRef?:string;versions:string[];analysis?:Record<string,unknown>;usageHistory?:unknown[];usageCount:number};
export type ReviewFinding={severity:ReviewSeverity;code:string;message:string;safeAutoFix:boolean;target?:string};

export function activeMemory(records:MemoryRecord[],now=Date.now()){
 return records.filter(record=>record.ttlSeconds===undefined||record.createdAt+record.ttlSeconds*1000>now).sort((a,b)=>b.confidence-a.confidence||b.createdAt-a.createdAt);
}
export function reviewSummary(findings:ReviewFinding[]){
 const counts={critical:0,major:0,minor:0,improvement:0};for(const finding of findings)counts[finding.severity]++;
 return {counts,blocking:counts.critical>0,safeFixes:findings.filter(item=>item.safeAutoFix)};
}
