import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PublicContextPanel } from "@/components/PublicContextPanel";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import type { FindingSeverity, FindingStatus, ScanFinding } from "@shared/cybershield";
import { AlertTriangle, ArrowDownRight, ArrowLeft, ArrowUpRight, BrainCircuit, Check, ChevronRight, CircleHelp, FileDown, FileSpreadsheet, Info, Minus, RefreshCw, RotateCcw, Search, Share2, ShieldAlert, ShieldCheck, TrendingUp, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { sharePrivateReport } from "@/lib/reportSharing";
import { requestReportPdfExport } from "@/lib/reportExport";
import { downloadReportCsv } from "@/lib/reportCsvExport";
import { isConfirmedGitMetadataExposure } from "@/lib/reportFindingPresentation";
import { buildReportRerunUrl } from "@/lib/reportRerun";
import { defaultLedgerFilters, filterLedgerFindings, type FindingCategoryFilter, type FindingSeverityFilter, type FindingStatusFilter } from "@/lib/reportFilters";
import { useLocation, useRoute } from "wouter";

function gradeClass(grade: string) {
  if (grade === "A" || grade === "B") return "grade-good";
  if (grade === "C") return "grade-mid";
  return "grade-risk";
}

function statusIcon(status: FindingStatus) {
  if (status === "pass") return <Check className="h-4 w-4" />;
  if (status === "info") return <Info className="h-4 w-4" />;
  return <X className="h-4 w-4" />;
}

function severityLabel(severity: FindingSeverity) {
  return severity === "info" ? "Information" : severity.charAt(0).toUpperCase() + severity.slice(1);
}

function FindingRow({ finding }: { finding: ScanFinding }) {
  const [open, setOpen] = useState(false);
  const confirmedGitExposure = isConfirmedGitMetadataExposure(finding);
  return (
    <article className={`finding-row finding-${finding.status} ${confirmedGitExposure ? "finding-confirmed-git-exposure" : ""}`}>
      <button className="finding-summary" onClick={() => setOpen(value => !value)} aria-expanded={open}>
        <span className={`finding-status status-${finding.status}`}>{statusIcon(finding.status)}</span>
        <span className="finding-title"><strong>{confirmedGitExposure && <AlertTriangle className="git-exposure-indicator" aria-label="Confirmed public Git metadata exposure" />}{finding.title}</strong><small>{finding.category} · {severityLabel(finding.severity)}</small></span>
        <Badge variant="outline" className={`severity severity-${finding.severity}`}>{severityLabel(finding.severity)}</Badge>
        <ChevronRight className={`finding-chevron ${open ? "rotate-90" : ""}`} />
      </button>
      {open && (
        <div className="finding-detail">
          <div><span>Observed evidence</span><p>{finding.evidence}</p></div>
          <div><span>Business impact</span><p>{finding.impact}</p></div>
          <div><span>Recommended next step</span><p>{finding.remediation}</p></div>
        </div>
      )}
    </article>
  );
}

function DeltaMetric({ label, delta }: { label: string; delta: number }) {
  const tone = delta > 0 ? "comparison-positive" : delta < 0 ? "comparison-negative" : "comparison-neutral";
  const icon = delta > 0 ? <ArrowUpRight className="h-4 w-4 shrink-0" /> : delta < 0 ? <ArrowDownRight className="h-4 w-4 shrink-0" /> : <Minus className="h-4 w-4 shrink-0" />;
  const value = delta > 0 ? `+${delta}` : `${delta}`;
  const metricCategory = label.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className={`comparison-metric ${tone} metric-${metricCategory}`}>
      <span className="metric-label">{label}</span>
      <strong className="metric-value">{icon}{value}</strong>
      <small className="metric-unit">points</small>
    </div>
  );
}

export default function ReportPage() {
  const [, params] = useRoute("/report/:id");
  const [, setLocation] = useLocation();
  const previewMode = import.meta.env.DEV ? new URLSearchParams(window.location.search).get("preview") : null;
  const isGitExposurePreview = previewMode === "git-exposure";
  const isPreview = previewMode === "compare" || previewMode === "baseline" || previewMode === "legacy" || isGitExposurePreview;
  const isBaselinePreview = previewMode === "baseline";
  const isLegacyPreview = previewMode === "legacy";
  const previewMetadata = isLegacyPreview ? { rdapRegistrar: null } : { rdapRegistrar: "Preview registrar", domainAgeDays: 1460, certificateSubdomains: ["portal.example.org", "www.example.org", "status.example.org"], tls: { protocol: "TLSv1.3", cipher: "AES_256_GCM", validTo: "2026-12-01T00:00:00.000Z", daysUntilExpiry: 84, status: "available" as const } };
  const reportQuery = trpc.scans.get.useQuery({ id: params?.id ?? "" }, { enabled: Boolean(params?.id) && !isPreview });
  const comparisonQuery = trpc.scans.compare.useQuery({ id: params?.id ?? "" }, { enabled: Boolean(params?.id) && !isPreview });
  const [ledgerFilters, setLedgerFilters] = useState(defaultLedgerFilters);

  const shareReport = async (domain: string) => {
    const url = window.location.href;
    const title = `CyberShield report: ${domain}`;
    const text = "Private CyberShield assessment report. Access remains restricted to the signed-in owner.";
    const result = await sharePrivateReport({
      title,
      text,
      url,
      nativeShare: navigator.share?.bind(navigator),
      copyLink: navigator.clipboard?.writeText.bind(navigator.clipboard),
    });
    if (result === "shared" || result === "cancelled") return;
    if (result === "copied") {
      toast.success("Private report link copied", { description: "Recipients must sign in with an authorized account to open it." });
      return;
    }
    toast.error("Could not copy the report link", { description: "Use your browser address bar to copy the private report URL." });
  };

  if (isPreview) {
    if (isGitExposurePreview) {
      const confirmedGitExposure: ScanFinding = {
        id: "public-git-metadata",
        category: "website",
        title: "Public Git metadata exposure",
        status: "fail",
        severity: "critical",
        evidence: "A HEAD request to /.git/HEAD returned HTTP 200. No response content was read.",
        impact: "Public source-control metadata can expose implementation information and should not be served by a production website.",
        remediation: "Block web access to .git and remove repository metadata from deployed web roots.",
        scoringWeight: 1.3,
      };
      return (
        <div className="dev-preview-shell">
          <section className="report-shell">
            <div className="dev-preview-banner">Development-only visual preview — confirmed Git metadata exposure styling.</div>
            <section className="findings-section">
              <div className="section-heading"><div><p className="eyebrow">EVIDENCE LEDGER</p><h2>Confirmed exposure preview</h2><p>Visual QA only. This is not a saved scan record.</p></div></div>
              <div className="findings-list"><FindingRow finding={confirmedGitExposure} /></div>
            </section>
          </section>
        </div>
      );
    }
    return (
      <div className="dev-preview-shell">
        <section className="report-shell">
          <div className="dev-preview-banner">Development-only visual preview — illustrative values are not saved scan records.</div>
          <header className="report-hero printable-header">
            <div className="report-hero-meta"><p className="eyebrow">CYBERSHIELD ASSESSMENT</p><h1>example.org</h1><p>{isLegacyPreview ? "Previewing a legacy saved report with safe unavailable context defaults." : "Previewing the private previous-scan comparison panel."}</p></div>
            <div className="grade-orb grade-mid"><span>C</span><small>79/100</small></div>
          </header>
          <div className="responsible-line"><ShieldCheck className="h-4 w-4" /> Comparison is limited to a user’s own immediately previous same-domain scan.</div>
          <Card className="comparison-card panel-card">
            <CardHeader><div><p className="eyebrow">POSTURE CHANGE</p><CardTitle>Compared with your previous scan</CardTitle></div><TrendingUp className="comparison-header-icon h-5 w-5" /></CardHeader>
            <CardContent>{isBaselinePreview ? <div className="comparison-baseline"><span><Minus className="h-4 w-4" /> Baseline established</span><p>Development preview: this is the first saved assessment for this domain, establishing a baseline for future comparisons.</p><small>Run another authorized passive assessment of this same domain later to see score changes.</small></div> : <><p className="comparison-summary">Development preview: the latest recorded posture improved in more measured categories than it declined.</p><div className="comparison-metrics"><DeltaMetric label="Overall score" delta={13} /><DeltaMetric label="Website" delta={20} /><DeltaMetric label="Email" delta={3} /><DeltaMetric label="Domain" delta={0} /></div><p className="comparison-source">Against the immediately previous saved scan of example.org. Score deltas reflect recorded deterministic checks only.</p></>}</CardContent>
          </Card>
          <PublicContextPanel metadata={previewMetadata} />
        </section>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <section className="report-shell">
        {reportQuery.isLoading ? (
          <div className="space-y-4"><Skeleton className="h-48 rounded-3xl bg-slate-200" /><Skeleton className="h-80 rounded-3xl bg-slate-200" /></div>
        ) : reportQuery.isError || !reportQuery.data ? (
          <Card className="panel-card border-rose-300/30"><CardHeader><CardTitle>Report unavailable</CardTitle></CardHeader><CardContent><p className="mb-5 text-slate-600">{reportQuery.error?.message ?? "This assessment could not be found."}</p><Button onClick={() => setLocation("/dashboard")}>Back to history</Button></CardContent></Card>
        ) : (() => {
          const report = reportQuery.data;
          const visibleFindings = filterLedgerFindings(report.findings, ledgerFilters);
          const hasActiveFilters = ledgerFilters.category !== "all" || ledgerFilters.status !== "all" || ledgerFilters.severity !== "all" || ledgerFilters.query.trim().length > 0;
          const setCategory = (category: FindingCategoryFilter) => setLedgerFilters(current => ({ ...current, category }));
          const setStatus = (status: FindingStatusFilter) => setLedgerFilters(current => ({ ...current, status }));
          const setSeverity = (severity: FindingSeverityFilter) => setLedgerFilters(current => ({ ...current, severity }));
          return <>
            <div className="report-actions no-print">
              <Button variant="outline" onClick={() => setLocation("/dashboard")} className="history-button"><ArrowLeft className="mr-2 h-4 w-4" /> Scan history</Button>
              <Button variant="outline" onClick={() => setLocation(buildReportRerunUrl(report.normalizedDomain))} className="rerun-button"><RefreshCw className="mr-2 h-4 w-4" /> Rerun scan</Button>
              <Button variant="outline" onClick={() => shareReport(report.normalizedDomain)} className="share-button"><Share2 className="mr-2 h-4 w-4" /> Share Report</Button>
              <Button variant="outline" onClick={() => downloadReportCsv(report)} className="csv-export-button"><FileSpreadsheet className="mr-2 h-4 w-4" /> Download CSV</Button>
              <Button onClick={() => requestReportPdfExport(() => window.print())} className="print-button"><FileDown className="mr-2 h-4 w-4" /> Print / Save PDF</Button>
            </div>
            <header className="report-hero printable-header">
              <div className="report-hero-meta"><p className="eyebrow">CYBERSHIELD ASSESSMENT</p><h1>{report.normalizedDomain}</h1><p>Passive posture snapshot completed {new Date(report.scannedAt).toLocaleString()}.</p></div>
              <div className={`grade-orb ${gradeClass(report.overall.grade)}`}><span>{report.overall.grade}</span><small>{report.overall.score}/100</small></div>
            </header>
            <div className="responsible-line"><ShieldCheck className="h-4 w-4" /> {report.responsibleUseNotice}</div>

            <Card className="comparison-card panel-card">
              <CardHeader><div><p className="eyebrow">POSTURE CHANGE</p><CardTitle>Compared with your previous scan</CardTitle></div><TrendingUp className="comparison-header-icon h-5 w-5" /></CardHeader>
              <CardContent>
                {comparisonQuery.isLoading ? <p className="comparison-loading">Calculating your private, same-domain comparison…</p> : comparisonQuery.isError || !comparisonQuery.data ? <p className="comparison-loading">Comparison is temporarily unavailable. Your current report remains complete.</p> : comparisonQuery.data.deltas ? <><p className="comparison-summary">{comparisonQuery.data.summary}</p><div className="comparison-metrics"><DeltaMetric label="Overall score" delta={comparisonQuery.data.deltas.overall} /><DeltaMetric label="Website" delta={comparisonQuery.data.deltas.website} /><DeltaMetric label="Email" delta={comparisonQuery.data.deltas.email} /><DeltaMetric label="Domain" delta={comparisonQuery.data.deltas.domain} /></div><p className="comparison-source">Against your previous saved scan of {comparisonQuery.data.previous?.normalizedDomain} on {comparisonQuery.data.previous ? new Date(comparisonQuery.data.previous.createdAt).toLocaleDateString() : "—"}. Score deltas reflect recorded deterministic checks only.</p></> : <div className="comparison-baseline"><span><Minus className="h-4 w-4" /> Baseline established</span><p>{comparisonQuery.data.summary}</p><small>Run another authorized passive assessment of this same domain later to see score changes.</small></div>}
              </CardContent>
            </Card>

            <div className="score-grid">
              {report.categories.map(category => <article key={category.category} className="score-card"><div className="score-card-top"><span>{category.label}</span><b>{category.grade}</b></div><strong>{category.score}<small>/100</small></strong><div className="score-track"><i style={{ width: `${category.score}%` }} /></div><p>{category.calculation}</p></article>)}
            </div>

            <PublicContextPanel metadata={report.metadata} />

            <Card className="ai-card panel-card">
              <CardHeader><div className="ai-title"><span><BrainCircuit className="h-5 w-5" /></span><div><p className="eyebrow">PLAIN-ENGLISH GUIDE</p><CardTitle>What to address first</CardTitle></div></div><Badge variant="outline" className="ai-source">{report.ai.source === "ai" ? "AI-assisted" : "Deterministic guidance"}</Badge></CardHeader>
              <CardContent><p className="ai-overview">{report.ai.overview}</p><div className="priority-grid">{report.ai.priorityActions.length ? report.ai.priorityActions.map(action => <article className="priority-card" key={action.findingId}><span>{action.priority}</span><h3>{action.title}</h3><p><b>Why it matters:</b> {action.businessImpact}</p><p><b>Next step:</b> {action.recommendedAction}</p></article>) : <p className="text-slate-300">No urgent remediation actions were generated from the completed deterministic checks.</p>}</div><p className="ai-disclaimer"><CircleHelp className="h-4 w-4" /> {report.ai.disclaimer}</p></CardContent>
            </Card>

            <section className="findings-section">
              <div className="section-heading"><div><p className="eyebrow">EVIDENCE LEDGER</p><h2>Observed findings</h2><p>Search or filter recorded evidence, then expand any row for business impact and practical remediation.</p></div><div className="ledger-tools no-print"><Button variant="outline" className="ledger-export-button" onClick={() => requestReportPdfExport(() => window.print())}><FileDown className="mr-2 h-4 w-4" /> Export report PDF</Button><label className="ledger-search"><Search size={16} /><span className="sr-only">Search findings</span><input value={ledgerFilters.query} onChange={event => setLedgerFilters(current => ({ ...current, query: event.target.value }))} placeholder="Search evidence or exposure" /></label><div className="ledger-filter-groups"><div className="ledger-filter-group"><span>Category</span><div className="finding-filter">{(["all", "website", "email", "domain"] as const).map(category => <button key={category} className={ledgerFilters.category === category ? "active" : ""} onClick={() => setCategory(category)}>{category === "all" ? "All" : category}</button>)}</div></div><div className="ledger-filter-group"><span>Result</span><div className="finding-filter">{(["all", "fail", "pass", "info"] as const).map(status => <button key={status} className={ledgerFilters.status === status ? "active" : ""} onClick={() => setStatus(status)}>{status === "all" ? "All" : status}</button>)}</div></div><div className="ledger-filter-group"><span>Severity</span><div className="finding-filter">{(["all", "critical", "high", "medium", "low", "info"] as const).map(severity => <button key={severity} className={ledgerFilters.severity === severity ? "active" : ""} onClick={() => setSeverity(severity)}>{severity === "all" ? "All" : severityLabel(severity)}</button>)}</div></div></div>{hasActiveFilters && <button className="ledger-reset" onClick={() => setLedgerFilters(defaultLedgerFilters)}><RotateCcw size={14} /> Clear filters</button>}<p className="ledger-filter-summary">Showing {visibleFindings.length} of {report.findings.length} findings</p></div></div>
              {visibleFindings.length ? <div className="findings-list">{visibleFindings.map(finding => <FindingRow key={finding.id} finding={finding} />)}</div> : <div className="ledger-empty"><Search size={20} /><strong>No findings match these filters</strong><p>Clear a filter or try a different keyword to review the recorded evidence.</p><button className="ledger-reset" onClick={() => setLedgerFilters(defaultLedgerFilters)}><RotateCcw size={14} /> Clear filters</button></div>}
            </section>

            <section className="report-footnotes"><div><ShieldAlert className="h-5 w-5" /><p><b>Scope boundary:</b> This report is based on safe, passive HTTP and DNS observations. It does not try passwords, exploit vulnerabilities, scan ports, bypass controls, or test application logic.</p></div><div><AlertTriangle className="h-5 w-5" /><p><b>Interpretation:</b> A score is a transparent prioritization aid based on the recorded checks—not a guarantee that no security issues exist.</p></div></section>
          </>;
        })()}
      </section>
    </DashboardLayout>
  );
}
