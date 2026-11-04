import type { Env } from "../types";
import { FREE_MODEL_SLUGS } from "./model-policy";
import { findModel, providerIcon } from "./model-registry";
import staticRegistry from "../data/ai-model-registry.json";

export type LiveModelCatalogItem={
  slug:string;
  /** Short UI label. Full slug stays in `slug` for API/routing. */
  displayName:string;
  task:string;
  hosted:boolean;
  reviewed:boolean;
  freeAllowlisted:boolean;
  provider:string;
  icon:string|null;
  capabilities:string[];
  contextWindow:number|null;
  speedProfile:"fast"|"balanced"|"quality"|"unknown";
  costProfile:"free-allowlisted"|"policy-gated"|"unknown";
  availability:"available";
  description?:string;
};

type StaticModel={
  slug:string;
  displayName?:string;
  provider?:string;
  task?:string;
  description?:string;
  freeAllowlisted?:boolean;
  hosted?:boolean;
  contextWindow?:number|null;
};

function providerFromSlug(slug:string){
 const clean=slug.replace(/^@cf\//,'').replace(/^@hf\//,'');const first=clean.split('/')[0]||'unknown';
 const labels:Record<string,string>={openai:'OpenAI',anthropic:'Anthropic',google:'Google',xai:'xAI',qwen:'Qwen',alibaba:'Alibaba',meta:'Meta','meta-llama':'Meta',mistralai:'Mistral',mistral:'Mistral',deepseek:'DeepSeek','deepseek-ai':'DeepSeek','zai-org':'Z.ai',zai:'Z.ai','zhipu-ai':'Z.ai',moonshotai:'Moonshot AI',nvidia:'NVIDIA',baai:'BAAI',ibm:'IBM','ibm-granite':'IBM','swiss-ai':'Swiss AI',cloudflare:'Cloudflare',moondream:'Moondream',clef:'Cloudflare','black-forest-labs':'Black Forest',blackforestlabs:'Black Forest',assemblyai:'AssemblyAI',deepgram:'Deepgram',elevenlabs:'ElevenLabs',ai4bharat:'AI4Bharat',aisingapore:'AI Singapore','llava-hf':'LLaVA',recraft:'Recraft',bytedance:'ByteDance',minimax:'MiniMax',pruna:'Pruna',runwayml:'Runway',stabilityai:'Stability AI'};
 return labels[first]??first.replace(/(^|[-_])([a-z])/g,(_:string,__:string,c:string)=>c.toUpperCase());
}
function displayNameFromSlug(slug:string){
 const leaf=slug.replace(/^@cf\//,'').split('/').pop()||slug;
 return leaf.replace(/[-_]+/g,' ').replace(/\bfp8\b/gi,'').replace(/\binstruct\b/gi,'').replace(/\bchat\b/gi,'').replace(/\bhf\b/gi,'').replace(/\b\d{4}\b/g,'').replace(/\s+/g,' ').trim()
  .split(' ').filter(Boolean).map(part=>{
   if(/^\d+(\.\d+)?[bBkKmM]?$/i.test(part))return part.replace(/b$/i,'B').replace(/m$/i,'M');
   if(/^(wan|glm|gpt|llm|ai|oss)$/i.test(part))return part.toUpperCase();
   if(/^deepseek$/i.test(part))return 'DeepSeek';
   if(/^(llama|qwen|gemma|mistral|nemotron|kimi|granite|apertus|clef)$/i.test(part))return part[0].toUpperCase()+part.slice(1).toLowerCase();
   if(/^qwen\d/i.test(part))return part.replace(/^qwen/i,'Qwen');
   if(/^gpt\d/i.test(part))return part.replace(/^gpt/i,'GPT');
   return part[0]?part[0].toUpperCase()+part.slice(1):part;
  }).join(' ').replace(/\b(GPT|GLM)\s+(\d+(?:\.\d+)?)\b/g,'$1-$2').replace(/\s+/g,' ').trim()||leaf;
}
function speedProfile(tier:string|undefined):LiveModelCatalogItem['speedProfile']{return tier==='fast'?'fast':tier==='balanced'?'balanced':tier==='frontier'?'quality':'unknown';}

function toCatalogItem(partial:{
  slug:string;displayName?:string;task?:string;hosted?:boolean;freeAllowlisted?:boolean;provider?:string;contextWindow?:number|null;description?:string;capabilities?:string[];
}):LiveModelCatalogItem{
  const registered=findModel(partial.slug);
  const freeAllowlisted=!!partial.freeAllowlisted||FREE_MODEL_SLUGS.has(partial.slug);
  const provider=partial.provider||registered?.provider||providerFromSlug(partial.slug);
  return {
    slug:partial.slug,
    displayName:partial.displayName||displayNameFromSlug(partial.slug),
    task:partial.task||'unknown',
    hosted:partial.hosted??partial.slug.startsWith('@cf/'),
    reviewed:!!registered,
    freeAllowlisted,
    provider,
    icon:providerIcon(provider)??null,
    capabilities:registered?.capabilities??(partial.capabilities?.length?partial.capabilities:(partial.task?[partial.task]:[])),
    contextWindow:partial.contextWindow??registered?.contextWindow??null,
    speedProfile:speedProfile(registered?.tier),
    costProfile:freeAllowlisted?'free-allowlisted':registered?'policy-gated':'unknown',
    availability:'available',
    description:partial.description||undefined,
  };
}

function staticModels():LiveModelCatalogItem[]{
  const rows=(staticRegistry as {models?:StaticModel[]}).models??[];
  return rows.filter(m=>typeof m.slug==='string'&&m.slug).map(m=>toCatalogItem({
    slug:m.slug,
    displayName:m.displayName,
    task:m.task,
    hosted:m.hosted,
    freeAllowlisted:m.freeAllowlisted,
    provider:m.provider,
    contextWindow:m.contextWindow??null,
    description:m.description,
  }));
}

/** Metadata only. Catalog presence never authorizes a paid inference.
 *  Merges the committed registry with the live Workers AI binding. */
export async function readLiveCatalog(env: Env) {
  const bySlug = new Map<string, LiveModelCatalogItem>();
  for (const model of staticModels()) bySlug.set(model.slug, model);

  let liveCount = 0;
  let complete = true;
  try {
    for (let page = 1; page <= 10; page++) {
      const rows = await env.AI.models({page, per_page:100});
      if (!Array.isArray(rows)) throw new Error("Каталог вернул неизвестный формат.");
      let added = 0;
      for (const m of rows) {
        if (!m.name) continue;
        liveCount++;
        added++;
        const registered=findModel(m.name);
        const prev=bySlug.get(m.name);
        bySlug.set(m.name, toCatalogItem({
          slug:m.name,
          displayName:prev?.displayName||displayNameFromSlug(m.name),
          task:m.task?.name ?? prev?.task ?? "unknown",
          hosted:m.name.startsWith("@cf/"),
          freeAllowlisted:prev?.freeAllowlisted||FREE_MODEL_SLUGS.has(m.name),
          provider:registered?.provider??prev?.provider??providerFromSlug(m.name),
          contextWindow:prev?.contextWindow??registered?.contextWindow??null,
          description:prev?.description,
          capabilities:registered?.capabilities??(m.task?.name?[m.task.name]:prev?.capabilities),
        }));
      }
      if (rows.length < 100) break;
      if (added === 0) { complete = false; break; }
    }
  } catch {
    complete = false;
  }

  const models = [...bySlug.values()].sort((a, b) =>
    a.provider.localeCompare(b.provider) || a.slug.localeCompare(b.slug),
  );
  return {
    models,
    returnedCount: models.length,
    liveCount,
    staticCount: (staticRegistry as {source?:{unique?:number}}).source?.unique ?? staticModels().length,
    complete,
    fetchedAt: new Date().toISOString(),
    scope: `Full AZRAIL model registry (static ${staticModels().length}) merged with live Workers AI binding. Context/speed/cost metadata is shown only when AZRAIL has reviewed evidence; unknown is preserved instead of guessed.`,
  };
}
