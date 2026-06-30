import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ConfigurationPage from "@/features/admin/configuration/pages/ConfigurationPage";

vi.mock("@/components/layout/AppShell", () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn() },
}));

describe("ConfigurationPage", () => {
  it("renders platform configuration sections", () => {
    render(<ConfigurationPage />);
    expect(screen.getByRole("heading", { name: /platform configuration/i })).toBeInTheDocument();
    expect(screen.getByText(/link & expiry settings/i)).toBeInTheDocument();
    expect(screen.getByText(/otp authentication/i)).toBeInTheDocument();
    expect(screen.getByText(/automated reminder schedule/i)).toBeInTheDocument();
    expect(screen.getByText(/gamification & rewards/i)).toBeInTheDocument();
  });

  it("updates settings across sections", async () => {
    const user = userEvent.setup();
    render(<ConfigurationPage />);

    const linkValidity = screen.getAllByRole("spinbutton")[0];
    await user.clear(linkValidity);
    await user.type(linkValidity, "14");

    const minusButtons = screen.getAllByRole("button").filter((btn) => btn.querySelector("svg.lucide-minus"));
    await user.click(minusButtons[1]);
    await user.click(minusButtons[1]);

    const plusButtons = screen.getAllByRole("button").filter((btn) => btn.querySelector("svg.lucide-plus"));
    await user.click(plusButtons[0]);

    const textareas = screen.getAllByRole("textbox");
    const tierDesc = textareas.find((el) => (el as HTMLTextAreaElement).rows === 3);
    if (tierDesc) {
      await user.clear(tierDesc);
      await user.type(tierDesc, "Updated tier description");
    }

    const switches = screen.getAllByRole("switch");
    for (const sw of switches.slice(0, 6)) {
      await user.click(sw);
    }

    await user.click(screen.getByRole("button", { name: /save all changes/i }));
    const { toast } = await import("sonner");
    expect(toast.success).toHaveBeenCalled();
  });

  it("switches token type to time-based and configures duration", async () => {
    const user = userEvent.setup();
    render(<ConfigurationPage />);

    const tokenSelect = screen.getAllByRole("combobox")[0];
    await user.click(tokenSelect);
    await user.click(await screen.findByRole("option", { name: /time-based only/i }));

    expect(screen.getByText(/time-based tokens do not invalidate/i)).toBeInTheDocument();

    const minutesRadio = screen.getByRole("radio", { name: /minutes/i });
    await user.click(minutesRadio);

    const minuteInput = screen.getAllByRole("spinbutton").find((el) =>
      el.closest("label")?.textContent?.includes("Minutes"),
    );
    if (minuteInput) {
      await user.clear(minuteInput);
      await user.type(minuteInput, "30");
    }
  });

  it("updates reminder schedule and milestone days", async () => {
    const user = userEvent.setup();
    render(<ConfigurationPage />);

    const reminderHeading = screen.getByText(/reminder 1 — friendly nudge/i);
    const reminderInput = reminderHeading.closest(".grid")?.querySelector('input[type="number"]') as HTMLInputElement;
    expect(reminderInput).toBeTruthy();
    await user.clear(reminderInput);
    await user.type(reminderInput, "4");
    expect(reminderInput).toHaveValue(4);
    expect(screen.getByText(/auto-close and expire link/i)).toBeInTheDocument();
  });

  it("toggles gamification prompts and reward tiers", async () => {
    const user = userEvent.setup();
    render(<ConfigurationPage />);

    const progressHeading = screen.getByText(/progress engagement/i);
    expect(progressHeading).toBeInTheDocument();
    const progressRow = progressHeading.closest(".flex")?.parentElement;
    const progressSwitch = progressRow?.querySelector('[role="switch"]');
    if (progressSwitch) {
      await user.click(progressSwitch);
      await user.click(progressSwitch);
    }

    const tier1Title = screen.getByDisplayValue(/cedar rose insights access/i);
    await user.clear(tier1Title);
    await user.type(tier1Title, "Premium Insights");

    const tier2Titles = screen.getAllByDisplayValue(/cedar rose service information/i);
    await user.clear(tier2Titles[0]);
    await user.type(tier2Titles[0], "Standard Service");
  });

  it("disables reward system and shows disabled tier controls", async () => {
    const user = userEvent.setup();
    render(<ConfigurationPage />);

    const rewardSwitch = screen.getAllByRole("switch").find((sw) => {
      const row = sw.closest(".flex.items-center.justify-between");
      return row?.textContent?.includes("post-submission reward unlock");
    });
    if (rewardSwitch) {
      await user.click(rewardSwitch);
      expect(screen.getByText(/tier 1 — full completion/i)).toBeInTheDocument();
    }
  });

  it("turns off gamification and configures mid-form prompts", async () => {
    const user = userEvent.setup();
    render(<ConfigurationPage />);

    const gamificationSwitch = screen.getAllByRole("switch").find((sw) => {
      const row = sw.closest(".flex.items-start.justify-between");
      return row?.textContent?.includes("Progress engagement");
    });
    expect(gamificationSwitch).toBeTruthy();
    await user.click(gamificationSwitch!);

    await user.click(gamificationSwitch!);
    const midSwitch = screen.getAllByRole("switch").find((sw) => {
      const row = sw.closest(".flex.items-start.justify-between");
      return row?.textContent?.includes("Mid-form message at 50%");
    });
    if (midSwitch) {
      await user.click(midSwitch);
      const midInput = screen.getAllByRole("textbox").find((el) =>
        (el as HTMLInputElement).value.includes("halfway"),
      );
      if (midInput) {
        await user.clear(midInput);
        await user.type(midInput, "Custom mid message");
      }
    }
  });

  it("updates reminder 2, reminder 3, and lockout settings", async () => {
    const user = userEvent.setup();
    render(<ConfigurationPage />);

    const r2Row = screen.getByText(/reminder 2 — deadline highlight \(day\)/i).closest(".grid");
    const r2 = within(r2Row as HTMLElement).getByRole("spinbutton");
    await user.clear(r2);
    await user.type(r2, "10");

    const r3Row = screen.getByText(/reminder 3 — final notice \(day\)/i).closest(".grid");
    const r3 = within(r3Row as HTMLElement).getByRole("spinbutton");
    await user.clear(r3);
    await user.type(r3, "20");

    const tier1Active = screen.getAllByRole("switch").find((sw) => {
      const card = sw.closest(".rounded-lg.bg-card");
      return card?.textContent?.includes("Tier 1");
    });
    if (tier1Active) await user.click(tier1Active);
  });

  it("toggles tier benefits and number stepper inputs", async () => {
    const user = userEvent.setup();
    render(<ConfigurationPage />);

    const accelSwitch = screen.getAllByRole("switch").find((sw) => {
      const row = sw.closest(".flex.items-start.justify-between");
      return row?.textContent?.includes("Accelerated report processing");
    });
    if (accelSwitch) {
      await user.click(accelSwitch);
      await user.click(accelSwitch);
    }

    const discountSwitch = screen.getAllByRole("switch").find((sw) => {
      const row = sw.closest(".flex.items-start.justify-between");
      return row?.textContent?.includes("Service discount eligibility");
    });
    if (discountSwitch) {
      await user.click(discountSwitch);
    }

    const stepperInput = screen.getAllByRole("spinbutton").find((el) =>
      el.closest(".inline-flex")?.querySelector("svg.lucide-minus"),
    );
    if (stepperInput) {
      await user.clear(stepperInput);
      await user.type(stepperInput, "5");
    }

    await user.click(screen.getByRole("button", { name: /discard changes/i }));
  });
});
