import { describe, expect, it } from "vitest";
import { parseInput, errorPayload, queryObject, ValidationError } from "../src/lib/validation";
import { AccessError } from "../src/lib/accounts";
import { approvalDecisionSchema, approvalListQuerySchema, chatSchema, metatronControlSchema, missionStartSchema, permissionSchema, accountCreateSchema, studioDraftSchema } from "../src/shared/schemas";

describe("shared zod validation", () => {
  it("rejects non-string chat message with a 400 ValidationError instead of a TypeError", () => {
    let err: unknown;
    try { parseInput(chatSchema, { message: 42 }); } catch (e) { err = e; }
    expect(err).toBeInstanceOf(ValidationError);
    expect(err).toBeInstanceOf(AccessError);
    expect((err as ValidationError).status).toBe(400);
    expect(errorPayload(err, "x")).toMatchObject({ code: "invalid_input", issues: [{ path: "message" }] });
  });
  it("requires projectId for missions and trims", () => {
    expect(() => parseInput(missionStartSchema, { message: "go" })).toThrow(/projectId/);
    expect(parseInput(missionStartSchema, { message: "  go ", projectId: "p" }).message).toBe("go");
  });
  it("keeps the legacy decision message", () => {
    expect(() => parseInput(approvalDecisionSchema, { decision: "maybe" })).toThrow("decision должен быть approved или rejected.");
  });
  it("coerces and bounds approval list query", () => {
    const url = new URL("https://x/api/approvals?limit=7&status=pending");
    expect(parseInput(approvalListQuerySchema, queryObject(url))).toMatchObject({ limit: 7, status: "pending" });
    expect(() => parseInput(approvalListQuerySchema, { limit: "9999" })).toThrow(ValidationError);
    expect(() => parseInput(approvalListQuerySchema, { status: "bogus" })).toThrow(ValidationError);
  });
  it("is strict on admin bodies", () => {
    expect(() => parseInput(permissionSchema, { projectId: "p", capability: "root" })).toThrow("Неверное разрешение.");
    expect(() => parseInput(accountCreateSchema, { name: "a", role: "editor", extra: 1 })).toThrow(ValidationError);
  });
  it("requires step for retry_step only", () => {
    expect(() => parseInput(metatronControlSchema, { missionId: "m", action: "retry_step" })).toThrow(ValidationError);
    expect(parseInput(metatronControlSchema, { missionId: "m", action: "pause" }).action).toBe("pause");
  });
  it("validates draft envelope", () => {
    expect(() => parseInput(studioDraftSchema, { baseRevision: -1, values: {} })).toThrow(ValidationError);
    expect(() => parseInput(studioDraftSchema, { baseRevision: 0, values: [] })).toThrow(ValidationError);
  });
  it("plain errors keep {error}", () => {
    expect(errorPayload(new AccessError("nope", 403), "x")).toEqual({ error: "nope" });
  });
});
