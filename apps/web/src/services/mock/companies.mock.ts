import type { CompanyData } from "@/types";
import companyDetails from "@/mocks/data/company-details.json";
import { delay } from "./utils";

export interface CompaniesService {
  getByUid(uid: string): Promise<CompanyData>;
}

export const mockCompaniesService: CompaniesService = {
  async getByUid(uid) {
    await delay(1200);
    if (!uid || uid.toUpperCase().includes("NOTFOUND")) {
      throw new Error(`Could not retrieve company data for UID ${uid}.`);
    }
    return (companyDetails as { default: CompanyData }).default;
  },
};
