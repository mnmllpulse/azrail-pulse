import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { runJob } from "../scripts/local-agent/azrail-agent.mjs";

const overview = (root: string, path = "") => runJob(root, { kind: "overview", path }) as Promise<string>;

describe("обзор проекта", () => {
  it("определяет pnpm по lock-файлу и даёт готовые команды", async () => {
    const root = await mkdtemp(join(tmpdir(), "ov-"));
    await writeFile(join(root, "package.json"), JSON.stringify({ scripts: { test: "vitest", build: "tsc" } }));
    await writeFile(join(root, "pnpm-lock.yaml"), "");
    await mkdir(join(root, "src"));
    const text = await overview(root);
    expect(text).toContain("Менеджер пакетов: pnpm (зависимости не установлены: сначала pnpm install)");
    expect(text).toContain("pnpm test; pnpm build");
    expect(text).toContain("src/");
  });

  it("npm по умолчанию: «npm run», зависимости установлены", async () => {
    const root = await mkdtemp(join(tmpdir(), "ov-"));
    await writeFile(join(root, "package.json"), JSON.stringify({ scripts: { dev: "vite" } }));
    await mkdir(join(root, "node_modules"));
    const text = await overview(root);
    expect(text).toContain("Менеджер пакетов: npm (зависимости установлены)");
    expect(text).toContain("npm run dev");
    expect(text).not.toContain("node_modules");
  });

  it("не проект — так и говорит; Python и README распознаются", async () => {
    const plain = await mkdtemp(join(tmpdir(), "ov-"));
    expect(await overview(plain)).toContain("нет — это не проект");
    const py = await mkdtemp(join(tmpdir(), "ov-"));
    await writeFile(join(py, "requirements.txt"), "");
    await writeFile(join(py, "README.md"), "# Мой проект");
    const text = await overview(py);
    expect(text).toContain("python -m pytest");
    expect(text).toContain("# Мой проект");
  });
});
