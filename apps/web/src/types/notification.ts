export type NotifType = "submission" | "expired" | "blocked" | "reminder" | "review" | "api";

export interface Notification {
  id: string;
  type: NotifType;
  title: string;
  body: string;
  time: string;
  read: boolean;
}
