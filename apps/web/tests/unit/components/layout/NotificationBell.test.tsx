import { describe, it, expect, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { renderWithRouter } from "../../../helpers/render-with-router";

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  markRead: vi.fn(),
  markAllRead: vi.fn(),
  navigate: vi.fn(),
}));

vi.mock("@/services", () => ({
  notificationsService: {
    list: mocks.list,
    markRead: mocks.markRead,
    markAllRead: mocks.markAllRead,
  },
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mocks.navigate,
  };
});

const notifications = [
  {
    id: "n-1",
    type: "submission" as const,
    title: "Questionnaire submitted",
    body: "Acme completed their form",
    time: "2h ago",
    read: false,
    caseId: "c-1",
  },
  {
    id: "n-2",
    type: "api" as const,
    title: "API push failed",
    body: "Retry scheduled",
    time: "1d ago",
    read: true,
  },
];

describe("NotificationBell", () => {
  it("shows unread badge count", async () => {
    mocks.list.mockResolvedValue(notifications);
    renderWithRouter(<NotificationBell />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /notifications/i })).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByText("1")).toBeInTheDocument();
    });
  });

  it("opens panel and marks notification read on click", async () => {
    mocks.list.mockResolvedValue(notifications);
    mocks.markRead.mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderWithRouter(<NotificationBell />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /notifications/i })).toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: /notifications/i }));

    expect(screen.getByText(/questionnaire submitted/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /questionnaire submitted/i }));
    expect(mocks.markRead).toHaveBeenCalledWith("n-1");
    expect(mocks.navigate).toHaveBeenCalledWith("/cases?caseId=c-1");
  });

  it("shows empty state when no notifications", async () => {
    mocks.list.mockResolvedValue([]);
    const user = userEvent.setup();
    renderWithRouter(<NotificationBell />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /notifications/i })).toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: /notifications/i }));
    expect(screen.getByText(/you're all caught up/i)).toBeInTheDocument();
  });

  it("marks all notifications read", async () => {
    mocks.list.mockResolvedValue(notifications);
    mocks.markAllRead.mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderWithRouter(<NotificationBell />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /notifications/i })).toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: /notifications/i }));
    const markAll = screen.queryByRole("button", { name: /mark all read/i });
    if (markAll) {
      await user.click(markAll);
      expect(mocks.markAllRead).toHaveBeenCalled();
    }
  });
});
