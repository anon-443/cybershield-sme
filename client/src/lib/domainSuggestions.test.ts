import { describe, expect, it } from "vitest";
import type { ScanSummary } from "@shared/cybershield";
import { getRecentDomainSuggestions } from "./domainSuggestions";

const scans: ScanSummary[] = [
  { id: "1", domain: "portal.example.com", normalizedDomain: "portal.example.com", overallScore: 82, grade: "B", websiteScore: 84, emailScore: 80, domainScore: 82, createdAt: new Date(), completedAt: new Date() },
  { id: "2", domain: "example.com", normalizedDomain: "example.com", overallScore: 79, grade: "C", websiteScore: 79, emailScore: 79, domainScore: 79, createdAt: new Date(), completedAt: new Date() },
  { id: "3", domain: "Example.com", normalizedDomain: "example.com", overallScore: 77, grade: "C", websiteScore: 77, emailScore: 77, domainScore: 77, createdAt: new Date(), completedAt: new Date() },
];

describe("getRecentDomainSuggestions", () => {
  it("returns distinct domains from a signed-in user's history in recency order", () => {
    expect(getRecentDomainSuggestions(scans, "")).toEqual(["portal.example.com", "example.com"]);
  });

  it("filters the private history locally without adding unrelated common domains", () => {
    expect(getRecentDomainSuggestions(scans, "portal")).toEqual(["portal.example.com"]);
    expect(getRecentDomainSuggestions(scans, "unknown")).toEqual([]);
  });
});
