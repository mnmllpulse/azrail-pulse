import {studioMeta} from '../studio-manifest';
import type {StudioModule} from '../studio-types';
import {cleanupVideoStudio,mountVideoStudio,runVideoStudio} from '../video-studio-2';
const meta=studioMeta('video');
export const studioModule:StudioModule={...meta,pendingLabel:'Рендер WebM…',mount:mountVideoStudio,run:runVideoStudio,cleanup:()=>cleanupVideoStudio()};
