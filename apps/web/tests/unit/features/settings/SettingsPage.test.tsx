import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SettingsPage from "@/features/settings/pages/SettingsPage";

vi.mock("@/components/layout/AppShell", () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe("SettingsPage", () => {
  it("renders settings sections and controls", async () => {
    const user = userEvent.setup();
    render(<SettingsPage />);
    expect(screen.getByRole("heading", { name: /settings/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /profile/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /password/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /notifications/i })).toBeInTheDocument();
    expect(screen.getByDisplayValue("David Chen")).toBeInTheDocument();
    await user.click(screen.getAllByRole("switch")[0]);
    expect(screen.getByRole("button", { name: /save changes/i })).toBeInTheDocument();
  });
});
