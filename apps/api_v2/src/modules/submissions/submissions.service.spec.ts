import {
  ModerationStatus,
  PublicSubmitTrustMode,
} from "@workspace/database/prisma";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProjectActionAuditService } from "../../common/audit/project-action-audit.service.js";
import type { ActorContext } from "../../common/authz/actor-context.js";
import type { NotificationsService } from "../notifications/notifications.service.js";
import type { PrismaService } from "../prisma/prisma.service.js";
import { SubmissionsService } from "./submissions.service.js";

const mockTransaction = vi.fn();
const mockSubmissionCount = vi.fn();
const mockSubmissionFindMany = vi.fn();
const mockSubmissionFindFirst = vi.fn();
const mockSubmissionUpdate = vi.fn();
const mockAnnotationCreate = vi.fn();
const mockActionAuditCreate = vi.fn();
const mockCreateForProjectReviewers = vi.fn();

const prismaMock = {
  client: {
    $transaction: mockTransaction,
    collectionFormSubmission: {
      count: mockSubmissionCount,
      findMany: mockSubmissionFindMany,
      findFirst: mockSubmissionFindFirst,
      update: mockSubmissionUpdate,
    },
    collectionFormSubmissionAnnotation: {
      create: mockAnnotationCreate,
    },
    projectActionAudit: {
      create: mockActionAuditCreate,
    },
  },
} as unknown as PrismaService;

const notificationsServiceMock = {
  createForProjectReviewers: mockCreateForProjectReviewers,
} as unknown as NotificationsService;

const agentActor: ActorContext = {
  actorType: "agent_key",
  userId: "user_1",
  projectId: "project_1",
  credentialId: "agent_key_1",
  scopes: ["submissions:annotate", "submissions:moderate"],
  clerkOrgPermissions: [],
};

function makeSubmission(overrides: Record<string, unknown> = {}) {
  return {
    id: "submission_1",
    projectId: "project_1",
    formId: "form_1",
    trustMode: PublicSubmitTrustMode.HMAC,
    idempotencyKey: "idem_1",
    payloadHash: "hash_1",
    answers: { quote: "Original words" },
    ratingValue: 9,
    ratingScale: 10,
    moderationStatus: ModerationStatus.PENDING,
    moderationReason: null,
    moderatedByActorType: null,
    moderatedByActorId: null,
    moderatedAt: null,
    metadata: null,
    createdAt: new Date("2026-05-08T00:00:00.000Z"),
    updatedAt: new Date("2026-05-08T00:00:00.000Z"),
    collectionForm: {
      id: "form_1",
      name: "Default Form",
    },
    annotations: [],
    moderationRuns: [],
    ...overrides,
  };
}

describe("SubmissionsService", () => {
  let service: SubmissionsService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockTransaction.mockImplementation(
      async (callback: (tx: unknown) => Promise<unknown>) =>
        callback(prismaMock.client),
    );
    service = new SubmissionsService(
      prismaMock,
      new ProjectActionAuditService(prismaMock),
      notificationsServiceMock,
    );
  });

  it("lets an agent annotate a submission without mutating source answers", async () => {
    mockSubmissionFindFirst.mockResolvedValue(makeSubmission());
    mockAnnotationCreate.mockResolvedValue({
      id: "annotation_1",
      projectId: "project_1",
      submissionId: "submission_1",
      actorType: "agent_key",
      actorId: "agent_key_1",
      note: "Strong candidate",
      labels: ["candidate"],
      sentiment: "positive",
      metadata: { confidence: 0.8 },
      createdAt: new Date("2026-05-08T00:00:00.000Z"),
      updatedAt: new Date("2026-05-08T00:00:00.000Z"),
    });

    await service.createAnnotation(
      { slug: "acme", submissionId: "submission_1" },
      {
        note: "Strong candidate",
        labels: ["candidate"],
        sentiment: "positive",
        metadata: { confidence: 0.8 },
      },
      { projectAccess: { projectId: "project_1" } },
      agentActor,
    );

    expect(mockAnnotationCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          actorType: "agent_key",
          actorId: "agent_key_1",
          note: "Strong candidate",
        }),
      }),
    );
    expect(mockSubmissionUpdate).not.toHaveBeenCalled();
    expect(mockActionAuditCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "submission.annotated",
          credentialId: "agent_key_1",
        }),
      }),
    );
  });

  it("lists safe moderation run summaries without raw provider output", async () => {
    mockSubmissionCount.mockResolvedValue(1);
    mockSubmissionFindMany.mockResolvedValue([
      makeSubmission({
        moderationRuns: [
          {
            id: "run_1",
            artifactType: "IMAGE",
            provider: "aws-rekognition",
            providerOperation: "DetectModerationLabels",
            status: "SUCCEEDED",
            decision: "REVIEW",
            score: 0.82,
            flags: ["violence"],
            categories: { violence: 0.82 },
            errorCode: null,
            errorMessage: null,
            rawResult: { private: true },
            providerJobId: "aws-job-1",
            createdAt: new Date("2026-06-01T10:00:00.000Z"),
            completedAt: new Date("2026-06-01T10:01:00.000Z"),
          },
        ],
      }),
    ]);

    const result = await service.list(
      { status: "ALL", page: 1, pageSize: 10 },
      { projectAccess: { projectId: "project_1" } },
    );

    expect(mockSubmissionFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({
          moderationRuns: expect.objectContaining({
            orderBy: { createdAt: "desc" },
            take: 10,
            select: expect.not.objectContaining({
              rawResult: true,
              providerJobId: true,
            }),
          }),
        }),
      }),
    );
    const item = result.items[0];
    expect(item).toBeDefined();
    if (!item) {
      throw new Error("Expected one submission item");
    }
    expect(item.moderationRuns).toEqual([
      {
        id: "run_1",
        artifactType: "IMAGE",
        provider: "aws-rekognition",
        providerOperation: "DetectModerationLabels",
        status: "SUCCEEDED",
        decision: "REVIEW",
        score: 0.82,
        flags: ["violence"],
        categories: { violence: 0.82 },
        reason: null,
        createdAt: "2026-06-01T10:00:00.000Z",
        completedAt: "2026-06-01T10:01:00.000Z",
      },
    ]);
    const run = item.moderationRuns[0];
    expect(run).toBeDefined();
    expect(run).not.toHaveProperty("rawResult");
    expect(run).not.toHaveProperty("providerJobId");
  });

  it("moderates submissions without changing source fields", async () => {
    mockSubmissionFindFirst.mockResolvedValue(makeSubmission());
    mockSubmissionUpdate.mockResolvedValue(
      makeSubmission({
        moderationStatus: ModerationStatus.FLAGGED,
        moderationReason: "Needs human review",
      }),
    );

    await service.moderate(
      { slug: "acme", submissionId: "submission_1" },
      {
        status: "FLAGGED",
        reason: "Needs human review",
      },
      { projectAccess: { projectId: "project_1" } },
      agentActor,
    );

    expect(mockSubmissionUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.not.objectContaining({
          answers: expect.anything(),
          ratingValue: expect.anything(),
          ratingScale: expect.anything(),
        }),
      }),
    );
    expect(mockSubmissionUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          moderationStatus: ModerationStatus.FLAGGED,
          moderatedByActorType: "agent_key",
          moderatedByActorId: "agent_key_1",
        }),
      }),
    );
    expect(mockActionAuditCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "submission.moderated",
          targetId: "submission_1",
        }),
      }),
    );
    expect(mockCreateForProjectReviewers).toHaveBeenCalledWith(
      "project_1",
      expect.objectContaining({
        type: "SUBMISSION_MODERATED",
        link: "/projects/acme/submissions/submission_1",
        metadata: expect.objectContaining({
          projectId: "project_1",
          submissionId: "submission_1",
          status: ModerationStatus.FLAGGED,
        }),
      }),
      { excludeUserIds: ["user_1"] },
      expect.any(Object),
    );
    expect(mockCreateForProjectReviewers).toHaveBeenCalledWith(
      "project_1",
      expect.objectContaining({
        type: "SUBMISSION_FLAGGED",
        link: "/projects/acme/submissions/submission_1",
        metadata: expect.objectContaining({
          projectId: "project_1",
          submissionId: "submission_1",
        }),
      }),
      { excludeUserIds: ["user_1"] },
      expect.any(Object),
    );
  });
});
