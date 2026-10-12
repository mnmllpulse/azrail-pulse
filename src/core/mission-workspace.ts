import type { Env } from "../types";
import { listFilesPage, readFile } from "../lib/workspace";
import type { WorkspaceFile } from "./verification";

/** Read a bounded, complete workspace snapshot for mission diff/verification. */
export async function readMissionWorkspace(env: Env, projectId: string): Promise<WorkspaceFile[]> {
  const page = await listFilesPage(env, projectId, 400);
  if (page.truncated) throw new Error("Workspace exceeds the 400-file verification limit; narrow the project before verification.");
  const out: WorkspaceFile[] = [];
  for (const entry of page.files) {
    const file = await readFile(env, projectId, entry.path);
    out.push({ path: entry.path, content: file?.content ?? "" });
  }
  return out;
}
