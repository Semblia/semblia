import { describe, expect, it, vi } from "vitest";
import { Prisma } from "@workspace/database/prisma";

import { IMPORT_SOURCE_CATALOG } from "./import-source-catalog.js";
import {
  createManualImportBodySchema,
  createPublicImportBodySchema,
} from "./imports.dto.js";
import {
  candidateIdentityHash,
  candidateToResponseData,
  normalizeImportCandidate,
} from "./import-normalization.js";
import {
  IMPORT_JOB_STALE_AFTER_MS,
  ImportsService,
} from "./imports.service.js";
import {
  IMPORT_QUEUE_DISPATCH_PENDING,
  ImportQueueDispatcher,
} from "./import-queue-dispatcher.js";

describe("imports", () => {
  it("exposes honest catalog availability", () => {
    expect(
      IMPORT_SOURCE_CATALOG.find((source) => source.key === "threads"),
    ).toMatchObject({
      availability: "MANUAL_ONLY",
      reasonCode: "PUBLIC_AUTOMATION_NOT_APPROVED",
    });
  });

  it("has explicit hosts for every public automation source", () => {
    expect(IMPORT_SOURCE_CATALOG).toHaveLength(54);
    for (const source of IMPORT_SOURCE_CATALOG) {
      if (
        source.modes.includes("PUBLIC_URL") ||
        source.modes.includes("MIGRATION")
      ) {
        expect(source.publicHosts.length).toBeGreaterThan(0);
      }
      if (source.availability === "MANUAL_ONLY")
        expect(source.reasonCode).toBeTruthy();
    }
  });

  it("publishes the exact approved catalog contract", () => {
    expect(
      IMPORT_SOURCE_CATALOG.map((source) => ({
        key: source.key,
        label: source.label,
        availability: source.availability,
        modes: source.modes,
        reasonCode: source.reasonCode,
        reason: source.reason,
        publicHosts: source.publicHosts,
        publicHostSuffixes: source.publicHostSuffixes,
      })),
    ).toEqual(EXPECTED_CATALOG);
  });

  it("requires bounded manual proof and rights confirmation", () => {
    expect(
      createManualImportBodySchema.safeParse({
        text: "Good",
        rightsConfirmed: false,
      }).success,
    ).toBe(false);
    expect(
      createManualImportBodySchema.safeParse({
        text: "Good",
        rightsConfirmed: true,
      }).success,
    ).toBe(true);
  });

  it("requires a public source, URL, and rights confirmation", () => {
    expect(
      createPublicImportBodySchema.safeParse({
        sourceKey: "wordpress",
        sourceUrl: "https://customer.wordpress.com/wp-json/wp/v2/comments",
        rightsConfirmed: true,
      }).success,
    ).toBe(true);
    expect(
      createPublicImportBodySchema.safeParse({
        sourceKey: "wordpress",
        sourceUrl: "file:///private",
        rightsConfirmed: true,
      }).success,
    ).toBe(false);
    expect(
      createPublicImportBodySchema.safeParse({
        sourceKey: "wordpress",
        sourceUrl: "https://customer.wordpress.com/wp-json/wp/v2/comments",
        rightsConfirmed: false,
      }).success,
    ).toBe(false);
  });

  it("rejects unsafe manual DTO values", () => {
    expect(
      createManualImportBodySchema.safeParse({
        text: "Good",
        rightsConfirmed: true,
        sourceUrl: "file:///secret",
      }).success,
    ).toBe(false);
    expect(
      createManualImportBodySchema.safeParse({
        text: "Good",
        rightsConfirmed: true,
        ratingValue: 5,
        ratingScale: 3,
      }).success,
    ).toBe(false);
    expect(
      createManualImportBodySchema.safeParse({
        text: "x".repeat(10_001),
        rightsConfirmed: true,
      }).success,
    ).toBe(false);
    expect(
      createManualImportBodySchema.safeParse({
        text: "Good",
        rightsConfirmed: true,
        sourceUrl: "https://user:password@example.com/proof",
      }).success,
    ).toBe(false);
    expect(
      createManualImportBodySchema.parse({
        text: "Good",
        rightsConfirmed: true,
        sourceUrl:
          "https://example.com/proof?AWSAccessKeyId=secret&sig=value#fragment",
      }).sourceUrl,
    ).toBe("https://example.com/proof");
    expect(
      createManualImportBodySchema.parse({
        text: "Good",
        rightsConfirmed: true,
        sourceUrl:
          "https://example.com/proof?AWSAccessKeyId=secret&sv=2024&se=tomorrow&sp=rw&auth=secret#private-fragment",
      }).sourceUrl,
    ).toBe("https://example.com/proof");
  });

  it("normalizes stable imported response data", () => {
    const candidate = normalizeImportCandidate({
      externalId: " ext ",
      sourceUrl: "https://example.com/p",
      sourceCreatedAt: "2999-01-01T00:00:00.000Z",
      text: " Proof ",
      ratingValue: 99,
      ratingScale: 5,
      authorName: " Ada ",
      authorRole: null,
      authorCompany: null,
      tags: ["one", "one"],
    });
    const data = candidateToResponseData(
      "project",
      "manual",
      "job",
      candidate,
      true,
    );
    expect(candidateIdentityHash("manual", candidate)).toHaveLength(64);
    expect(data).toMatchObject({
      origin: "IMPORT",
      trustMode: "IMPORT",
      formId: null,
      versionId: null,
      reviewStatus: "PENDING",
      publishStatus: "PRIVATE",
      consent: { canPublishText: true },
    });
    expect(data.answers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fieldId: "import-primary-text",
          type: "longText",
          role: "primaryText",
          publishable: true,
        }),
      ]),
    );
    expect(candidate.sourceCreatedAt).toBeNull();
    expect(candidate.ratingValue).toBe(5);
  });

  it("rejects provider URL credentials and strips every query and fragment", () => {
    expect(() =>
      normalizeImportCandidate({
        ...candidate(),
        sourceUrl: "https://user:password@example.com/proof",
      }),
    ).toThrow("source URL is invalid");
    expect(
      normalizeImportCandidate({
        ...candidate(),
        sourceUrl:
          "https://example.com/proof?x-GoOg-Signature=secret&sv=2024&sp=rw&auth=secret&password=secret#private-fragment",
      }).sourceUrl,
    ).toBe("https://example.com/proof");
  });

  it("retains only source-specific public identity parameters", () => {
    expect(
      normalizeImportCandidate(
        {
          ...candidate(),
          sourceUrl:
            "https://play.google.com/store/apps/details?id=com.example&utm_source=ad#reviews",
        },
        "google-play",
      ).sourceUrl,
    ).toBe("https://play.google.com/store/apps/details?id=com.example");
    expect(() =>
      normalizeImportCandidate(
        {
          ...candidate(),
          sourceUrl:
            "https://play.google.com/store/apps/details?id=com.example&token=secret",
        },
        "google-play",
      ),
    ).toThrow("Public import source URL is not allowed");
  });

  it("freezes catalog records and their policies", () => {
    expect(Object.isFrozen(IMPORT_SOURCE_CATALOG)).toBe(true);
    expect(Object.isFrozen(IMPORT_SOURCE_CATALOG[0]!)).toBe(true);
    expect(Object.isFrozen(IMPORT_SOURCE_CATALOG[0]!.modes)).toBe(true);
    expect(Object.isFrozen(IMPORT_SOURCE_CATALOG[0]!.publicHostSuffixes)).toBe(
      true,
    );
  });

  it("queues only job identity after the transaction resolves", async () => {
    const events: string[] = [];
    const add = vi.fn(async (_name, payload, options) => {
      events.push("queue");
      expect(payload).toEqual({ jobId: "job_1" });
      expect(options).toEqual({
        jobId: "import-job_1",
        attempts: 3,
        backoff: { type: "exponential", delay: 30_000 },
        removeOnComplete: true,
        removeOnFail: false,
      });
    });
    const tx = {
      importJob: {
        create: vi.fn(async () => ({
          id: "job_1",
          projectId: "project",
          mode: "MANUAL",
          sourceKey: "manual",
        })),
      },
      projectActionAudit: { create: vi.fn(async () => undefined) },
    };
    const prisma = {
      client: {
        $transaction: async (callback: (writer: typeof tx) => unknown) => {
          events.push("transaction");
          return callback(tx);
        },
      },
    };
    const service = new ImportsService(
      prisma as never,
      { add } as never,
      {
        recordWith: async (_tx: unknown, input: unknown) => {
          events.push("audit");
          expect(input).toEqual({
            projectId: "project",
            actor: null,
            action: "import.job.created",
            targetType: "import_job",
            targetId: "job_1",
            metadata: { mode: "MANUAL", sourceKey: "manual" },
          });
        },
      } as never,
      {} as never,
    );
    await service.createManualImport(
      "project",
      {
        text: "Proof",
        rightsConfirmed: true,
        sourceKey: "manual",
        sourceUrl:
          "https://example.com/proof?AWSAccessKeyId=secret&sv=2024&auth=secret#private-fragment",
      },
      null,
    );
    expect(events).toEqual(["transaction", "audit", "queue"]);
    expect(tx.importJob.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          config: expect.objectContaining({
            candidate: expect.objectContaining({
              sourceUrl: "https://example.com/proof",
            }),
          }),
        }),
      }),
    );
  });

  it("accepts the durable job and marks dispatch pending when Redis is down", async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const tx = {
      importJob: {
        create: vi.fn().mockResolvedValue({
          id: "job_1",
          projectId: "project_1",
          mode: "MANUAL",
          sourceKey: "manual",
        }),
      },
    };
    const service = new ImportsService(
      {
        client: {
          $transaction: async (callback: (writer: typeof tx) => unknown) =>
            callback(tx),
          importJob: { updateMany },
        },
      } as never,
      { add: vi.fn().mockRejectedValue(new Error("redis down")) } as never,
      { recordWith: vi.fn() } as never,
      {} as never,
    );

    await expect(
      service.createManualImport(
        "project_1",
        { sourceKey: "manual", text: "Proof", rightsConfirmed: true },
        null,
      ),
    ).resolves.toMatchObject({ id: "job_1" });
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: "job_1", status: "QUEUED" },
      data: {
        errorCode: IMPORT_QUEUE_DISPATCH_PENDING,
        errorMessage: "Import is queued for dispatch retry.",
      },
    });
  });

  it("reconciles bounded queued jobs with deterministic duplicate-safe IDs", async () => {
    const add = vi.fn().mockResolvedValue({ id: "import-job_1" });
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const findMany = vi
      .fn()
      .mockResolvedValue([{ id: "job_1" }, { id: "job_2" }]);
    const dispatcher = new ImportQueueDispatcher(
      { client: { importJob: { findMany, updateMany } } } as never,
      { add } as never,
    );

    await expect(dispatcher.reconcileQueuedJobs()).resolves.toEqual({
      scanned: 2,
    });
    expect(findMany).toHaveBeenCalledWith({
      where: { status: "QUEUED" },
      orderBy: { createdAt: "asc" },
      take: 100,
      select: { id: true },
    });
    expect(add).toHaveBeenNthCalledWith(
      1,
      "import",
      { jobId: "job_1" },
      expect.objectContaining({ jobId: "import-job_1" }),
    );
    expect(add).toHaveBeenNthCalledWith(
      2,
      "import",
      { jobId: "job_2" },
      expect.objectContaining({ jobId: "import-job_2" }),
    );
  });

  it("scopes list and detail queries to the requested project and omits config", async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const findFirst = vi.fn().mockResolvedValue({ id: "job_1", items: [] });
    const service = new ImportsService(
      {
        client: {
          importJob: {
            count: vi.fn().mockResolvedValue(0),
            findMany,
            findFirst,
          },
        },
      } as never,
      {} as never,
      {} as never,
      {} as never,
    );
    await service.listJobs("project_1", { page: 2, pageSize: 10 });
    await service.getJob("project_1", "job_1");

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { projectId: "project_1" },
        skip: 10,
        take: 10,
      }),
    );
    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "job_1", projectId: "project_1" },
      }),
    );
    expect(findFirst.mock.calls[0]?.[0].select).not.toHaveProperty("config");
  });

  it("persists identity, response, and item atomically before moderation", async () => {
    const events: string[] = [];
    const tx = {
      formResponse: {
        create: vi.fn(async () => {
          events.push("response");
          return { id: "response_1" };
        }),
      },
      responseImportIdentity: {
        create: vi.fn(async () => {
          events.push("identity");
        }),
      },
      importItem: {
        create: vi.fn(async () => {
          events.push("item");
        }),
      },
    };
    const moderation = {
      enqueueSubmission: vi.fn(async () => {
        events.push("moderation");
      }),
    };
    const service = new ImportsService(
      {
        client: {
          importItem: { findFirst: vi.fn().mockResolvedValue(null) },
          $transaction: async (callback: (writer: typeof tx) => unknown) =>
            callback(tx),
        },
      } as never,
      {} as never,
      {} as never,
      moderation as never,
    );

    await expect(
      service.persistCandidate(
        "job_1",
        "project_1",
        "manual",
        candidate(),
        true,
        0,
      ),
    ).resolves.toBe("IMPORTED");
    expect(events).toEqual(["response", "identity", "item", "moderation"]);
    expect(tx.importItem.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          jobId: "job_1",
          rowIndex: 0,
          result: "IMPORTED",
        }),
      }),
    );
  });

  it("records an identity duplicate without updating the existing response", async () => {
    const uniqueRace = new Prisma.PrismaClientKnownRequestError("identity", {
      code: "P2002",
      clientVersion: "test",
      meta: { target: ["projectId", "sourceKey", "externalIdHash"] },
    });
    const create = vi.fn().mockResolvedValue(undefined);
    const service = new ImportsService(
      {
        client: {
          importItem: { findFirst: vi.fn().mockResolvedValue(null), create },
          $transaction: vi.fn().mockRejectedValue(uniqueRace),
        },
      } as never,
      {} as never,
      {} as never,
      {} as never,
    );

    await expect(
      service.persistCandidate(
        "job_1",
        "project_1",
        "manual",
        candidate(),
        true,
        0,
      ),
    ).resolves.toBe("DUPLICATE");
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ result: "DUPLICATE" }),
      }),
    );
    expect(create.mock.calls[0]?.[0].data).not.toHaveProperty("responseId");
  });

  it("rejects non-deterministic rows and never maps failed items to duplicates", async () => {
    const service = new ImportsService(
      {
        client: {
          importItem: {
            findFirst: vi
              .fn()
              .mockResolvedValue({ result: "FAILED", responseId: null }),
          },
        },
      } as never,
      {} as never,
      {} as never,
      {} as never,
    );
    await expect(
      service.persistCandidate(
        "job_1",
        "project_1",
        "manual",
        candidate(),
        true,
        0,
      ),
    ).rejects.toThrow("not retryable");
    await expect(
      service.persistCandidate(
        "job_1",
        "project_1",
        "manual",
        candidate(),
        true,
        -1,
      ),
    ).rejects.toThrow("row index");
  });

  it("atomically claims queued, failed, or stale running jobs before processing", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-22T00:00:00.000Z"));
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const service = new ImportsService(
      {
        client: {
          importJob: {
            updateMany,
            findUniqueOrThrow: vi.fn().mockResolvedValue({
              id: "job_1",
              projectId: "project_1",
              sourceKey: "manual",
              config: { candidate: candidate(), rightsConfirmed: true },
            }),
            update: vi.fn(),
            findFirst: vi.fn().mockResolvedValue({ id: "job_1", items: [] }),
          },
        },
      } as never,
      {} as never,
      {} as never,
      {} as never,
    );
    vi.spyOn(service, "persistCandidate").mockResolvedValue("IMPORTED");

    await service.process("job_1");

    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "job_1",
          OR: expect.arrayContaining([
            { status: "QUEUED" },
            { status: "FAILED" },
            expect.objectContaining({
              status: "RUNNING",
              startedAt: {
                lt: new Date(
                  new Date("2026-07-22T00:00:00.000Z").valueOf() -
                    IMPORT_JOB_STALE_AFTER_MS,
                ),
              },
            }),
          ]),
        }),
        data: expect.objectContaining({
          status: "RUNNING",
          errorCode: null,
          errorMessage: null,
          completedAt: null,
        }),
      }),
    );
    vi.useRealTimers();
  });

  it("throws for an active running claim so BullMQ retries rather than completing", async () => {
    const service = new ImportsService(
      {
        client: {
          importJob: {
            updateMany: vi.fn().mockResolvedValue({ count: 0 }),
            findUnique: vi.fn().mockResolvedValue({ status: "RUNNING" }),
          },
        },
      } as never,
      {} as never,
      {} as never,
      {} as never,
    );

    await expect(service.process("job_1")).rejects.toThrow("already running");
  });

  it.each([
    ["constraint", ["ImportItem_jobId_rowIndex_key"]],
    ["field array", ["jobId", "rowIndex"]],
  ])(
    "re-reads a concurrently created item for a %s P2002 target",
    async (_shape, target) => {
      const uniqueRace = new Prisma.PrismaClientKnownRequestError("race", {
        code: "P2002",
        clientVersion: "test",
        meta: { target },
      });
      const findFirst = vi
        .fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          result: "IMPORTED",
          responseId: "response_1",
        });
      const service = new ImportsService(
        {
          client: {
            importItem: { findFirst },
            $transaction: vi.fn().mockRejectedValue(uniqueRace),
          },
        } as never,
        {} as never,
        {} as never,
        { enqueueSubmission: vi.fn() } as never,
      );

      await expect(
        service.persistCandidate(
          "job_1",
          "project_1",
          "manual",
          candidate(),
          true,
          0,
        ),
      ).resolves.toBe("IMPORTED");
    },
  );
});

function candidate() {
  return {
    externalId: "external_1",
    sourceUrl: null,
    sourceCreatedAt: null,
    text: "Proof",
    ratingValue: null,
    ratingScale: null,
    authorName: null,
    authorRole: null,
    authorCompany: null,
    tags: [],
  };
}

const SETUP = "Provider OAuth setup and approved scopes are required.";
const MANUAL =
  "Use manual entry or a provider export; automated retrieval is not approved.";
const aliases = (hosts: string[]) => [
  ...new Set(
    hosts.flatMap((host) =>
      host.split(".").length === 2 && !host.startsWith("www.")
        ? [host, `www.${host}`]
        : [host],
    ),
  ),
];
const available = (
  key: string,
  label: string,
  modes: string[],
  publicHosts: string[] = [],
  publicHostSuffixes: string[] = [],
) => ({
  key,
  label,
  availability: "AVAILABLE",
  modes,
  reasonCode: null,
  reason: null,
  publicHosts: aliases(publicHosts),
  publicHostSuffixes,
});
const setup = (key: string, label: string) => ({
  key,
  label,
  availability: "SETUP_REQUIRED",
  modes: ["CONNECTED_API"],
  reasonCode: "PROVIDER_SETUP_REQUIRED",
  reason: SETUP,
  publicHosts: [],
  publicHostSuffixes: [],
});
const manual = (
  key: string,
  label: string,
  reason = MANUAL,
  reasonCode = "PUBLIC_AUTOMATION_NOT_APPROVED",
) => ({
  key,
  label,
  availability: "MANUAL_ONLY",
  modes: ["MANUAL", "SPREADSHEET"],
  reasonCode,
  reason,
  publicHosts: [],
  publicHostSuffixes: [],
});
const bestEffortMigration = (
  key: string,
  label: string,
  publicHosts: string[],
) => ({
  key,
  label,
  availability: "AVAILABLE",
  modes: ["MIGRATION", "SPREADSHEET"],
  reasonCode: "DOCUMENTED_PUBLIC_PAGE_ONLY",
  reason:
    "Use a documented public wall or embed URL. If its public shape is unsupported, upload the provider export instead.",
  publicHosts: aliases(publicHosts),
  publicHostSuffixes: [],
});
const EXPECTED_CATALOG = [
  available("spreadsheet", "CSV, XLS, XLSX", ["SPREADSHEET"]),
  available("manual", "Manual text proof", ["MANUAL"]),
  setup("x", "X"),
  setup("linkedin", "LinkedIn"),
  setup("google-business", "Google Business Profile"),
  setup("youtube", "YouTube comments"),
  manual(
    "product-hunt",
    "Product Hunt",
    "Product Hunt requires API permission for commercial use. Import proof manually or from an approved export.",
  ),
  manual(
    "reddit",
    "Reddit",
    "Reddit commercial API access requires a separate agreement. Use manual entry or an approved export.",
  ),
  {
    key: "vimeo",
    label: "Vimeo",
    availability: "SETUP_REQUIRED",
    modes: ["PUBLIC_URL", "SPREADSHEET"],
    reasonCode: "SERVER_PROVIDER_CREDENTIAL_REQUIRED",
    reason:
      "A server-side Vimeo API credential is required to import public video comments.",
    publicHosts: aliases(["vimeo.com", "player.vimeo.com"]),
    publicHostSuffixes: [],
  },
  manual("capterra", "Capterra"),
  manual(
    "g2",
    "G2",
    "G2 review retrieval requires a licensed syndication partnership. Use manual entry or a provider export.",
    "OFFICIAL_PROVIDER_ACCESS_REQUIRED",
  ),
  manual(
    "apple-app-store",
    "Apple App Store",
    "App Store review access requires an App Store Connect organization key. Use an App Store export until that account is connected.",
    "OFFICIAL_PROVIDER_ACCESS_REQUIRED",
  ),
  {
    ...setup("google-play", "Google Play reviews"),
    modes: ["CONNECTED_API", "SPREADSHEET"],
  },
  manual(
    "trustpilot",
    "Trustpilot",
    "Trustpilot API storage requires licensed access and deletion reconciliation at least every 28 days. Use a permitted export until that lifecycle is connected.",
    "OFFICIAL_PROVIDER_LIFECYCLE_REQUIRED",
  ),
  manual(
    "shopify",
    "Shopify",
    "Shopify review access requires an approved merchant app and review-program scopes. Use a merchant export until connected.",
    "OFFICIAL_PROVIDER_ACCESS_REQUIRED",
  ),
  manual(
    "yelp",
    "Yelp",
    "Yelp does not permit durable review storage through its public API. Import only proof you separately have permission to use.",
  ),
  manual("apple-podcasts", "Apple Podcasts"),
  manual("appsumo", "AppSumo"),
  manual("zillow", "Zillow"),
  manual(
    "udemy",
    "Udemy",
    "Udemy review access requires an instructor token for owned courses. Use the official review CSV export until connected.",
    "OFFICIAL_PROVIDER_ACCESS_REQUIRED",
  ),
  manual("chrome-web-store", "Chrome Web Store"),
  manual("skillshare", "Skillshare"),
  manual("realtor", "Realtor.com"),
  manual("sourceforge", "SourceForge"),
  manual(
    "whop",
    "Whop",
    "Whop review access requires a company key or user OAuth connection. Use a provider export until connected.",
    "OFFICIAL_PROVIDER_ACCESS_REQUIRED",
  ),
  {
    key: "wordpress",
    label: "WordPress.com comments",
    availability: "AVAILABLE",
    modes: ["PUBLIC_URL", "SPREADSHEET"],
    reasonCode: "DOCUMENTED_PUBLIC_REST_ONLY",
    reason:
      "Use a documented public WordPress.com comments endpoint. Self-hosted WordPress and WooCommerce sites require an export until ownership verification is available.",
    publicHosts: aliases(["wordpress.com", "wordpress.org"]),
    publicHostSuffixes: ["wordpress.com"],
  },
  manual("fiverr", "Fiverr"),
  manual("homestars", "HomeStars"),
  manual("goodreads", "Goodreads"),
  available(
    "testimonial-to",
    "Testimonial.to",
    ["MIGRATION", "SPREADSHEET"],
    ["testimonial.to", "embed-v2.testimonial.to"],
  ),
  available(
    "senja",
    "Senja",
    ["MIGRATION", "SPREADSHEET"],
    ["senja.io", "love.senja.io", "widget.senja.io"],
  ),
  available(
    "famewall",
    "Famewall",
    ["MIGRATION", "SPREADSHEET"],
    [
      "famewall.io",
      "wall.famewall.io",
      "embed.famewall.io",
      "wallembed.famewall.io",
    ],
  ),
  bestEffortMigration("endorsal", "Endorsal", ["endorsal.io"]),
  available(
    "trustmary",
    "Trustmary",
    ["MIGRATION", "SPREADSHEET"],
    ["trustmary.com", "widget.trustmary.com"],
  ),
  manual(
    "trust",
    "Trust",
    "Trust migration requires an authenticated workspace API key. Upload its export until a project credential is connected.",
    "OFFICIAL_PROVIDER_ACCESS_REQUIRED",
  ),
  bestEffortMigration("shoutout", "Shoutout", ["shoutout.social"]),
  available(
    "feedspace",
    "Feedspace",
    ["MIGRATION", "SPREADSHEET"],
    ["feedspace.io", "app.feedspace.io", "love.feedspace.io"],
  ),
  available(
    "boast",
    "Boast",
    ["MIGRATION", "SPREADSHEET"],
    ["boast.io", "app.boast.io", "widgets.boast.io", "api.boast.io"],
  ),
  available(
    "vocal-video",
    "Vocal Video",
    ["MIGRATION", "SPREADSHEET"],
    ["vocalvideo.com"],
  ),
  bestEffortMigration("wiserreview", "WiserReview", [
    "wiserreview.com",
    "embed.wiserreview.com",
  ]),
  available(
    "shapo",
    "Shapo",
    ["MIGRATION", "SPREADSHEET"],
    ["shapo.io", "app.shapo.io"],
  ),
  available(
    "walls-io",
    "Walls.io",
    ["MIGRATION", "SPREADSHEET"],
    ["walls.io", "my.walls.io"],
  ),
  available(
    "taggbox",
    "Taggbox",
    ["MIGRATION", "SPREADSHEET"],
    [
      "taggbox.com",
      "app.taggbox.com",
      "web.taggbox.com",
      "socialwalls.com",
      "app.socialwalls.com",
    ],
  ),
  available(
    "embedsocial",
    "EmbedSocial",
    ["MIGRATION", "SPREADSHEET"],
    ["embedsocial.com"],
  ),
  manual("facebook", "Facebook"),
  manual("instagram", "Instagram"),
  manual("tiktok", "TikTok"),
  manual("threads", "Threads"),
  manual("slack", "Slack"),
  manual("discord", "Discord"),
  manual("telegram", "Telegram"),
  manual("whatsapp", "WhatsApp"),
  manual("amazon", "Amazon"),
  manual("airbnb", "Airbnb"),
];
