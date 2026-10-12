export type CompareDomain='music'|'image'|'video'|'web'|'prompt'|'generic';
export type CompareSide={id:string;label:string;version?:string;artifactId?:string;metadata?:Record<string,unknown>};
export type CompareSession={id:string;domain:CompareDomain;a:CompareSide;b:CompareSide;createdAt:number};

export function createCompareSession(domain:CompareDomain,a:CompareSide,b:CompareSide):CompareSession{
 if(!a?.id||!b?.id)throw new Error('Compare Mode requires both A and B.');
 if(a.id===b.id)throw new Error('Compare Mode requires two different items.');
 return{id:crypto.randomUUID(),domain,a,b,createdAt:Date.now()};
}

export function compareLabels(session:CompareSession){
 return{a:`A · ${session.a.label}${session.a.version?` · ${session.a.version}`:''}`,b:`B · ${session.b.label}${session.b.version?` · ${session.b.version}`:''}`};
}
