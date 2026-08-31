import { describe, expect, it } from "vitest";
import { attachDeterministicExplanation, calculateCategoryScores, normalizeDkimSelector, normalizeDomain } from "./securityScan";
import type { ScanReport } from "../shared/cybershield";
import { buildScanComparison } from "./scanComparison";

describe("normalizeDomain", () => {
  it("normalizes a public hostname and removes a trailing dot", () => {
    expect(normalizeDomain(" HTTPS://Portal.Example.com. ")).toBe("portal.example.com");
  });

  it("rejects a private target, IP address, and page path", () => {
    expect(() => normalizeDomain("localhost")).toThrow(/public domain/i);
    expect(() => normalizeDomain("127.0.0.1")).toThrow(/IP address/i);
    expect(() => normalizeDomain("example.com/private")).toThrow(/only a domain/i);
  });
});

describe("normalizeDkimSelector", () => {
  it("accepts a DNS-safe selector and normalizes its case", () => {
    expect(normalizeDkimSelector("Google-2026")).toBe("google-2026");
  });

  it("rejects selector strings that could alter the DNS lookup name", () => {
    expect(() => normalizeDkimSelector("selector._domainkey")).toThrow(/valid DKIM selector/i);
    expect(() => normalizeDkimSelector("selector value")).toThrow(/valid DKIM selector/i);
  });
});

describe("deterministic report explanations", () => {
  it("creates an action only from a recorded deterministic finding", () => {
    const report = {
      version: "1.0",
      domain: "example.com",
      normalizedDomain: "example.com",
      scannedAt: new Date().toISOString(),
      responsibleUseNotice: "Authorized passive only",
      metadata: { aRecords: [], aaaaRecords: [], mxRecords: [], nameservers: [], rdapRegistrar: null, rdapStatus: "unavailable" },
      findings: [{ id: "dmarc-record", category: "email", title: "DMARC anti-impersonation policy", status: "fail", severity: "high", evidence: "No DMARC record", impact: "Impersonation risk", remediation: "Publish DMARC", scoringWeight: 1 }],
      categories: [],
      overall: { score: 55, grade: "D", calculation: "deterministic" },
    } as Omit<ScanReport, "ai">;
    const withExplanation = attachDeterministicExplanation(report);
    expect(withExplanation.ai.source).toBe("deterministic-fallback");
    expect(withExplanation.ai.priorityActions[0]).toMatchObject({ findingId: "dmarc-record", recommendedAction: "Publish DMARC" });
  });

  it("retains expanded passive TLS and public-domain metadata in a completed report", () => {
    const report = {
      version: "1.0",
      domain: "example.com",
      normalizedDomain: "example.com",
      scannedAt: new Date().toISOString(),
      responsibleUseNotice: "Authorized passive only",
      metadata: { aRecords: [], aaaaRecords: [], mxRecords: [], nameservers: [], rdapRegistrar: "Registrar", rdapStatus: "available", registrationDate: "2022-01-01T00:00:00.000Z", domainAgeDays: 1000, certificateSubdomains: ["portal.example.com"], certificateTransparencyStatus: "available", tls: { protocol: "TLSv1.3", cipher: "AES_256_GCM", validTo: "2026-12-01T00:00:00.000Z", daysUntilExpiry: 84, status: "available" } },
      findings: [],
      categories: [],
      overall: { score: 100, grade: "A", calculation: "deterministic" },
    } as Omit<ScanReport, "ai">;
    expect(attachDeterministicExplanation(report).metadata).toMatchObject({ domainAgeDays: 1000, certificateSubdomains: ["portal.example.com"], certificateTransparencyStatus: "available", tls: { protocol: "TLSv1.3" } });
  });
});

describe("transparent scoring", () => {
  it("applies weighted deterministic deductions and produces an A–F grade", () => {
    const scores = calculateCategoryScores([
      { id: "hsts", category: "website", title: "HSTS", status: "warn", severity: "medium", evidence: "missing", impact: "risk", remediation: "set it", scoringWeight: 1 },
      { id: "dmarc", category: "email", title: "DMARC", status: "fail", severity: "high", evidence: "missing", impact: "risk", remediation: "set it", scoringWeight: 1 },
      { id: "dns", category: "domain", title: "DNS", status: "pass", severity: "info", evidence: "found", impact: "context", remediation: "review", scoringWeight: 1 },
    ]);
    expect(scores.find(score => score.category === "website")).toMatchObject({ score: 91, grade: "A", deductionTotal: 9 });
    expect(scores.find(score => score.category === "email")).toMatchObject({ score: 75, grade: "C", deductionTotal: 25 });
    expect(scores.find(score => score.category === "domain")).toMatchObject({ score: 100, grade: "A", deductionTotal: 0 });
  });

  it("applies the critical public Git metadata deduction when a bounded status check reports exposure", () => {
    const scores = calculateCategoryScores([{ id: "public-git-metadata", category: "website", title: "Public Git metadata exposure", status: "fail", severity: "critical", evidence: "HTTP 200", impact: "risk", remediation: "block it", scoringWeight: 1.3 }]);
    expect(scores.find(score => score.category === "website")).toMatchObject({ score: 48, grade: "F", deductionTotal: 52 });
  });
});

describe("scan comparison", () => {
  const previous = { id: "old", domain: "example.com", normalizedDomain: "example.com", overallScore: 68, grade: "D", websiteScore: 70, emailScore: 55, domainScore: 90, createdAt: new Date("2026-08-01"), completedAt: new Date("2026-08-01") };
  const current = { id: "new", domain: "example.com", normalizedDomain: "example.com", overallScore: 78, grade: "C", websiteScore: 80, emailScore: 70, domainScore: 90, createdAt: new Date("2026-08-15"), completedAt: new Date("2026-08-15") };

  it("calculates category deltas against the user’s previous same-domain scan", () => {
    expect(buildScanComparison(current, previous)).toMatchObject({
      deltas: { overall: 10, website: 10, email: 15, domain: 0 },
    });
  });

  it("uses a baseline state when no previous same-domain scan exists", () => {
    expect(buildScanComparison(current, null)).toMatchObject({ previous: null, deltas: null });
  });
});
