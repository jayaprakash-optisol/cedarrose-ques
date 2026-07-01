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
  settingsService,
  dashboardService,
  questionnaireService,
} from "@/services";

describe("services index", () => {
  it("exports API service facades", () => {
    expect(typeof casesService.list).toBe("function");
    expect(typeof auditService.list).toBe("function");
    expect(typeof companiesService.getByUid).toBe("function");
    expect(typeof usersService.list).toBe("function");
    expect(typeof templatesService.list).toBe("function");
    expect(typeof configService.get).toBe("function");
    expect(typeof notificationsService.list).toBe("function");
    expect(typeof authService.login).toBe("function");
    expect(typeof settingsService.get).toBe("function");
    expect(typeof dashboardService.getCompletionStats).toBe("function");
    expect(typeof questionnaireService.verifyLink).toBe("function");
  });
});
