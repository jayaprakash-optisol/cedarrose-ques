import { describe, it, expect } from "vitest";
import {
  buildNotificationCopy,
  caseDisplayName,
  caseLabel,
  type CaseNotificationContext,
} from "../../../../src/modules/notifications/notification-copy.js";

const baseContext: CaseNotificationContext = {
  caseRef: "c-001",
  orderId: "ORD-1001",
  subjectName: "Subject Co",
  status: "SENT",
  completionMandatory: 40,
  remindersSent: 1,
};

describe("notification-copy", () => {
  describe("caseDisplayName", () => {
    it("prefers company name over subject name", () => {
      expect(
        caseDisplayName({
          ...baseContext,
          company: { companyName: "Acme Ltd" },
        }),
      ).toBe("Acme Ltd");
    });

    it("falls back to subject name", () => {
      expect(caseDisplayName(baseContext)).toBe("Subject Co");
    });
  });

  describe("caseLabel", () => {
    it("combines display name and order id", () => {
      expect(caseLabel({ ...baseContext, company: { companyName: "Acme Ltd" } })).toBe(
        "Acme Ltd (ORD-1001)",
      );
    });
  });

  describe("buildNotificationCopy", () => {
    const label = "Subject Co (ORD-1001)";

    it("builds submission copy", () => {
      const copy = buildNotificationCopy("submission", baseContext);
      expect(copy.title).toBe("New submission received");
      expect(copy.body).toContain(label);
      expect(copy.body).toContain("Awaiting researcher review");
    });

    it("builds expired copy", () => {
      const copy = buildNotificationCopy("expired", baseContext);
      expect(copy.title).toBe("Questionnaire link expired");
      expect(copy.body).toContain("link expired without submission");
    });

    it("builds blocked copy", () => {
      const copy = buildNotificationCopy("blocked", baseContext);
      expect(copy.title).toBe("Blocked dispatch — action required");
      expect(copy.body).toContain("No company profile or contact email");
    });

    it("builds review copy with and without notes", () => {
      expect(buildNotificationCopy("review", baseContext).body).toContain("was approved");
      expect(buildNotificationCopy("review", baseContext, { notes: "Looks good" }).body).toContain(
        "Looks good",
      );
    });

    it("builds api copy", () => {
      const copy = buildNotificationCopy("api", baseContext);
      expect(copy.title).toBe("API push completed");
      expect(copy.body).toContain("CedarRose Data Exchange");
    });

    it("builds reminder copy with day labels and progress", () => {
      const first = buildNotificationCopy("reminder", baseContext, { reminderNumber: 1 });
      expect(first.title).toBe("Reminder sent");
      expect(first.body).toContain("Reminder 1 (Day 3)");
      expect(first.body).toContain("40% complete");

      const second = buildNotificationCopy("reminder", baseContext, { reminderNumber: 2 });
      expect(second.body).toContain("Day 5");

      const final = buildNotificationCopy("reminder", { ...baseContext, completionMandatory: 0 }, {
        reminderNumber: 3,
      });
      expect(final.title).toBe("Final reminder sent");
      expect(final.body).toContain("Day 7");
    });

    it("builds reminder copy using context remindersSent when no opts", () => {
      const copy = buildNotificationCopy("reminder", {
        ...baseContext,
        remindersSent: 2,
        completionMandatory: undefined,
      });
      expect(copy.body).toContain("Reminder 2");
      expect(copy.body).not.toContain("%");
    });

    it("builds stale copy with default hours when no opts", () => {
      const copy = buildNotificationCopy("stale", baseContext);
      expect(copy.body).toContain("72 hours");
    });

    it("builds stale copy with configurable hours", () => {
      const copy = buildNotificationCopy("stale", baseContext, { staleHours: 48 });
      expect(copy.title).toBe("Case activity stalled");
      expect(copy.body).toContain("48 hours");
    });

    it("falls back for unknown types", () => {
      const copy = buildNotificationCopy("unknown" as "submission", baseContext);
      expect(copy.title).toContain("Update for");
      expect(copy.body).toContain("There is an update");
    });
  });
});
