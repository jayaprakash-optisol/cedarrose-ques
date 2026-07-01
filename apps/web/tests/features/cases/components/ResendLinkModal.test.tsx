import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { render, screen, waitFor } from "@testing-library/react";
import { ResendLinkModal } from "@/features/cases/components/ResendLinkModal";
import { casesService } from "@/services";
import { ApiError } from "@/services/api/errors";
import { createMockCase } from "../../../fixtures/case";
import { makeQueryClient, renderWithProviders } from "../../../helpers/render";

function getCase(overrides: Parameters<typeof createMockCase>[0] = {}) {
  return createMockCase({
    status: "EXPIRED",
    linkValidityHours: 48,
    ...overrides,
  });
}

describe("ResendLinkModal", () => {
  beforeEach(() => vi.restoreAllMocks());
  afterEach(() => vi.restoreAllMocks());

  it("returns null when not open", () => {
    const { container } = renderWithProviders(
      <ResendLinkModal
        case={getCase()}
        open={false}
        onClose={() => {}}
        onConfirmed={() => {}}
        onViewDetails={() => {}}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders the modal with case details when open", () => {
    renderWithProviders(
      <ResendLinkModal
        case={getCase()}
        open
        onClose={() => {}}
        onConfirmed={() => {}}
        onViewDetails={() => {}}
      />,
    );
    expect(screen.getAllByText("Resend questionnaire link").length).toBeGreaterThan(0);
    expect(screen.getByText("Acme Trading LLC")).toBeInTheDocument();
  });

  it("shows the contact email or em-dash when missing", () => {
    const c = getCase({
      companyData: {
        ...createMockCase().companyData,
        recipientEmails: [],
      },
    });
    renderWithProviders(
      <ResendLinkModal case={c} open onClose={() => {}} onConfirmed={() => {}} onViewDetails={() => {}} />,
    );
    // The em-dash is rendered in the Row component
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });

  it("calls onResend and shows the success view", async () => {
    const user = userEvent.setup();
    vi.spyOn(casesService, "resendLink").mockResolvedValue({ linkExpiry: "2026-07-01T00:00:00.000Z" });
    renderWithProviders(
      <ResendLinkModal
        case={getCase()}
        open
        onClose={() => {}}
        onConfirmed={() => {}}
        onViewDetails={() => {}}
      />,
    );
    await user.click(screen.getByRole("button", { name: /Resend questionnaire link/ }));
    await waitFor(() => {
      expect(screen.getByText("Link resent successfully")).toBeInTheDocument();
    });
  });

  it("shows the error message on failure", async () => {
    const user = userEvent.setup();
    vi.spyOn(casesService, "resendLink").mockRejectedValue(new ApiError("BAD", "Service down", 500));
    renderWithProviders(
      <ResendLinkModal
        case={getCase()}
        open
        onClose={() => {}}
        onConfirmed={() => {}}
        onViewDetails={() => {}}
      />,
    );
    await user.click(screen.getByRole("button", { name: /Resend questionnaire link/ }));
    expect(await screen.findByText("Service down")).toBeInTheDocument();
  });

  it("falls back to a generic error on non-ApiError", async () => {
    const user = userEvent.setup();
    vi.spyOn(casesService, "resendLink").mockRejectedValue(new Error("boom"));
    renderWithProviders(
      <ResendLinkModal
        case={getCase()}
        open
        onClose={() => {}}
        onConfirmed={() => {}}
        onViewDetails={() => {}}
      />,
    );
    await user.click(screen.getByRole("button", { name: /Resend questionnaire link/ }));
    expect(await screen.findByText("Failed to resend link.")).toBeInTheDocument();
  });

  it("calls onConfirmed when closing from the success state", async () => {
    const user = userEvent.setup();
    vi.spyOn(casesService, "resendLink").mockResolvedValue({ linkExpiry: "2026-07-01T00:00:00.000Z" });
    const onConfirmed = vi.fn();
    const onClose = vi.fn();
    renderWithProviders(
      <ResendLinkModal
        case={getCase()}
        open
        onClose={onClose}
        onConfirmed={onConfirmed}
        onViewDetails={() => {}}
      />,
    );
    await user.click(screen.getByRole("button", { name: /Resend questionnaire link/ }));
    await user.click(await screen.findByRole("button", { name: "Close" }));
    expect(onConfirmed).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onViewDetails when the link is clicked", async () => {
    const user = userEvent.setup();
    const onViewDetails = vi.fn();
    const onClose = vi.fn();
    renderWithProviders(
      <ResendLinkModal
        case={getCase()}
        open
        onClose={onClose}
        onConfirmed={() => {}}
        onViewDetails={onViewDetails}
      />,
    );
    await user.click(screen.getByRole("button", { name: /View full case details/ }));
    expect(onViewDetails).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});
