import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import {
  FormIntent,
  FormStatus,
  FormVersionStatus,
} from "@workspace/database/prisma";
import { createFormTemplate } from "@workspace/forms-core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BillingService } from "../billing/billing.service.js";
import type { PrismaService } from "../prisma/prisma.service.js";
import { FormsService } from "./forms.service.js";

type FormRow = {
  id: string;
  projectId: string;
  intent: FormIntent;
  name: string;
  slug: string | null;
  status: FormStatus;
  open: boolean;
  draft: Record<string, unknown>;
  draftVersion: number;
  currentVersion: number | null;
  updatedByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type FormVersionRow = {
  id: string;
  formId: string;
  projectId: string;
  slug: string | null;
  version: number;
  schemaVersion: string;
  rendererVersion: string;
  coreVersion: string;
  status: FormVersionStatus;
  snapshot: Record<string, unknown>;
  checksum: string;
  previewImageUrl: string | null;
  publishedAt: Date;
};

const state: {
  forms: FormRow[];
  versions: FormVersionRow[];
} = {
  forms: [],
  versions: [],
};

const mockGetFormUsageForProject = vi.fn();

function matchesForm(
  row: FormRow,
  where: {
    id?: string;
    projectId?: string;
    slug?: string;
    status?: FormStatus;
    open?: boolean;
    draftVersion?: number;
    currentVersion?: { not: null };
  },
) {
  if (where.id !== undefined && row.id !== where.id) return false;
  if (where.projectId !== undefined && row.projectId !== where.projectId) {
    return false;
  }
  if (where.slug !== undefined && row.slug !== where.slug) return false;
  if (where.status !== undefined && row.status !== where.status) return false;
  if (where.open !== undefined && row.open !== where.open) return false;
  if (
    where.draftVersion !== undefined &&
    row.draftVersion !== where.draftVersion
  ) {
    return false;
  }
  if (where.currentVersion?.not === null && row.currentVersion === null) {
    return false;
  }
  return true;
}

function matchesVersion(
  row: FormVersionRow,
  where: {
    id?: string;
    formId?: string;
    projectId?: string;
    version?: number;
    status?: FormVersionStatus;
  },
) {
  if (where.id !== undefined && row.id !== where.id) return false;
  if (where.formId !== undefined && row.formId !== where.formId) return false;
  if (where.projectId !== undefined && row.projectId !== where.projectId) {
    return false;
  }
  if (where.version !== undefined && row.version !== where.version) return false;
  if (where.status !== undefined && row.status !== where.status) return false;
  return true;
}

const formDelegate = {
  findMany: vi.fn(
    ({
      where,
    }: {
      where: { projectId?: string };
    }) =>
      state.forms
        .filter((row) => matchesForm(row, where))
        .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime()),
  ),
  create: vi.fn(({ data }: { data: Partial<FormRow> }) => {
    const createdAt = new Date("2026-06-20T10:00:00.000Z");
    const row: FormRow = {
      id: `form_${state.forms.length + 1}`,
      projectId: data.projectId ?? "project_1",
      intent: data.intent ?? FormIntent.CUSTOM,
      name: data.name ?? "Untitled form",
      slug: data.slug ?? null,
      status: data.status ?? FormStatus.DRAFT,
      open: data.open ?? true,
      draft: data.draft ?? {},
      draftVersion: data.draftVersion ?? 1,
      currentVersion: data.currentVersion ?? null,
      updatedByUserId: data.updatedByUserId ?? null,
      createdAt,
      updatedAt: createdAt,
    };
    state.forms.push(row);
    return row;
  }),
  findFirst: vi.fn(({ where }: { where: Parameters<typeof matchesForm>[1] }) =>
    state.forms.find((row) => matchesForm(row, where)) ?? null,
  ),
  update: vi.fn(
    ({
      where,
      data,
    }: {
      where: { id: string };
      data: Partial<FormRow>;
    }) => {
      const row = state.forms.find((entry) => entry.id === where.id);
      if (!row) throw new Error("missing form");
      Object.assign(row, data, {
        updatedAt: new Date("2026-06-20T10:10:00.000Z"),
      });
      return row;
    },
  ),
  updateMany: vi.fn(
    ({
      where,
      data,
    }: {
      where: Parameters<typeof matchesForm>[1];
      data: Omit<Partial<FormRow>, "draftVersion"> & {
        draftVersion?: number | { increment: number };
      };
    }) => {
      let count = 0;
      for (const row of state.forms) {
        if (!matchesForm(row, where)) continue;
        const nextDraftVersion =
          typeof data.draftVersion === "object"
            ? row.draftVersion + data.draftVersion.increment
            : data.draftVersion;
        Object.assign(row, data, {
          draftVersion: nextDraftVersion ?? row.draftVersion,
          updatedAt: new Date("2026-06-20T10:05:00.000Z"),
        });
        count += 1;
      }
      return { count };
    },
  ),
  delete: vi.fn(({ where }: { where: { id: string } }) => {
    const index = state.forms.findIndex((entry) => entry.id === where.id);
    if (index === -1) throw new Error("missing form");
    const [deleted] = state.forms.splice(index, 1);
    if (!deleted) throw new Error("missing form");
    state.versions = state.versions.filter((row) => row.formId !== where.id);
    return { id: deleted.id, projectId: deleted.projectId };
  }),
};

const versionDelegate = {
  findFirst: vi.fn(
    ({
      where,
      orderBy,
    }: {
      where: Parameters<typeof matchesVersion>[1];
      orderBy?: { version: "desc" };
    }) => {
      const rows = state.versions.filter((row) => matchesVersion(row, where));
      if (orderBy?.version === "desc") {
        rows.sort((left, right) => right.version - left.version);
      }
      return rows[0] ?? null;
    },
  ),
  create: vi.fn(({ data }: { data: FormVersionRow }) => {
    const row: FormVersionRow = {
      ...data,
      previewImageUrl: data.previewImageUrl ?? null,
      status: data.status ?? FormVersionStatus.PUBLISHED,
    };
    state.versions.push(row);
    return row;
  }),
  findMany: vi.fn(
    ({
      where,
    }: {
      where: Parameters<typeof matchesVersion>[1];
    }) =>
      state.versions
        .filter((row) => matchesVersion(row, where))
        .sort((left, right) => right.version - left.version),
  ),
  findUnique: vi.fn(
    ({ where }: { where: { id: string } }) =>
      state.versions.find((row) => row.id === where.id) ?? null,
  ),
};

const prismaMock = {
  client: {
    form: formDelegate,
    formVersion: versionDelegate,
    $transaction: vi.fn((callback: (tx: unknown) => unknown) =>
      callback({
        form: formDelegate,
        formVersion: versionDelegate,
      }),
    ),
  },
} as unknown as PrismaService;

const billingMock = {
  getFormUsageForProject: mockGetFormUsageForProject,
} as unknown as BillingService;

function makeService() {
  return new FormsService(prismaMock, billingMock);
}

function makeRequest(projectId = "project_1") {
  return { projectAccess: { projectId } };
}

function makeForm(overrides: Partial<FormRow> = {}): FormRow {
  return {
    id: "form_1",
    projectId: "project_1",
    intent: FormIntent.TESTIMONIAL,
    name: "Testimonials",
    slug: "testimonials",
    status: FormStatus.DRAFT,
    open: true,
    draft: createFormTemplate("TESTIMONIAL") as unknown as Record<
      string,
      unknown
    >,
    draftVersion: 1,
    currentVersion: null,
    updatedByUserId: null,
    createdAt: new Date("2026-06-20T09:00:00.000Z"),
    updatedAt: new Date("2026-06-20T09:00:00.000Z"),
    ...overrides,
  };
}

describe("FormsService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.forms = [];
    state.versions = [];
    mockGetFormUsageForProject.mockResolvedValue({ used: 0, limit: 10 });
  });

  it("creates a form by seeding the requested intent template", async () => {
    const service = makeService();
    const result = await service.create(
      { slug: "acme" },
      { intent: "REVIEW", name: "Review intake" },
      makeRequest(),
      "user_1",
    );

    expect(mockGetFormUsageForProject).toHaveBeenCalledWith("project_1");
    expect(formDelegate.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          projectId: "project_1",
          intent: FormIntent.REVIEW,
          name: "Review intake",
          draftVersion: 1,
          updatedByUserId: "user_1",
        }),
      }),
    );
    expect(result).toMatchObject({
      id: "form_1",
      projectId: "project_1",
      intent: "REVIEW",
      name: "Review intake",
      status: "DRAFT",
      draftVersion: 1,
      currentVersion: null,
      updatedByUserId: "user_1",
    });
    expect(result.draft).toMatchObject({
      intent: "REVIEW",
      content: { title: "Leave a review" },
    });
  });

  it("rejects create when the owning account has exhausted its forms limit", async () => {
    mockGetFormUsageForProject.mockResolvedValue({ used: 1, limit: 1 });
    const service = makeService();

    await expect(
      service.create(
        { slug: "acme" },
        { intent: "CUSTOM" },
        makeRequest(),
        "user_1",
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(formDelegate.create).not.toHaveBeenCalled();
  });

  it("saves drafts with optimistic concurrency and rejects stale versions", async () => {
    state.forms = [makeForm({ draftVersion: 2 })];
    const service = makeService();
    const draft = createFormTemplate("CUSTOM");

    const saved = await service.saveDraft(
      { slug: "acme", formId: "form_1" },
      { draft, expectedVersion: 2 },
      makeRequest(),
      "user_2",
    );

    expect(formDelegate.updateMany).toHaveBeenCalledWith({
      where: {
        id: "form_1",
        projectId: "project_1",
        draftVersion: 2,
      },
      data: {
        draft: expect.objectContaining({ intent: "CUSTOM" }),
        draftVersion: { increment: 1 },
        // The doc's intent is mirrored onto the queryable column on save.
        intent: "CUSTOM",
        updatedByUserId: "user_2",
      },
    });
    expect(saved).toMatchObject({
      draftVersion: 3,
      draft: { intent: "CUSTOM" },
    });

    await expect(
      service.saveDraft(
        { slug: "acme", formId: "form_1" },
        { draft, expectedVersion: 2 },
        makeRequest(),
        "user_2",
      ),
    ).rejects.toThrow(ConflictException);
  });

  it("publishes immutable versions, bumps the form pointer, and no-ops identical republishes", async () => {
    state.forms = [makeForm()];
    const service = makeService();

    const first = await service.publish(
      { slug: "acme", formId: "form_1" },
      makeRequest(),
    );
    const second = await service.publish(
      { slug: "acme", formId: "form_1" },
      makeRequest(),
    );

    expect(state.versions).toHaveLength(1);
    expect(state.forms[0]).toMatchObject({
      currentVersion: 1,
      status: FormStatus.PUBLISHED,
    });
    expect(first.version).toBe(1);
    expect(second.id).toBe(first.id);
    expect(second.checksum).toBe(first.checksum);
    expect(first.snapshot).not.toHaveProperty("serverSettings");
    expect(state.versions[0]?.snapshot).toHaveProperty("serverSettings");
  });

  it("rejects publishing an embed-delivery draft that exceeds embed capabilities", async () => {
    const draft = createFormTemplate("TESTIMONIAL", "embed");
    draft.fields = [
      ...draft.fields,
      {
        ...draft.fields[0]!,
        id: "video_ask",
        type: "videoUpload",
        label: "Record a video",
      },
    ];
    state.forms = [
      makeForm({ draft: draft as unknown as Record<string, unknown> }),
    ];
    const service = makeService();

    await expect(
      service.publish({ slug: "acme", formId: "form_1" }, makeRequest()),
    ).rejects.toThrow(UnprocessableEntityException);
    expect(state.versions).toHaveLength(0);
  });

  it("lists version metadata and returns a public snapshot for a specific version", async () => {
    state.forms = [makeForm()];
    const service = makeService();
    const published = await service.publish(
      { slug: "acme", formId: "form_1" },
      makeRequest(),
    );

    const versions = await service.listVersions(
      { slug: "acme", formId: "form_1" },
      makeRequest(),
    );
    const version = await service.getVersion(
      { slug: "acme", formId: "form_1", version: 1 },
      makeRequest(),
    );

    expect(versions).toEqual([
      expect.objectContaining({
        id: published.id,
        version: 1,
        checksum: published.checksum,
      }),
    ]);
    expect(versions[0]).not.toHaveProperty("snapshot");
    expect(version.snapshot).toMatchObject({
      snapshotId: published.id,
      formId: "form_1",
      version: 1,
    });
    expect(version.snapshot).not.toHaveProperty("serverSettings");
  });

  it("serves runtime snapshots as public-safe payloads only", async () => {
    const draft = createFormTemplate("REVIEW");
    draft.settings.blockedWords = ["internal-blocked-word"];
    state.forms = [
      makeForm({
        intent: FormIntent.REVIEW,
        draft: draft as unknown as Record<string, unknown>,
      }),
    ];
    const service = makeService();
    const published = await service.publish(
      { slug: "acme", formId: "form_1" },
      makeRequest(),
    );

    const bySlug = await service.getRuntimeSnapshotBySlug(
      { slug: "testimonials" },
      "project_1",
      "hosted",
    );

    expect(bySlug).toMatchObject({ snapshotId: published.id });
    expect(bySlug).not.toHaveProperty("serverSettings");
    expect(JSON.stringify(bySlug)).not.toContain("internal-blocked-word");
  });

  it("binds same-slug snapshots to the resolved project", async () => {
    state.forms = [
      makeForm({ id: "form_one", projectId: "project_1", slug: "contact" }),
      makeForm({ id: "form_two", projectId: "project_2", slug: "contact" }),
    ];
    const service = makeService();
    const first = await service.publish(
      { slug: "acme", formId: "form_one" },
      makeRequest("project_1"),
    );
    const second = await service.publish(
      { slug: "beta", formId: "form_two" },
      makeRequest("project_2"),
    );

    await expect(
      service.getRuntimeSnapshotBySlug(
        { slug: "contact" },
        "project_1",
        "hosted",
      ),
    ).resolves.toMatchObject({ snapshotId: first.id, projectId: "project_1" });
    await expect(
      service.getRuntimeSnapshotBySlug(
        { slug: "contact" },
        "project_2",
        "hosted",
      ),
    ).resolves.toMatchObject({ snapshotId: second.id, projectId: "project_2" });
  });

  it("rejects embed snapshots when public security disables embedding", async () => {
    state.forms = [makeForm()];
    const service = makeService();
    await service.publish(
      { slug: "acme", formId: "form_1" },
      makeRequest(),
    );
    const version = state.versions[0];
    if (!version) throw new Error("expected published version");
    version.snapshot.security = { embedAllowed: false, allowedOrigins: [] };

    await expect(
      service.getRuntimeSnapshotBySlug(
        { slug: "testimonials" },
        "project_1",
        "embed",
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it("allows embed snapshots when public security enables embedding", async () => {
    state.forms = [makeForm()];
    const service = makeService();
    const published = await service.publish(
      { slug: "acme", formId: "form_1" },
      makeRequest(),
    );

    await expect(
      service.getRuntimeSnapshotBySlug(
        { slug: "testimonials" },
        "project_1",
        "embed",
      ),
    ).resolves.toMatchObject({ snapshotId: published.id });
  });

  it("does not serve closed or missing runtime snapshots", async () => {
    state.forms = [makeForm({ status: FormStatus.PUBLISHED, open: false })];
    const service = makeService();

    await expect(
      service.getRuntimeSnapshotBySlug(
        { slug: "testimonials" },
        "project_1",
        "hosted",
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it("deletes a form after verifying project ownership", async () => {
    state.forms = [makeForm()];
    const service = makeService();

    await expect(
      service.delete({ slug: "acme", formId: "form_1" }, makeRequest()),
    ).resolves.toEqual({ id: "form_1", projectId: "project_1" });
    expect(state.forms).toHaveLength(0);
  });
});
