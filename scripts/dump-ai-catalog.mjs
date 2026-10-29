import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const tomlPath = join(
  process.env.APPDATA || "",
  "xdg.config/.wrangler/config/default.toml",
);
const toml = readFileSync(tomlPath, "utf8");
const token = (toml.match(/oauth_token\s*=\s*"([^"]+)"/) || [])[1];
if (!token) {
  console.error("NO_TOKEN");
  process.exit(1);
}
const account = "bd152b38c981856eca68a275982f2070";
const all = [];
const seen = new Set();

async function pull(path, label) {
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
      console.error(
        label,
        "API_FAIL",
        page,
        JSON.stringify(body.errors?.[0] || { status: res.status }),
      );
      break;
    }
    const rows = Array.isArray(body.result)
      ? body.result
      : Array.isArray(body.result?.models)
        ? body.result.models
        : Array.isArray(body.result?.data)
          ? body.result.data
          : [];
    const resultInfo = body.result_info || {};
    let added = 0;
    for (const m of rows) {
      const name = m.name || m.id || m.model || m.slug;
      if (!name || seen.has(name)) continue;
      seen.add(name);
      added++;
      const task =
        m.task?.name ||
        m.task_type ||
        m.task ||
        m.modality ||
        (Array.isArray(m.tasks) ? m.tasks[0] : null) ||
        "unknown";
      all.push({
        slug: String(name),
        task: typeof task === "string" ? task : "unknown",
        displayName: m.display_name || m.displayName || m.title || "",
        provider:
          m.author ||
          m.provider ||
          m.organization ||
          m.publisher ||
          "",
        description: typeof m.description === "string" ? m.description : "",
        free:
          m.is_free === true ||
          m.free === true ||
          m.pricing?.type === "free" ||
          m.pricing?.unit_price === 0 ||
          false,
        source: m.source ?? m.hosted ? "workers-ai" : null,
        rawKeys: Object.keys(m).slice(0, 20),
      });
    }
    console.log(
      label,
      "page",
      page,
      "rows",
      rows.length,
      "added",
      added,
      "total",
      all.length,
      "info",
      JSON.stringify(resultInfo),
    );
    if (!rows.length || rows.length < 100 || added === 0) break;
  }
}

await pull("/ai/catalog/models", "catalog");
if (all.length < 100) await pull("/ai/models/search", "search");

mkdirSync(".work", { recursive: true });
writeFileSync(".work/cf-ai-models-full.json", JSON.stringify(all, null, 2));
if (all[0]) {
  writeFileSync(".work/cf-ai-models-sample.json", JSON.stringify(all[0], null, 2));
}
console.log("WROTE", all.length);
