export type ApprovalActionType =
  | "delete_file"
  | "external_write"
  | "connector_mutation"
  | "github_pr"
  | "deployment"
  | "production_migration"
  | "restore"
  | "secret_rotation";

export type ApprovalRisk = "high" | "critical";
export type ApprovalStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "cancelled"
  | "executing"
  | "executed"
  | "failed"
  | "uncertain"
  | "expired";

import type { TraceContext } from "./observability-context";

export interface ApprovalRequestInput {
  missionId?: string;
  accountId?: string;
  projectId?: string;
  actionType: ApprovalActionType;
  risk: ApprovalRisk;
  scopeType: string;
  scopeId: string;
  payloadDigest: string;
  summary: string;
  requestedBy: string;
  externalRef?: string;
  expiresAt?: number;
  trace?: TraceContext;
}

export interface ApprovalRequestRecord {
  id: string;
  mission_id: string | null;
  account_id: string | null;
  project_id: string | null;
  action_type: ApprovalActionType;
  risk: ApprovalRisk;
  scope_type: string;
  scope_id: string;
  payload_digest: string;
  summary: string;
  status: ApprovalStatus;
  requested_by: string;
  decided_by: string | null;
  decision_reason: string | null;
  requested_at: number;
  expires_at: number;
  decided_at: number | null;
  executed_at: number | null;
  external_ref: string | null;
}
