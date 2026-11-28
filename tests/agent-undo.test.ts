import { access, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { runJob } from "../scripts/local-agent/azrail-agent.mjs";

const has = (path: string) => access(path).then(() => true, () => false);
const job = (kind: string, path: string, content?: string) => ({ kind, path, content });

describe("журнал и откат", () => {
  it("откатывает запись, перенос, корзину и новую папку в обратном порядке", async () => {
    const root = await mkdtemp(join(tmpdir(), "undo-"));
    await writeFile(join(root, "a.txt"), "старое");
    await runJob(root, job("mkdir", "Проект"));
    await runJob(root, job("write", "a.txt", "новое"));
    await runJob(root, job("move", "a.txt", "Проект/a.txt"));
    await runJob(root, job("write", "b.txt", "b"));
    await runJob(root, job("trash", "b.txt"));
    expect(await has(join(root, "b.txt"))).toBe(false);

    await runJob(root, job("undo", "1"));
    expect(await readFile(join(root, "b.txt"), "utf8")).toBe("b");
    await runJob(root, job("undo", "2"));
    expect(await has(join(root, "b.txt"))).toBe(false);
    expect(await readFile(join(root, "a.txt"), "utf8")).toBe("новое");
    await runJob(root, job("undo", "1"));
    expect(await readFile(join(root, "a.txt"), "utf8")).toBe("старое");
    await runJob(root, job("undo", "1"));
    expect(await has(join(root, "Проект"))).toBe(false);
    await expect(runJob(root, job("undo", "1"))).rejects.toThrow(/пуст/);
  });

  it("папка, которая была до задачи, не удаляется; непустая не трогается", async () => {
    const root = await mkdtemp(join(tmpdir(), "undo-"));
    await mkdir(join(root, "есть"));
    await runJob(root, job("mkdir", "есть"));
    expect(await runJob(root, job("undo", "1"))).toMatch(/была и до/);
    await runJob(root, job("mkdir", "новая"));
    await writeFile(join(root, "новая", "x"), "1");
    await expect(runJob(root, job("undo", "1"))).rejects.toThrow(/не пуста/);
    expect(await has(join(root, "новая"))).toBe(true);
  });

  it("правка файла откатывается из копии", async () => {
    const root = await mkdtemp(join(tmpdir(), "undo-"));
    await writeFile(join(root, "c.txt"), "один два");
    await runJob(root, job("edit", "c.txt", JSON.stringify({ old: "два", new: "три" })));
    expect(await readFile(join(root, "c.txt"), "utf8")).toBe("один три");
    await runJob(root, job("undo", "1"));
    expect(await readFile(join(root, "c.txt"), "utf8")).toBe("один два");
  });
});
