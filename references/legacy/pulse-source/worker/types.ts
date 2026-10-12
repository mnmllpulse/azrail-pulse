import type { D1Database, R2Bucket, Fetcher, Ai } from '@cloudflare/workers-types';
export interface Env {
  DB: D1Database;
  R2: R2Bucket;
  AI: Ai;
  ASSETS: Fetcher;
  OWNER_ACCESS_KEY: string;
  DAILY_AI_LIMIT?: string;
  ALLOW_THIRD_PARTY_MODELS?: string;
  GEMINI_API_KEY?: string;
  GEMINI_TEXT_MODEL?: string;
  GEMINI_MUSIC_MODEL?: string;
  GEMINI_VIDEO_MODEL?: string;
  EXTERNAL_DAILY_LIMIT?: string;
  CLOUDFLARE_ACCOUNT_ID?: string;
  CLOUDFLARE_READ_TOKEN?: string;
  DEPLOY_HOOK_URL?: string;
  TG_BOT_TOKEN_OS?: string;
  TG_ALLOWED_CHAT_ID?: string;
}
export interface Principal { id: string; role: 'owner'; sessionHash: string }
export interface ChatMessage { role: 'user' | 'assistant' | 'system'; content: string }
