import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ResendLinkModal } from "@/features/cases/components/ResendLinkModal";
import { makeCase } from "../../../helpers/mock-case";
import { ApiError } from "@/services/api/client";

const mocks = vi.hoisted(() => ({
  resendLink: vi.fn(),
}));

vi.mock("@/services", () => ({
  casesService: { resendLink: mocks.resendLink },
}));

describe("ResendLinkModal", () => {
  const baseCase = makeCase({
    status: "EXPIRED",
    linkExpiry: "2026-01-01T00:00:00.000Z",
    link: { resentCount: 1, sentAt: "2026-05-01T00:00:00.000Z", expiresAt: "2026-01-01T00:00:00.000Z" },
  });

  beforeEach(() => {
    mocks.resendLink.mockReset();
  });

  it("returns null when closed", () => {
    const { container } = render(
      <ResendLinkModal
        case={baseCase}
        open={false}
        onClose={vi.fn()}
        onConfirmed={vi.fn()}
        onViewDetails={vi.fn()}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("resends link and shows success state", async () => {
    mocks.resendLink.mockResolvedValue(undefined);
    const onClose = vi.fn();
    const onConfirmed = vi.fn();
    const user = userEvent.setup();

    render(
      <ResendLinkModal
        case={baseCase}
        open
        onClose={onClose}
        onConfirmed={onConfirmed}
        onViewDetails={vi.fn()}
      />,
    );

    expect(screen.getByRole("heading", { name: /resend questionnaire link/i })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /^resend questionnaire link$/i }));

    await waitFor(() => {
      expect(screen.getByText(/link resent successfully/i)).toBeInTheDocument();
    });
    expect(mocks.resendLink).toHaveBeenCalledWith(baseCase.id);

    await user.click(screen.getByRole("button", { name: /close/i }));
    expect(onConfirmed).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it("shows error when resend fails", async () => {
    mocks.resendLink.mockRejectedValue(new ApiError("FAIL", "Server error", 500));
    const user = userEvent.setup();

    render(
      <ResendLinkModal
        case={baseCase}
        open
        onClose={vi.fn()}
        onConfirmed={vi.fn()}
        onViewDetails={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: /resend questionnaire link/i }));
    await waitFor(() => {
      expect(screen.getByText("Server error")).toBeInTheDocument();
    });
  });

  it("calls onViewDetails from footer link", async () => {
    const onViewDetails = vi.fn();
    const onClose = vi.fn();
    const user = userEvent.setup();

    render(
      <ResendLinkModal
        case={baseCase}
        open
        onClose={onClose}
        onConfirmed={vi.fn()}
        onViewDetails={onViewDetails}
      />,
    );

    await user.click(screen.getByText(/view full case details/i));
    expect(onClose).toHaveBeenCalled();
    expect(onViewDetails).toHaveBeenCalled();
  });
});
