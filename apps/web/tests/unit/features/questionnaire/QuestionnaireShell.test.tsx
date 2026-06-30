import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { QuestionnaireShell } from "@/features/questionnaire/components/QuestionnaireShell";

describe("QuestionnaireShell", () => {
  it("renders header, title, and children", () => {
    render(
      <QuestionnaireShell title="Test Questionnaire" backgroundImage="/bg.png">
        <p>Form content</p>
      </QuestionnaireShell>,
    );
    expect(screen.getByText("Cedar Rose")).toBeInTheDocument();
    expect(screen.getByText("Test Questionnaire")).toBeInTheDocument();
    expect(screen.getByText("Confidential")).toBeInTheDocument();
    expect(screen.getByText("Form content")).toBeInTheDocument();
  });

  it("renders without optional title", () => {
    render(
      <QuestionnaireShell>
        <span>Child</span>
      </QuestionnaireShell>,
    );
    expect(screen.queryByText("Test Questionnaire")).not.toBeInTheDocument();
    expect(screen.getByText("Child")).toBeInTheDocument();
  });
});
