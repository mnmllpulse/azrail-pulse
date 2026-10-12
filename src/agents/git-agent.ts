import { withBillingScope, projectBillingScope } from "../lib/billing-context";
import { Agent } from "agents";
import { assertRepo, pathSegments, UnsafePathError } from "../lib/safe-path";
import type { Env, GitAgentState, TaskRequest, TaskResult, GitOperation } from "../types";
import { approvalDigest, claimApproval, completeApproval, requestApproval } from "../lib/approval-engine";
import { githubRequest, readGithubError } from "../services/github-client";

// ВАЖНО про источник знаний: формы ответов GitHub REST API взяты по знанию API,
// а НЕ проверены живыми запросами в этой сессии — api.github.com отдал
// rate-limit на IP песочницы. Эндпоинты стабильные и давние, но если что-то
// пойдёт не так на первом реальном запуске — смотреть надо сюда в первую очередь.
// Проверяется одним вызовом: POST /api/task с gitOp.type="list_commits".


/** btoa() ломается на не-latin1 (кириллица в коде/README → InvalidCharacterError).
 *  Кодируем через UTF-8 байты — иначе коммиты с русским текстом молча падают. */
function toBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}


export class GitAgent extends Agent<Env, GitAgentState> {
  initialState: GitAgentState = { lastRunAt: null };

  /** См. RunnableAgent.ping — проверка того, что DO поднимается и отвечает. */
  async ping() {
    let storageReadable = false;
    try {
      // Прямой запрос к хранилищу Durable Object, а не чтение this.state:
      // геттер состояния кеширует и на тёплом экземпляре не дошёл бы до
      // SQLite вообще. Подробности — в комментарии к AgentPing.
      this.sql`SELECT 1`;
      storageReadable = true;
    } catch {
      storageReadable = false;
    }
    return { storageReadable };
  }

  async run(request: TaskRequest): Promise<TaskResult> {
    return withBillingScope(request._billingScope ?? projectBillingScope(request.projectId), () => this.runScoped(request));
  }

  private async runScoped(request: TaskRequest): Promise<TaskResult> {
    this.setState({ lastRunAt: new Date().toISOString() });

    if (!this.env.GITHUB_TOKEN) {
      return {
        status: "needs_input",
        agent: "git-agent",
        summary: "Нет GITHUB_TOKEN — без него Git-операции невозможны.",
        questions: ["Задай секрет: `wrangler secret put GITHUB_TOKEN` (нужны права repo)."],
      };
    }

    // Репозиторий берём из запроса, env.GITHUB_REPO — только фоллбек.
    // (Раньше репо было жёстко одно на весь воркер — не масштабировалось
    //  на несколько проектов, это чинится здесь.)
    const repo = request.gitRepo ?? this.env.GITHUB_REPO;
    if (!repo || !/^[\w.-]+\/[\w.-]+$/.test(repo)) {
      return {
        status: "needs_input",
        agent: "git-agent",
        summary: "Не указан репозиторий.",
        questions: ['Передай "gitRepo": "owner/name" в запросе, либо задай секрет GITHUB_REPO по умолчанию.'],
      };
    }

    const op = request.gitOp;
    if (!op) {
      return {
        status: "needs_input",
        agent: "git-agent",
        summary: "Не указана Git-операция.",
        questions: [
          'Передай "gitOp", например: {"type":"create_branch","branch":"feature/x"} · ' +
            '{"type":"commit_file","branch":"main","path":"src/a.ts","content":"...","message":"..."} · ' +
            '{"type":"open_pr","head":"feature/x","base":"main","title":"..."} · ' +
            '{"type":"diff","base":"main","head":"feature/x"} · {"type":"list_commits"}',
        ],
      };
    }

    try {
      switch (op.type) {
        case "create_branch":
          return await this.createBranch(repo, op, request);
        case "commit_file":
          return await this.commitFile(repo, op, request);
        case "open_pr":
          return await this.openPr(repo, op, request);
        case "diff":
          return await this.diff(repo, op);
        case "list_commits":
          return await this.listCommits(repo, op);
        default:
          return {
            status: "needs_input",
            agent: "git-agent",
            summary: `Неизвестная операция: ${(op as { type: string }).type}`,
          };
      }
    } catch (err) {
      if (err instanceof UnsafePathError) {
        return {
          status: "needs_input",
          agent: "git-agent",
          summary: "Запрос отклонён: параметр не прошёл проверку безопасности.",
          error: err.message,
        };
      }
      return {
        status: "failed",
        agent: "git-agent",
        summary: "Сбой при обращении к GitHub API.",
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  private async gh(path: string, init: RequestInit = {}): Promise<Response> {
    return githubRequest(this.env.GITHUB_TOKEN!, path, init);
  }

  private async ghFail(res: Response, action: string): Promise<TaskResult> {
    const detail = await readGithubError(res);
    return {
      status: "failed",
      agent: "git-agent",
      summary: `${action}: GitHub вернул ${res.status}.`,
      error: detail.slice(0, 500),
    };
  }

  private async createBranch(
    repo: string,
    op: Extract<GitOperation, { type: "create_branch" }>,
    request: TaskRequest,
  ): Promise<TaskResult> {
    const from = op.from ?? "main";
    // Read-only resolution happens before approval so the decision binds to
    // the exact base commit. If the branch moves before retry, the digest
    // changes and the old approval cannot be replayed.
    const refRes = await this.gh(`/repos/${assertRepo(repo)}/git/ref/heads/${pathSegments(from, "from")}`);
    if (!refRes.ok) return this.ghFail(refRes, `Не удалось прочитать ветку "${from}"`);
    const baseSha = ((await refRes.json()) as { object: { sha: string } }).object.sha;
    const payloadDigest = await approvalDigest({ repo, action: "create_branch", branch: op.branch, from, baseSha });
    const scopeId = `${repo}:${op.branch}`;
    const actor = `git:${request.userId ?? request.projectId ?? "unknown"}`;
    if (!request.approvalId) {
      const approval = await requestApproval(this.env, {
        accountId: request.userId, projectId: request.projectId, actionType: "external_write", risk: "high",
        scopeType: "github_branch", scopeId, payloadDigest,
        summary: `Создать ветку ${op.branch} в ${repo} от ${from}@${baseSha.slice(0, 12)}`, requestedBy: actor,
      });
      return { status: "needs_input", agent: "git-agent", summary: "Ветка не создана: нужен approval на точную базу ветки.", data: { approvalId: approval.id, approvalStatus: approval.status, payloadDigest }, questions: ["Подтверди Git write в Approval Center и повтори запрос с approvalId."] };
    }
    await claimApproval(this.env,{id:request.approvalId,actionType:"external_write",scopeType:"github_branch",scopeId,payloadDigest,actor});
    let dispatched=false;
    try {
      dispatched=true;
      const createRes = await this.gh(`/repos/${assertRepo(repo)}/git/refs`, {
        method: "POST",
        body: JSON.stringify({ ref: `refs/heads/${op.branch}`, sha: baseSha }),
      });
      if (!createRes.ok) {
        await completeApproval(this.env,{id:request.approvalId,actor,outcome:"failed",detail:{status:createRes.status}});
        return this.ghFail(createRes, `Не удалось создать ветку "${op.branch}"`);
      }
      await completeApproval(this.env,{id:request.approvalId,actor,outcome:"executed",detail:{branch:op.branch,baseSha}});
      return { status: "done", agent: "git-agent", summary: `Ветка "${op.branch}" создана от "${from}" (${baseSha.slice(0, 7)}).`, data: { repo, branch: op.branch, from, baseSha, approvalId: request.approvalId } };
    } catch(error) {
      await completeApproval(this.env,{id:request.approvalId,actor,outcome:dispatched?"uncertain":"failed",detail:{error:error instanceof Error?error.message:String(error)}}).catch(()=>{});
      throw error;
    }
  }

  private async commitFile(
    repo: string,
    op: Extract<GitOperation, { type: "commit_file" }>,
    request: TaskRequest,
  ): Promise<TaskResult> {
    let existingSha: string | undefined;
    const safePath = pathSegments(op.path, "path");
    const headRes = await this.gh(`/repos/${assertRepo(repo)}/contents/${safePath}?ref=${encodeURIComponent(op.branch)}`);
    if (headRes.ok) existingSha = ((await headRes.json()) as { sha?: string }).sha;
    else if (headRes.status !== 404) return this.ghFail(headRes, `Не удалось проверить файл "${op.path}"`);

    const payloadDigest = await approvalDigest({repo,action:"commit_file",branch:op.branch,path:op.path,content:op.content,message:op.message,existingSha:existingSha??null});
    const scopeId=`${repo}:${op.branch}:${op.path}`;
    const actor=`git:${request.userId ?? request.projectId ?? "unknown"}`;
    if(!request.approvalId){
      const approval=await requestApproval(this.env,{accountId:request.userId,projectId:request.projectId,actionType:"external_write",risk:"high",scopeType:"github_file",scopeId,payloadDigest,summary:`Записать ${op.path} в ${repo}@${op.branch}`,requestedBy:actor});
      return {status:"needs_input",agent:"git-agent",summary:"Git commit не выполнен: нужен approval на точное содержимое и текущую версию файла.",data:{approvalId:approval.id,approvalStatus:approval.status,payloadDigest},questions:["Подтверди Git write в Approval Center и повтори запрос с approvalId."]};
    }
    await claimApproval(this.env,{id:request.approvalId,actionType:"external_write",scopeType:"github_file",scopeId,payloadDigest,actor});
    let dispatched=false;
    try {
      dispatched=true;
      const putRes = await this.gh(`/repos/${assertRepo(repo)}/contents/${safePath}`, {
        method: "PUT",
        body: JSON.stringify({message:op.message,content:toBase64(op.content),branch:op.branch,...(existingSha?{sha:existingSha}:{})}),
      });
      if(!putRes.ok){await completeApproval(this.env,{id:request.approvalId,actor,outcome:"failed",detail:{status:putRes.status}});return this.ghFail(putRes,`Не удалось закоммитить "${op.path}"`);}
      const commit=(await putRes.json()) as {commit?:{sha?:string;html_url?:string}};
      await completeApproval(this.env,{id:request.approvalId,actor,outcome:"executed",detail:{commitSha:commit.commit?.sha,path:op.path}});
      return {status:"done",agent:"git-agent",summary:`${existingSha?"Обновлён":"Создан"} файл "${op.path}" в ветке "${op.branch}".`,data:{repo,path:op.path,branch:op.branch,created:!existingSha,commitSha:commit.commit?.sha,url:commit.commit?.html_url,approvalId:request.approvalId}};
    } catch(error){
      await completeApproval(this.env,{id:request.approvalId,actor,outcome:dispatched?"uncertain":"failed",detail:{error:error instanceof Error?error.message:String(error)}}).catch(()=>{});
      throw error;
    }
  }

  private async openPr(
    repo: string,
    op: Extract<GitOperation, { type: "open_pr" }>,
    request: TaskRequest,
  ): Promise<TaskResult> {
    const payloadDigest = await approvalDigest({ repo, title: op.title, head: op.head, base: op.base, body: op.body ?? "" });
    const scopeId = `${repo}:${op.head}->${op.base}`;
    const actor = `git:${request.userId ?? request.projectId ?? "unknown"}`;
    if (!request.approvalId) {
      const approval = await requestApproval(this.env, {
        accountId: request.userId,
        projectId: request.projectId,
        actionType: "github_pr",
        risk: "critical",
        scopeType: "github_pr",
        scopeId,
        payloadDigest,
        summary: `Открыть PR в ${repo}: ${op.head} → ${op.base} — ${op.title}`,
        requestedBy: actor,
      });
      return {
        status: "needs_input",
        agent: "git-agent",
        summary: "PR подготовлен, но не открыт. Нужен отдельный approval на точные параметры.",
        data: { approvalId: approval.id, approvalStatus: approval.status, payloadDigest },
        questions: ["Подтверди запрос в Approval Center и повтори операцию с approvalId."],
      };
    }

    await claimApproval(this.env, {
      id: request.approvalId,
      actionType: "github_pr",
      scopeType: "github_pr",
      scopeId,
      payloadDigest,
      actor,
    });
    let dispatched = false;
    try {
      dispatched = true;
      const res = await this.gh(`/repos/${assertRepo(repo)}/pulls`, {
        method: "POST",
        body: JSON.stringify({ title: op.title, head: op.head, base: op.base, body: op.body ?? "" }),
      });
      if (!res.ok) {
        await completeApproval(this.env, { id: request.approvalId, actor, outcome: "failed", detail: { status: res.status } });
        return this.ghFail(res, "Не удалось открыть PR");
      }

      const pr = (await res.json()) as { number?: number; html_url?: string };
      await completeApproval(this.env, { id: request.approvalId, actor, outcome: "executed", detail: { number: pr.number, url: pr.html_url } });
      return {
        status: "done",
        agent: "git-agent",
        summary: `PR #${pr.number} открыт: ${op.head} → ${op.base}.`,
        data: { repo, number: pr.number, url: pr.html_url, approvalId: request.approvalId },
      };
    } catch (error) {
      await completeApproval(this.env, { id: request.approvalId, actor, outcome: dispatched ? "uncertain" : "failed", detail: { error: error instanceof Error ? error.message : String(error) } }).catch(() => {});
      throw error;
    }
  }

  private async diff(repo: string, op: Extract<GitOperation, { type: "diff" }>): Promise<TaskResult> {
    const res = await this.gh(`/repos/${assertRepo(repo)}/compare/${encodeURIComponent(op.base)}...${encodeURIComponent(op.head)}`);
    if (!res.ok) return this.ghFail(res, `Не удалось сравнить ${op.base}...${op.head}`);

    const cmp = (await res.json()) as {
      ahead_by?: number;
      behind_by?: number;
      files?: Array<{ filename: string; status: string; additions: number; deletions: number }>;
    };
    const files = (cmp.files ?? []).map((f) => ({
      file: f.filename,
      status: f.status,
      additions: f.additions,
      deletions: f.deletions,
    }));
    const totalAdd = files.reduce((s, f) => s + f.additions, 0);
    const totalDel = files.reduce((s, f) => s + f.deletions, 0);

    return {
      status: "done",
      agent: "git-agent",
      summary: `${op.base}...${op.head}: ${files.length} файлов, +${totalAdd} / -${totalDel}, впереди на ${cmp.ahead_by ?? 0} коммитов.`,
      data: { repo, aheadBy: cmp.ahead_by, behindBy: cmp.behind_by, files },
    };
  }

  private async listCommits(repo: string, op: Extract<GitOperation, { type: "list_commits" }>): Promise<TaskResult> {
    const limit = Math.min(op.limit ?? 10, 50);
    const query = new URLSearchParams({ per_page: String(limit) });
    if (op.branch) query.set("sha", op.branch);

    const res = await this.gh(`/repos/${assertRepo(repo)}/commits?${query}`);
    if (!res.ok) return this.ghFail(res, "Не удалось получить коммиты");

    const raw = (await res.json()) as Array<{
      sha: string;
      html_url?: string;
      commit: { message: string; author?: { name?: string; date?: string } };
    }>;
    const commits = raw.map((c) => ({
      sha: c.sha.slice(0, 7),
      message: c.commit.message.split("\n")[0],
      author: c.commit.author?.name,
      date: c.commit.author?.date,
      url: c.html_url,
    }));

    return {
      status: "done",
      agent: "git-agent",
      summary: `${commits.length} коммитов${op.branch ? ` в "${op.branch}"` : ""}.`,
      data: { repo, commits },
    };
  }
}
