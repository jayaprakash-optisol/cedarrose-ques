const KEY = "cedarrose_app_selected";

export type SelectedApp = "questionnaire" | "automation";

export function hasAppSelected(): boolean {
  const value = sessionStorage.getItem(KEY);
  return value === "questionnaire" || value === "automation";
}

export function getSelectedApp(): SelectedApp | null {
  const value = sessionStorage.getItem(KEY);
  return value === "questionnaire" || value === "automation" ? value : null;
}

export function setAppSelected(app: SelectedApp): void {
  sessionStorage.setItem(KEY, app);
}

export function clearAppSelected(): void {
  sessionStorage.removeItem(KEY);
}
