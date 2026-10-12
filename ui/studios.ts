// Backward-compatible facade. The canonical Studio manifest and lazy runtime registry
// live in studio-manifest.ts and studio-registry.ts.
export {studios,studioById} from './studio-registry';
export type {StudioId,StudioModule} from './studio-types';
