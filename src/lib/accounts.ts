import type { Env } from "../types";
import { sessionPrincipal } from "../unified/oidc";
import { checkAuth } from "./auth";
export type Role = "admin" | "editor" | "viewer";
export interface Principal { id: string; role: Role; name: string; operator?: boolean }
export class AccessError extends Error { constructor(message: string, public status = 403) { super(message); } }
export const administrator: Principal = { id: "bootstrap-admin", role: "admin", name: "Administrator" };
export async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2,"0")).join("");
}
export async function authenticate(request: Request, env: Env) {
  const session = await sessionPrincipal(request, env);
  if (session) return {ok:true,caller:session.id,principal:session};
  if(env.AUTH_MODE === "oidc") return {ok:false,status:401,error:"Войдите в аккаунт.",caller:"",principal:undefined};
  const bootstrap = checkAuth(request, env);
  if (bootstrap.ok) return { ...bootstrap, caller: administrator.id, principal: administrator };
  const token = request.headers.get("Authorization")?.match(/^Bearer (az_[a-f0-9]{64})$/)?.[1];
  if (!token) return { ok: false, status: 401, error: "Нужен действующий ключ доступа.", caller: "", principal: undefined };
  const row = await env.AZRAIL_D1.prepare(`SELECT id, name, role FROM access_accounts WHERE token_hash=? AND disabled=0 AND expires_at>?`)
    .bind(await hashToken(token),Date.now()).first<Principal>();
  return row ? { ok:true,caller:row.id,principal:row } : {ok:false,status:401,error:"Ключ истёк или отозван.",caller:"",principal:undefined};
}
export async function activeAccount(env:Env,id:string):Promise<Principal|null> {
  if(id===administrator.id) return env.AUTH_MODE!=="oidc" && env.AZRAIL_TOKEN ? administrator : null;
  return env.AZRAIL_D1.prepare("SELECT id,name,role FROM access_accounts WHERE id=? AND disabled=0 AND expires_at>?").bind(id,Date.now()).first<Principal>();
}
export async function createAccount(env:Env,name:string,role:Role,days=30) {
  if(!name.trim() || name.length>100 || !["admin","editor","viewer"].includes(role) || !Number.isInteger(days) || days<1 || days>365) throw new AccessError("Недопустимые параметры аккаунта.",400);
  const token="az_"+crypto.randomUUID().replaceAll("-","")+crypto.randomUUID().replaceAll("-","");
  const id=crypto.randomUUID(),expiresAt=Date.now()+days*86400000;
  await env.AZRAIL_D1.prepare("INSERT INTO access_accounts(id,name,role,token_hash,expires_at) VALUES(?,?,?,?,?)").bind(id,name,role,await hashToken(token),expiresAt).run();
  return {id,name,role,token,expiresAt};
}
export async function requireResource(env:Env,p:Principal,kind:string,id:string,create=false):Promise<void> {
  if(!id || id.length>512) throw new AccessError("Некорректный идентификатор.",400);
  if(p.role==="admin") {
    if(create) await env.AZRAIL_D1.prepare("INSERT INTO resource_owners(kind,resource_id,account_id) VALUES(?,?,?) ON CONFLICT DO NOTHING").bind(kind,id,p.id).run();
    return;
  }
  let row=await env.AZRAIL_D1.prepare("SELECT account_id FROM resource_owners WHERE kind=? AND resource_id=?").bind(kind,id).first<{account_id:string}>();
  if(!row && create && p.role!=="viewer") {
    // Existing legacy resources may only be assigned by an administrator.
    const exists=kind==="project" ? await env.AZRAIL_D1.prepare("SELECT id FROM projects WHERE id=? UNION ALL SELECT id FROM missions WHERE project_id=? UNION ALL SELECT project_id AS id FROM project_memory WHERE project_id=? UNION ALL SELECT project_id AS id FROM task_history WHERE project_id=? UNION ALL SELECT project_id AS id FROM workspace_heads WHERE project_id=? LIMIT 1").bind(id,id,id,id,id).first()
      :kind==="conversation" ? await env.AZRAIL_D1.prepare("SELECT id FROM conversations WHERE id=?").bind(id).first() : null;
    if(exists) throw new AccessError("Ресурс недоступен.",404);
    if(kind==="project") {
      const files=await env.AZRAIL_R2.list({prefix:`projects/${id}/`,limit:1});
      if(files.objects.length) throw new AccessError("Ресурс недоступен.",404);
    }
    await env.AZRAIL_D1.prepare("INSERT INTO resource_owners(kind,resource_id,account_id) VALUES(?,?,?) ON CONFLICT DO NOTHING").bind(kind,id,p.id).run();
    row=await env.AZRAIL_D1.prepare("SELECT account_id FROM resource_owners WHERE kind=? AND resource_id=?").bind(kind,id).first<{account_id:string}>();
  }
  if(row?.account_id!==p.id) throw new AccessError("Ресурс недоступен.",404);
}
export async function authorizeRequest(env:Env,p:Principal,request:Request,body:Record<string,unknown>={}) {
  const u=new URL(request.url), path=u.pathname;
  if(p.role==="viewer" && !["GET","OPTIONS"].includes(request.method) && !(path==="/api/stream/ticket" && request.method==="POST")) throw new AccessError("Роль разрешает только чтение.");
  if((path.startsWith("/api/admin/") || ["/api/bench","/api/selftest"].includes(path)) && p.role!=="admin" && !(p.operator && ["/api/admin/routing-settings","/api/admin/billing","/api/admin/permissions","/api/admin/trial"].includes(path))) throw new AccessError("Нужны права администратора.");
  if(path.startsWith("/api/approvals") && request.method!=="GET" && p.role!=="admin") throw new AccessError("Подтверждать опасные операции может только администратор.");
  const projectMatch=path.match(/^\/api\/projects\/([^/]+)/);
  const project=projectMatch?decodeURIComponent(projectMatch[1]):typeof body.projectId==="string"?body.projectId:u.searchParams.get("projectId");
  if(project) {
    if(!/^[A-Za-z0-9_-]{1,128}$/.test(project)) throw new AccessError("Некорректный projectId.",400);
    await requireResource(env,p,"project",project,request.method==="POST" && !projectMatch);
  }
  if(p.role!=="admin" && request.method==="POST" && ["/api/task","/api/chat","/api/mission","/api/stream/ticket"].includes(path) && !project) throw new AccessError("Выберите проект.",400);
  if(p.role!=="admin" && path==="/api/stream" && !project) throw new AccessError("Выберите проект.",400);
  const conversation=typeof body.conversationId==="string"?body.conversationId:u.searchParams.get("conversationId");
  const createConversation=request.method==="POST" && (path==="/api/chat" || path==="/api/conversations/plan");
  if(conversation) await requireResource(env,p,"conversation",conversation,createConversation);
  if(path==="/api/chat" && request.method==="POST" && !conversation && project) await requireResource(env,p,"conversation",project,true);
  const mission=typeof body.missionId==="string"?body.missionId:u.searchParams.get("missionId");
  if(mission) {
    const row=await env.AZRAIL_D1.prepare("SELECT project_id FROM missions WHERE id=?").bind(mission).first<{project_id:string}>();
    if(!row) throw new AccessError("Миссия недоступна.",404);
    await requireResource(env,p,"project",row.project_id);
  }
  const refs:unknown[]=Array.isArray(body.attachments)?body.attachments:[];
  const keys=refs.map(r=>r&&typeof r==="object"?(r as {r2Key?:unknown}).r2Key:undefined).filter((k):k is string=>typeof k==="string"&&k.length>0);
  for(const key of [...keys,...(typeof body.r2Key==="string"?[body.r2Key]:[])]) await requireResource(env,p,"upload",key);
  if(body.parentMessageId && p.role!=="admin") {
    const row=await env.AZRAIL_D1.prepare("SELECT conversation_id FROM messages WHERE id=?").bind(body.parentMessageId).first<{conversation_id:string}>();
    if(!row || row.conversation_id!==(conversation??project)) throw new AccessError("Сообщение недоступно.",404);
    await requireResource(env,p,"conversation",row.conversation_id);
  }
  if(p.role!=="admin" && (body.gitOp || body.qaOp || body.commitToBranch || body.inputType==="github" || body.intent==="deploy")) throw new AccessError("Интеграции доступны только администратору.");
}
