export type StudioRunState='IDLE'|'READY'|'RUNNING'|'PAUSED'|'CANCELLING'|'FAILED'|'COMPLETED';

const transitions:Record<StudioRunState,readonly StudioRunState[]>={
 IDLE:['READY'],
 READY:['RUNNING','FAILED'],
 RUNNING:['PAUSED','CANCELLING','FAILED','COMPLETED'],
 PAUSED:['RUNNING','CANCELLING','FAILED'],
 CANCELLING:['READY','FAILED'],
 FAILED:['READY','RUNNING'],
 COMPLETED:['READY','RUNNING'],
};

export const studioStateLabel:Record<StudioRunState,string>={
 IDLE:'Idle',READY:'Ready',RUNNING:'Running',PAUSED:'Paused',CANCELLING:'Stopping',FAILED:'Failed',COMPLETED:'Completed',
};

function canTransitionStudioState(from:StudioRunState,to:StudioRunState){return from===to||transitions[from].includes(to);}

export type StudioStateController={
 get:()=>StudioRunState;
 set:(next:StudioRunState)=>void;
 subscribe:(listener:(state:StudioRunState)=>void)=>()=>void;
};

export function createStudioStateController(initial:StudioRunState='IDLE'):StudioStateController{
 let state=initial;const listeners=new Set<(state:StudioRunState)=>void>();
 return {
  get:()=>state,
  set(next){if(!canTransitionStudioState(state,next))throw new Error(`Invalid studio state transition ${state} -> ${next}`);if(next===state)return;state=next;for(const listener of listeners)listener(state);},
  subscribe(listener){listeners.add(listener);listener(state);return()=>listeners.delete(listener);},
 };
}
