import { describe, expect, it } from "vitest";
import type { ScanFinding } from "@shared/cybershield";
import { defaultLedgerFilters, filterLedgerFindings } from "./reportFilters";

const findings: ScanFinding[] = [
  { id: "header", category: "website", title: "HSTS not enabled", status: "fail", severity: "high", evidence: "Strict-Transport-Security was absent", impact: "Downgrade resistance is weaker", remediation: "Set HSTS", scoringWeight: 1 },
  { id: "spf", category: "email", title: "SPF policy available", status: "pass", severity: "info", evidence: "SPF found", impact: "Email identity context available", remediation: "Maintain policy", scoringWeight: 0 },
  { id: "rdap", category: "domain", title: "RDAP unavailable", status: "info", severity: "info", evidence: "Lookup unavailable", impact: "No public registration conclusion", remediation: "Retry later", scoringWeight: 0 },
];

describe("filterLedgerFindings", () => {
  it("combines category, outcome, and severity filters", () => {
    expect(filterLedgerFindings(findings, { ...defaultLedgerFilters, category: "website", status: "fail", severity: "high" }).map(item => item.id)).toEqual(["header"]);
  });

  it("matches search text across the stored passive finding fields", () => {
    expect(filterLedgerFindings(findings, { ...defaultLedgerFilters, query: "transport" }).map(item => item.id)).toEqual(["header"]);
    expect(filterLedgerFindings(findings, { ...defaultLedgerFilters, query: "unavailable" }).map(item => item.id)).toEqual(["rdap"]);
  });
});
