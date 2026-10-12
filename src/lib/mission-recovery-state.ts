import type { Env } from "../types";

export type MissionRecoveryState = { planRevisions:number; regressionRetries:number };

export async function loadMissionRecoveryState(env:Env,missionId:string):Promise<MissionRecoveryState> {
  const row=await env.AZRAIL_D1.prepare(
    "SELECT plan_revisions,regression_retries FROM mission_recovery_state WHERE mission_id=?",
  ).bind(missionId).first<{plan_revisions:number;regression_retries:number}>();
  if(!row)return {planRevisions:0,regressionRetries:0};
  if(!Number.isSafeInteger(row.plan_revisions)||row.plan_revisions<0||!Number.isSafeInteger(row.regression_retries)||row.regression_retries<0)
    throw new Error("Повреждено durable recovery-состояние миссии.");
  return {planRevisions:row.plan_revisions,regressionRetries:row.regression_retries};
}

async function claimCounter(
  env:Env,
  missionId:string,
  column:"plan_revisions"|"regression_retries",
  max:number,
):Promise<number|null> {
  if(!Number.isSafeInteger(max)||max<1)return null;
  // Column is selected from a closed internal union, never from user input.
  const initialPlan=column==="plan_revisions"?1:0;
  const initialRegression=column==="regression_retries"?1:0;
  const row=await env.AZRAIL_D1.prepare(`INSERT INTO mission_recovery_state(
      mission_id,plan_revisions,regression_retries,updated_at
    ) VALUES(?,?,?,?)
    ON CONFLICT(mission_id) DO UPDATE SET ${column}=${column}+1,updated_at=excluded.updated_at
    WHERE ${column} < ?
    RETURNING ${column} AS value`).bind(
      missionId,initialPlan,initialRegression,Date.now(),max,
    ).first<{value:number}>();
  return row?.value??null;
}

/** Restart-safe budget for plan revisions. */
export const claimPlanRevision=(env:Env,missionId:string,max:number)=>claimCounter(env,missionId,"plan_revisions",max);

/** Restart-safe budget for automatic rollback-and-retry after test regression. */
export const claimRegressionRetry=(env:Env,missionId:string,max:number)=>claimCounter(env,missionId,"regression_retries",max);
