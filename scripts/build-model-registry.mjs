/**
 * Builds config/ai-model-registry.json from Cloudflare Unified Catalog
 * + Workers AI model search. Full list, no truncation.
 */
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const toml = readFileSync(
  join(process.env.APPDATA || "", "xdg.config/.wrangler/config/default.toml"),
  "utf8",
);
const token = (toml.match(/oauth_token\s*=\s*"([^"]+)"/) || [])[1];
if (!token) {
  console.error("Missing wrangler OAuth token.");
  process.exit(1);
}
const account = "bd152b38c981856eca68a275982f2070";

const FREE_ALLOWLIST = new Set([
  "@cf/meta/llama-3.2-3b-instruct",
  "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
  "@cf/qwen/qwen2.5-coder-32b-instruct",
  "@cf/qwen/qwen3-30b-a3b-fp8",
  "@cf/openai/gpt-oss-20b",
  "@cf/baai/bge-m3",
]);

const PROVIDER_LABELS = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  google: "Google",
  xai: "xAI",
  qwen: "Qwen",
  alibaba: "Alibaba",
  meta: "Meta",
  "meta-llama": "Meta",
  mistralai: "Mistral",
  mistral: "Mistral",
  deepseek: "DeepSeek",
  "deepseek-ai": "DeepSeek",
  "zai-org": "Z.ai",
  zai: "Z.ai",
  "zhipu-ai": "Z.ai",
  moonshotai: "Moonshot AI",
  nvidia: "NVIDIA",
  baai: "BAAI",
  ibm: "IBM",
  "swiss-ai": "Swiss AI",
  cloudflare: "Cloudflare",
  workersai: "Cloudflare",
  "workers-ai": "Cloudflare",
  moondream: "Moondream",
  clef: "Cloudflare",
  "black-forest-labs": "Black Forest",
  blackforestlabs: "Black Forest",
  assemblyai: "AssemblyAI",
  deepgram: "Deepgram",
  elevenlabs: "ElevenLabs",
  groq: "Groq",
  cohere: "Cohere",
  perplexity: "Perplexity",
  together: "Together AI",
  fireworks: "Fireworks",
  replicate: "Replicate",
  huggingface: "Hugging Face",
  hf: "Hugging Face",
};

function providerLabel(id) {
  if (!id) return "Other";
  const key = String(id).toLowerCase();
  return (
    PROVIDER_LABELS[key] ||
    key.replace(/(^|[-_])([a-z])/g, (_, __, c) => c.toUpperCase())
  );
}

function displayFromSlug(slug, fallback = "") {
  if (fallback && fallback.trim()) return fallback.trim();
  const leaf = String(slug).replace(/^@cf\//, "").split("/").pop() || slug;
  return leaf
    .replace(/[-_]+/g, " ")
    .replace(/\bfp8\b/gi, "")
    .replace(/\binstruct\b/gi, "")
    .replace(/\bchat\b/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .map((part) => {
      if (/^\d+(\.\d+)?[bBkKmM]?$/i.test(part))
        return part.replace(/b$/i, "B").replace(/m$/i, "M");
      if (/^(wan|glm|gpt|llm|ai|oss)$/i.test(part)) return part.toUpperCase();
      if (/^deepseek$/i.test(part)) return "DeepSeek";
      return part[0] ? part[0].toUpperCase() + part.slice(1) : part;
    })
    .join(" ");
}

function pricingValues(pricing) {
  if (!pricing || typeof pricing !== "object") return [];
  return Object.values(pricing).filter((v) => typeof v === "number" || typeof v === "string");
}
function isFreePricing(pricing) {
  const values = pricingValues(pricing);
  if (!values.length) return false;
  return values.every((v) => Number(v) === 0);
}
function hasPaidPricing(pricing) {
  return pricingValues(pricing).some((v) => Number(v) > 0);
}

async function fetchAll(path) {
  const out = [];
  for (let page = 1; page <= 40; page++) {
    const url = new URL(
      `https://api.cloudflare.com/client/v4/accounts/${account}${path}`,
    );
    url.searchParams.set("page", String(page));
    url.searchParams.set("per_page", "100");
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await res.json();
    if (!body.success) {
      throw new Error(
        `${path} page ${page}: ${body.errors?.[0]?.message || res.status}`,
      );
    }
    const rows = Array.isArray(body.result) ? body.result : [];
    out.push(...rows);
    const total = body.result_info?.total_count;
    console.log(path, "page", page, "got", rows.length, "acc", out.length, "total", total ?? "?");
    if (!rows.length || rows.length < 100) break;
    if (typeof total === "number" && out.length >= total) break;
  }
  return out;
}

const [catalogRows, searchRows] = await Promise.all([
  fetchAll("/ai/catalog/models"),
  fetchAll("/ai/models/search"),
]);

/** @type {Map<string, any>} */
const bySlug = new Map();

function upsert(entry) {
  const prev = bySlug.get(entry.slug);
  if (!prev) {
    bySlug.set(entry.slug, entry);
    return;
  }
  bySlug.set(entry.slug, {
    ...prev,
    ...entry,
    displayName: entry.displayName || prev.displayName,
    provider: entry.provider || prev.provider,
    task: entry.task !== "unknown" ? entry.task : prev.task,
    freeAllowlisted: prev.freeAllowlisted || entry.freeAllowlisted,
    hosted: prev.hosted || entry.hosted,
    source: Array.from(new Set([...(prev.source || []), ...(entry.source || [])])),
  });
}

for (const m of catalogRows) {
  const slug = String(m.model_id || m.name || "").trim();
  if (!slug) continue;
  const providerId = m.provider_id || slug.split("/")[0] || "unknown";
  const hosted = slug.startsWith("@cf/") || providerId === "workers-ai" || providerId === "cloudflare";
  const freeAllowlisted =
    FREE_ALLOWLIST.has(slug) ||
    FREE_ALLOWLIST.has(`@cf/${slug}`) ||
    isFreePricing(m.pricing) ||
    (hosted && !hasPaidPricing(m.pricing));
  upsert({
    slug,
    displayName: displayFromSlug(slug, m.name),
    provider: providerLabel(providerId),
    providerId,
    task: typeof m.task === "string" ? m.task : "unknown",
    description: typeof m.description === "string" ? m.description : "",
    freeAllowlisted,
    hosted,
    contextWindow: m.context_length ?? null,
    maxOutputTokens: m.max_output_tokens ?? null,
    tags: Array.isArray(m.tags) ? m.tags : [],
    source: ["unified-catalog"],
  });
}

for (const m of searchRows) {
  const slug = String(m.name || "").trim();
  if (!slug) continue;
  const leafProvider = slug.replace(/^@cf\//, "").replace(/^@hf\//, "").split("/")[0];
  const hosted = slug.startsWith("@cf/");
  const freeAllowlisted =
    FREE_ALLOWLIST.has(slug) ||
    isFreePricing(m.pricing) ||
    (hosted && !hasPaidPricing(m.pricing));
  upsert({
    slug,
    displayName: displayFromSlug(slug),
    provider: providerLabel(leafProvider),
    providerId: leafProvider,
    task: m.task?.name || "unknown",
    description: typeof m.description === "string" ? m.description : "",
    freeAllowlisted,
    hosted,
    contextWindow: null,
    maxOutputTokens: null,
    tags: [],
    source: ["workers-ai-search"],
  });
}

const models = [...bySlug.values()].sort((a, b) =>
  a.provider.localeCompare(b.provider) || a.slug.localeCompare(b.slug),
);

const registry = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  source: {
    unifiedCatalog: catalogRows.length,
    workersAiSearch: searchRows.length,
    unique: models.length,
  },
  models,
};

const payload = JSON.stringify(registry, null, 2) + "\n";
const outPaths = [
  join(root, "config", "ai-model-registry.json"),
  join(root, "src", "data", "ai-model-registry.json"),
];
for (const outPath of outPaths) {
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, payload);
  console.log("Wrote", outPath, "models:", models.length);
}
mkdirSync(join(root, ".work"), { recursive: true });
writeFileSync(join(root, ".work", "ai-model-registry.summary.json"), JSON.stringify({
  unique: models.length,
  free: models.filter((m) => m.freeAllowlisted).length,
  paid: models.filter((m) => !m.freeAllowlisted).length,
  byProvider: models.reduce((acc, m) => {
    acc[m.provider] = (acc[m.provider] || 0) + 1;
    return acc;
  }, {}),
}, null, 2));
console.log("free", models.filter((m) => m.freeAllowlisted).length, "paid", models.filter((m) => !m.freeAllowlisted).length);
