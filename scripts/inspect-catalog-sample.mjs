import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const toml = readFileSync(
  join(process.env.APPDATA, "xdg.config/.wrangler/config/default.toml"),
  "utf8",
);
const token = (toml.match(/oauth_token\s*=\s*"([^"]+)"/) || [])[1];
const account = "bd152b38c981856eca68a275982f2070";
const url = `https://api.cloudflare.com/client/v4/accounts/${account}/ai/catalog/models?page=1&per_page=5`;
const body = await (
  await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
).json();
writeFileSync(
  ".work/cf-catalog-raw-sample.json",
  JSON.stringify(body.result.slice(0, 3), null, 2),
);
console.log("total", body.result_info);
const m = body.result[0];
console.log("keys", Object.keys(m));
console.log("pricing", JSON.stringify(m.pricing));
console.log("task", JSON.stringify(m.task));
console.log("name", m.name, "model_id", m.model_id, "provider_id", m.provider_id);
console.log("tags", m.tags);
console.log("metadata", JSON.stringify(m.metadata));
