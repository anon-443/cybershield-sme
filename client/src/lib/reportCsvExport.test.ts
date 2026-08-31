import { describe, expect, it } from "vitest";
import type { ScanReport } from "@shared/cybershield";
import { buildReportCsv } from "./reportCsvExport";

const report: ScanReport = {
  version: "1.0", domain: "example.com", normalizedDomain: "example.com", scannedAt: "2026-08-27T00:00:00.000Z", responsibleUseNotice: "Authorized passive checks only",
  metadata: { aRecords: [], aaaaRecords: [], mxRecords: [], nameservers: [], rdapRegistrar: null, rdapStatus: "unavailable", registrationDate: null, domainAgeDays: null, certificateSubdomains: [], certificateTransparencyStatus: "unavailable", tls: { protocol: null, cipher: null, validTo: null, daysUntilExpiry: null, status: "unavailable" } },
  categories: [{ category: "website", label: "Website", weight: 1, score: 80, grade: "B", deductionTotal: 20, calculation: "Recorded checks", availableChecks: 4, unavailableChecks: 0 }],
  overall: { score: 80, grade: "B", calculation: "Weighted evidence" },
  findings: [{ id: "headers", category: "website", title: "Header, review", status: "warn", severity: "medium", evidence: "Value with \"quotes\"", impact: "A recorded impact", remediation: "Apply the control", scoringWeight: 1 }],
  ai: { source: "deterministic-fallback", overview: "", priorityActions: [], disclaimer: "" },
};

describe("buildReportCsv", () => {
  it("includes the private report summary, categories, and findings with escaped CSV cells", () => {
    const csv = buildReportCsv(report);
    expect(csv).toContain('"Assessment summary","example.com"');
    expect(csv).toContain('"Category score","example.com"');
    expect(csv).toContain('"Header, review"');
    expect(csv).toContain('"Value with ""quotes"""');
  });
});
