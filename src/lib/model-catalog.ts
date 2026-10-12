import type { Env } from "../types";
import { FREE_MODEL_SLUGS } from "./model-policy";
import { findModel } from "./model-registry";

export type LiveModelCatalogItem={
  slug:string;
  task:string;
  hosted:boolean;
  reviewed:boolean;
  freeAllowlisted:boolean;
  provider:string;
  capabilities:string[];
  contextWindow:number|null;
  speedProfile:"fast"|"balanced"|"quality"|"unknown";
  costProfile:"free-allowlisted"|"policy-gated"|"unknown";
  availability:"available";
};

function providerFromSlug(slug:string){
 const clean=slug.replace(/^@cf\//,'');const first=clean.split('/')[0]||'unknown';
 const labels:Record<string,string>={openai:'OpenAI',anthropic:'Anthropic',google:'Google',xai:'xAI',qwen:'Qwen',alibaba:'Alibaba',meta:'Meta',mistralai:'Mistral',deepseek:'DeepSeek','deepseek-ai':'DeepSeek','zai-org':'Z.ai',moonshotai:'Moonshot AI',nvidia:'NVIDIA'};
 return labels[first]??first;
}
function speedProfile(tier:string|undefined):LiveModelCatalogItem['speedProfile']{return tier==='fast'?'fast':tier==='balanced'?'balanced':tier==='frontier'?'quality':'unknown';}

/** Metadata only. Catalog presence never authorizes a paid inference. */
export async function readLiveCatalog(env: Env) {
  const models: LiveModelCatalogItem[] = [];
  const seen = new Set<string>();
  let complete = false;
  for (let page = 1; page <= 10; page++) {
    const rows = await env.AI.models({page, per_page:100});
    if (!Array.isArray(rows)) throw new Error("Каталог вернул неизвестный формат.");
    let added = 0;
    for (const m of rows) {
      if (!m.name || seen.has(m.name)) continue;
      seen.add(m.name); added++;
      const registered=findModel(m.name),freeAllowlisted=FREE_MODEL_SLUGS.has(m.name);
      models.push({
        slug:m.name,
        task:m.task?.name ?? "unknown",
        hosted:m.name.startsWith("@cf/"),
        reviewed:!!registered,
        freeAllowlisted,
        provider:registered?.provider??providerFromSlug(m.name),
        capabilities:registered?.capabilities??(m.task?.name?[m.task.name]:[]),
        contextWindow:registered?.contextWindow??null,
        speedProfile:speedProfile(registered?.tier),
        costProfile:freeAllowlisted?'free-allowlisted':registered?'policy-gated':'unknown',
        availability:'available',
      });
    }
    if (rows.length < 100) {complete = true; break;}
    if (added === 0) break;
  }
  return {models, returnedCount:models.length, complete, fetchedAt:new Date().toISOString(),
    scope:"Live Workers AI binding catalog. Context/speed/cost metadata is shown only when AZRAIL has reviewed evidence; unknown is preserved instead of guessed."};
}
