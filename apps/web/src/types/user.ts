export type RoleKey = "researcher" | "reviewer" | "analyst" | "admin";

export type AppKey = "automation" | "questionnaire";

export interface User {
  id: string;
  name: string;
  email: string;
  totalReports: number | null;
  score: number | null;
  lastSubmission: string | null;
  status: "Active" | "Inactive" | "Pending";
  role: RoleKey;
  platforms?: string[];
  flash?: boolean;
}

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: RoleKey;
  title: string;
  initials: string;
}

export interface InvitationInfo {
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}
