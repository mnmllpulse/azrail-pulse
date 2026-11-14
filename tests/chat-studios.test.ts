import { describe, expect, it } from "vitest";
import { audioSummary, dataSummary, ledgerSummary, pulseSummary, studioIntent } from "../ui/chat-studios";
import { parseDataset } from "../ui/data";

describe("студии в чате: намерение", () => {
  it("расходы и состояние системы", () => {
    expect(studioIntent("сколько я потратил сегодня", [])).toBe("ledger");
    expect(studioIntent("покажи расходы", [])).toBe("ledger");
    expect(studioIntent("какое состояние системы?", [])).toBe("pulse");
  });
  it("файл + просьба разобрать", () => {
    expect(studioIntent("проанализируй таблицу", [{ name: "sales.csv" }])).toBe("data");
    expect(studioIntent("разбери трек", [{ name: "mix.wav" }])).toBe("audio");
    expect(studioIntent("проанализируй", [{ name: "doc.pdf" }])).toBeNull();
  });
  it("обычная речь и заказы остаются в чате", () => {
    expect(studioIntent("привет", [])).toBeNull();
    expect(studioIntent("напиши отчёт о расходах компании на маркетинг", [])).toBeNull();
    expect(studioIntent("проанализируй код", [])).toBeNull();
  });
});

describe("студии в чате: тексты", () => {
  it("таблица данных", () => {
    const text = dataSummary("a.csv", parseDataset("name,qty\nx,1\ny,3\ny,\n").analysis);
    expect(text).toContain("3 строк");
    expect(text).toContain("| qty | number |");
  });
  it("расходы", () => {
    const text = ledgerSummary({ overview: { todaySpendMicroUsd: 12_345, budget: { limitMicroUsd: 500_000, committedMicroUsd: 1000, scopeLabel: "день" } }, metrics: { calls: 7, errors: 1 }, anomalies: [] });
    expect(text).toContain("$0.01");
    expect(text).toContain("Аномалий нет.");
  });
  it("состояние системы показывает только проблемы", () => {
    const text = pulseSummary({ overall: "warning", sections: [{ title: "AI", items: [{ label: "лимит", value: "90%", status: "warning" }, { label: "ключ", value: "ok", status: "healthy" }] }] });
    expect(text).toContain("1/2 в норме");
    expect(text).toContain("- лимит: 90% (warning)");
    expect(text).not.toContain("ключ:");
  });
  it("аудио", () => {
    const text = audioSummary("m.wav", { durationSeconds: 125, sampleRate: 44100, channels: 2, integratedLufs: -9.04, peakDbFS: -0.2, truePeakDbTP: 0.1, loudnessRangeLu: 5, clippedSamplePercent: 0, silencePercent: 1, stereoWidthPercent: 40, bpm: 124, detectedKey: "A minor", note: "" } as never);
    expect(text).toContain("2:05");
    expect(text).toContain("-9 LUFS");
    expect(text).toContain("A minor");
  });
});
