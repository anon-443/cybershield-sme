import type { ScanFinding } from "@shared/cybershield";

export function isConfirmedGitMetadataExposure(finding: Pick<ScanFinding, "id" | "status" | "severity" | "evidence">) {
  return finding.id === "public-git-metadata" && finding.status === "fail" && finding.severity === "critical" && /HTTP 200\b/.test(finding.evidence);
}
