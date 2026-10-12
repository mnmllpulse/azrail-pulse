import { MODEL_CATALOG } from '../../shared/platform';
export interface AIModel { id: string; name: string; provider: string; category: string; capabilities: string[]; deprecated?: boolean; }
export const AI_MODELS: AIModel[] = MODEL_CATALOG;
export const MODEL_CATEGORIES = [...new Set(AI_MODELS.map(m => m.category))];
export const MODEL_PROVIDERS = [...new Set(AI_MODELS.map(m => m.provider))];
