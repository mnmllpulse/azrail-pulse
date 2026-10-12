import {studioMeta} from '../studio-manifest';
import type {StudioModule} from '../studio-types';
import {mountPulseLab,runPulseLab} from '../pulse-lab';
const meta=studioMeta('lab');
export const studioModule:StudioModule={...meta,mount:mountPulseLab,run:runPulseLab};
