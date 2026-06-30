import { describe, it, expect, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import NewRequestPage from "@/features/new-request/pages/NewRequestPage";
import { renderWithRouter } from "../../../helpers/render-with-router";
import { makeCase } from "../../../helpers/mock-case";

const mocks = vi.hoisted(() => ({
  getByUid: vi.fn(),
  create: vi.fn(),
}));

vi.mock("@/components/layout/AppShell", () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/services", () => ({
  companiesService: { getByUid: mocks.getByUid },
  casesService: { create: mocks.create },
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const company = {
  companyName: "ABC Holdings Ltd",
  registrationNumber: "CR-987654",
  country: "UAE",
  riskRating: "Medium",
  recipientEmails: ["compliance@abcholdings.ae"],
  additionalFields: {
    incorporationDate: "2015-03-12",
    legalStructure: "LLC",
    primaryIndustry: "Trading",
  },
};

const prefilledRoute =
  "/new-request?orderId=ORD-10001&country=UAE&subject=ABC%20Holdings%20Ltd";

describe("NewRequestPage", () => {
  it("renders step A form", () => {
    renderWithRouter(<NewRequestPage />);
    expect(screen.getByRole("heading", { name: /new questionnaire request/i })).toBeInTheDocument();
    expect(screen.getByText(/step a — enter order details/i)).toBeInTheDocument();
  });

  it("auto-fetches company data when orderId is in query params", async () => {
    mocks.getByUid.mockResolvedValue(company);
    renderWithRouter(<NewRequestPage />, {
      routerProps: { initialEntries: [prefilledRoute] },
    });

    await waitFor(() => {
      expect(screen.getByText(/step b — review fetched company data/i)).toBeInTheDocument();
    });
    expect(mocks.getByUid).toHaveBeenCalledWith("UID-44529");
    expect(screen.getByText(/abc holdings ltd/i)).toBeInTheDocument();
  });

  it("creates case on confirm and send", async () => {
    mocks.getByUid.mockResolvedValue(company);
    mocks.create.mockResolvedValue(makeCase({ linkUrl: "http://localhost/q/tok-1" }));
    const user = userEvent.setup();

    renderWithRouter(<NewRequestPage />, {
      routerProps: { initialEntries: [prefilledRoute] },
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /confirm & send link/i })).toBeEnabled();
    });
    await user.click(screen.getByRole("button", { name: /confirm & send link/i }));

    await waitFor(() => {
      expect(screen.getByText(/secure link sent/i)).toBeInTheDocument();
    });
    expect(mocks.create).toHaveBeenCalled();
  });

  it("fetches company from manual step A form", async () => {
    mocks.getByUid.mockResolvedValue(company);
    const user = userEvent.setup();
    renderWithRouter(<NewRequestPage />);

    const selects = screen.getAllByRole("combobox");
    await user.click(selects[0]);
    await user.click(await screen.findByRole("option", { name: /abc holdings ltd/i }));
    await user.click(selects[1]);
    await user.click(await screen.findByRole("option", { name: /ord-10001/i }));
    await user.click(screen.getByRole("button", { name: /fetch company data/i }));

    await waitFor(() => {
      expect(screen.getByText(/step b — review fetched company data/i)).toBeInTheDocument();
    });
  });

  it("shows error when company fetch fails", async () => {
    mocks.getByUid.mockRejectedValue(new Error("not found"));
    const user = userEvent.setup();
    renderWithRouter(<NewRequestPage />);

    const selects = screen.getAllByRole("combobox");
    await user.click(selects[0]);
    await user.click(await screen.findByRole("option", { name: /abc holdings ltd/i }));
    await user.click(selects[1]);
    await user.click(await screen.findByRole("option", { name: /ord-10001/i }));
    await user.click(screen.getByRole("button", { name: /fetch company data/i }));

    await waitFor(() => {
      expect(screen.getByText(/could not retrieve company data/i)).toBeInTheDocument();
    });
  });

  it("validates required fields before fetch", async () => {
    const user = userEvent.setup();
    renderWithRouter(<NewRequestPage />);
    const uidInput = screen.getByPlaceholderText("UID-44529");
    await user.clear(uidInput);
    await user.click(screen.getByRole("button", { name: /fetch company data/i }));
    const { toast } = await import("sonner");
    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("required"));
  });

  it("covers step B interactions and step C actions", async () => {
    mocks.getByUid.mockResolvedValue({
      ...company,
      recipientEmails: ["bad@gmial.com"],
    });
    mocks.create.mockResolvedValue(makeCase({ linkUrl: "http://localhost/q/tok-1" }));
    const user = userEvent.setup();
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    });

    renderWithRouter(<NewRequestPage />, {
      routerProps: { initialEntries: [prefilledRoute] },
    });

    await waitFor(() => {
      expect(screen.getByText(/appears to contain a typo/i)).toBeInTheDocument();
    });

    await user.click(screen.getByRole("radio", { name: /partner/i }));
    await user.click(screen.getByRole("button", { name: /preview partner template/i }));

    const expirySelect = screen.getAllByRole("combobox").find((el) =>
      el.textContent?.includes("48 hours"),
    );
    if (expirySelect) {
      await user.click(expirySelect);
      await user.click(await screen.findByRole("option", { name: /72 hours/i }));
    }

    await user.click(screen.getByRole("button", { name: /confirm & send link/i }));
    await waitFor(() => {
      expect(screen.getByText(/secure link sent/i)).toBeInTheDocument();
    });

    const copyBtn = screen.getAllByRole("button").find((btn) => btn.querySelector("svg.lucide-copy"));
    if (copyBtn) await user.click(copyBtn);

    await user.click(screen.getByRole("button", { name: /trigger another request/i }));
    expect(screen.getByText(/step a — enter order details/i)).toBeInTheDocument();
  });

  it("shows error when case creation fails", async () => {
    mocks.getByUid.mockResolvedValue(company);
    mocks.create.mockRejectedValue(new Error("fail"));
    const user = userEvent.setup();
    renderWithRouter(<NewRequestPage />, {
      routerProps: { initialEntries: [prefilledRoute] },
    });
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /confirm & send link/i })).toBeEnabled();
    });
    await user.click(screen.getByRole("button", { name: /confirm & send link/i }));
    const { toast } = await import("sonner");
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled();
    });
  });
});
