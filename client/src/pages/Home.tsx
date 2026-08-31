import { useAuth } from "@/_core/hooks/useAuth";
import "./HomeViewportFit.css";
import { startLogin } from "@/const";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { AlertTriangle, ArrowRight, Check, ChevronDown, Clock3, FileText, Globe2, Info, LoaderCircle, Menu, Radar, ShieldCheck, Waypoints, X } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { readReportRerunDomain } from "@/lib/reportRerun";
import { applyPointerTilt, resetPointerTilt } from "@/lib/pointerTilt";
import { coverageMetrics } from "@/lib/coverageMetrics";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { SiteThemeToggle } from "@/components/SiteThemeToggle";
import { getAssessmentConsoleVisualState } from "@/lib/assessmentConsoleMotion";
import { validatePublicDomainInput } from "@/lib/domainInputValidation";
import { trpc } from "@/lib/trpc";
import { getRecentDomainSuggestions } from "@/lib/domainSuggestions";

const scanSteps = [
  { stage: "validating", label: "Validating the public target", short: "Target" },
  { stage: "dns", label: "Reading public DNS posture", short: "DNS" },
  { stage: "https", label: "Inspecting the HTTPS response", short: "HTTPS" },
  { stage: "robots", label: "Reviewing public index directives", short: "Robots" },
  { stage: "rdap", label: "Retrieving registration context", short: "Domain" },
  { stage: "scoring", label: "Calculating the evidence score", short: "Score" },
  { stage: "guidance", label: "Preparing practical guidance", short: "Guidance" },
  { stage: "saving", label: "Saving your private report", short: "Save" },
] as const;

const consoleParticles = [
  ["9%", "18%", "0s"], ["16%", "74%", "-.7s"], ["24%", "34%", "-1.3s"], ["31%", "86%", "-2.1s"], ["39%", "15%", "-.35s"], ["47%", "61%", "-1.8s"], ["55%", "29%", "-2.6s"], ["63%", "79%", "-1.1s"], ["71%", "44%", "-2.35s"], ["79%", "19%", "-.95s"], ["86%", "68%", "-1.55s"], ["94%", "37%", "-2.9s"],
] as const;

type ConsoleParticleStyle = CSSProperties & { "--particle-left": string; "--particle-top": string; "--particle-delay": string };

type ScanStage = (typeof scanSteps)[number]["stage"] | "starting" | "complete";
type ScanUpdate = { stage: ScanStage; progress: number; message: string };
type ScanStreamEvent =
  | { type: "stage"; stage: ScanStage; progress: number; message: string }
  | { type: "complete"; id: string }
  | { type: "error"; message: string };

function MetricTooltipContent({ label, metrics }: { label: string; metrics: string[] }) {
  return <TooltipContent side="top" sideOffset={14} collisionPadding={16} className="coverage-metric-tooltip"><p>{label} metrics</p><ul>{metrics.map(metric => <li key={metric}><Check size={13} />{metric}</li>)}</ul><small>Public, passive signals only</small></TooltipContent>;
}

function CoverageTooltipPreview() {
  const card = coverageMetrics[0];
  return <div className="tooltip-preview-shell"><p>Development-only tooltip preview</p><Tooltip open><article className="coverage-metric-card tooltip-preview-card"><div className="coverage-icon"><Globe2 /></div><span>{card.label}</span><h3>{card.title}</h3><p>{card.description}</p><small>{card.weight}</small><TooltipTrigger asChild><button type="button" className="coverage-metric-trigger"><Info size={14} /><span>View metrics</span></button></TooltipTrigger></article><MetricTooltipContent label={card.label} metrics={card.metrics} /></Tooltip></div>;
}

export default function Home() {
  const { loading, isAuthenticated, logout } = useAuth();
  const [, setLocation] = useLocation();
  const streamRef = useRef<EventSource | null>(null);
  const mobileNavTriggerRef = useRef<HTMLButtonElement | null>(null);
  const mobileNavDrawerRef = useRef<HTMLElement | null>(null);
  const domainInputRef = useRef<HTMLInputElement | null>(null);
  const rerunDomain = readReportRerunDomain(window.location.search);
  const previewDomainState = import.meta.env.DEV ? new URLSearchParams(window.location.search).get("preview") : null;
  const previewDomain = previewDomainState === "invalid-domain" ? "example.com/admin" : previewDomainState === "valid-domain" ? "example.com" : "";
  const previewSignedOut = previewDomainState === "signed-out";
  const previewRecentDomains = previewDomainState === "recent-domains";
  const displayAuthenticated = isAuthenticated && !previewSignedOut;
  const recentScansQuery = trpc.scans.list.useQuery(undefined, { enabled: displayAuthenticated && !previewRecentDomains });
  const [domain, setDomain] = useState(() => previewDomain || rerunDomain);
  const [domainTouched, setDomainTouched] = useState(Boolean(rerunDomain || previewDomain));
  const [suggestionsOpen, setSuggestionsOpen] = useState(previewRecentDomains);
  const [dkimSelector, setDkimSelector] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [scanState, setScanState] = useState<"idle" | "scanning" | "complete">("idle");
  const [scanUpdate, setScanUpdate] = useState<ScanUpdate>({ stage: "starting", progress: 0, message: "" });
  const [scanError, setScanError] = useState("");
  const [scrollProgress, setScrollProgress] = useState(0);
  const [activeSection, setActiveSection] = useState<"home" | "method" | "coverage">("home");
  const previewMobileNav = import.meta.env.DEV && new URLSearchParams(window.location.search).get("preview") === "mobile-nav";
  const previewCoverageTooltip = import.meta.env.DEV && new URLSearchParams(window.location.search).get("preview") === "coverage-tooltip";
  const previewAssessmentTooltip = import.meta.env.DEV && new URLSearchParams(window.location.search).get("preview") === "assessment-tooltip";
  const [mobileNavOpen, setMobileNavOpen] = useState(previewMobileNav);
  const [mobileNavClosing, setMobileNavClosing] = useState(false);
  const [activeCoverageTooltip, setActiveCoverageTooltip] = useState<string | null>(previewCoverageTooltip ? "website" : null);
  const [consoleHovered, setConsoleHovered] = useState(false);
  const motionCardHandlers = {
    onPointerMove: (event: ReactPointerEvent<HTMLElement>) => applyPointerTilt(event.currentTarget, event.clientX, event.clientY),
    onPointerLeave: (event: ReactPointerEvent<HTMLElement>) => resetPointerTilt(event.currentTarget),
  };
  const coverageIcon = { website: Globe2, email: Waypoints, domain: FileText };

  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setScrollProgress(max > 0 ? Math.min(100, Math.round((window.scrollY / max) * 100)) : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      streamRef.current?.close();
    };
  }, []);

  useEffect(() => {
    const updateSection = () => {
      const method = document.getElementById("method");
      const coverage = document.getElementById("coverage");
      const threshold = window.innerHeight * 0.32;
      if (coverage && coverage.getBoundingClientRect().top <= threshold) return setActiveSection("coverage");
      if (method && method.getBoundingClientRect().top <= threshold) return setActiveSection("method");
      setActiveSection("home");
    };
    updateSection();
    window.addEventListener("scroll", updateSection, { passive: true });
    return () => window.removeEventListener("scroll", updateSection);
  }, []);

  useEffect(() => {
    if (!rerunDomain) return;
    const scrollToAssessment = window.setTimeout(() => document.getElementById("assess")?.scrollIntoView({ behavior: "smooth", block: "center" }), 0);
    return () => window.clearTimeout(scrollToAssessment);
  }, [rerunDomain]);

  useLayoutEffect(() => {
    if (!previewCoverageTooltip) return;
    document.getElementById("coverage")?.scrollIntoView({ behavior: "instant" as ScrollBehavior, block: "center" });
  }, [previewCoverageTooltip]);

  const scrollToSection = (id: "method" | "coverage") => {
    closeMobileNav();
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const closeMobileNav = () => {
    if (!mobileNavOpen || mobileNavClosing) return;
    setMobileNavClosing(true);
    window.setTimeout(() => {
      setMobileNavOpen(false);
      setMobileNavClosing(false);
      mobileNavTriggerRef.current?.focus();
    }, 180);
  };

  useEffect(() => {
    if (!mobileNavOpen) return;
    const focusDrawer = window.setTimeout(() => mobileNavDrawerRef.current?.focus(), 0);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMobileNav();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(focusDrawer);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [mobileNavOpen, mobileNavClosing]);

  function startAssessment() {
    const domainFormatError = validatePublicDomainInput(domain);
    if (domainFormatError) {
      setDomainTouched(true);
      toast.error(domainFormatError);
      return;
    }
    if (!confirmed) {
      toast.error("Confirm that you own or are authorized to assess this domain");
      return;
    }
    if (!isAuthenticated) {
      startLogin();
      return;
    }
    streamRef.current?.close();
    setScanError("");
    setScanState("scanning");
    setScanUpdate({ stage: "starting", progress: 3, message: "Connecting to the assessment service" });
    const dkim = dkimSelector.trim() ? `&dkim=${encodeURIComponent(dkimSelector.trim())}` : "";
    const stream = new EventSource(`/api/scan-stream?domain=${encodeURIComponent(domain.trim())}&ai=1${dkim}`);
    streamRef.current = stream;
    stream.onmessage = event => {
      let payload: ScanStreamEvent;
      try {
        payload = JSON.parse(event.data) as ScanStreamEvent;
      } catch {
        return;
      }
      if (payload.type === "stage") {
        setScanUpdate(payload);
        return;
      }
      if (payload.type === "error") {
        stream.close();
        streamRef.current = null;
        setScanState("idle");
        setScanError(payload.message);
        toast.error(payload.message);
        return;
      }
      stream.close();
      streamRef.current = null;
      setScanState("complete");
      setScanUpdate({ stage: "complete", progress: 100, message: "Your report is ready" });
      window.setTimeout(() => setLocation(`/report/${payload.id}`), 700);
    };
    stream.onerror = () => {
      if (stream.readyState === EventSource.CLOSED && streamRef.current === stream) {
        stream.close();
        streamRef.current = null;
        setScanState("idle");
        const message = "The assessment connection was interrupted before a report could be saved";
        setScanError(message);
        toast.error(message);
      }
    };
  }

  const previewProgress = previewDomainState === "progress";
  const visibleState = previewProgress ? "scanning" : scanState;
  const visibleUpdate = previewProgress ? { stage: "scoring" as ScanStage, progress: 84, message: "Calculating your transparent category score" } : scanUpdate;
  const activeIndex = scanSteps.findIndex(item => item.stage === visibleUpdate.stage);
  const displayIndex = activeIndex < 0 ? 0 : activeIndex;
  const activeStep = scanSteps[displayIndex];
  const showProgress = visibleState === "scanning" || visibleState === "complete";
  const recentDomainSuggestions = previewRecentDomains ? ["portal.example.com", "example.com"] : getRecentDomainSuggestions(recentScansQuery.data ?? [], domain);
  const matchingRecentDomains = previewRecentDomains && domain ? recentDomainSuggestions.filter(item => item.includes(domain.toLowerCase())) : recentDomainSuggestions;
  const showDomainSuggestions = displayAuthenticated && !showProgress && suggestionsOpen && matchingRecentDomains.length > 0;
  const domainFormatError = domainTouched ? validatePublicDomainInput(domain) : null;
  const domainIsInvalid = Boolean(domainFormatError);
  const consoleVisualState = getAssessmentConsoleVisualState({ domain, scanning: showProgress });
  const handleConsolePointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty("--console-pointer-x", `${((event.clientX - bounds.left) / bounds.width) * 100}%`);
    event.currentTarget.style.setProperty("--console-pointer-y", `${((event.clientY - bounds.top) / bounds.height) * 100}%`);
  };
  const clearDomain = () => {
    setDomain("");
    setDomainTouched(false);
    setScanError("");
    setSuggestionsOpen(false);
  };
  const selectRecentDomain = (selectedDomain: string) => {
    setDomain(selectedDomain);
    setDomainTouched(true);
    setSuggestionsOpen(false);
    window.setTimeout(() => domainInputRef.current?.focus(), 0);
  };

  if (previewCoverageTooltip) return <CoverageTooltipPreview />;

  return (
    <div className="observatory-page">
      <div className="page-progress" aria-hidden="true"><span style={{ transform: `scaleX(${scrollProgress / 100})` }} /></div>
      <div className="observatory-noise" aria-hidden="true" />
      <header className="observatory-header">
        <button className={`observatory-brand ${activeSection === "home" ? "is-active" : ""}`} onClick={() => { setActiveSection("home"); setLocation("/"); }} aria-label="CyberShield home" aria-current={activeSection === "home" ? "page" : undefined}><span><ShieldCheck size={18} /></span>CyberShield</button>
        <div className="header-meta"><nav className="observatory-nav desktop-nav" aria-label="Primary navigation"><button className={activeSection === "method" ? "is-active" : ""} onClick={() => scrollToSection("method")} aria-current={activeSection === "method" ? "page" : undefined}>How it works</button><button className={activeSection === "coverage" ? "is-active" : ""} onClick={() => scrollToSection("coverage")} aria-current={activeSection === "coverage" ? "page" : undefined}>Coverage</button>{displayAuthenticated ? <button onClick={() => setLocation("/dashboard")}>Workspace</button> : <button className="nav-signin" onClick={startLogin}>Sign in</button>}{displayAuthenticated && <button className="nav-signout" onClick={logout}>Sign out</button>}</nav><SiteThemeToggle compact className="landing-theme-toggle" /></div>
        <button ref={mobileNavTriggerRef} className="nav-drawer-trigger" aria-label={mobileNavOpen ? "Close navigation" : "Open navigation"} aria-expanded={mobileNavOpen} aria-controls="mobile-navigation" onClick={() => mobileNavOpen ? closeMobileNav() : setMobileNavOpen(true)}>{mobileNavOpen ? <X size={19} /> : <Menu size={20} />}</button>
      </header>
      {mobileNavOpen && <><button className={`mobile-nav-backdrop ${mobileNavClosing ? "is-closing" : ""}`} aria-label="Close navigation" onClick={closeMobileNav} /><nav ref={mobileNavDrawerRef} id="mobile-navigation" className={`mobile-nav-drawer ${mobileNavClosing ? "is-closing" : ""}`} aria-label="Mobile navigation" tabIndex={-1}><span>Navigate</span><button className={activeSection === "home" ? "is-active" : ""} onClick={() => { setActiveSection("home"); closeMobileNav(); setLocation("/"); }}>Home</button><button className={activeSection === "method" ? "is-active" : ""} onClick={() => scrollToSection("method")}>How it works</button><button className={activeSection === "coverage" ? "is-active" : ""} onClick={() => scrollToSection("coverage")}>Coverage</button>{displayAuthenticated ? <button onClick={() => { closeMobileNav(); setLocation("/dashboard"); }}>Workspace</button> : <button className="nav-signin" onClick={() => { closeMobileNav(); startLogin(); }}>Sign in</button>}{displayAuthenticated && <button onClick={() => { closeMobileNav(); logout(); }}>Sign out</button>}</nav></>}

      <main>
        <section className="observatory-hero">
          <div className="hero-row">
          <div className="signal-stage" aria-label="CyberShield assessment visual">
            <div className="signal-radar"><span className="radar-rings" /><span className="radar-sweep" /><span className="radar-core"><ShieldCheck size={28} /></span><span className="signal-node node-a" /><span className="signal-node node-b" /><span className="signal-node node-c" /></div>
            <div className="signal-caption"><span>Public evidence field</span><b>3 domains of review</b></div>
          </div>
          <div className="hero-side">
          <div className="hero-intro">
            <h1><span>Know your</span><span>security posture</span></h1>
            <div className="hero-actions"><Button className="ink-button" onClick={() => document.getElementById("assess")?.scrollIntoView({ behavior: "smooth", block: "center" })}>Assess a domain <ArrowRight size={16} /></Button><button className="quiet-link" onClick={() => document.getElementById("coverage")?.scrollIntoView({ behavior: "smooth" })}>View coverage <ChevronDown size={15} /></button></div>
          </div>
          <section className={`assessment-console console-state-${consoleVisualState} ${consoleHovered ? "console-is-hovered" : ""} particles-enabled`} id="assess" onPointerMove={handleConsolePointerMove} onPointerEnter={() => setConsoleHovered(true)} onPointerLeave={() => setConsoleHovered(false)} onFocusCapture={() => setConsoleHovered(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setConsoleHovered(false); }}>
            <div className="console-signal-field" aria-hidden="true"><i /><i /><i />{consoleParticles.map(([left, top, delay], index) => <span key={index} className="console-particle" style={{ "--particle-left": left, "--particle-top": top, "--particle-delay": delay } as ConsoleParticleStyle} />)}</div>
            <div className="console-title"><div className="console-icon"><Radar size={18} /></div><div><span>Start a review</span><h2>Assess a public domain</h2></div></div>
            <div className="console-live-readout" aria-hidden="true"><span><i /> Signal channel</span><b>{consoleVisualState === "scanning" ? "ANALYSING PUBLIC SIGNALS" : consoleVisualState === "engaged" ? "TARGET STAGED · READY TO REVIEW" : "SYSTEM READY · AUTHORIZATION REQUIRED"}</b><em>01 10 01 / SECURE REVIEW</em></div>
            {showProgress ? <div className="observatory-progress" role="status" aria-live="polite">
              <div className="progress-top"><div><span>Live assessment</span><strong><LoaderCircle className="assessment-progress-spinner" size={16} aria-hidden="true" />{visibleState === "complete" ? "Report prepared" : activeStep.label}</strong></div><b>{visibleUpdate.progress}%</b></div>
              <p>{visibleUpdate.message}</p><div className="observatory-progress-track"><i style={{ width: `${visibleUpdate.progress}%` }} /></div>
              <div className="progress-list">{scanSteps.map((step, index) => <div key={step.stage} className={visibleState === "complete" || index < displayIndex ? "done" : index === displayIndex ? "active" : ""}><i>{visibleState === "complete" || index < displayIndex ? <Check size={11} /> : index + 1}</i><span>{step.short}</span></div>)}</div>
              <small>CyberShield checks public signals only and never attempts to log in, exploit, or crawl the target</small><Button className="console-button console-button-loading" disabled><LoaderCircle size={16} /> {visibleState === "complete" ? "Opening your private report" : "Running secure assessment"}</Button>
            </div> : <>
              <label className="console-label" htmlFor="domain">Domain to assess</label>
              <div className="console-domain-combobox" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setSuggestionsOpen(false); }}><div className={`console-input ${domainIsInvalid ? "is-invalid" : ""}`}><Globe2 size={18} /><Input ref={domainInputRef} id="domain" value={domain} role="combobox" aria-autocomplete="list" aria-expanded={showDomainSuggestions} aria-controls="domain-suggestions" aria-invalid={domainIsInvalid} aria-describedby="domain-help" onFocus={() => setSuggestionsOpen(true)} onChange={event => { setDomain(event.target.value); setDomainTouched(Boolean(event.target.value)); setSuggestionsOpen(true); }} onKeyDown={event => { if (event.key === "Escape") setSuggestionsOpen(false); if (event.key === "Enter") startAssessment(); }} placeholder="example.com" />{domain && <button className="console-input-clear" type="button" onClick={clearDomain} aria-label="Clear domain input"><X size={13} /><span>Clear</span></button>}<span>Public only</span></div>{showDomainSuggestions && <div id="domain-suggestions" className="recent-domain-suggestions" role="listbox" aria-label="Your recently assessed domains"><div><Clock3 size={13} /> Your private recent domains</div>{matchingRecentDomains.map(suggestion => <button key={suggestion} type="button" role="option" aria-selected={suggestion === domain.toLowerCase()} onMouseDown={event => event.preventDefault()} onClick={() => selectRecentDomain(suggestion)}><Globe2 size={14} /><span>{suggestion}</span><small>Prefill only</small></button>)}<p>Selecting a domain never starts an assessment. Confirm authorization before running one.</p></div>}</div>
              <p id="domain-help" className={`console-help ${domainIsInvalid ? "is-invalid" : ""}`} role={domainIsInvalid ? "alert" : undefined}>{domainFormatError ?? (rerunDomain ? "Saved-report rerun selected. Reconfirm authorization before starting this fresh passive assessment" : "Enter a public domain only. Paths, ports, credentials, local hosts, and IP addresses are blocked")}</p>
              <details className="console-advanced"><summary>Optional email detail</summary><label htmlFor="dkim-selector">DKIM selector <span>Only if you know it</span></label><Input id="dkim-selector" value={dkimSelector} onChange={event => setDkimSelector(event.target.value)} placeholder="selector" /><p>CyberShield checks this public DNS selector only. Leave blank if you do not know it</p></details>
              <label className="console-confirm"><Checkbox checked={confirmed} onCheckedChange={value => setConfirmed(value === true)} /><span>I own this domain or have written permission to perform a passive assessment</span></label>
              <Tooltip open={previewAssessmentTooltip || undefined}><TooltipTrigger asChild><span className="console-action-tooltip"><Button className="console-button" onClick={startAssessment} disabled={loading || !domain.trim()}>{displayAuthenticated ? "Run secure assessment" : "Sign in to assess"}<ArrowRight size={16} /></Button></span></TooltipTrigger><TooltipContent side="top" sideOffset={12} className="console-action-tooltip-content">Checks public HTTPS, DNS, email, and domain signals after you confirm authorization</TooltipContent></Tooltip>{/* The clipped privacy row was removed to keep the console's lower edge clean at its fixed first-screen height. */}
              {scanError && <div className="console-error"><AlertTriangle size={15} /><span>{scanError}</span></div>}
            </>}
          </section>
          </div>
          </div>
        </section>

        <section className="proof-rail" aria-label="Assessment characteristics"><div className="motion-tilt" {...motionCardHandlers}><b>01</b><span>Bounded checks</span><small>Short passive public requests</small></div><div className="motion-tilt" {...motionCardHandlers}><b>02</b><span>Visible logic</span><small>Weighted findings create each score</small></div><div className="motion-tilt" {...motionCardHandlers}><b>03</b><span>Clear actions</span><small>Practical remediation in plain English</small></div><div className="motion-tilt" {...motionCardHandlers}><b>04</b><span>Private history</span><small>Compare only your own saved scans</small></div></section>

        <section className="method-block" id="method"><div className="section-intro"><span>01 / The method</span><h2>Evidence that leads to a clear action</h2><p>CyberShield keeps the technical signal and business explanation connected so every result is easy to use</p></div><div className="method-ledger"><article className="motion-tilt" {...motionCardHandlers}><span>Observe</span><strong>Public web and DNS signals</strong><p>HTTPS response, headers, cookies, mail records, DNS, and registration context</p></article><article className="motion-tilt" {...motionCardHandlers}><span>Score</span><strong>Transparent weighted logic</strong><p>Warnings and failures create visible deductions across website, email, and domain categories</p></article><article className="motion-tilt" {...motionCardHandlers}><span>Prioritize</span><strong>Actionable remediation</strong><p>Plain-English guidance helps you choose the most important next step</p></article></div></section>

        <section className="coverage-block" id="coverage"><div className="coverage-top"><div><span>02 / Coverage</span><h2>Three signals for one clear posture</h2></div><p>For owners, administrators, and agencies who need a clear starting point before a deeper security review</p></div><div className="coverage-grid">{coverageMetrics.map(card => {
          const Icon = coverageIcon[card.id];
          const isOpen = activeCoverageTooltip === card.id;
          return <Tooltip key={card.id} open={isOpen} onOpenChange={open => setActiveCoverageTooltip(open ? card.id : null)}><article className="motion-tilt coverage-metric-card" {...motionCardHandlers} onPointerEnter={() => setActiveCoverageTooltip(card.id)} onPointerLeave={event => { resetPointerTilt(event.currentTarget); setActiveCoverageTooltip(null); }} onFocusCapture={() => setActiveCoverageTooltip(card.id)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setActiveCoverageTooltip(null); }}><div className="coverage-icon"><Icon /></div><span>{card.label}</span><h3>{card.title}</h3><p>{card.description}</p><small>{card.weight}</small><TooltipTrigger asChild><button type="button" className="coverage-metric-trigger" aria-label={`Show ${card.label.toLowerCase()} scanning metrics`}><Info size={14} /><span>View metrics</span></button></TooltipTrigger></article><MetricTooltipContent label={card.label} metrics={card.metrics} /></Tooltip>;
        })}</div></section>

        <section className="boundary-block"><div className="boundary-mark"><ShieldCheck size={32} /><span>SAFE<br />BY DESIGN</span></div><div><span>03 / Assessment boundary</span><h2>Useful information without intrusive testing</h2><p>CyberShield is not a penetration-testing tool. It assesses public signals only after you confirm authorization</p><div className="boundary-list"><span><Check size={16} /> Public HTTPS and DNS observations</span><span><Check size={16} /> Private saved history and comparison</span><span><Check size={16} /> No ports, exploits, passwords, or brute force</span></div></div></section>
      </main>
      <footer className="observatory-footer"><span>CyberShield SME</span><span>Authorized passive domain posture assessment</span><span>Built for better decisions</span></footer>
    </div>
  );
}
