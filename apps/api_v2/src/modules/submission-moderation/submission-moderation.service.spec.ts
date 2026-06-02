import { describe, expect, it, vi } from "vitest";
import {
  ModerationStatus,
  PublicSubmitTrustMode,
  SubmissionModerationArtifactType,
  SubmissionModerationRunStatus,
} from "@workspace/database/prisma";
import type { PrismaService } from "../prisma/prisma.service.js";
import {
  MODERATION_OPERATION_NOOP,
  MODERATION_PROVIDER_LOCAL,
} from "./submission-moderation.constants.js";
import { SubmissionModerationService } from "./submission-moderation.service.js";

function makeService(options: {
  prisma: unknown;
  config?: Record<string, unknown>;
  queue?: { add: ReturnType<typeof vi.fn> };
}) {
  const config = {
    get: vi.fn((key: string) => options.config?.[key]),
  };
  return new SubmissionModerationService(
    options.prisma as PrismaService,
    config as never,
    (options.queue ?? { add: vi.fn() }) as never,
    { moderateText: vi.fn() } as never,
    { moderateImage: vi.fn(), startVideoModeration: vi.fn() } as never,
    { startTranscription: vi.fn() } as never,
    { moderate: vi.fn(async () => ({
      provider: MODERATION_PROVIDER_LOCAL,
      providerOperation: MODERATION_OPERATION_NOOP,
      score: 0,
      flags: [],
      categories: {},
      rawResult: { disabled: true },
    })) } as never,
  );
}

function makeSubmission() {
  return {
    id: "sub_1",
    projectId: "project_1",
    formId: "form_1",
    trustMode: PublicSubmitTrustMode.HMAC,
    answers: {
      content: "Loved it",
      author: { name: "Ada" },
    },
    moderationStatus: ModerationStatus.PENDING,
    moderatedAt: null,
    moderatedByActorType: null,
    project: {
      autoModeration: true,
      autoApproveVerified: false,
    },
    mediaAssets: [],
  };
}

describe("SubmissionModerationService", () => {
  it("creates a durable text run and deterministic queue job", async () => {
    const queue = { add: vi.fn() };
    const createdRun = {
      id: "run_1",
      submissionId: "sub_1",
      artifactType: SubmissionModerationArtifactType.TEXT,
      status: SubmissionModerationRunStatus.ENQUEUED,
    };
    const prisma = {
      client: {
        collectionFormSubmission: {
          findUnique: vi.fn(async () => makeSubmission()),
        },
        submissionModerationRun: {
          create: vi.fn(async () => createdRun),
        },
      },
    };
    const service = makeService({ prisma, queue });

    await expect(
      service.enqueueSubmission({ submissionId: "sub_1" }),
    ).resolves.toEqual([createdRun]);

    expect(prisma.client.submissionModerationRun.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        projectId: "project_1",
        submissionId: "sub_1",
        artifactType: "TEXT",
        provider: "local",
        providerOperation: "noop",
        status: "ENQUEUED",
      }),
    });
    expect(queue.add).toHaveBeenCalledWith(
      "submission-moderation",
      { runId: "run_1" },
      expect.objectContaining({
        jobId: "submission-moderation:run_1",
        attempts: 3,
      }),
    );
  });

  it("creates suppressed runs when the AWS budget gate is zero", async () => {
    const queue = { add: vi.fn() };
    const suppressedRun = {
      id: "run_suppressed",
      status: SubmissionModerationRunStatus.SUPPRESSED,
    };
    const prisma = {
      client: {
        collectionFormSubmission: {
          findUnique: vi.fn(async () => makeSubmission()),
        },
        submissionModerationRun: {
          create: vi.fn(async () => suppressedRun),
        },
      },
    };
    const service = makeService({
      prisma,
      queue,
      config: {
        MODERATION_AWS_ENABLED: true,
        MODERATION_AWS_DAILY_BUDGET_CENTS: 0,
        MODERATION_AWS_MONTHLY_BUDGET_CENTS: 5000,
      },
    });

    await expect(
      service.enqueueSubmission({ submissionId: "sub_1" }),
    ).resolves.toEqual([suppressedRun]);

    expect(prisma.client.submissionModerationRun.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        provider: "aws-comprehend",
        providerOperation: "DetectToxicContent",
        status: "SUPPRESSED",
        errorCode: "BUDGET_SUPPRESSED",
      }),
    });
    expect(queue.add).not.toHaveBeenCalled();
  });

  it("processes local noop runs and reconciles pending submissions conservatively", async () => {
    const now = new Date("2026-06-02T12:00:00.000Z");
    vi.useFakeTimers();
    vi.setSystemTime(now);
    const run = {
      id: "run_1",
      projectId: "project_1",
      submissionId: "sub_1",
      mediaAssetId: null,
      artifactType: SubmissionModerationArtifactType.TEXT,
      artifactHash: "hash",
      provider: "local",
      providerOperation: "noop",
      status: SubmissionModerationRunStatus.ENQUEUED,
      submission: makeSubmission(),
      mediaAsset: null,
    };
    const prisma = {
      client: {
        submissionModerationRun: {
          findUnique: vi.fn(async () => run),
          update: vi.fn(async ({ data }) => ({ ...run, ...data })),
        },
        collectionFormSubmission: {
          update: vi.fn(() => Promise.resolve({})),
        },
        $transaction: vi.fn(async (operations) => Promise.all(operations)),
      },
    };
    const service = makeService({ prisma });

    await service.processRun("run_1");

    expect(prisma.client.submissionModerationRun.update).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: { id: "run_1" },
        data: expect.objectContaining({
          status: "SUCCEEDED",
          decision: "APPROVE",
          score: 0,
          flags: [],
          completedAt: now,
        }),
      }),
    );
    expect(prisma.client.collectionFormSubmission.update).toHaveBeenCalledWith({
      where: { id: "sub_1" },
      data: {
        moderationStatus: "PENDING",
        moderationReason: "Submission passed provider moderation checks.",
      },
    });
    vi.useRealTimers();
  });
});
