import { describe, it, expect, beforeEach } from "vitest";
import {
  hasAppSelected,
  getSelectedApp,
  setAppSelected,
  clearAppSelected,
} from "@/lib/app-selection";

describe("app-selection", () => {
  beforeEach(() => sessionStorage.clear());

  it("tracks selected app in session storage", () => {
    expect(hasAppSelected()).toBe(false);
    setAppSelected("questionnaire");
    expect(getSelectedApp()).toBe("questionnaire");
    expect(hasAppSelected()).toBe(true);
    clearAppSelected();
    expect(hasAppSelected()).toBe(false);
  });
});
