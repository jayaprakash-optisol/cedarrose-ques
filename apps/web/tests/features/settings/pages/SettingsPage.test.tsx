import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SettingsPage from "@/features/settings/pages/SettingsPage";
import { Toaster } from "@/components/ui/sonner";
import { settingsService } from "@/services";
import { ApiError } from "@/services/api/errors";
import { renderWithProviders } from "../../../helpers/render";

const defaultSettings = {
  user: { id: "u1", name: "Jane", email: "j@e.com", role: "analyst" as const, title: "T", initials: "J" },
  preferences: {
    notifyOnSubmission: true,
    notifyOnLinkExpiry: true,
    notifyOnBlockedDispatch: true,
    notifyOnRemindersSent: true,
  },
};

const defaultAuth = {
  user: defaultSettings.user,
  isAuthenticated: true,
};

function renderSettings(authValue = defaultAuth) {
  return renderWithProviders(
    <>
      <SettingsPage />
      <Toaster />
    </>,
    { authValue },
  );
}

describe("SettingsPage", () => {
  beforeEach(() => vi.restoreAllMocks());
  afterEach(() => vi.restoreAllMocks());

  it("renders the Settings heading", async () => {
    vi.spyOn(settingsService, "get").mockResolvedValue(defaultSettings);
    renderSettings();
    expect(await screen.findByRole("heading", { name: "Settings" })).toBeInTheDocument();
  });

  it("updates the name field", async () => {
    const user = userEvent.setup();
    vi.spyOn(settingsService, "get").mockResolvedValue(defaultSettings);
    renderSettings();
    const nameInput = await screen.findByDisplayValue("Jane");
    await user.clear(nameInput);
    await user.type(nameInput, "Jane Updated");
    expect(nameInput).toHaveValue("Jane Updated");
  });

  it("toggles a notification preference", async () => {
    const user = userEvent.setup();
    vi.spyOn(settingsService, "get").mockResolvedValue(defaultSettings);
    renderSettings();
    const row = await screen.findByText("Notify me on new submissions");
    const toggle = within(row.parentElement!).getByRole("switch");
    await user.click(toggle);
    expect(toggle).toHaveAttribute("data-state", "unchecked");
  });

  it("saves settings successfully", async () => {
    const user = userEvent.setup();
    vi.spyOn(settingsService, "get").mockResolvedValue(defaultSettings);
    const saveSpy = vi.spyOn(settingsService, "save").mockResolvedValue(defaultSettings);
    renderSettings();
    await user.click(await screen.findByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(saveSpy).toHaveBeenCalled());
  });

  it("shows an error toast when save fails with an ApiError", async () => {
    const user = userEvent.setup();
    vi.spyOn(settingsService, "get").mockResolvedValue(defaultSettings);
    vi.spyOn(settingsService, "save").mockRejectedValue(new ApiError("BAD", "Save failed", 500));
    renderSettings();
    await user.click(await screen.findByRole("button", { name: "Save changes" }));
    expect(await screen.findByText("Save failed")).toBeInTheDocument();
  });

  it("shows a generic error toast on non-ApiError save failure", async () => {
    const user = userEvent.setup();
    vi.spyOn(settingsService, "get").mockResolvedValue(defaultSettings);
    vi.spyOn(settingsService, "save").mockRejectedValue(new Error("boom"));
    renderSettings();
    await user.click(await screen.findByRole("button", { name: "Save changes" }));
    expect(await screen.findByText("Failed to save settings.")).toBeInTheDocument();
  });

  it("rejects mismatched passwords", async () => {
    const user = userEvent.setup();
    vi.spyOn(settingsService, "get").mockResolvedValue(defaultSettings);
    renderSettings();
    await user.type(await screen.findByPlaceholderText("••••••••"), "old12345");
    await user.type(screen.getByPlaceholderText("At least 8 characters"), "newpass1");
    await user.type(screen.getByPlaceholderText("Re-enter new password"), "different2");
    await user.click(screen.getByRole("button", { name: /Update password/ }));
    expect(
      await screen.findByText("New password and confirm password do not match."),
    ).toBeInTheDocument();
  });

  it("rejects passwords shorter than 8 characters", async () => {
    const user = userEvent.setup();
    vi.spyOn(settingsService, "get").mockResolvedValue(defaultSettings);
    renderSettings();
    await user.type(await screen.findByPlaceholderText("••••••••"), "oldpass1");
    await user.type(screen.getByPlaceholderText("At least 8 characters"), "short");
    await user.type(screen.getByPlaceholderText("Re-enter new password"), "short");
    await user.click(screen.getByRole("button", { name: /Update password/ }));
    expect(
      await screen.findByText("New password must be at least 8 characters."),
    ).toBeInTheDocument();
  });

  it("changes the password successfully", async () => {
    const user = userEvent.setup();
    vi.spyOn(settingsService, "get").mockResolvedValue(defaultSettings);
    const changeSpy = vi.spyOn(settingsService, "changePassword").mockResolvedValue();
    renderSettings();
    await user.type(await screen.findByPlaceholderText("••••••••"), "oldpass1");
    await user.type(screen.getByPlaceholderText("At least 8 characters"), "newpass1");
    await user.type(screen.getByPlaceholderText("Re-enter new password"), "newpass1");
    await user.click(screen.getByRole("button", { name: /Update password/ }));
    await waitFor(() => expect(changeSpy).toHaveBeenCalledWith("oldpass1", "newpass1", "newpass1"));
  });
});
