import type {Env} from '../types';

export type MissionDecisionKind='model'|'tool'|'route'|'retry'|'recovery'|'approval'|'replacement'|'control';

/** Best-effort audit receipt: decision logging must never turn a successful action into a failure. */
export async function recordMissionDecision(
  env:Env,missionId:string|undefined,decisionKind:MissionDecisionKind,
  choice:string,reason:string,evidence:unknown={},step?:number,
):Promise<void>{
  if(!missionId)return;
  try{
    await env.AZRAIL_D1.prepare(`INSERT INTO mission_decisions(
      id,mission_id,step,decision_kind,choice,reason,evidence_json,created_at
    ) VALUES(?,?,?,?,?,?,?,?)`).bind(
      crypto.randomUUID(),missionId,step??null,decisionKind,choice.slice(0,240),reason.slice(0,4000),JSON.stringify(evidence??{}),Date.now(),
    ).run();
  }catch{/* observability receipt is non-authoritative */}
}
