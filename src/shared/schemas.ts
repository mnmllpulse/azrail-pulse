/**
 * Shared request contracts (Zod) for the Worker API.
 *
 * Imported by the Worker (src/) for strict input validation and by the UI (ui/)
 * for compile-time payload types, so both sides of a route agree on one shape.
 * This module must stay platform-neutral: it may import only `zod`.
 */
import { z } from "zod";

const trimmed = (max: number, label: string) =>
  z.string({ error: (issue) => issue.input === undefined ? `${label} обязателен.` : `${label} должен быть строкой.` }).trim().min(1, `${label} обязателен.`).max(max, `${label}: не длиннее ${max} символов.`);

const idSchema = (label = "id") => trimmed(512, label);
const projectIdSchema = trimmed(512, "projectId");
const missionIdSchema = trimmed(512, "missionId");
const preferredModelSchema = z.string().trim().max(200).optional();
const chatVoiceSchema = z.enum(["lumen", "shade", "aria"]).optional();

const attachmentRefSchema = z.object({
  r2Key: z.string().min(1).max(1024).optional(),
  fileName: z.string().min(1).max(512),
  inputType: z.enum(["zip", "pdf", "docx", "github", "text", "json", "image", "audio", "video", "code", "unknown"]),
  size: z.number().int().nonnegative().optional(),
  mimeType: z.string().max(200).optional(),
});
const attachmentsSchema = z.array(attachmentRefSchema).max(12, "Не больше 12 вложений.").optional();

// ── Missions / chat ────────────────────────────────────────────────────────
export const missionStartSchema = z.object({
  message: trimmed(20_000, "message"),
  projectId: projectIdSchema,
  maxIterations: z.number().int().positive().max(1000).optional(),
  preferredModel: preferredModelSchema,
  attachments: attachmentsSchema,
});
export type MissionStartBody = z.infer<typeof missionStartSchema>;

export const missionRefSchema = z.object({ missionId: missionIdSchema, projectId: z.string().max(512).optional() });
export const missionHintSchema = z.object({ missionId: missionIdSchema, text: z.string().max(4000).default("") });

export const chatSchema = z.object({
  message: trimmed(20_000, "message"),
  projectId: z.string().trim().max(512).optional(),
  conversationId: z.string().trim().max(512).optional(),
  parentMessageId: z.string().trim().max(512).optional(),
  preferredModel: preferredModelSchema,
  voice: chatVoiceSchema,
  attachments: attachmentsSchema,
});
export type ChatBody = z.infer<typeof chatSchema>;

export const polishSchema = z.object({ text: trimmed(20_000, "text"), preferredModel: preferredModelSchema });

export const planDraftSchema = z.object({
  message: trimmed(4_000, "message"),
  memory: z.string().trim().max(1_000).optional(),
});

const planUrl = z.string().max(300).regex(/^\/api\/studio\/artifacts\/[A-Za-z0-9._~-]+(?:\?inline=1)?$|^\/s\/[A-Za-z0-9_-]+\/?$/);
const planThingSchema = z.object({
  type: z.enum(["image", "audio", "page", "storyboard", "note", "file", "diagram"]),
  url: planUrl.optional(),
  title: z.string().max(200).optional(),
  lines: z.array(z.string().max(200)).max(8).optional(),
  alts: z.array(planUrl).max(3).optional(),
});

export const conversationPlanSchema = z.object({
  conversationId: z.string().trim().min(1).max(128),
  userText: z.string().trim().min(1).max(4000).optional(),
  summary: z.string().trim().min(1).max(4000).optional(),
  plan: z.object({
    text: z.string().max(2000),
    parts: z.array(z.object({
      id: z.string().trim().min(1).max(32),
      kind: z.enum(["image", "music", "video", "web", "file", "diagram", "build"]),
      text: z.string().max(500),
      worker: z.string().max(80),
      state: z.enum(["waiting", "running", "done", "failed"]),
      ready: z.string().max(500),
      wave: z.number().int().min(0).max(3).optional(),
      dependsOn: z.array(z.string().trim().min(1).max(32)).max(3).optional(),
      thing: planThingSchema.optional(),
      versions: z.array(planThingSchema).max(3).optional(),
      seed: z.number().int().min(0).max(2147483647).optional(),
    })).max(4),
  }),
});

export const conversationPatchSchema = z.object({
  id: z.string().trim().min(1).max(128),
  title: z.string().trim().min(1).max(90).optional(),
  pinned: z.boolean().optional(),
  archived: z.boolean().optional(),
  projectId: z.string().trim().min(1).max(128).nullable().optional(),
}).refine(
  (v) => v.title !== undefined || v.pinned !== undefined || v.archived !== undefined || v.projectId !== undefined,
  { message: "Нужно title, pinned, archived или projectId." },
);

export const benchSchema = z.object({
  confirm: z.boolean().optional(),
  only: z.array(z.string().max(200)).max(200).optional(),
  note: z.string().max(2000).optional(),
});

// ── Approvals ──────────────────────────────────────────────────────────────
const approvalStatusSchema = z.enum(["pending", "approved", "rejected", "cancelled", "executing", "executed", "failed", "uncertain", "expired"]);
export const approvalListQuerySchema = z.object({
  status: approvalStatusSchema.optional(),
  projectId: z.string().max(512).optional(),
  missionId: z.string().max(512).optional(),
  limit: z.coerce.number().int().min(1).max(500).default(100),
});
export const approvalDecisionSchema = z.object({
  decision: z.enum(["approved", "rejected"], { error: "decision должен быть approved или rejected." }),
  reason: z.string().max(2000).optional(),
  payloadDigest: z.string().max(256).optional(),
});
export type ApprovalDecisionBody = z.infer<typeof approvalDecisionSchema>;

// ── Backups ────────────────────────────────────────────────────────────────
export const backupCreateSchema = z.object({ projectId: projectIdSchema });
export const backupQuerySchema = z.object({ projectId: projectIdSchema });
export const backupDeleteQuerySchema = z.object({ projectId: projectIdSchema, backupId: idSchema("backupId") });
export const backupRestoreSchema = z.object({
  projectId: projectIdSchema,
  targetProjectId: trimmed(512, "targetProjectId"),
  backupId: idSchema("backupId"),
  approvalId: z.string().max(512).optional(),
});
export type BackupRestoreBody = z.infer<typeof backupRestoreSchema>;

// ── Admin ──────────────────────────────────────────────────────────────────
export const accountCreateSchema = z.object({
  name: trimmed(100, "name"),
  role: z.enum(["admin", "editor", "viewer"]).default("editor"),
  days: z.number().int().min(1).max(365).default(30),
}).strict();
export const accountRevokeSchema = z.object({ accountId: idSchema("accountId") }).strict();
export const permissionSchema = z.object({
  projectId: projectIdSchema,
  capability: z.enum(["git", "deploy", "sandbox", "qa"], { error: "Неверное разрешение." }),
  enabled: z.boolean().optional(),
}).strict();
export const ownershipSchema = z.object({
  kind: z.enum(["project", "conversation", "upload"], { error: "Неверный владелец или тип ресурса." }),
  resourceId: idSchema("resourceId"),
  accountId: idSchema("accountId"),
}).strict();
export const billingUpdateSchema = z.union([
  z.object({ reconcileCallId: idSchema("reconcileCallId"), actualMicroUsd: z.number().int().nonnegative(), evidence: z.string().max(4000).default("") }).strict(),
  z.object({ model: trimmed(200, "model"), inputRate: z.number().int().min(0).max(1e12), outputRate: z.number().int().min(0).max(1e12) }).strict(),
  z.object({ usd: z.number().positive().max(1000), scope: z.string().max(256).default("global") }).strict(),
]);

// ── Streams / Metatron ─────────────────────────────────────────────────────
export const streamTicketSchema = z.object({ projectId: z.string().trim().min(1).max(512).default("default") });
const metatronActionSchema = z.enum(["start", "pause", "resume", "cancel", "terminate", "retry_step"]);
export const metatronControlSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("retry_step"), missionId: missionIdSchema, step: z.number().int().nonnegative() }),
  z.object({ action: metatronActionSchema.exclude(["retry_step"]), missionId: missionIdSchema }),
]);
export type MetatronControlBody = z.infer<typeof metatronControlSchema>;
export const faultInjectionSchema = z.object({
  missionId: missionIdSchema,
  scenario: z.enum(["timeout", "provider_down", "d1_failure", "network_loss"]),
});

// ── Studios ────────────────────────────────────────────────────────────────
export const studioDraftSchema = z.object({
  baseRevision: z.number().int().nonnegative(),
  // Per-field allowlist and length limits stay in src/unified/drafts.ts.
  values: z.record(z.string(), z.unknown()),
}).strict();
export type StudioDraftBody = z.infer<typeof studioDraftSchema>;

export const snapshotRefSchema = z.object({ snapshotId: idSchema("snapshotId"), approvalId: z.string().max(512).optional() });
export type SnapshotRefBody = z.infer<typeof snapshotRefSchema>;
