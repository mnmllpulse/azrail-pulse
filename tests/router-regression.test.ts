import { describe, it, expect } from "vitest";
import cases from "./fixtures/router-cases.json";
import { readAssignment } from "../ui/assignment";
import { planWork } from "../ui/planner";

type Case = { text: string; kind?: string; kinds?: string[] };

describe("регрессионный набор маршрутизатора: реальные фразы чата", () => {
  for (const c of cases as Case[]) {
    it(`«${c.text}» → ${c.kinds ? c.kinds.join(" + ") : c.kind}`, () => {
      if (c.kinds) expect(planWork(c.text).parts.map((p) => p.kind)).toEqual(c.kinds);
      else expect(readAssignment(c.text).kind).toBe(c.kind);
    });
  }

  it("набор достаточно широк: 20+ фраз, все виды поручений", () => {
    const list = cases as Case[];
    const kinds = new Set(list.flatMap((c) => c.kinds ?? [c.kind]));
    expect(list.length).toBeGreaterThanOrEqual(20);
    for (const kind of ["talk", "image", "web", "music", "video", "file", "diagram"]) expect(kinds.has(kind)).toBe(true);
  });
});
