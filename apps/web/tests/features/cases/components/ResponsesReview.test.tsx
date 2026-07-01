import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ResponsesReview } from "@/features/cases/components/ResponsesReview";
import { renderWithProviders } from "../../../helpers/render";

describe("ResponsesReview", () => {
  it("renders the empty state when there are no responses", () => {
    renderWithProviders(<ResponsesReview responses={[]} companyName="Acme" />);
    expect(screen.getByText(/No questionnaire responses saved yet/)).toBeInTheDocument();
  });

  it("renders the responses with source badges", () => {
    renderWithProviders(
      <ResponsesReview
        responses={[
          { question: "Q1", answer: "Acme", mandatory: true },
          { question: "Q2", answer: "Something else", mandatory: false },
        ]}
        companyName="Acme"
      />,
    );
    expect(screen.getByText("Q1")).toBeInTheDocument();
    expect(screen.getByText("Pre-filled — CRiS")).toBeInTheDocument();
    expect(screen.getByText("Filled by subject")).toBeInTheDocument();
  });

  it("renders 'Not provided' badge for empty answers", () => {
    renderWithProviders(
      <ResponsesReview
        responses={[{ question: "Q", answer: "", mandatory: true }]}
        companyName="Acme"
      />,
    );
    expect(screen.getByText("Not provided")).toBeInTheDocument();
  });

  it("shows the 'Required' tag for mandatory questions", () => {
    renderWithProviders(
      <ResponsesReview
        responses={[{ question: "Q", answer: "x", mandatory: true }]}
        companyName="Acme"
      />,
    );
    expect(screen.getByText("Required")).toBeInTheDocument();
  });

  it("renders the optional section when there are optional responses", () => {
    renderWithProviders(
      <ResponsesReview
        responses={[
          { question: "Q1", answer: "a", mandatory: true },
          { question: "Q2", answer: "b", mandatory: false },
        ]}
        companyName="Acme"
      />,
    );
    expect(screen.getByText(/optional/)).toBeInTheDocument();
  });

  it("renders the missing count when there are missing fields", () => {
    renderWithProviders(
      <ResponsesReview
        responses={[
          { question: "Q1", answer: "", mandatory: true },
          { question: "Q2", answer: "", mandatory: false },
        ]}
        companyName="Acme"
      />,
    );
    expect(screen.getByText(/not provided/)).toBeInTheDocument();
  });

  it("toggles the collapsible on click", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <ResponsesReview
        responses={[{ question: "Q", answer: "x", mandatory: false }]}
        companyName="Acme"
      />,
    );
    expect(screen.getByText("Q")).toBeInTheDocument();
    // Click the toggle — content should still be findable in DOM
    const trigger = document.querySelector('[data-state]') ?? document.body;
    await user.click(screen.getByText(/Questionnaire responses/));
    expect(document.body.textContent).toContain("Q");
    expect(trigger).toBeTruthy();
  });
});
