import {studioMeta} from '../studio-manifest';
import type {StudioModule} from '../studio-types';
import {cleanupDataStudio,mountDataStudio,runDataStudio} from '../data-studio';
const meta=studioMeta('data');
export const studioModule:StudioModule={...meta,pendingLabel:'Анализирую dataset…',mount(context){mountDataStudio(context);},run:runDataStudio,cleanup:()=>cleanupDataStudio()};
