import type { FindingSeverity, FindingStatus, ScanFinding } from "@shared/cybershield";

export type FindingCategoryFilter = "all" | "website" | "email" | "domain";
export type FindingStatusFilter = "all" | FindingStatus;
export type FindingSeverityFilter = "all" | FindingSeverity;

export type LedgerFilters = {
  category: FindingCategoryFilter;
  status: FindingStatusFilter;
  severity: FindingSeverityFilter;
  query: string;
};

export const defaultLedgerFilters: LedgerFilters = { category: "all", status: "all", severity: "all", query: "" };

export function filterLedgerFindings(findings: ScanFinding[], filters: LedgerFilters) {
  const query = filters.query.trim().toLowerCase();
  return findings.filter(finding => {
    const categoryMatches = filters.category === "all" || finding.category === filters.category;
    const statusMatches = filters.status === "all" || finding.status === filters.status;
    const severityMatches = filters.severity === "all" || finding.severity === filters.severity;
    const textMatches = !query || [finding.title, finding.evidence, finding.impact, finding.remediation].join(" ").toLowerCase().includes(query);
    return categoryMatches && statusMatches && severityMatches && textMatches;
  });
}
