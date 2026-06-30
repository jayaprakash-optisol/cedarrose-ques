import { describe, it, expect } from "vitest";
import { addHours } from "date-fns";
import {
  determineInitialStatus,
  generateSecureLink,
} from "../../../../src/modules/cases/cases.repository.js";
import { hashToken } from "../../../../src/shared/utils/crypto.js";

describe("cases repository helpers", () => {
  describe("determineInitialStatus", () => {
    it('returns "PENDING LINKAGE & CONTACT" when no uid and no email', () => {
      expect(determineInitialStatus(false, false)).toBe("PENDING LINKAGE & CONTACT");
    });

    it('returns "PENDING CONTACT" when uid present but no email', () => {
      expect(determineInitialStatus(false, true)).toBe("PENDING CONTACT");
    });

    it('returns "NOT SENT" when email is provided', () => {
      expect(determineInitialStatus(true, false)).toBe("NOT SENT");
      expect(determineInitialStatus(true, true)).toBe("NOT SENT");
    });
  });

  describe("generateSecureLink", () => {
    it("returns raw token, hash, and expiry based on validity hours", () => {
      const before = new Date();
      const link = generateSecureLink(48);
      const after = addHours(before, 48);

      expect(link.rawToken).toHaveLength(96);
      expect(link.tokenHash).toBe(hashToken(link.rawToken));
      expect(link.expiresAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(link.expiresAt.getTime()).toBeLessThanOrEqual(after.getTime() + 1000);
    });

    it("generates unique tokens on each call", () => {
      const a = generateSecureLink(24);
      const b = generateSecureLink(24);
      expect(a.rawToken).not.toBe(b.rawToken);
      expect(a.tokenHash).not.toBe(b.tokenHash);
    });
  });
});
