import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  clearAppSelected,
  getSelectedApp,
  hasAppSelected,
  setAppSelected,
  type SelectedApp,
} from "@/lib/app-selection";


describe("app-selection", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  describe("hasAppSelected", () => {
    it("returns false when nothing is stored", () => {
      expect(hasAppSelected()).toBe(false);
    });

    it("returns false for an unknown value", () => {
      sessionStorage.setItem("cedarrose_app_selected", "other");
      expect(hasAppSelected()).toBe(false);
    });

    it("returns true when 'questionnaire' is stored", () => {
      sessionStorage.setItem("cedarrose_app_selected", "questionnaire");
      expect(hasAppSelected()).toBe(true);
    });

    it("returns true when 'automation' is stored", () => {
      sessionStorage.setItem("cedarrose_app_selected", "automation");
      expect(hasAppSelected()).toBe(true);
    });
  });

  describe("getSelectedApp", () => {
    it("returns null when nothing is stored", () => {
      expect(getSelectedApp()).toBeNull();
    });

    it("returns null for an unknown value", () => {
      sessionStorage.setItem("cedarrose_app_selected", "garbage");
      expect(getSelectedApp()).toBeNull();
    });

    it("returns the stored value when it is 'questionnaire'", () => {
      sessionStorage.setItem("cedarrose_app_selected", "questionnaire");
      expect(getSelectedApp()).toBe<SelectedApp>("questionnaire");
    });

    it("returns the stored value when it is 'automation'", () => {
      sessionStorage.setItem("cedarrose_app_selected", "automation");
      expect(getSelectedApp()).toBe<SelectedApp>("automation");
    });
  });

  describe("setAppSelected", () => {
    it("persists the app selection", () => {
      setAppSelected("questionnaire");
      expect(sessionStorage.getItem("cedarrose_app_selected")).toBe("questionnaire");
    });

    it("overwrites a prior selection", () => {
      setAppSelected("questionnaire");
      setAppSelected("automation");
      expect(getSelectedApp()).toBe<SelectedApp>("automation");
    });
  });

  describe("clearAppSelected", () => {
    it("removes the stored value", () => {
      setAppSelected("questionnaire");
      clearAppSelected();
      expect(hasAppSelected()).toBe(false);
    });
  });
});
