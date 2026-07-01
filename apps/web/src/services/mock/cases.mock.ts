import type { CaseRecord } from "@/types";
import casesData from "@/mocks/data/cases.json";
import { delay, normalizeMockDates } from "./utils";
import { mockTemplatesService } from "./templates.mock";

let casesCache: CaseRecord[] | null = null;

function getCases(): CaseRecord[] {
  if (!casesCache) {
    casesCache = normalizeMockDates(casesData as CaseRecord[], [
      "requestedDate",
      "lastActivity",
      "reviewDate",
    ]);
  }
  return structuredClone(casesCache);
}

export interface CasesService {
  list(): Promise<CaseRecord[]>;
  getById(id: string): Promise<CaseRecord | undefined>;
  resendLink(id: string): Promise<{ linkExpiry: string | null }>;
  create(input: {
    orderId: string;
    uid?: string;
    subjectName: string;
    country: string;
    recipientType: CaseRecord["recipientType"];
    recipientEmail?: string;
    linkValidityHours?: number;
  }): Promise<CaseRecord>;
}

export const mockCasesService: CasesService = {
  async list() {
    await delay();
    return getCases();
  },
  async getById(id) {
    await delay(150);
    return getCases().find((c) => c.id === id);
  },
  async resendLink(id) {
    await delay(800);
    const cases = getCases();
    const idx = cases.findIndex((c) => c.id === id);
    if (idx === -1) throw new Error("Case not found");
    const validityHours = cases[idx].linkValidityHours ?? 48;
    const linkExpiry = new Date(Date.now() + validityHours * 3600_000).toISOString();
    cases[idx] = {
      ...cases[idx],
      status: "SENT",
      linkExpiry,
      link: {
        ...cases[idx].link,
        resentCount: cases[idx].link.resentCount + 1,
        sentAt: new Date().toISOString(),
        expiresAt: linkExpiry,
      },
    };
    casesCache = cases;
    return { linkExpiry };
  },
  async create(input) {
    await delay(800);
    if (input.recipientEmail) {
      const templates = await mockTemplatesService.list();
      const active = templates.find(
        (t) => t.recipientType === input.recipientType && t.status === "Active",
      );
      if (!active) {
        throw new Error(
          `No active questionnaire template is available for recipient type "${input.recipientType}".`,
        );
      }
    }
    const cases = getCases();
    const nextNum = cases.length + 1;
    const newId = `c-${String(nextNum).padStart(3, "0")}`;
    // Generate a mock token that the QuestionnaireLandingPage mock accepts (any non-"expired" string)
    const mockToken = `mock-${newId}-${Date.now()}`;
    const created: CaseRecord = {
      ...cases[0],
      id: newId,
      orderId: input.orderId,
      uid: input.uid ?? "",
      subjectName: input.subjectName,
      country: input.country,
      recipientType: input.recipientType,
      status: input.recipientEmail ? "SENT" : "PENDING CONTACT",
      requestedDate: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      linkExpiry: new Date(Date.now() + (input.linkValidityHours ?? 48) * 3600_000).toISOString(),
      link: {
        sentAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + (input.linkValidityHours ?? 48) * 3600_000).toISOString(),
        resentCount: 0,
      },
      linkUrl: input.recipientEmail ? `${window.location.origin}/q/${mockToken}` : null,
    };
    cases.unshift(created);
    casesCache = cases;
    return created;
  },
};
