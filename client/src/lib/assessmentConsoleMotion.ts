export type AssessmentConsoleVisualState = "idle" | "engaged" | "scanning";

export function getAssessmentConsoleVisualState({ domain, scanning }: { domain: string; scanning: boolean }): AssessmentConsoleVisualState {
  if (scanning) return "scanning";
  return domain.trim() ? "engaged" : "idle";
}
