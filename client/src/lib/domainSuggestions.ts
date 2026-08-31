import type { ScanSummary } from "@shared/cybershield";

/** Returns only distinct domains previously saved by the current signed-in user. */
export function getRecentDomainSuggestions(scans: ScanSummary[], query: string, limit = 5) {
  const normalizedQuery = query.trim().toLowerCase();
  const suggestions: string[] = [];
  const seen = new Set<string>();

  for (const scan of scans) {
    const domain = scan.normalizedDomain.trim().toLowerCase();
    if (!domain || seen.has(domain) || (normalizedQuery && !domain.includes(normalizedQuery))) continue;
    seen.add(domain);
    suggestions.push(domain);
    if (suggestions.length === limit) break;
  }

  return suggestions;
}
