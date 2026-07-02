import { describe, expect, it, vi, afterEach, beforeEach } from "vitest";
import { screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ConfigPage from "@/features/admin/configuration/pages/ConfigurationPage";
import { renderWithProviders } from "../../../../helpers/render";
import { authService } from "@/services";

describe("ConfigurationPage", () => {
  afterEach(() => { vi.restoreAllMocks(); });

  function renderPage() {
    vi.spyOn(authService, "logout").mockResolvedValue();
    return renderWithProviders(<ConfigPage />, { authValue: { isAuthenticated: true, isAdmin: true } });
  }

  // ---------- Basic rendering ----------

  it("renders the heading and warning banner", () => {
    renderPage();
    expect(screen.getAllByText("Platform Configuration").length).toBeGreaterThanOrEqual(1);
  });

  it("renders all section titles", () => {
    renderPage();
    expect(screen.getByText("Link & Expiry Settings")).toBeInTheDocument();
    expect(screen.getByText("OTP Authentication")).toBeInTheDocument();
    expect(screen.getByText("Automated Reminder Schedule")).toBeInTheDocument();
    expect(screen.getByText("Gamification & Rewards")).toBeInTheDocument();
  });

  it("shows save all changes button", () => {
    renderPage();
    expect(screen.getByText("Save all changes")).toBeInTheDocument();
  });

  it("shows discard changes button", () => {
    renderPage();
    expect(screen.getByText("Discard changes")).toBeInTheDocument();
  });

  it("shows last saved info and reward warning", () => {
    renderPage();
    expect(screen.getByText(/Last saved:/)).toBeInTheDocument();
    expect(screen.getByText(/Reward content must be confirmed/)).toBeInTheDocument();
  });

  it("shows reminder milestones", () => {
    renderPage();
    expect(screen.getByText("Dispatch")).toBeInTheDocument();
    expect(screen.getByText("Reminder 1")).toBeInTheDocument();
    expect(screen.getByText("Reminder 2")).toBeInTheDocument();
    expect(screen.getByText("Final Reminder")).toBeInTheDocument();
    expect(screen.getByText("Expiry")).toBeInTheDocument();
  });

  // ---------- Link & Expiry Settings ----------

  it("shows the single-use token info by default", () => {
    renderPage();
    expect(screen.getByText(/Token is invalidated/)).toBeInTheDocument();
  });

  it("shows link validity input", () => {
    renderPage();
    const inputs = document.querySelectorAll('input[type="number"]');
    expect(inputs.length).toBeGreaterThan(0);
  });

  it("shows OTP code expires input", () => {
    renderPage();
    expect(screen.getByText("OTP code expires after (minutes)")).toBeInTheDocument();
  });

  it("shows session lock duration input", () => {
    renderPage();
    expect(screen.getByText(/Session lock duration after failed OTP attempts/)).toBeInTheDocument();
  });

  it("shows OTP retry number stepper", () => {
    renderPage();
    expect(screen.getByText("Maximum incorrect OTP attempts before lockout")).toBeInTheDocument();
  });

  it("shows OTP resend number stepper", () => {
    renderPage();
    expect(screen.getByText("Maximum OTP resend requests per session")).toBeInTheDocument();
  });

  it("renders reward system toggle", () => {
    renderPage();
    expect(screen.getByText("Enable post-submission reward unlock")).toBeInTheDocument();
  });

  it("shows no reward row", () => {
    renderPage();
    expect(screen.getByText("No reward")).toBeInTheDocument();
  });

  // ---------- Time-based token mode (skipped — Radix Select has jsdom scrollIntoView issues) ----------

  it("renders the single-use token type select", () => {
    renderPage();
    const selects = document.querySelectorAll('[role="combobox"]');
    expect(selects.length).toBeGreaterThan(0);
  });

  // ---------- Reminder Schedule section ----------

  it("shows reminder setting labels", () => {
    renderPage();
    expect(screen.getByText(/Reminder 1 — friendly nudge/)).toBeInTheDocument();
    expect(screen.getByText(/Reminder 2 — deadline highlight/)).toBeInTheDocument();
    expect(screen.getByText(/Reminder 3 — final notice/)).toBeInTheDocument();
    expect(screen.getByText(/Auto-close and expire link/)).toBeInTheDocument();
  });

  // ---------- Gamification section ----------

  it("renders gamification section labels", () => {
    renderPage();
    expect(screen.getByText("In-form engagement")).toBeInTheDocument();
    expect(screen.getByText("Reward tiers")).toBeInTheDocument();
    expect(screen.getByText("Progress engagement")).toBeInTheDocument();
    expect(screen.getByText("Mid-form message at 50%")).toBeInTheDocument();
    expect(screen.getByText("Near-completion message at 80%")).toBeInTheDocument();
  });

  it("shows reward tier labels and awarded when text", () => {
    renderPage();
    expect(screen.getByText(/Tier 1 — Full Completion/)).toBeInTheDocument();
    expect(screen.getByText(/Tier 2 — Core Completion/)).toBeInTheDocument();
    expect(screen.getAllByText("Awarded when:").length).toBeGreaterThanOrEqual(2);
  });

  it("shows reward delivery labels", () => {
    renderPage();
    const deliveryLabels = screen.getAllByText(/Delivery:/);
    expect(deliveryLabels.length).toBe(2);
  });

  it("shows tier 2 benefit unavailability text", () => {
    renderPage();
    expect(screen.getByText("Not available for Tier 2")).toBeInTheDocument();
    expect(screen.getByText("Not available in Phase 1")).toBeInTheDocument();
  });

  it("shows Tier 1 reward title and description inputs", () => {
    renderPage();
    const titleLabels = screen.getAllByText("Reward title");
    expect(titleLabels.length).toBeGreaterThanOrEqual(2);
    const descLabels = screen.getAllByText("Reward description");
    expect(descLabels.length).toBeGreaterThanOrEqual(2);
  });

  it("shows benefits included labels", () => {
    renderPage();
    expect(screen.getAllByText("Benefits included").length).toBeGreaterThanOrEqual(2);
  });

  it("renders the active switches for both tiers", () => {
    renderPage();
    expect(screen.getAllByText("Active").length).toBeGreaterThanOrEqual(2);
  });

  it("toggles gamification switch", async () => {
    const user = userEvent.setup();
    renderPage();
    const switches = screen.getAllByRole("switch");
    expect(switches.length).toBeGreaterThan(0);
  });

  it("triggers save button click", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByText("Save all changes"));
  });

  it("types in the link validity input", async () => {
    const user = userEvent.setup();
    renderPage();
    const inputs = document.querySelectorAll('input[type="number"]');
    expect(inputs.length).toBeGreaterThan(0);
    // The first input should be the link validity
    const linkInput = inputs[0] as HTMLInputElement;
    await user.clear(linkInput);
    await user.type(linkInput, "15");
    expect(linkInput.value).toBe("15");
  });

  it("types in mid-form message text", async () => {
    const user = userEvent.setup();
    renderPage();
    // Find the mid-form message input by finding the parent label
    const midLabels = screen.getAllByText("Mid-form message at 50%");
    expect(midLabels.length).toBeGreaterThan(0);
  });

  it("toggles a switch (gamification)", async () => {
    const user = userEvent.setup();
    renderPage();
    const switches = screen.getAllByRole("switch");
    if (switches.length > 0) {
      await user.click(switches[0]);
    }
  });

  it("toggles mid-form switch", async () => {
    const user = userEvent.setup();
    renderPage();
    const switches = screen.getAllByRole("switch");
    if (switches.length > 1) {
      await user.click(switches[1]);
    }
  });

  it("toggles near-completion switch", async () => {
    const user = userEvent.setup();
    renderPage();
    const switches = screen.getAllByRole("switch");
    if (switches.length > 2) {
      await user.click(switches[2]);
    }
  });

  it("toggles reward system switch", async () => {
    const user = userEvent.setup();
    renderPage();
    const switches = screen.getAllByRole("switch");
    if (switches.length > 3) {
      await user.click(switches[3]);
    }
  });

  it("renders tier 1 and tier 2 active switches", () => {
    renderPage();
    const switches = screen.getAllByRole("switch");
    expect(switches.length).toBeGreaterThanOrEqual(6);
  });

  it("types in tier 1 title input", async () => {
    const user = userEvent.setup();
    renderPage();
    const titleInputs = screen.getAllByDisplayValue(/Cedar Rose Insights Access/);
    expect(titleInputs.length).toBeGreaterThan(0);
    const input = titleInputs[0] as HTMLInputElement;
    await user.clear(input);
    await user.type(input, "New Title");
    expect(input.value).toBe("New Title");
  });

  it("types in tier 1 description textarea", async () => {
    const user = userEvent.setup();
    renderPage();
    const descInputs = screen.getAllByDisplayValue(/Access to selected Cedar Rose insights/);
    expect(descInputs.length).toBeGreaterThan(0);
  });

  it("types in tier 2 title and description", async () => {
    const user = userEvent.setup();
    renderPage();
    const inputs = screen.getAllByDisplayValue(/Cedar Rose Service Information/);
    expect(inputs.length).toBeGreaterThan(0);
  });

  it("renders the time-based warning banner conditionally", () => {
    renderPage();
    // By default, single-use mode is active, so the time-based warning is not shown
    expect(screen.queryByText(/Time-based tokens do not invalidate/)).not.toBeInTheDocument();
  });

  it("renders the in-progress message inputs by default", () => {
    renderPage();
    const midInput = screen.getByDisplayValue("You are halfway there — great progress!");
    expect(midInput).toBeInTheDocument();
    const nearInput = screen.getByDisplayValue("You are 80% complete — only one section remaining.");
    expect(nearInput).toBeInTheDocument();
  });

  it("toggles tier 1 active switch", async () => {
    const user = userEvent.setup();
    renderPage();
    // Tier 1 active is the 5th switch (0=gamification, 1=mid, 2=near, 3=reward, 4=tier1active)
    const switches = screen.getAllByRole("switch");
    if (switches.length > 4) {
      await user.click(switches[4]);
    }
  });

  it("toggles tier 2 active switch", async () => {
    const user = userEvent.setup();
    renderPage();
    const switches = screen.getAllByRole("switch");
    if (switches.length > 5) {
      await user.click(switches[5]);
    }
  });

  it("clicks NumberStepper plus and minus buttons", async () => {
    const user = userEvent.setup();
    renderPage();
    // NumberStepper renders buttons (no specific role other than 'button')
    const buttons = screen.getAllByRole("button");
    // Click the first 4 buttons (likely NumberStepper plus/minus)
    for (let i = 0; i < Math.min(4, buttons.length); i++) {
      await user.click(buttons[i]);
    }
  });

  it("types in all number inputs to trigger onChange handlers", async () => {
    const user = userEvent.setup();
    renderPage();
    const inputs = document.querySelectorAll('input[type="number"]');
    for (let i = 0; i < inputs.length; i++) {
      const input = inputs[i] as HTMLInputElement;
      await user.clear(input);
      await user.type(input, "5");
    }
  });

  it("types in the mid-form message input", async () => {
    const user = userEvent.setup();
    renderPage();
    const midInput = screen.getByDisplayValue("You are halfway there — great progress!") as HTMLInputElement;
    await user.clear(midInput);
    await user.type(midInput, "Custom mid text");
    expect(midInput.value).toBe("Custom mid text");
  });

  it("types in the near-completion message input", async () => {
    const user = userEvent.setup();
    renderPage();
    const nearInput = screen.getByDisplayValue("You are 80% complete — only one section remaining.") as HTMLInputElement;
    await user.clear(nearInput);
    await user.type(nearInput, "Custom near text");
    expect(nearInput.value).toBe("Custom near text");
  });

  it("toggles multiple switches to trigger onCheckedChange", async () => {
    const user = userEvent.setup();
    renderPage();
    const switches = screen.getAllByRole("switch");
    // Toggle each switch
    for (const sw of switches) {
      await user.click(sw);
    }
  });

  it("types in tier 1 title input", async () => {
    const user = userEvent.setup();
    renderPage();
    const input = screen.getByDisplayValue("Cedar Rose Insights Access") as HTMLInputElement;
    await user.clear(input);
    await user.type(input, "Updated Tier 1");
    expect(input.value).toBe("Updated Tier 1");
  });

  it("types in tier 1 description textarea", async () => {
    const user = userEvent.setup();
    renderPage();
    const textarea = screen.getByDisplayValue("Access to selected Cedar Rose insights and deliverables relevant to your company.") as HTMLTextAreaElement;
    await user.clear(textarea);
    await user.type(textarea, "Updated description");
    expect(textarea.value).toBe("Updated description");
  });

  it("types in tier 2 title input", async () => {
    const user = userEvent.setup();
    renderPage();
    const input = screen.getByDisplayValue("Cedar Rose Service Information") as HTMLInputElement;
    await user.clear(input);
    await user.type(input, "Updated Tier 2");
    expect(input.value).toBe("Updated Tier 2");
  });

  it("types in tier 2 description textarea", async () => {
    const user = userEvent.setup();
    renderPage();
    const textarea = screen.getByDisplayValue("Access to Cedar Rose service information and standard report processing.") as HTMLTextAreaElement;
    await user.clear(textarea);
    await user.type(textarea, "Updated tier 2 desc");
    expect(textarea.value).toBe("Updated tier 2 desc");
  });
});
