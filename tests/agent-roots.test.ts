// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from "vitest";
import { activeRootField, pickActive, readActiveRoot, saveActiveRoot } from "../ui/agent-roots";

const roots = [{ name: "app", path: "C:\\app" }, { name: "docs", path: "C:\\docs" }];

describe("активная папка агента", () => {
  beforeEach(() => localStorage.clear());
  it("по умолчанию поле root не добавляется", () => {
    expect(readActiveRoot()).toBe("");
    expect(activeRootField()).toEqual({});
  });
  it("сохранённое имя попадает в задачи, пустое сбрасывает", () => {
    saveActiveRoot("docs");
    expect(activeRootField()).toEqual({ root: "docs" });
    saveActiveRoot("");
    expect(activeRootField()).toEqual({});
  });
  it("pickActive: выбранная, иначе первая, иначе null", () => {
    expect(pickActive(roots, "docs")?.path).toBe("C:\\docs");
    expect(pickActive(roots, "gone")?.name).toBe("app");
    expect(pickActive([], "docs")).toBeNull();
  });
});
