import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { V2CollectionFormDTO, V2FormConfigEntry } from "@workspace/types";
import { FormConfigList } from "@/components/collect/form-config-list";
import {
  fetchForms,
  createForm,
  duplicateForm,
  deleteForm,
  updateForm,
} from "@/lib/semblia-api";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}));

vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({
    getToken: vi.fn().mockResolvedValue("session-token"),
    isSignedIn: true,
  }),
}));

vi.mock("@/lib/semblia-api", () => ({
  fetchForms: vi.fn(),
  createForm: vi.fn(),
  duplicateForm: vi.fn(),
  deleteForm: vi.fn(),
  updateForm: vi.fn(),
}));

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function entry(overrides: Partial<V2FormConfigEntry> = {}): V2FormConfigEntry {
  return {
    id: "form_1",
    name: "Welcome Survey",
    description: "Onboarding feedback",
    isActive: true,
    abWeight: 100,
    createdAt: "2026-05-01T12:00:00.000Z",
    updatedAt: "2026-05-10T12:00:00.000Z",
    submissions: 42,
    views: 200,
    responseRate: 21,
    avgRating: 4.5,
    lastSubmissionAt: "2026-05-10T12:00:00.000Z",
    ...overrides,
  };
}

function dto(overrides: Partial<V2FormConfigEntry> = {}): V2CollectionFormDTO {
  const e = entry(overrides);
  return {
    id: e.id,
    projectId: "proj_1",
    entry: e,
    config: {},
  };
}

describe("<FormConfigList />", () => {
  beforeEach(() => {
    pushMock.mockReset();
    vi.mocked(fetchForms).mockReset();
    vi.mocked(createForm).mockReset();
    vi.mocked(duplicateForm).mockReset();
    vi.mocked(deleteForm).mockReset();
    vi.mocked(updateForm).mockReset();
  });

  it("renders forms from useFormsList", async () => {
    vi.mocked(fetchForms).mockResolvedValueOnce([dto()]);

    render(<FormConfigList slug="launchpad" />, { wrapper });

    expect(await screen.findByText("Welcome Survey")).toBeTruthy();
    expect(fetchForms).toHaveBeenCalledWith("session-token", "launchpad");
  });

  it("creates a form via mutation and navigates to the studio", async () => {
    vi.mocked(fetchForms).mockResolvedValue([]);
    vi.mocked(createForm).mockResolvedValueOnce(dto({ id: "form_new" }));

    render(<FormConfigList slug="launchpad" />, { wrapper });

    await waitFor(() => expect(screen.getByText(/Stepped flow/i)).toBeTruthy());

    await userEvent.click(screen.getByText(/Stepped flow/i));

    // Forms v4: creation never posts a config — the API owns the default
    // publish-validated document, and layout presets are picked in the studio.
    await waitFor(() =>
      expect(createForm).toHaveBeenCalledWith("session-token", "launchpad", {
        name: "Default Form",
        description: "",
      }),
    );
    await waitFor(() =>
      expect(pushMock).toHaveBeenCalledWith(
        "/projects/launchpad/collect/form_new",
      ),
    );
  });

  it("duplicates a form via the duplicate mutation", async () => {
    vi.mocked(fetchForms).mockResolvedValue([dto()]);
    vi.mocked(duplicateForm).mockResolvedValueOnce(
      dto({ id: "form_2", name: "Welcome Survey (copy)" }),
    );

    render(<FormConfigList slug="launchpad" />, { wrapper });

    expect(await screen.findByText("Welcome Survey")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: /duplicate/i }));

    await waitFor(() =>
      expect(duplicateForm).toHaveBeenCalledWith(
        "session-token",
        "launchpad",
        "form_1",
      ),
    );
  });

  it("toggles a form's active state through the update mutation", async () => {
    vi.mocked(fetchForms).mockResolvedValue([dto()]);
    vi.mocked(updateForm).mockResolvedValueOnce(dto({ isActive: false }));

    render(<FormConfigList slug="launchpad" />, { wrapper });

    expect(await screen.findByText("Welcome Survey")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: /pause/i }));

    await waitFor(() =>
      expect(updateForm).toHaveBeenCalledWith(
        "session-token",
        "launchpad",
        "form_1",
        { isActive: false },
      ),
    );
  });

  it("sets a form's A/B weight through the weight dialog", async () => {
    vi.mocked(fetchForms).mockResolvedValue([dto()]);
    vi.mocked(updateForm).mockResolvedValueOnce(dto({ abWeight: 25 }));

    render(<FormConfigList slug="launchpad" />, { wrapper });

    expect(await screen.findByText("Welcome Survey")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: /a\/b weight/i }));

    const dialog = await screen.findByRole("dialog");
    await userEvent.click(within(dialog).getByRole("button", { name: "25" }));
    await userEvent.click(
      within(dialog).getByRole("button", { name: /save weight/i }),
    );

    await waitFor(() =>
      expect(updateForm).toHaveBeenCalledWith(
        "session-token",
        "launchpad",
        "form_1",
        { abWeight: 25 },
      ),
    );
  });

  it("deletes a form after confirmation", async () => {
    vi.mocked(fetchForms).mockResolvedValue([dto()]);
    vi.mocked(deleteForm).mockResolvedValueOnce(undefined as unknown as void);

    render(<FormConfigList slug="launchpad" />, { wrapper });

    expect(await screen.findByText("Welcome Survey")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: /delete/i }));

    await userEvent.click(
      await screen.findByRole("button", { name: /delete form/i }),
    );

    await waitFor(() =>
      expect(deleteForm).toHaveBeenCalledWith(
        "session-token",
        "launchpad",
        "form_1",
      ),
    );
  });
});
