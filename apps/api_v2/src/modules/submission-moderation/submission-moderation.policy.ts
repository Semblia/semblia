import type {
  ModerationInput,
  ModerationPolicyResult,
} from "./submission-moderation.types.js";

const severeFlags = new Set([
  "explicit_nudity",
  "sexual_activity",
  "hate_symbol",
  "violence_or_threat",
  "graphic",
  "self_harm",
]);

export function normalizeAwsModerationLabel(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function resolveModerationDecision(
  input: ModerationInput,
): ModerationPolicyResult {
  if (input.existingStatus === "REJECTED") {
    return {
      decision: "REJECT",
      reviewStatus: "REJECTED",
      reason: "Submission was already rejected by a reviewer.",
      score: input.score,
      flags: input.flags,
    };
  }

  const hasSevereFlag = input.flags.some((flag) => severeFlags.has(flag));

  if (hasSevereFlag && input.score >= 0.92) {
    return {
      decision: "REVIEW",
      reviewStatus: "PENDING",
      reason: "Provider detected high-confidence severe content.",
      score: input.score,
      flags: input.flags,
    };
  }

  if (input.score >= 0.68 || input.flags.length > 0) {
    return {
      decision: "REVIEW",
      reviewStatus: "PENDING",
      reason: "Provider detected content that needs human review.",
      score: input.score,
      flags: input.flags,
    };
  }

  if (input.verifiedTrust && input.autoApproveVerified) {
    return {
      decision: "APPROVE",
      reviewStatus: "APPROVED",
      reason: "Verified submission passed moderation checks.",
      score: input.score,
      flags: input.flags,
    };
  }

  return {
    decision: "APPROVE",
    reviewStatus: input.existingStatus === "APPROVED" ? "APPROVED" : "PENDING",
    reason: "Submission passed provider moderation checks.",
    score: input.score,
    flags: input.flags,
  };
}
