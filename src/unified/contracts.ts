/** Wire contracts, independent from model prose and UI storage. */
export type ResourceUnit = 'micro_usd' | 'neuron' | 'request' | 'second' | 'byte' | 'input_token' | 'output_token' | 'reasoning_token' | 'cache_token' | 'image_unit' | 'video_second' | 'audio_second' | 'tool_call' | 'browser_ms' | 'container_cpu_ms' | 'storage_byte' | 'bandwidth_byte';
export interface MissionSpec {
 version: 1;
 idempotencyKey: string;
 projectId: string;
 goal: string;
 expectedArtifacts: Array<'source' | 'image' | 'audio' | 'video' | 'report'>;
 design: { locale: 'ru' | 'en'; accent: string; minViewport: 320; reducedMotion: true };
 limits: { maxIterations: number; maxOutputTokens: number; maxMicroUsd: number };
 verification: { commands: string[]; required: boolean; sourceDigest?: string };
 // owner/account always derived from verified session, never from this payload.
}
export interface ToolCall<Input = unknown, Output = unknown> {
 id: string; missionId: string; projectId: string; accountId: string;
 tool: string; input: Input;
 state: 'planned' | 'reserved' | 'running' | 'succeeded' | 'failed' | 'uncertain';
 permission: string; policyRevision: number; reservationIds: string[];
 attempt: number; result?: Output; evidence?: { sha256: string; exitCode?: number; artifactId?: string };
}
export interface ResourceReservation {
 id: string; scope: string; unit: ResourceUnit; resource: string;
 upperBound: number; fingerprint: string;
}
