import {studioMeta} from '../studio-manifest';
import type {StudioModule} from '../studio-types';
import {mountWebWorkbench} from '../web-workbench';
const meta=studioMeta('web');
let cleanup=()=>{};
export const studioModule:StudioModule={
 ...meta,
 mount(context){cleanup();cleanup=mountWebWorkbench(context);},
 cleanup(){cleanup();cleanup=()=>{};},
};
