import { defineConfig } from "vitest/config";
import path from "node:path";

const STUB = path.resolve(import.meta.dirname, "tests/stubs/cloudflare-workers.ts");

export default defineConfig({
  plugins: [
    {
      // Любой модуль вида `cloudflare:*` подменяется одной заглушкой.
      // Их несколько (workers, email, ...), и латать по одному — гонка:
      // при обновлении пакета `agents` появится следующий.
      name: "azrail-stub-cloudflare-runtime",
      enforce: "pre",
      resolveId(id) {
        return id.startsWith("cloudflare:") ? STUB : null;
      },
    },
  ],
  test: {
    include: ["tests/**/*.test.ts"],
    server: {
      // Без inline vitest не трогает node_modules, и подмена не применяется
      deps: { inline: ["agents", "partyserver"] },
    },
  },
});
