/**
 * Shared request contracts (Zod) for the Worker API.
 *
 * Imported by the Worker (src/) for strict input validation and by the UI (ui/)
 * for compile-time payload types, so both sides of a route agree on one shape.
 * This module must stay platform-neutral: it may import only `zod`.
 */
import { z } from "zod";

const trimmed = (max: number, label: string) =>
  z.string({ required_error: `${label} обязателен.`, invalid_type_error: `${label} должен быть строкой.` }).trim().min(1, `${label} обязателен.`).max(max, `${label}: не длиннее ${max} символов.`);

export const idSchema = (label = "id") => trimmed(512, label);
export const projectIdSchema = trimmed(512, "projectId");
export const missionIdSchema = trimmed(512, "missionId");
export const preferredModelSchema = z.string().trim().max(200).optional();

export const attachmentRefSchema = z.object({
  r2Key: z.string().min(1).max(1024).optional(),
  fileName: z.string().min(1).max(512),
  inputType: z.enum(["zip", "pdf", "docx", "github", "text", "json", "image", "audio", "video", "code", "unknown"]),
  size: z.number().int().nonnegative().optional(),
  mimeType: z.string().max(200).optional(),
});
export const attachmentsSchema = z.array(attachmentRefSchema).max(12, "Не больше 12 вложений.").optional();

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
});
export type ChatBody = z.infer<typeof chatSchema>;

export const polishSchema = z.object({ text: trimmed(20_000, "text"), preferredModel: preferredModelSchema });

export const benchSchema = z.object({
  confirm: z.boolean().optional(),
  only: z.array(z.string().max(200)).max(200).optional(),
  note: z.string().max(2000).optional(),
});

// ── Approvals ──────────────────────────────────────────────────────────────
export const approvalStatusSchema = z.enum(["pending", "approved", "rejected", "cancelled", "executing", "executed", "failed", "uncertain", "expired"]);
export const approvalListQuerySchema = z.object({
  status: approvalStatusSchema.optional(),
  projectId: z.string().max(512).optional(),
  missionId: z.string().max(512).optional(),
  limit: z.coerce.number().int().min(1).max(500).default(100),
});
export const approvalDecisionSchema = z.object({
  decision: z.enum(["approved", "rejected"], { errorMap: () => ({ message: "decision должен быть approved или rejected." }) }),
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
  capability: z.enum(["git", "deploy", "sandbox", "qa"], { errorMap: () => ({ message: "Неверное разрешение." }) }),
  enabled: z.boolean().optional(),
}).strict();
export const ownershipSchema = z.object({
  kind: z.enum(["project", "conversation", "upload"], { errorMap: () => ({ message: "Неверный владелец или тип ресурса." }) }),
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
export const metatronActionSchema = z.enum(["start", "pause", "resume", "cancel", "terminate", "retry_step"]);
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
  values: z.record(z.unknown()),
}).strict();
export type StudioDraftBody = z.infer<typeof studioDraftSchema>;

export const snapshotRefSchema = z.object({ snapshotId: idSchema("snapshotId"), approvalId: z.string().max(512).optional() });
export type SnapshotRefBody = z.infer<typeof snapshotRefSchema>;
