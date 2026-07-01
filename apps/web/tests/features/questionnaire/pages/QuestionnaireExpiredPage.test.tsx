import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import QuestionnaireExpiredPage from "@/features/questionnaire/pages/QuestionnaireExpiredPage";
import { renderWithProviders } from "../../../helpers/render";

describe("QuestionnaireExpiredPage", () => {
  it("renders the expired heading", () => {
    renderWithProviders(<QuestionnaireExpiredPage />);
    expect(screen.getByText("This link is no longer valid")).toBeInTheDocument();
    expect(screen.getByText("Cedar Rose")).toBeInTheDocument();
  });
});
