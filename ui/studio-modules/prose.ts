import {studioMeta} from '../studio-manifest';
import type {StudioModule} from '../studio-types';
import {cleanupProseStudio,mountProseStudio} from '../prose-studio';

const meta=studioMeta('prose');
export const studioModule:StudioModule={...meta,pendingLabel:'Собираю текст…',mount(context){mountProseStudio(context);},cleanup(){cleanupProseStudio();}};
