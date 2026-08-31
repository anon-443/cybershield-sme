export function buildReportRerunUrl(domain: string) {
  return `/?rerun=${encodeURIComponent(domain)}#assess`;
}

export function readReportRerunDomain(search: string) {
  return new URLSearchParams(search).get("rerun")?.trim() ?? "";
}
