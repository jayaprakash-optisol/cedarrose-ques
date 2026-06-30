import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ResponsesReview } from "@/features/cases/components/ResponsesReview";

describe("ResponsesReview", () => {
  it("shows empty state when no responses", () => {
    render(<ResponsesReview responses={[]} companyName="Acme Ltd" />);
    expect(screen.getByText(/no questionnaire responses saved yet/i)).toBeInTheDocument();
  });

  it("renders response summary and collapsible list", () => {
    render(
      <ResponsesReview
        companyName="Acme Ltd"
        responses={[
          { question: "Legal name", mandatory: true, answer: "Acme Ltd" },
          { question: "Trading name", mandatory: false, answer: "Acme Trading" },
          { question: "Tax ID", mandatory: true, answer: "" },
        ]}
      />,
    );

    expect(screen.getByText(/pre-filled from cris/i)).toBeInTheDocument();
    expect(screen.getAllByText(/filled by subject/i).length).toBeGreaterThan(0);
    expect(screen.getByText("Legal name")).toBeInTheDocument();
    expect(screen.getByText("Acme Trading")).toBeInTheDocument();
  });
});
