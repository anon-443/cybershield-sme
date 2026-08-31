import { nanoid } from "nanoid";
import type { ScanReport } from "../shared/cybershield";
import { createAiExplanation } from "./aiRemediation";
import { saveScan } from "./db";
import { attachDeterministicExplanation, runPassiveAssessment, type ScanProgressUpdate } from "./securityScan";

type ScanInput = {
  domain: string;
  includeAi: boolean;
  dkimSelector?: string;
};

export async function executeScanForUser(
  userId: number,
  input: ScanInput,
  onProgress?: (update: ScanProgressUpdate) => void,
): Promise<{ id: string; report: ScanReport }> {
  const deterministic = await runPassiveAssessment(input.domain, onProgress, { dkimSelector: input.dkimSelector });
  let report = attachDeterministicExplanation(deterministic);
  if (input.includeAi) {
    onProgress?.({ stage: "guidance", progress: 89, message: "Creating plain-English guidance from the recorded evidence." });
    try {
      report = { ...report, ai: await createAiExplanation(report) };
    } catch (error) {
      console.warn("[CyberShield] AI explanation unavailable; returning deterministic explanation.", error);
    }
  }
  onProgress?.({ stage: "saving", progress: 95, message: "Saving the completed report to your private workspace." });
  const byCategory = new Map(report.categories.map(category => [category.category, category.score]));
  const id = nanoid(21);
  await saveScan({
    id,
    userId,
    domain: report.domain,
    normalizedDomain: report.normalizedDomain,
    status: "completed",
    overallScore: report.overall.score,
    grade: report.overall.grade,
    websiteScore: byCategory.get("website") ?? 0,
    emailScore: byCategory.get("email") ?? 0,
    domainScore: byCategory.get("domain") ?? 0,
    reportJson: report,
  });
  onProgress?.({ stage: "complete", progress: 100, message: "Assessment complete. Your evidence ledger is ready." });
  return { id, report };
}
