import { describe, it, expect } from "vitest";
import {
  casesService,
  auditService,
  companiesService,
  usersService,
  templatesService,
  configService,
  notificationsService,
  authService,
  dashboardService,
  questionnaireService,
} from "@/services";

describe("services index", () => {
  it("exports mock-backed service facades when VITE_USE_MOCK is true", () => {
    expect(casesService).toBeDefined();
    expect(auditService).toBeDefined();
    expect(companiesService).toBeDefined();
    expect(usersService).toBeDefined();
    expect(templatesService).toBeDefined();
    expect(configService).toBeDefined();
    expect(notificationsService).toBeDefined();
    expect(authService).toBeDefined();
    expect(dashboardService).toBeDefined();
    expect(questionnaireService).toBeDefined();
  });

  it("mock casesService.list returns an array", async () => {
    const cases = await casesService.list();
    expect(Array.isArray(cases)).toBe(true);
  });
});
