import type { UserRow } from "../../src/db/schema/users.js";

export function createMockUser(overrides: Partial<UserRow> = {}): UserRow {
  return {
    userId: "11111111-1111-1111-1111-111111111111",
    email: "analyst@cedarrose.local",
    password: "$2a$10$mockhashedpasswordvalue000000000000000000000000000",
    firstName: "Test",
    lastName: "Analyst",
    role: "Analyst",
    status: "Active",
    profilePicture: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    title: null,
    initials: null,
    totalReports: null,
    score: null,
    lastSubmission: null,
    ...overrides,
  };
}
