import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import type { ScanComparison, ScanSummary } from "@shared/cybershield";
import { getDashboardComparisonState } from "@/lib/dashboardComparisonPresentation";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowDownRight, ArrowUpRight, ChartNoAxesCombined, FileSearch, GitCompareArrows, Minus, Plus, ShieldCheck } from "lucide-react";
import { useLocation } from "wouter";

function gradeClass(grade: string) {
  if (grade === "A" || grade === "B") return "grade-good";
  if (grade === "C") return "grade-mid";
  return "grade-risk";
}

function HistoryRow({ scan, previewComparison }: { scan: ScanSummary; previewComparison?: ScanComparison }) {
  const [, setLocation] = useLocation();
  const comparison = trpc.scans.compare.useQuery({ id: scan.id }, { enabled: !previewComparison });
  const comparisonData = previewComparison ?? comparison.data;
  const delta = comparisonData?.deltas?.overall;
  const hasBaseline = comparisonData?.deltas === null;
  const changeClass = !comparisonData || hasBaseline ? "change-baseline" : delta! > 0 ? "change-up" : delta! < 0 ? "change-down" : "change-steady";
  const changeIcon = !comparisonData || hasBaseline ? <Minus size={13} /> : delta! > 0 ? <ArrowUpRight size={13} /> : delta! < 0 ? <ArrowDownRight size={13} /> : <Minus size={13} />;
  const changeText = !comparisonData ? "Calculating" : hasBaseline ? "Baseline" : delta! > 0 ? `+${delta} points` : delta! < 0 ? `${delta} points` : "No change";
  const deltas = comparisonData?.deltas;
  const categorySummary = !deltas ? "No previous same-domain scan" : [
    deltas.website && `Web ${deltas.website > 0 ? "+" : ""}${deltas.website}`,
    deltas.email && `Email ${deltas.email > 0 ? "+" : ""}${deltas.email}`,
    deltas.domain && `Domain ${deltas.domain > 0 ? "+" : ""}${deltas.domain}`,
  ].filter(Boolean).join(" · ") || "All category scores unchanged";

  return <button className="history-row" onClick={() => setLocation(`/report/${scan.id}`)}>
    <div className={`history-grade ${gradeClass(scan.grade)}`}>{scan.grade}</div>
    <div className="history-domain"><strong>{scan.normalizedDomain}</strong><span>{new Date(scan.createdAt).toLocaleString()}</span></div>
    <div className="history-categories"><span>Web <b>{scan.websiteScore}</b></span><span>Email <b>{scan.emailScore}</b></span><span>Domain <b>{scan.domainScore}</b></span></div>
    <div className="history-insight"><span>{categorySummary}</span><small>{deltas ? "Category change" : "Comparison state"}</small></div>
    <span className={`history-change ${changeClass}`}>{changeIcon}{changeText}</span>
    <div className="history-score"><span>{scan.overallScore}</span><small>/100</small></div>
    <Badge variant="outline" className="history-open">Open ledger <ArrowUpRight size={13} /></Badge>
  </button>;
}

function ScoreTrend({ scans }: { scans: ScanSummary[] }) {
  const points = [...scans].slice(0, 8).reverse().map((scan, index) => ({
    index: index + 1,
    date: new Date(scan.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    score: scan.overallScore,
  }));
  if (points.length < 2) return <div className="trend-empty"><ChartNoAxesCombined size={19} /><span>Run a second assessment of the same domain to start comparing posture over time</span></div>;
  return <div className="trend-chart"><ResponsiveContainer width="100%" height={150}><AreaChart data={points} margin={{ top: 10, right: 2, left: -24, bottom: 0 }}><defs><linearGradient id="scorePulse" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3167f0" stopOpacity={.32} /><stop offset="95%" stopColor="#3167f0" stopOpacity={0} /></linearGradient></defs><XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: "#708177", fontSize: 10 }} /><YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: "#91a097", fontSize: 10 }} tickCount={3} /><Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #d0ddd2", boxShadow: "0 10px 25px rgba(18,35,31,.12)", fontSize: 12 }} formatter={(value: number) => [`${value}/100`, "Posture score"]} labelStyle={{ color: "#43544a" }} /><Area type="monotone" dataKey="score" stroke="#3167f0" strokeWidth={2.5} fill="url(#scorePulse)" /></AreaChart></ResponsiveContainer></div>;
}

function DashboardComparisonCard({ scan, previewComparison }: { scan: ScanSummary; previewComparison?: ScanComparison }) {
  const [, setLocation] = useLocation();
  const comparisonQuery = trpc.scans.compare.useQuery({ id: scan.id }, { enabled: !previewComparison });
  const comparison = previewComparison ?? comparisonQuery.data;
  const state = getDashboardComparisonState(comparison);
  return <article className="dashboard-comparison-card">
    <div className="dashboard-comparison-heading"><div><span>Latest vs previous</span><h2>Same-domain posture change</h2></div><GitCompareArrows size={19} /></div>
    {state === "loading" ? <p className="dashboard-comparison-copy">Comparing this scan with the immediately previous saved scan of {scan.normalizedDomain}…</p> : state === "baseline" ? <><p className="dashboard-comparison-copy">This is the first saved scan of {scan.normalizedDomain}. It is now your private baseline for comparison.</p><small>Run a later authorized passive assessment of the same domain to see score deltas here.</small></> : <><p className="dashboard-comparison-copy">{comparison?.summary}</p><div className="dashboard-comparison-metrics"><span><b>{comparison?.deltas?.overall && comparison.deltas.overall > 0 ? "+" : ""}{comparison?.deltas?.overall}</b>overall</span><span><b>{comparison?.deltas?.website && comparison.deltas.website > 0 ? "+" : ""}{comparison?.deltas?.website}</b>website</span><span><b>{comparison?.deltas?.email && comparison.deltas.email > 0 ? "+" : ""}{comparison?.deltas?.email}</b>email</span></div></>}
    <Button variant="outline" className="dashboard-comparison-action" onClick={() => setLocation(`/report/${scan.id}`)}>Open comparison details</Button>
  </article>;
}

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const scans = trpc.scans.list.useQuery();
  const previewMode = import.meta.env.DEV ? new URLSearchParams(window.location.search).get("preview") : null;
  const isPreview = previewMode === "compare" || previewMode === "baseline";
  const isBaselinePreview = previewMode === "baseline";
  const previewPrevious: ScanSummary = { id: "preview-prior", domain: "example.org", normalizedDomain: "example.org", overallScore: 66, grade: "D", websiteScore: 61, emailScore: 72, domainScore: 84, createdAt: new Date("2026-08-01T10:00:00Z"), completedAt: new Date("2026-08-01T10:00:00Z") };
  const previewCurrent: ScanSummary = { id: "preview-current", domain: "example.org", normalizedDomain: "example.org", overallScore: 79, grade: "C", websiteScore: 81, emailScore: 75, domainScore: 84, createdAt: new Date("2026-08-21T10:00:00Z"), completedAt: new Date("2026-08-21T10:00:00Z") };
  const previewComparison: ScanComparison = isBaselinePreview ? { current: previewCurrent, previous: null, deltas: null, summary: "This is the first saved assessment for this domain" } : { current: previewCurrent, previous: previewPrevious, deltas: { overall: 13, website: 20, email: 3, domain: 0 }, summary: "The latest assessment improved in more measured categories than it declined" };
  const visibleScans = isPreview ? [previewCurrent, ...(isBaselinePreview ? [] : [previewPrevious])] : scans.data;
  const latest = visibleScans?.[0];
  const latestDomainScans = latest ? visibleScans?.filter(scan => scan.normalizedDomain === latest.normalizedDomain) ?? [] : [];

  const dashboardContent = <section className="dashboard-shell workspace-shell">
    <header className="workspace-header"><div><span>Private workspace</span><h1>Posture history that stays in context</h1><p>Review your saved evidence, compare the latest same-domain result, and spot the change that deserves attention</p></div><Button onClick={() => setLocation("/")} className="primary-action"><Plus size={16} /> Assess a domain</Button></header>
    {isPreview && <div className="dev-preview-banner">Development-only visual preview. Values are illustrative and never saved.</div>}
    {!isPreview && scans.isLoading ? <div className="history-list" aria-label="Loading your scan history">{[1, 2, 3].map(item => <Skeleton key={item} className="h-24 rounded-xl bg-slate-200" />)}</div> : !isPreview && scans.isError ? <Card className="panel-card"><CardHeader><CardTitle>History temporarily unavailable</CardTitle><CardDescription>{scans.error.message}</CardDescription></CardHeader><CardContent><Button variant="outline" onClick={() => scans.refetch()}>Try again</Button></CardContent></Card> : !visibleScans?.length ? <Card className="empty-card panel-card"><CardContent className="py-14 text-center"><div className="empty-icon"><ShieldCheck size={25} /></div><h2>Your workspace is ready</h2><p>Run a passive assessment of a public domain you own or are authorized to review. Your first report becomes a private baseline for future comparison.</p><Button onClick={() => setLocation("/")} className="primary-action">Start an assessment</Button></CardContent></Card> : <>
      <section className="workspace-summary"><article className="latest-card"><div><span>Latest assessment</span><strong>{latest?.normalizedDomain}</strong><small>{latest ? new Date(latest.createdAt).toLocaleString() : ""}</small></div><div className={`latest-grade ${gradeClass(latest?.grade ?? "F")}`}><b>{latest?.grade}</b><span>{latest?.overallScore}/100</span></div></article><article className="trend-card"><div className="trend-heading"><div><span>Score trace</span><h2>{latest?.normalizedDomain} over time</h2></div><ChartNoAxesCombined size={19} /></div><ScoreTrend scans={latestDomainScans} /></article>{latest && <DashboardComparisonCard scan={latest} previewComparison={isPreview ? previewComparison : undefined} />}</section>
      <section className="recent-ledger"><div className="ledger-heading"><div><span>Saved assessment ledger</span><h2>Every report, one place</h2></div><p>Each comparison uses the immediately previous scan of the same domain in your workspace</p></div><div className="history-list">{visibleScans.map(scan => <HistoryRow key={scan.id} scan={scan} previewComparison={isPreview && scan.id === previewCurrent.id ? previewComparison : undefined} />)}</div></section>
    </>}
    <div className="workspace-note"><FileSearch size={15} /><span>Reports preserve the observed public response at the moment of assessment. They do not test passwords, scan ports, or attempt to bypass controls</span></div>
  </section>;

  return isPreview ? <div className="dev-preview-shell">{dashboardContent}</div> : <DashboardLayout>{dashboardContent}</DashboardLayout>;
}
