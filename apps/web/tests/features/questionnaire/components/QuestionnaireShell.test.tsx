import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { QuestionnaireShell } from "@/features/questionnaire/components/QuestionnaireShell";

describe("QuestionnaireShell", () => {
  it("renders the Cedar Rose brand in the header", () => {
    render(<QuestionnaireShell>X</QuestionnaireShell>);
    expect(screen.getByText("Cedar Rose")).toBeInTheDocument();
  });

  it("renders the title in the header when provided", () => {
    render(<QuestionnaireShell title="My Title">x</QuestionnaireShell>);
    expect(screen.getByText("My Title")).toBeInTheDocument();
  });

  it("hides the title element when not provided", () => {
    const { container } = render(<QuestionnaireShell>x</QuestionnaireShell>);
    expect(container.textContent).not.toContain("Credit Information");
  });

  it("renders the children in the main area", () => {
    render(<QuestionnaireShell><div data-testid="child">body</div></QuestionnaireShell>);
    expect(screen.getByTestId("child")).toBeInTheDocument();
  });

  it("applies a background image when provided", () => {
    const { container } = render(
      <QuestionnaireShell backgroundImage="https://example.com/bg.jpg">x</QuestionnaireShell>,
    );
    const main = container.querySelector("main") as HTMLElement;
    expect(main.style.backgroundImage).toContain("https://example.com/bg.jpg");
    expect(main.className).toContain("bg-cover");
  });
});
