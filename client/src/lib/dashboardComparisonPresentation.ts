import type { ScanComparison } from "@shared/cybershield";

export function getDashboardComparisonState(comparison?: ScanComparison) {
  if (!comparison) return "loading" as const;
  return comparison.deltas ? "comparison" as const : "baseline" as const;
}
