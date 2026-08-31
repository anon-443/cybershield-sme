import { describe, expect, it } from "vitest";
import type { ScanComparison } from "@shared/cybershield";
import { getDashboardComparisonState } from "./dashboardComparisonPresentation";

const baseline = { current: {} as ScanComparison["current"], previous: null, deltas: null, summary: "Baseline" };
const compared = { ...baseline, previous: {} as ScanComparison["current"], deltas: { overall: 4, website: 2, email: 0, domain: 0 } };

describe("getDashboardComparisonState", () => {
  it("distinguishes loading, baseline, and same-domain comparisons", () => {
    expect(getDashboardComparisonState()).toBe("loading");
    expect(getDashboardComparisonState(baseline)).toBe("baseline");
    expect(getDashboardComparisonState(compared)).toBe("comparison");
  });
});
