import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import QuestionnaireExpiredPage from "@/features/questionnaire/pages/QuestionnaireExpiredPage";
import { renderWithRouter } from "../../../helpers/render-with-router";

vi.mock("@/features/questionnaire/components/QuestionnaireShell", () => ({
  QuestionnaireShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe("QuestionnaireExpiredPage", () => {
  it("renders expired link messaging", () => {
    renderWithRouter(<QuestionnaireExpiredPage />);
    expect(screen.getByRole("heading", { name: /this link has expired/i })).toBeInTheDocument();
    expect(screen.getByText(/why did this happen/i)).toBeInTheDocument();
    expect(screen.getByText(/request a new link/i)).toBeInTheDocument();
  });
});
