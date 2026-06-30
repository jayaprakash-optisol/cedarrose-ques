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

  it("getSelectedApp returns null when nothing is stored", () => {
    expect(getSelectedApp()).toBeNull();
  });

  it("getSelectedApp returns null for invalid stored value", () => {
    sessionStorage.setItem("cedarrose_app_selected", "unknown");
    expect(getSelectedApp()).toBeNull();
    expect(hasAppSelected()).toBe(false);
  });

  it("setAppSelected automation is recognised", () => {
    setAppSelected("automation");
    expect(getSelectedApp()).toBe("automation");
    expect(hasAppSelected()).toBe(true);
  });
});
