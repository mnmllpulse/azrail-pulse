import { describe, it, expect } from "vitest";
import { modelDisplayName, providerFromSlug, providerIconPath, isChatCapableModel, groupModelsByProvider, modelRecencyScore } from "../ui/model-display";

describe("model display: short label + icon, full slug stays in code", () => {
  it("formats Cloudflare-dashboard style short names", () => {
    expect(modelDisplayName("@cf/alibaba/wan-3.0")).toBe("WAN 3.0");
    expect(modelDisplayName("openai/gpt-6-luna")).toBe("GPT-6 Luna");
    expect(modelDisplayName("@cf/meta/llama-3.3-70b-instruct-fp8-fast")).toBe("Llama 3.3 70B Fast");
    expect(modelDisplayName("@cf/deepseek-ai/deepseek-v4-flash-0731")).toBe("DeepSeek V4 Flash");
  });

  it("keeps provider icons for Alibaba / Qwen / Meta / Anthropic", () => {
    expect(providerFromSlug("@cf/alibaba/wan-3.0")).toBe("Alibaba");
    expect(providerIconPath("Alibaba")).toBe("/icons/alibaba.svg");
    expect(providerIconPath(providerFromSlug("@cf/meta/llama-3.3-70b-instruct-fp8-fast"))).toBe("/icons/meta.svg");
    expect(providerIconPath(providerFromSlug("anthropic/claude-fable-5.1"))).toBe("/icons/anthropic.svg");
    expect(providerIconPath("Cloudflare")).toBe("/icons/cloudflare.svg");
  });

  it("treats chat/instruct models as chat-capable and excludes pure image models", () => {
    expect(isChatCapableModel({ slug: "@cf/meta/llama-3.3-70b-instruct-fp8-fast", task: "text-generation" })).toBe(true);
    expect(isChatCapableModel({ slug: "@cf/black-forest-labs/flux-1-schnell", task: "text-to-image" })).toBe(false);
  });

  it("groups providers and sorts newest models first inside a group", () => {
    const groups = groupModelsByProvider([
      { slug: "@cf/openai/gpt-oss-20b", provider: "OpenAI" },
      { slug: "openai/gpt-6-luna", provider: "OpenAI" },
      { slug: "@cf/meta/llama-3.2-3b-instruct", provider: "Meta" },
      { slug: "@cf/meta/llama-4-scout-17b-16e-instruct", provider: "Meta" },
    ]);
    expect(groups.map((g) => g.provider)).toEqual(["OpenAI", "Meta"]);
    expect(groups[0]?.models[0]?.slug).toBe("openai/gpt-6-luna");
    expect(modelRecencyScore("@cf/meta/llama-4-scout-17b-16e-instruct")).toBeGreaterThan(modelRecencyScore("@cf/meta/llama-3.2-3b-instruct"));
  });
});
