import { currentBillingScope, projectBillingScope } from "../lib/billing-context";
import { findByCapability, type Capability } from "../lib/agent-registry";
import { requireCapability } from "../lib/project-control";
import type { GeneratedFile, Env, TaskRequest, TaskResult } from "../types";
import { GitAgent } from "./git-agent";
import { recordMissionDecision } from "../lib/mission-decision-log";

type SubAgentFactory = (agentClass: any, name: string) => Promise<any>;

export async function invokeAgentCapability(
  env: Env,
  subAgent: SubAgentFactory,
  capability: Capability,
  request: TaskRequest,
): Promise<TaskResult> {
  await requireCapability(env, request.projectId, capability);
  const candidates = findByCapability(capability);
  if (candidates.length === 0) {
    return {
      status: "failed",
      agent: "orchestrator",
      summary: `В реестре нет агента с возможностью "${capability}".`,
    };
  }

  const entry = candidates[0];
  const missionId=request._missionId;
  const startedAt=Date.now();
  const writeRuntime=async(instanceId:string,status:string,generation:number,lastError?:string)=>{
    if(!missionId)return;
    await env.AZRAIL_D1.prepare(`INSERT INTO mission_agent_runtime(
      mission_id,agent_id,instance_id,capability,status,generation,started_at,heartbeat_at,finished_at,last_error
    ) VALUES(?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(mission_id,agent_id,generation) DO UPDATE SET instance_id=excluded.instance_id,status=excluded.status,
      heartbeat_at=excluded.heartbeat_at,finished_at=excluded.finished_at,last_error=excluded.last_error`)
      .bind(missionId,entry.id,instanceId,capability,status,generation,startedAt,Date.now(),['failed','completed','replaced'].includes(status)?Date.now():null,lastError??null).run();
  };
  const prepareInstance=async(instanceId:string,generation:number)=>{
    const agent = await subAgent(entry.agentClass, instanceId);
    await writeRuntime(instanceId,'starting',generation);
    const ping=await agent.ping();
    if(!ping?.storageReadable)throw new Error(`Agent ${entry.id} health probe failed.`);
    await writeRuntime(instanceId,'healthy',generation);
    return agent;
  };
  const runPrepared=async(agent:any,instanceId:string,generation:number)=>{
    try {
      await writeRuntime(instanceId,'running',generation);
      const result=await agent.run({ ...request, _billingScope: currentBillingScope() ?? projectBillingScope(request.projectId) });
      await writeRuntime(instanceId,result.status==='failed'?'failed':'completed',generation,result.error);
      return result as TaskResult;
    } catch(error) {
      await writeRuntime(instanceId,'failed',generation,error instanceof Error?error.message:String(error)).catch(()=>{});
      // Never auto-replay after run() started: provider/tool effects may be uncertain.
      throw error;
    }
  };
  const primaryId=`${entry.id}-${request.projectId ?? "default"}`;
  let agent:any;
  let instanceId=primaryId,generation=1;
  try {
    agent=await prepareInstance(primaryId,1);
  } catch(error) {
    const reason=error instanceof Error?error.message:String(error);
    // Only health/bootstrap failures are eligible for automatic replacement.
    // runPrepared() is intentionally outside this catch so a started task is never replayed.
    await writeRuntime(primaryId,'degraded',1,reason).catch(()=>{});
    instanceId=`${entry.id}-${request.projectId ?? "default"}-replacement-${crypto.randomUUID().slice(0,8)}`;
    generation=2;
    if(missionId)await recordMissionDecision(env,missionId,'replacement',instanceId,`Primary ${entry.id} failed pre-dispatch health/bootstrap probe; creating a fresh Durable Object facet.`,{primaryId,capability,reason});
    await writeRuntime(primaryId,'replaced',1,reason).catch(()=>{});
    agent=await prepareInstance(instanceId,generation);
  }
  return runPrepared(agent,instanceId,generation);
}

export async function commitGeneratedFiles(
  env: Env,
  subAgent: SubAgentFactory,
  request: TaskRequest,
  files: GeneratedFile[],
) {
  await requireCapability(env, request.projectId, "git");
  if (files.length === 0) return [];

  const gitAgent = await subAgent(GitAgent, `git-${request.projectId ?? "default"}`);
  const out: Array<{ path: string; status: string; detail: string }> = [];
  for (const file of files) {
    const res = await gitAgent.run({
      projectId: request.projectId,
      gitRepo: request.gitRepo,
      gitOp: {
        type: "commit_file",
        branch: request.commitToBranch!,
        path: file.path,
        content: file.content,
        message: `AZRAIL UI Agent: ${file.path}`,
      },
    });
    out.push({ path: file.path, status: res.status, detail: res.error ?? res.summary });
  }
  return out;
}
