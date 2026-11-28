import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { runJob } from "../scripts/local-agent/azrail-agent.mjs";

const find = (root: string, name: string) => runJob(root, { kind: "symbols", path: "", content: name }) as Promise<string>;

describe("поиск символов", () => {
  it("отделяет определения от использований", async () => {
    const root = await mkdtemp(join(tmpdir(), "sym-"));
    await mkdir(join(root, "src"));
    await mkdir(join(root, "node_modules"));
    await writeFile(join(root, "src", "a.ts"), "export function total(a: number) {\n  return a;\n}\nexport const rate = (x) => x;\nclass Cart {}\n");
    await writeFile(join(root, "src", "b.ts"), "import { total } from './a';\nconst n = total(2);\nconst rate2 = 1;\n");
    await writeFile(join(root, "node_modules", "x.ts"), "function total() {}\n");
    const total = await find(root, "total");
    expect(total).toContain("Определения (1):");
    expect(total).toContain("src/a.ts:1");
    expect(total).toContain("src/b.ts:2");
    expect(total).not.toContain("node_modules");
    expect(await find(root, "rate")).toContain("Определения (1):");
    expect(await find(root, "Cart")).toContain("src/a.ts:5");
  });

  it("не найден — так и говорит; опасное имя отклоняется", async () => {
    const root = await mkdtemp(join(tmpdir(), "sym-"));
    await writeFile(join(root, "a.ts"), "const x = 1;");
    expect(await find(root, "nope")).toContain("не найден");
    await expect(find(root, "a.*b")).rejects.toThrow(/Имя символа/);
  });
});
