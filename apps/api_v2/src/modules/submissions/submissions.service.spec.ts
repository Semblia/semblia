import { ModerationStatus, PublicSubmitTrustMode } from "@workspace/database/prisma";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProjectActionAuditService } from "../../common/audit/project-action-audit.service.js";
import type { ActorContext } from "../../common/authz/actor-context.js";
import type { PrismaService } from "../prisma/prisma.service.js";
import { SubmissionsService } from "./submissions.service.js";

const mockTransaction = vi.fn();
const mockSubmissionCount = vi.fn();
const mockSubmissionFindMany = vi.fn();
const mockSubmissionFindFirst = vi.fn();
const mockSubmissionUpdate = vi.fn();
const mockAnnotationCreate = vi.fn();
const mockTestimonialUpdate = vi.fn();
const mockActionAuditCreate = vi.fn();

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
    testimonial: {
      update: mockTestimonialUpdate,
    },
    projectActionAudit: {
      create: mockActionAuditCreate,
    },
  },
} as unknown as PrismaService;

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
    testimonialId: "testimonial_1",
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
    testimonial: {
      id: "testimonial_1",
      authorName: "Ava",
      authorRole: null,
      authorCompany: null,
      content: "Original words",
      rating: 5,
      isPublished: true,
      moderationStatus: ModerationStatus.PENDING,
      createdAt: new Date("2026-05-08T00:00:00.000Z"),
      updatedAt: new Date("2026-05-08T00:00:00.000Z"),
    },
    annotations: [],
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
    );
  });

  it("lets an agent annotate a submission without mutating source answers", async () => {
    mockSubmissionFindFirst.mockResolvedValue(makeSubmission());
    mockAnnotationCreate.mockResolvedValue({
      id: "annotation_1",
      projectId: "project_1",
      submissionId: "submission_1",
      testimonialId: "testimonial_1",
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

  it("moderates linked submissions and unpublishes flagged testimonials without changing source fields", async () => {
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
    expect(mockTestimonialUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "testimonial_1" },
        data: expect.objectContaining({
          moderationStatus: ModerationStatus.FLAGGED,
          isApproved: false,
          isPublished: false,
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
  });
});
