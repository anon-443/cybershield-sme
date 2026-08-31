import { promises as dns } from "node:dns";
import { isIP } from "node:net";
import tls from "node:tls";
import {
  assessmentCategories,
  type AssessmentCategory,
  type CategoryScore,
  type DomainMetadata,
  type FindingSeverity,
  type ScanFinding,
  type ScanReport,
} from "../shared/cybershield";

const ASSESSMENT_NOTICE =
  "Authorized, passive assessments only. CyberShield performs non-invasive HTTP and DNS checks and does not attempt exploitation, credential testing, brute force, or intrusive scanning.";

const CATEGORY_CONFIG: Record<AssessmentCategory, { label: string; weight: number }> = {
  website: { label: "Website security", weight: 0.5 },
  email: { label: "Email security", weight: 0.3 },
  domain: { label: "Domain intelligence", weight: 0.2 },
};

const PENALTY: Record<Exclude<FindingSeverity, "info">, number> = {
  critical: 40,
  high: 25,
  medium: 15,
  low: 5,
};

export type ScanProgressUpdate = {
  stage: "validating" | "https" | "dns" | "robots" | "rdap" | "scoring" | "guidance" | "saving" | "complete";
  progress: number;
  message: string;
};

function finding(input: Omit<ScanFinding, "scoringWeight"> & { scoringWeight?: number }): ScanFinding {
  return { scoringWeight: 1, ...input };
}

function valueFromTxt(records: string[][]): string[] {
  return records.map(record => record.join("")).filter(Boolean);
}

function isPrivateIpv4(ip: string) {
  const octets = ip.split(".").map(Number);
  if (octets.length !== 4 || octets.some(Number.isNaN)) return true;
  const [a, b] = octets;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0) ||
    (a === 192 && b === 2) ||
    (a === 198 && (b === 18 || b === 19 || b === 51)) ||
    (a === 203 && b === 0) ||
    a >= 224
  );
}

function isUnsafeAddress(address: string) {
  if (isIP(address) === 4) return isPrivateIpv4(address);
  const normalized = address.toLowerCase();
  return (
    normalized === "::" ||
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe80:") ||
    normalized.startsWith("2001:db8")
  );
}

export function normalizeDomain(input: string): string {
  const raw = input.trim().toLowerCase();
  if (!raw) throw new Error("Enter a domain to begin the assessment.");

  let url: URL;
  try {
    url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    throw new Error("Enter a valid public domain, such as example.com.");
  }

  if (!["https:", "http:"].includes(url.protocol) || url.port || url.username || url.password) {
    throw new Error("Enter only a public domain without a port or credentials.");
  }
  if (url.pathname !== "/" || url.search || url.hash) {
    throw new Error("Enter only a domain, not a page path, search query, or fragment.");
  }

  const hostname = url.hostname.replace(/\.$/, "");
  const labels = hostname.split(".");
  const hasValidLabels = labels.length >= 2 && labels.every(label => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$|^[a-z0-9]$/i.test(label));
  if (!hasValidLabels || hostname.length > 253 || isIP(hostname)) {
    throw new Error("Enter a valid public domain name rather than an IP address or local host.");
  }
  if (hostname === "localhost" || hostname.endsWith(".localhost") || hostname.endsWith(".local")) {
    throw new Error("Local and private network targets are not permitted.");
  }
  return hostname;
}

export function normalizeDkimSelector(input: string): string {
  const selector = input.trim().toLowerCase();
  if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(selector)) {
    throw new Error("Enter a valid DKIM selector using letters, numbers, or hyphens only.");
  }
  return selector;
}

async function verifyPublicResolution(domain: string): Promise<void> {
  const results = await Promise.allSettled([dns.resolve4(domain), dns.resolve6(domain)]);
  const addresses = results.flatMap(result => (result.status === "fulfilled" ? result.value : []));
  if (addresses.some(isUnsafeAddress)) {
    throw new Error("This domain resolves to a private or reserved network address and cannot be assessed.");
  }
}

async function passiveFetch(url: string) {
  return fetch(url, {
    method: "GET",
    redirect: "manual",
    signal: AbortSignal.timeout(8000),
    headers: {
      "User-Agent": "CyberShield-SME/1.0 (authorized passive assessment)",
      Accept: "text/html,application/xhtml+xml,*/*;q=0.8",
    },
  });
}

async function passiveHead(url: string) {
  return fetch(url, {
    method: "HEAD",
    redirect: "manual",
    signal: AbortSignal.timeout(6000),
    headers: { "User-Agent": "CyberShield-SME/1.0 (authorized passive assessment)" },
  });
}

async function inspectTls(domain: string) {
  return new Promise<{ protocol: string; cipher: string | null; validTo: string | null; daysUntilExpiry: number | null } | null>(resolve => {
    let settled = false;
    const socket = tls.connect({ host: domain, port: 443, servername: domain, rejectUnauthorized: false });
    const finish = (result: { protocol: string; cipher: string | null; validTo: string | null; daysUntilExpiry: number | null } | null) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(result);
    };
    socket.setTimeout(7000, () => finish(null));
    socket.once("error", () => finish(null));
    socket.once("secureConnect", () => {
      const certificate = socket.getPeerCertificate();
      const validTo = certificate.valid_to ? new Date(certificate.valid_to) : null;
      const daysUntilExpiry = validTo && !Number.isNaN(validTo.getTime()) ? Math.floor((validTo.getTime() - Date.now()) / 86_400_000) : null;
      finish({ protocol: socket.getProtocol() ?? "unknown", cipher: socket.getCipher()?.name ?? null, validTo: validTo?.toISOString() ?? null, daysUntilExpiry });
    });
  });
}

async function lookupCertificateSubdomains(domain: string): Promise<{ names: string[]; available: boolean }> {
  try {
    const response = await fetch(`https://crt.sh/?q=${encodeURIComponent(`%.${domain}`)}&output=json`, {
      signal: AbortSignal.timeout(8000),
      headers: { "User-Agent": "CyberShield-SME/1.0 (authorized passive assessment)", Accept: "application/json" },
    });
    if (!response.ok) throw new Error("Certificate transparency lookup failed");
    const records = await response.json() as Array<{ name_value?: string }>;
    const names = Array.from(new Set(records.flatMap(record => (record.name_value ?? "").split("\n")).map(name => name.replace(/^\*\./, "").toLowerCase()).filter(name => name.endsWith(`.${domain}`) && /^[a-z0-9.-]+$/i.test(name)))).slice(0, 25);
    return { names, available: true };
  } catch {
    return { names: [], available: false };
  }
}

async function probePublicStatus(url: string): Promise<number | null> {
  try {
    return (await passiveHead(url)).status;
  } catch {
    return null;
  }
}

async function safeDns<T>(lookup: () => Promise<T>): Promise<{ value: T | null; available: boolean }> {
  try {
    return { value: await lookup(), available: true };
  } catch (error) {
    const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
    if (code === "ENODATA" || code === "ENOTFOUND") {
      return { value: [] as unknown as T, available: true };
    }
    return { value: null, available: false };
  }
}

function gradeFromScore(score: number) {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 55) return "D";
  return "F";
}

export function calculateCategoryScores(findings: ScanFinding[]): CategoryScore[] {
  return assessmentCategories.map(category => {
    const relevant = findings.filter(item => item.category === category);
    const scorable = relevant.filter(item => item.status === "fail" || item.status === "warn");
    const deductionTotal = scorable.reduce((sum, item) => {
      if (item.severity === "info") return sum;
      const stateMultiplier = item.status === "warn" ? 0.6 : 1;
      return sum + PENALTY[item.severity] * item.scoringWeight * stateMultiplier;
    }, 0);
    const score = Math.max(0, Math.round(100 - deductionTotal));
    const unavailableChecks = relevant.filter(item => item.status === "info" && item.evidence.toLowerCase().includes("unavailable")).length;
    const config = CATEGORY_CONFIG[category];
    return {
      category,
      label: config.label,
      weight: config.weight,
      score,
      grade: gradeFromScore(score),
      deductionTotal: Math.round(deductionTotal),
      calculation: `100 − ${Math.round(deductionTotal)} deterministic risk points`,
      availableChecks: relevant.length - unavailableChecks,
      unavailableChecks,
    };
  });
}

function buildDeterministicExplanation(report: Omit<ScanReport, "ai">): ScanReport["ai"] {
  const priorityFindings = report.findings
    .filter(item => item.status === "fail" || item.status === "warn")
    .sort((a, b) => (PENALTY[b.severity as Exclude<FindingSeverity, "info">] ?? 0) - (PENALTY[a.severity as Exclude<FindingSeverity, "info">] ?? 0))
    .slice(0, 3);
  return {
    source: "deterministic-fallback",
    overview: `CyberShield completed passive checks for ${report.normalizedDomain}. The score is calculated only from the deterministic findings shown in this report.`,
    priorityActions: priorityFindings.map((item, index) => ({
      findingId: item.id,
      title: item.title,
      businessImpact: item.impact,
      recommendedAction: item.remediation,
      priority: index === 0 ? "Immediate" : index === 1 ? "Next" : "Improve",
    })),
    disclaimer: "The explanation is based only on recorded deterministic checks. It does not independently verify vulnerabilities or replace a professional security assessment.",
  };
}

export async function runPassiveAssessment(domainInput: string, onProgress?: (update: ScanProgressUpdate) => void, options: { dkimSelector?: string } = {}): Promise<Omit<ScanReport, "ai">> {
  onProgress?.({ stage: "validating", progress: 10, message: "Validating the public domain and private-network safeguards." });
  const domain = normalizeDomain(domainInput);
  const dkimSelector = options.dkimSelector ? normalizeDkimSelector(options.dkimSelector) : null;
  await verifyPublicResolution(domain);
  onProgress?.({ stage: "dns", progress: 24, message: "Reading public DNS, SPF, DMARC, and mail-routing records." });
  const findings: ScanFinding[] = [];

  const [aResult, aaaaResult, mxResult, nsResult, spfResult, dmarcResult, dkimResult] = await Promise.all([
    safeDns(() => dns.resolve4(domain)),
    safeDns(() => dns.resolve6(domain)),
    safeDns(() => dns.resolveMx(domain)),
    safeDns(() => dns.resolveNs(domain)),
    safeDns(() => dns.resolveTxt(domain)),
    safeDns(() => dns.resolveTxt(`_dmarc.${domain}`)),
    dkimSelector ? safeDns(() => dns.resolveTxt(`${dkimSelector}._domainkey.${domain}`)) : Promise.resolve(null),
  ]);

  const metadata: DomainMetadata = {
    aRecords: aResult.value ?? [],
    aaaaRecords: aaaaResult.value ?? [],
    mxRecords: mxResult.value?.map(record => `${record.priority} ${record.exchange}`) ?? [],
    nameservers: nsResult.value ?? [],
    rdapRegistrar: null,
    rdapStatus: "unavailable",
    registrationDate: null,
    domainAgeDays: null,
    certificateSubdomains: [],
    certificateTransparencyStatus: "unavailable",
    tls: { protocol: null, cipher: null, validTo: null, daysUntilExpiry: null, status: "unavailable" },
  };

  if (aResult.available || aaaaResult.available) {
    findings.push(finding({
      id: "public-dns-records",
      category: "domain",
      title: "Public DNS records available",
      status: "pass",
      severity: "info",
      evidence: `${metadata.aRecords.length} A record(s), ${metadata.aaaaRecords.length} AAAA record(s), and ${metadata.nameservers.length} nameserver(s) returned.`,
      impact: "Public DNS is required for customers and services to reach your domain.",
      remediation: "Maintain accurate DNS records and review changes through an approved change-management process.",
    }));
  } else {
    findings.push(finding({
      id: "public-dns-records",
      category: "domain",
      title: "DNS lookup unavailable",
      status: "info",
      severity: "info",
      evidence: "DNS lookup was unavailable from the assessment service.",
      impact: "The service could not verify DNS metadata during this scan.",
      remediation: "Retry later or verify DNS records directly with your DNS provider.",
    }));
  }

  const spfRecords = spfResult.value ? valueFromTxt(spfResult.value) : [];
  const hasSpf = spfRecords.some(record => /^v=spf1\b/i.test(record));
  findings.push(
    spfResult.available
      ? finding({
          id: "spf-record",
          category: "email",
          title: "SPF email authorization",
          status: hasSpf ? "pass" : "fail",
          severity: hasSpf ? "info" : "high",
          evidence: hasSpf ? spfRecords.find(record => /^v=spf1\b/i.test(record)) ?? "SPF record detected." : "No TXT record beginning with v=spf1 was found.",
          impact: hasSpf ? "Your domain publishes sender authorization information." : "Without SPF, attackers may have an easier time impersonating your domain in email.",
          remediation: hasSpf ? "Review the record whenever email providers change." : "Publish an SPF record that lists approved email senders and ends with an appropriate enforcement policy.",
          scoringWeight: 1.1,
        })
      : finding({
          id: "spf-record",
          category: "email",
          title: "SPF lookup unavailable",
          status: "info",
          severity: "info",
          evidence: "SPF DNS lookup was unavailable from the assessment service.",
          impact: "The service could not verify sender authorization during this scan.",
          remediation: "Retry later or inspect the domain TXT records with your DNS provider.",
        }),
  );

  const dmarcRecords = dmarcResult.value ? valueFromTxt(dmarcResult.value) : [];
  const dmarc = dmarcRecords.find(record => /^v=dmarc1\b/i.test(record));
  findings.push(
    dmarcResult.available
      ? finding({
          id: "dmarc-record",
          category: "email",
          title: "DMARC anti-impersonation policy",
          status: dmarc ? "pass" : "fail",
          severity: dmarc ? "info" : "high",
          evidence: dmarc ?? "No DMARC record was found at the _dmarc subdomain.",
          impact: dmarc ? "Your domain publishes a policy for handling unauthenticated email." : "Without DMARC, recipients have less guidance for rejecting impersonated messages.",
          remediation: dmarc ? "Review policy alignment and reporting addresses regularly." : "Publish a DMARC record, begin with monitoring if necessary, and progress to an enforcement policy after validation.",
          scoringWeight: 1.25,
        })
      : finding({
          id: "dmarc-record",
          category: "email",
          title: "DMARC lookup unavailable",
          status: "info",
          severity: "info",
          evidence: "DMARC DNS lookup was unavailable from the assessment service.",
          impact: "The service could not verify anti-impersonation policy during this scan.",
          remediation: "Retry later or inspect the _dmarc TXT record with your DNS provider.",
      }),
  );

  if (!dkimSelector) {
    findings.push(finding({
      id: "dkim-selector-context",
      category: "email",
      title: "DKIM selector not provided",
      status: "info",
      severity: "info",
      evidence: "DKIM records require a selector. No owner-supplied selector was provided for this passive lookup.",
      impact: "The service cannot confirm a selector-specific DKIM record without the selector used by the mail provider.",
      remediation: "Provide the active DKIM selector from the email provider to include it in a future passive assessment.",
    }));
  } else {
    const records = dkimResult?.value ? valueFromTxt(dkimResult.value) : [];
    const hasDkim = records.some(record => /v=DKIM1\b/i.test(record));
    findings.push(dkimResult?.available ? finding({
      id: "dkim-record",
      category: "email",
      title: "DKIM selector record",
      status: hasDkim ? "pass" : "warn",
      severity: hasDkim ? "info" : "medium",
      evidence: hasDkim ? `A DKIM record was found for selector ${dkimSelector}.` : `No DKIM TXT record beginning with v=DKIM1 was found for selector ${dkimSelector}.`,
      impact: hasDkim ? "The selected email signing record is publicly available." : "The selected mail flow may not have a published DKIM record or the selector may be different.",
      remediation: hasDkim ? "Review the selector when the email provider changes." : "Confirm the selector with the mail provider and publish the required DKIM record.",
      scoringWeight: 1.05,
    }) : finding({
      id: "dkim-record",
      category: "email",
      title: "DKIM lookup unavailable",
      status: "info",
      severity: "info",
      evidence: `The service could not read the selected DKIM record for ${dkimSelector}.`,
      impact: "The selector-specific signing posture could not be verified during this assessment.",
      remediation: "Retry later or confirm the selector directly with the email provider.",
    }));
  }

  findings.push(
    mxResult.available
      ? finding({
          id: "mx-records",
          category: "email",
          title: "Mail exchanger records",
          status: metadata.mxRecords.length ? "pass" : "info",
          severity: "info",
          evidence: metadata.mxRecords.length ? `${metadata.mxRecords.length} MX record(s) returned.` : "No MX records returned; the domain may not receive direct email.",
          impact: "This is informational context for the domain’s email configuration.",
          remediation: "Confirm the result matches your intended email architecture.",
        })
      : finding({
          id: "mx-records",
          category: "email",
          title: "MX lookup unavailable",
          status: "info",
          severity: "info",
          evidence: "MX DNS lookup was unavailable from the assessment service.",
          impact: "The service could not verify mail routing during this scan.",
          remediation: "Retry later or inspect MX records with your DNS provider.",
        }),
  );

  onProgress?.({ stage: "https", progress: 49, message: "Reviewing the public HTTPS response, TLS context, headers, and cookie attributes." });
  const tlsInfo = await inspectTls(domain);
  if (tlsInfo) {
    metadata.tls = { ...tlsInfo, status: "available" };
    const expiringSoon = tlsInfo.daysUntilExpiry !== null && tlsInfo.daysUntilExpiry < 21;
    findings.push(finding({
      id: "tls-certificate-context",
      category: "website",
      title: "TLS certificate context",
      status: expiringSoon ? "warn" : "pass",
      severity: expiringSoon ? "medium" : "info",
      evidence: `Negotiated ${tlsInfo.protocol}${tlsInfo.cipher ? ` with ${tlsInfo.cipher}` : ""}${tlsInfo.daysUntilExpiry !== null ? `; certificate expires in ${tlsInfo.daysUntilExpiry} days` : ""}.`,
      impact: expiringSoon ? "A certificate near expiry can interrupt trusted access if renewal is missed." : "The assessment could retrieve basic public TLS negotiation and certificate-expiry context.",
      remediation: expiringSoon ? "Confirm certificate renewal ownership and renew before expiry." : "Track renewal ownership and certificate expiry as part of regular operations.",
      scoringWeight: 1.1,
    }));
  } else {
    findings.push(finding({
      id: "tls-certificate-context",
      category: "website",
      title: "TLS certificate context unavailable",
      status: "info",
      severity: "info",
      evidence: "The service could not retrieve additional TLS handshake context during this assessment.",
      impact: "The HTTPS availability result remains the primary signal for this assessment.",
      remediation: "Retry later or review certificate details directly through the hosting provider.",
    }));
  }
  try {
    const response = await passiveFetch(`https://${domain}/`);
    const status = response.status;
    findings.push(finding({
      id: "https-availability",
      category: "website",
      title: "HTTPS/TLS availability",
      status: "pass",
      severity: "info",
      evidence: `HTTPS responded with status ${status}${response.headers.get("location") ? ` and a redirect to ${response.headers.get("location")}` : ""}.`,
      impact: "Visitors can establish an encrypted HTTPS connection to the assessed host.",
      remediation: "Keep certificates current and redirect HTTP traffic to HTTPS at the edge.",
      scoringWeight: 1.4,
    }));

    const headerChecks: Array<{ key: string; label: string; severity: FindingSeverity; impact: string; remediation: string; weight?: number }> = [
      { key: "strict-transport-security", label: "HTTP Strict Transport Security", severity: "medium", impact: "Without HSTS, browsers may not automatically upgrade future visits to HTTPS.", remediation: "Set a Strict-Transport-Security header after validating HTTPS across your subdomains." },
      { key: "content-security-policy", label: "Content Security Policy", severity: "medium", impact: "Without a CSP, the browser has fewer restrictions on where scripts and content can load from.", remediation: "Deploy a tested Content-Security-Policy tailored to the application’s trusted sources.", weight: 1.1 },
      { key: "x-content-type-options", label: "MIME type sniffing protection", severity: "low", impact: "Browsers may infer content types more broadly than intended.", remediation: "Set X-Content-Type-Options: nosniff for applicable responses." },
      { key: "x-frame-options", label: "Frame embedding protection", severity: "low", impact: "Pages may be more susceptible to clickjacking if framing is not restricted.", remediation: "Set X-Frame-Options or use CSP frame-ancestors to restrict allowed framing origins." },
      { key: "referrer-policy", label: "Referrer information policy", severity: "low", impact: "More URL detail than necessary may be sent to external destinations.", remediation: "Set an appropriate Referrer-Policy, such as strict-origin-when-cross-origin." },
    ];
    for (const header of headerChecks) {
      const value = response.headers.get(header.key);
      findings.push(finding({
        id: `header-${header.key}`,
        category: "website",
        title: header.label,
        status: value ? "pass" : "warn",
        severity: value ? "info" : header.severity,
        evidence: value ? `${header.key}: ${value}` : `${header.key} was not returned on the HTTPS response.`,
        impact: value ? "The assessed response publishes this browser security control." : header.impact,
        remediation: value ? "Review the configured value whenever the site’s architecture changes." : header.remediation,
        scoringWeight: header.weight ?? 1,
      }));
    }

    const cookies = response.headers.getSetCookie?.() ?? (response.headers.get("set-cookie") ? [response.headers.get("set-cookie") as string] : []);
    if (!cookies.length) {
      findings.push(finding({
        id: "cookie-flags",
        category: "website",
        title: "Cookie flag review",
        status: "info",
        severity: "info",
        evidence: "No Set-Cookie header was observed on the assessed response.",
        impact: "No session or preference cookie flags were available to review on this response.",
        remediation: "Review cookie flags on authenticated and application-specific responses as well.",
      }));
    } else {
      const missing = new Set<string>();
      cookies.forEach(cookie => {
        if (!/;\s*secure\b/i.test(cookie)) missing.add("Secure");
        if (!/;\s*httponly\b/i.test(cookie)) missing.add("HttpOnly");
        if (!/;\s*samesite=/i.test(cookie)) missing.add("SameSite");
      });
      findings.push(finding({
        id: "cookie-flags",
        category: "website",
        title: "Cookie security flags",
        status: missing.size ? "warn" : "pass",
        severity: missing.size ? "medium" : "info",
        evidence: missing.size ? `Observed cookie(s) missing: ${Array.from(missing).join(", ")}.` : `${cookies.length} observed cookie(s) included Secure, HttpOnly, and SameSite attributes.`,
        impact: missing.size ? "Missing cookie protections can increase session exposure or cross-site request risks depending on how the cookies are used." : "Observed cookies include core browser-side protection attributes.",
        remediation: missing.size ? "For applicable sensitive cookies, set Secure, HttpOnly, and an appropriate SameSite value." : "Continue reviewing cookie attributes when authentication or session design changes.",
        scoringWeight: 1.05,
      }));
    }
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Connection failed";
    findings.push(finding({
      id: "https-availability",
      category: "website",
      title: "HTTPS/TLS availability",
      status: "fail",
      severity: "high",
      evidence: `The HTTPS request did not complete: ${detail}.`,
      impact: "Visitors may be unable to establish a trusted encrypted connection to this host.",
      remediation: "Verify public DNS, certificate configuration, TLS support, and firewall rules for the HTTPS service.",
      scoringWeight: 1.4,
    }));
    findings.push(finding({
      id: "website-headers-unavailable",
      category: "website",
      title: "Website header review unavailable",
      status: "info",
      severity: "info",
      evidence: "Security headers and cookies could not be reviewed because HTTPS was unavailable.",
      impact: "The assessment could not inspect the live HTTPS response.",
      remediation: "Restore HTTPS availability and rerun the passive assessment.",
    }));
  }

  onProgress?.({ stage: "robots", progress: 66, message: "Checking public robots.txt visibility without crawling site content." });
  try {
    const robots = await passiveFetch(`https://${domain}/robots.txt`);
    findings.push(finding({
      id: "robots-txt",
      category: "website",
      title: "robots.txt visibility",
      status: "info",
      severity: "info",
      evidence: robots.status === 200 ? "robots.txt was publicly accessible with status 200." : `robots.txt returned status ${robots.status}.`,
      impact: "robots.txt is an indexing directive, not an access-control mechanism; its contents can be publicly visible.",
      remediation: "Do not place sensitive paths or secrets in robots.txt. Protect restricted resources with authentication and authorization.",
    }));
  } catch {
    findings.push(finding({
      id: "robots-txt",
      category: "website",
      title: "robots.txt lookup unavailable",
      status: "info",
      severity: "info",
      evidence: "robots.txt could not be retrieved during the passive assessment.",
      impact: "The service could not confirm robots.txt visibility.",
      remediation: "Retry later if this file is relevant to your publication controls.",
    }));
  }

  const gitHeadStatus = await probePublicStatus(`https://${domain}/.git/HEAD`);
  findings.push(gitHeadStatus === null ? finding({
    id: "public-git-metadata",
    category: "website",
    title: "Public Git metadata check unavailable",
    status: "info",
    severity: "info",
    evidence: "The service could not complete the bounded public metadata check.",
    impact: "The assessment could not determine whether common source-control metadata is protected.",
    remediation: "Retry later or confirm the web server does not publish repository metadata.",
  }) : finding({
    id: "public-git-metadata",
    category: "website",
    title: "Public Git metadata exposure",
    status: gitHeadStatus === 200 ? "fail" : "pass",
    severity: gitHeadStatus === 200 ? "critical" : "info",
    evidence: gitHeadStatus === 200 ? "A HEAD request to /.git/HEAD returned HTTP 200. No response content was read." : `A HEAD request to /.git/HEAD returned HTTP ${gitHeadStatus}.`,
    impact: gitHeadStatus === 200 ? "Public source-control metadata can expose implementation information and should not be served by a production website." : "The bounded passive check did not observe publicly available Git metadata at this common path.",
    remediation: gitHeadStatus === 200 ? "Block web access to .git and remove repository metadata from deployed web roots." : "Continue preventing repository metadata from being deployed to public web roots.",
    scoringWeight: 1.3,
  }));

  onProgress?.({ stage: "rdap", progress: 75, message: "Retrieving available public domain-registration context." });
  try {
    const rdapResponse = await passiveFetch(`https://rdap.org/domain/${encodeURIComponent(domain)}`);
    if (!rdapResponse.ok) throw new Error(`RDAP returned ${rdapResponse.status}`);
    const rdap = (await rdapResponse.json()) as { entities?: Array<{ roles?: string[]; vcardArray?: unknown[] }>; events?: Array<{ eventAction?: string; eventDate?: string }> };
    const registrar = rdap.entities?.find(entity => entity.roles?.includes("registrar"));
    const vcard = registrar?.vcardArray?.[1] as Array<[string, unknown, string, string]> | undefined;
    metadata.rdapRegistrar = vcard?.find(item => item[0] === "fn")?.[3] ?? null;
    const registrationEvent = rdap.events?.find(event => event.eventAction === "registration");
    const registrationDate = registrationEvent?.eventDate ? new Date(registrationEvent.eventDate) : null;
    if (registrationDate && !Number.isNaN(registrationDate.getTime())) {
      metadata.registrationDate = registrationDate.toISOString();
      metadata.domainAgeDays = Math.floor((Date.now() - registrationDate.getTime()) / 86_400_000);
    }
    metadata.rdapStatus = "available";
    findings.push(finding({
      id: "rdap-domain-record",
      category: "domain",
      title: "Public domain registration metadata",
      status: "pass",
      severity: "info",
      evidence: `${metadata.rdapRegistrar ? `RDAP returned registrar: ${metadata.rdapRegistrar}. ` : ""}${metadata.domainAgeDays !== null ? `Registration age: ${metadata.domainAgeDays} days.` : "RDAP returned public domain registration metadata."}`,
      impact: "This provides context for domain administration and renewal ownership.",
      remediation: "Keep registrar account access protected with strong authentication and current recovery contacts.",
    }));
  } catch {
    findings.push(finding({
      id: "rdap-domain-record",
      category: "domain",
      title: "RDAP domain metadata unavailable",
      status: "info",
      severity: "info",
      evidence: "The public RDAP lookup was unavailable or did not return a readable record.",
      impact: "The service could not verify public registration metadata during this scan.",
      remediation: "Retry later or review registration details through your domain registrar.",
    }));
  }

  const certificateSubdomains = await lookupCertificateSubdomains(domain);
  metadata.certificateSubdomains = certificateSubdomains.names;
  metadata.certificateTransparencyStatus = certificateSubdomains.available ? "available" : "unavailable";
  findings.push(certificateSubdomains.available ? finding({
    id: "certificate-transparency-context",
    category: "domain",
    title: "Certificate transparency context",
    status: "info",
    severity: "info",
    evidence: certificateSubdomains.names.length ? `${certificateSubdomains.names.length} certificate-listed subdomain name(s) were returned, limited to 25.` : "No certificate-listed subdomain names were returned by the public lookup.",
    impact: "Certificate transparency can provide public context for domains that have appeared in issued certificates.",
    remediation: "Review listed names for relevance and remove retired hosts from certificate and DNS operations where appropriate.",
  }) : finding({
    id: "certificate-transparency-context",
    category: "domain",
    title: "Certificate transparency lookup unavailable",
    status: "info",
    severity: "info",
    evidence: "The public certificate transparency lookup was unavailable during this assessment.",
    impact: "The service could not provide passive certificate-listed subdomain context.",
    remediation: "Retry later if certificate transparency context is required for your review.",
  }));

  onProgress?.({ stage: "scoring", progress: 84, message: "Calculating transparent category scores from recorded findings." });
  const categories = calculateCategoryScores(findings);
  const overallScore = Math.round(categories.reduce((sum, item) => sum + item.score * item.weight, 0));
  return {
    version: "1.0",
    domain: domainInput.trim(),
    normalizedDomain: domain,
    scannedAt: new Date().toISOString(),
    responsibleUseNotice: ASSESSMENT_NOTICE,
    metadata,
    findings,
    categories,
    overall: {
      score: overallScore,
      grade: gradeFromScore(overallScore),
      calculation: categories.map(item => `${item.label} ${item.score} × ${Math.round(item.weight * 100)}%`).join(" + "),
    },
  };
}

export function attachDeterministicExplanation(report: Omit<ScanReport, "ai">): ScanReport {
  return { ...report, ai: buildDeterministicExplanation(report) };
}
