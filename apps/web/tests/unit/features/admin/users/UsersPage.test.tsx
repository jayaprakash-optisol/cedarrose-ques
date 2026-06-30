import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, waitFor, within, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import UsersPage from "@/features/admin/users/pages/UsersPage";
import { renderWithRouter } from "../../../../helpers/render-with-router";

vi.mock("@/components/layout/AppShell", () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

async function waitForUsers() {
  await waitFor(() => {
    expect(screen.getByText(/ann magdy/i)).toBeInTheDocument();
  });
}

async function fillUserForm(user: ReturnType<typeof userEvent.setup>, opts: {
  first?: string;
  last?: string;
  email?: string;
  automationRole?: string;
}) {
  const dialog = screen.getByRole("dialog");
  if (opts.first !== undefined) {
    await user.clear(within(dialog).getByPlaceholderText("John"));
    await user.type(within(dialog).getByPlaceholderText("John"), opts.first);
  }
  if (opts.last !== undefined) {
    await user.clear(within(dialog).getByPlaceholderText("Smith"));
    await user.type(within(dialog).getByPlaceholderText("Smith"), opts.last);
  }
  if (opts.email !== undefined) {
    await user.clear(within(dialog).getByPlaceholderText("john.smith@email.com"));
    await user.type(within(dialog).getByPlaceholderText("john.smith@email.com"), opts.email);
  }
  if (opts.automationRole) {
    const automationCard = within(dialog).getByText(/qa automation platform/i).closest(".rounded-\\[10px\\]")!;
    const autoSwitch = within(automationCard as HTMLElement).getByRole("switch");
    if (autoSwitch.getAttribute("data-state") !== "checked") {
      await user.click(autoSwitch);
    }
    const roleSelect = within(automationCard as HTMLElement).getByRole("combobox");
    await user.click(roleSelect);
    await user.click(await screen.findByRole("option", { name: opts.automationRole }));
  }
}

describe("UsersPage", () => {
  const writeText = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    writeText.mockClear();
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders user table for researchers", async () => {
    renderWithRouter(<UsersPage />);
    await waitFor(() => {
      expect(screen.getByText(/user management/i)).toBeInTheDocument();
    });
    await waitForUsers();
  });

  it("switches role tabs including reviewers and admins", async () => {
    const user = userEvent.setup();
    renderWithRouter(<UsersPage />);
    await waitForUsers();

    await user.click(screen.getByRole("button", { name: /analysts/i }));
    await waitFor(() => {
      expect(screen.getByText(/david chen/i)).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /reviewers/i }));
    await waitFor(() => {
      expect(screen.getByText(/sarah mitchell/i)).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /admins/i }));
    await waitFor(() => {
      expect(screen.getByText(/cynthia gebeily/i)).toBeInTheDocument();
    });
  });

  it("opens add user modal", async () => {
    const user = userEvent.setup();
    renderWithRouter(<UsersPage />);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /add user/i })).toBeEnabled();
    });

    await user.click(screen.getByRole("button", { name: /add user/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("shows validation errors in add user modal", async () => {
    const user = userEvent.setup();
    renderWithRouter(<UsersPage />);
    await waitForUsers();
    await user.click(screen.getByRole("button", { name: /add user/i }));

    await user.click(screen.getByRole("button", { name: /add user & send invitation/i }));
    expect(screen.getByText(/first name is required/i)).toBeInTheDocument();
    expect(screen.getByText(/last name is required/i)).toBeInTheDocument();
    expect(screen.getByText(/enter a valid email address/i)).toBeInTheDocument();
    expect(screen.getByText(/grant access to at least one application/i)).toBeInTheDocument();
  });

  it("submits add user form with fake timers", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderWithRouter(<UsersPage />);
    await waitForUsers();

    await user.click(screen.getByRole("button", { name: /analysts/i }));
    await user.click(screen.getByRole("button", { name: /add user/i }));
    await fillUserForm(user, {
      first: "Jane",
      last: "Doe",
      email: "jane.doe@example.com",
    });

    const dialog = screen.getByRole("dialog");
    const questRoleSelect = within(dialog).getAllByRole("combobox")[0];
    await user.click(questRoleSelect);
    await user.click(await screen.findByRole("option", { name: "Analyst" }));

    await user.click(screen.getByRole("button", { name: /add user & send invitation/i }));
    await vi.advanceTimersByTimeAsync(1500);

    const { toast } = await import("sonner");
    expect(toast.success).toHaveBeenCalledWith(expect.stringContaining("Jane Doe"));
    await waitFor(() => {
      expect(screen.getByText(/invitation sent successfully/i)).toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: /^close$/i }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("copies user id", async () => {
    const user = userEvent.setup();
    renderWithRouter(<UsersPage />);
    await waitForUsers();

    await user.click(screen.getAllByTitle("Copy ID")[0]);

    const { toast } = await import("sonner");
    expect(toast.success).toHaveBeenCalledWith("User ID copied");
  });

  it("opens view sheet with user details", async () => {
    const user = userEvent.setup();
    renderWithRouter(<UsersPage />);
    await waitForUsers();

    await user.click(screen.getAllByTitle("View")[0]);
    expect(screen.getByText(/user details/i)).toBeInTheDocument();
    expect(screen.getByText(/ann magdy/i)).toBeInTheDocument();
  });

  it("exports csv", async () => {
    const user = userEvent.setup();
    renderWithRouter(<UsersPage />);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /export csv/i })).toBeEnabled();
    });

    const createUrl = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:users");
    const revoke = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    await user.click(screen.getByRole("button", { name: /export csv/i }));
    expect(createUrl).toHaveBeenCalled();
    createUrl.mockRestore();
    revoke.mockRestore();
  });

  it("opens edit user modal and saves changes", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderWithRouter(<UsersPage />);
    await waitFor(() => {
      expect(screen.getAllByTitle("Edit").length).toBeGreaterThan(0);
    });

    await user.click(screen.getAllByTitle("Edit")[0]);
    const dialog = screen.getByRole("dialog");
    const firstName = within(dialog).getByPlaceholderText("John");
    await user.clear(firstName);
    await user.type(firstName, "Anna");

    await user.click(screen.getByRole("button", { name: /save changes/i }));
    await vi.advanceTimersByTimeAsync(1500);

    const { toast } = await import("sonner");
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalled();
      expect(screen.getByText(/invitation sent successfully/i)).toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: /^close$/i }));
  });

  it("deletes a user", async () => {
    const user = userEvent.setup();
    renderWithRouter(<UsersPage />);
    await waitForUsers();

    await user.click(screen.getAllByTitle("Delete")[0]);
    await user.click(screen.getByRole("button", { name: /yes, remove/i }));

    const { toast } = await import("sonner");
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalled();
    });
  });

  it("toggles app cards in add user modal", async () => {
    const user = userEvent.setup();
    renderWithRouter(<UsersPage />);
    await waitForUsers();
    await user.click(screen.getByRole("button", { name: /add user/i }));

    const dialog = screen.getByRole("dialog");
    const autoCard = within(dialog).getByText(/qa automation platform/i).closest(".rounded-\\[10px\\]")!;
    const autoSwitch = within(autoCard as HTMLElement).getByRole("switch");
    await user.click(autoSwitch);
    await user.click(autoSwitch);

    const questCard = within(dialog).getByText(/qa questionnaire platform/i).closest(".rounded-\\[10px\\]")!;
    const questSwitch = within(questCard as HTMLElement).getByRole("switch");
    await user.click(questSwitch);
    await user.click(questSwitch);
  });

  it("cancels add user modal", async () => {
    const user = userEvent.setup();
    renderWithRouter(<UsersPage />);
    await waitForUsers();
    await user.click(screen.getByRole("button", { name: /add user/i }));
    await user.click(screen.getByRole("button", { name: /^cancel$/i }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
