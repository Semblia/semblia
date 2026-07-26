import * as React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DeleteAccountDialog } from "@/components/account/danger-zone-section";
import type { MaybeUserResource } from "@/components/account/clerk-user-types";

/**
 * Account deletion is irreversible and, until this split, had no coverage at
 * all. These assert the gate itself: the confirm control must stay disabled
 * until the exact phrase is typed, and the input must carry an accessible name.
 */

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

function renderDialog(confirmText: string) {
  const user = { delete: vi.fn() } as unknown as MaybeUserResource;
  return render(
    <DeleteAccountDialog
      user={user}
      open
      onOpenChange={vi.fn()}
      confirmText={confirmText}
      onConfirmTextChange={vi.fn()}
    />,
  );
}

function confirmButton() {
  return screen
    .getAllByRole("button", { name: /delete account/i })
    .find((el) => (el as HTMLButtonElement).type !== "reset") as
    | HTMLButtonElement
    | undefined;
}

describe("delete account dialog", () => {
  it("keeps the confirm disabled until the exact phrase is typed", () => {
    for (const text of ["", "delete", "delete my acc", "remove my account"]) {
      const { unmount } = renderDialog(text);
      expect(confirmButton()?.disabled).toBe(true);
      unmount();
    }
  });

  it("enables the confirm on the exact phrase, ignoring case and padding", () => {
    for (const text of [
      "delete my account",
      "  delete my account  ",
      "DELETE MY ACCOUNT",
    ]) {
      const { unmount } = renderDialog(text);
      expect(confirmButton()?.disabled).toBe(false);
      unmount();
    }
  });

  it("gives the confirmation input an accessible name", () => {
    renderDialog("");
    expect(
      screen.getByLabelText(/type "delete my account" to confirm/i),
    ).toBeTruthy();
  });
});
