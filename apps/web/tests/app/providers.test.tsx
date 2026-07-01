import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { AppProviders } from "@/app/providers";

function Child() {
  return <div data-testid="child">Hello</div>;
}

describe("AppProviders", () => {
  it("renders children through QueryClient, Auth, Tooltip providers", () => {
    render(
      <AppProviders>
        <Child />
      </AppProviders>,
    );
    expect(screen.getByTestId("child")).toHaveTextContent("Hello");
  });
});
