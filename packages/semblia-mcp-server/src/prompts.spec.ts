import { describe, expect, it, vi } from "vitest";
import { registerSembliaPrompts, SEMBLIA_PROMPT_NAMES } from "./prompts.js";

describe("registerSembliaPrompts", () => {
  it("registers the initial Task 6 feedback-operation prompts", () => {
    const prompts = new Map<
      string,
      { config: unknown; callback: (args: Record<string, unknown>) => unknown }
    >();
    const server = {
      registerPrompt: vi.fn(
        (name: string, config: unknown, callback: never) => {
          prompts.set(name, { config, callback });
        },
      ),
    };

    registerSembliaPrompts(server as never);

    expect([...prompts.keys()]).toEqual(SEMBLIA_PROMPT_NAMES);

    const prompt = prompts
      .get("review_recent_feedback")
      ?.callback({ slug: "demo", limit: 10 });

    expect(JSON.stringify(prompt)).toContain("semblia_list_responses");
    expect(JSON.stringify(prompt)).toContain("demo");
  });
});
