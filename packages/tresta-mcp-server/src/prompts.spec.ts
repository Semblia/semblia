import { describe, expect, it, vi } from "vitest";
import { registerTrestaPrompts, TRESTA_PROMPT_NAMES } from "./prompts.js";

describe("registerTrestaPrompts", () => {
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

    registerTrestaPrompts(server as never);

    expect([...prompts.keys()]).toEqual(TRESTA_PROMPT_NAMES);

    const prompt = prompts
      .get("review_recent_feedback")
      ?.callback({ slug: "demo", limit: 10 });

    expect(JSON.stringify(prompt)).toContain("tresta_list_responses");
    expect(JSON.stringify(prompt)).toContain("demo");
  });
});
