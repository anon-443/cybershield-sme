import type { ScanReport } from "@shared/cybershield";

function escapeCsv(value: string | number | null | undefined) {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

export function buildReportCsv(report: ScanReport) {
  const rows: Array<Array<string | number | null | undefined>> = [
    ["Record", "Domain", "Scanned at", "Category", "Status", "Severity", "Score", "Grade", "Title", "Observed evidence", "Business impact", "Recommended action"],
    ["Assessment summary", report.normalizedDomain, report.scannedAt, "Overall", "", "", report.overall.score, report.overall.grade, "", report.overall.calculation, "", ""],
    ...report.categories.map(category => ["Category score", report.normalizedDomain, report.scannedAt, category.label, "", "", category.score, category.grade, "", category.calculation, "", ""]),
    ...report.findings.map(finding => ["Finding", report.normalizedDomain, report.scannedAt, finding.category, finding.status, finding.severity, "", "", finding.title, finding.evidence, finding.impact, finding.remediation]),
  ];
  return rows.map(row => row.map(escapeCsv).join(",")).join("\r\n");
}

export function downloadReportCsv(report: ScanReport) {
  const file = new Blob([buildReportCsv(report)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = `cybershield-${report.normalizedDomain.replace(/[^a-z0-9.-]/gi, "-")}-assessment.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
