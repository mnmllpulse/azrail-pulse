import type { Env } from "../types";

export type MissionTestBaseline = { passed:number; failed:number };

export async function loadMissionTestBaseline(env:Env,missionId:string):Promise<MissionTestBaseline|null> {
  const row=await env.AZRAIL_D1.prepare(
    "SELECT passed,failed FROM mission_test_baselines WHERE mission_id=?",
  ).bind(missionId).first<{passed:number;failed:number}>();
  if(!row)return null;
  if(!Number.isSafeInteger(row.passed)||row.passed<0||!Number.isSafeInteger(row.failed)||row.failed<0)
    throw new Error("Повреждён сохранённый baseline тестов миссии.");
  return {passed:row.passed,failed:row.failed};
}

/**
 * First baseline wins. A recovery must never overwrite the original test
 * baseline with measurements taken after partial mission mutations.
 */
export async function rememberMissionTestBaseline(
  env:Env,missionId:string,baseline:MissionTestBaseline,
):Promise<MissionTestBaseline> {
  if(!Number.isSafeInteger(baseline.passed)||baseline.passed<0||!Number.isSafeInteger(baseline.failed)||baseline.failed<0)
    throw new Error("Некорректный baseline тестов.");
  try {
    await env.AZRAIL_D1.prepare(`INSERT INTO mission_test_baselines(mission_id,passed,failed,captured_at)
      VALUES(?,?,?,?) ON CONFLICT(mission_id) DO NOTHING`).bind(
      missionId,baseline.passed,baseline.failed,Date.now(),
    ).run();
  } catch(error) {
    // INSERT may have committed and lost its response. Re-read before
    // treating the baseline as unavailable.
    const durable=await loadMissionTestBaseline(env,missionId).catch(()=>null);
    if(durable)return durable;
    throw error;
  }
  return (await loadMissionTestBaseline(env,missionId))??baseline;
}
