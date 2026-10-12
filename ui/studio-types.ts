const STUDIO_IDS = ['web','image','music','video','audio','als','data','ledger','lab'] as const;
export type StudioId = typeof STUDIO_IDS[number];

export type StudioCapability =
 | 'mission'
 | 'cloud-write'
 | 'image-generation'
 | 'music-generation'
 | 'video-generation'
 | 'audio-analysis'
 | 'ableton-analysis'
 | 'data-analysis'
 | 'ledger-read'
 | 'system-diagnostics';

export type StudioMeta = {
 id:StudioId;
 title:string;
 icon:string;
 description:string;
 type:string;
 action:string;
 cloud:boolean;
 capabilities:readonly StudioCapability[];
};

export type StudioAccount={id:string;name:string;operator?:boolean;role?:'viewer'|'editor'|'admin'};
export type StudioApi=(path:string,options?:RequestInit)=>Promise<any>;
export type StudioBlobApi=(path:string)=>Promise<Blob>;

export type DraftOptions={scope:string;preferCurrent?:boolean;writable?:boolean};

export type StudioModuleContext={
 meta:StudioMeta;
 controls:HTMLElement;
 result:HTMLElement;
 account:StudioAccount|null;
 projectId:string;
 composer:HTMLElement;
 missionPanel:HTMLElement;
 api:StudioApi;
 blobAPI:StudioBlobApi;
 notice:(message:string,persist?:boolean)=>void;
 failure:(error:unknown)=>void;
 mountDraft:(server:boolean,options:DraftOptions)=>void;
 setMediaCleanup:(cleanup:()=>void)=>void;
 setLastBlob:(blob:Blob|null)=>void;
 current:()=>boolean;
 signal?:AbortSignal;
 currentProjectId?:()=>string;
 startMission?:(message:string)=>Promise<void>;
 dialog?:(title:string,html:string)=>HTMLElement;
 closeDialog?:()=>void;
};

export type StudioModule={
 id:StudioId;
 title:string;
 icon:string;
 description:string;
 type:string;
 action:string;
 cloud:boolean;
 capabilities:readonly StudioCapability[];
 pendingLabel?:string;
 mount:(context:StudioModuleContext)=>void|Promise<void>;
 run?:(context:StudioModuleContext & {signal:AbortSignal})=>Promise<void>;
 cleanup?:(context:StudioModuleContext)=>void;
};
