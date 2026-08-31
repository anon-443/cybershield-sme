import type { ScanComparison, ScanSummary } from "../shared/cybershield";

export function buildScanComparison(current: ScanSummary, previous: ScanSummary | null): ScanComparison {
  if (!previous) {
    return {
      current,
      previous: null,
      deltas: null,
      summary: "This is the first saved assessment for this domain. It establishes a baseline for future comparisons.",
    };
  }

  const deltas = {
    overall: current.overallScore - previous.overallScore,
    website: current.websiteScore - previous.websiteScore,
    email: current.emailScore - previous.emailScore,
    domain: current.domainScore - previous.domainScore,
  };
  const improved = Object.values(deltas).filter(delta => delta > 0).length;
  const declined = Object.values(deltas).filter(delta => delta < 0).length;
  const summary =
    improved === 0 && declined === 0
      ? "Your recorded category scores are unchanged from the previous assessment of this domain."
      : improved > declined
        ? "Your posture improved in more measured categories than it declined. Review the evidence ledger for the changes behind each score."
        : declined > improved
          ? "Your posture declined in more measured categories than it improved. Review the evidence ledger and prioritize the changed findings."
          : "Your posture changed across categories. Review each delta alongside the evidence ledger before drawing a conclusion.";

  return { current, previous, deltas, summary };
}
