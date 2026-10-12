import {studioManifest,studioById} from './studio-manifest';
import type {StudioId,StudioModule} from './studio-types';

const loaders:Record<StudioId,()=>Promise<{studioModule:StudioModule}>>={
 web:()=>import('./studio-modules/web'),
 image:()=>import('./studio-modules/image'),
 music:()=>import('./studio-modules/music'),
 video:()=>import('./studio-modules/video'),
 audio:()=>import('./studio-modules/audio'),
 als:()=>import('./studio-modules/als'),
 data:()=>import('./studio-modules/data'),
 ledger:()=>import('./studio-modules/ledger'),
 lab:()=>import('./studio-modules/lab'),
};

export const studios=studioManifest;
export {studioById};
export type {StudioId,StudioModule} from './studio-types';

export async function loadStudioModule(id:StudioId):Promise<StudioModule>{
 const loaded=await loaders[id]();
 const module=loaded.studioModule;
 const meta=studioById(id);
 if(!meta||module.id!==id)throw new Error(`Studio registry mismatch for ${id}`);
 if(module.title!==meta.title||module.action!==meta.action||module.type!==meta.type)throw new Error(`Studio metadata drift for ${id}`);
 return module;
}
