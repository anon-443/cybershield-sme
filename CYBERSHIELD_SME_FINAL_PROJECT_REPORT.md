# CyberShield SME: Authorized Passive Domain-Security Posture Assessment Platform

**Final Project Report**  
**Prepared for internship submission**  
**Project type:** Full-stack web application  
**Repository:** [github.com/anon-443/cybershield-sme](https://github.com/anon-443/cybershield-sme) (private)

## 1. Problem and Project Objective

Small and medium businesses often need an understandable starting point for reviewing the public security posture of a domain, but they may not have a dedicated security team or the time to interpret raw DNS, TLS, and browser-security information. At the same time, a student project must avoid turning a simple assessment application into an intrusive scanner. CyberShield SME was therefore designed as a **permission-first, passive-only** application that converts bounded public observations into a transparent score, an evidence-led report, and practical next steps.

The project’s objective is not to prove that a website is secure or insecure. Instead, it gives an authenticated domain owner a point-in-time view of three areas: website security, email posture, and public domain intelligence. Before any request begins, the user confirms that they own the domain or have written authorization to assess it. The system then accepts a hostname only, rejects risky target formats, collects limited public information, and stores the resulting report privately for that signed-in user. This scope makes the application appropriate for responsible portfolio and internship use while still demonstrating meaningful full-stack cybersecurity engineering.[1]

## 2. Approach and System Design

CyberShield follows a clear flow: authenticate the user, validate the target, perform bounded public checks, calculate a deterministic result, explain the evidence in plain English, and save the report in the user’s private workspace. The user interface is built as a responsive React application with a public landing page, a guided assessment form, real scan-progress feedback, a private dashboard, a historical comparison view, and a printable report. The design deliberately communicates that the product is for authorized passive assessment rather than penetration testing.

The system architecture separates presentation, application logic, persistence, and external public lookups. React 19, TypeScript, Tailwind CSS, shadcn/ui, and Wouter provide the frontend. The server uses Node.js, Express, and tRPC, while MySQL/TiDB through Drizzle ORM stores user-owned scan summaries and report data. Manus OAuth protects the workspace and scan endpoints. Public DNS, HTTPS, TLS, RDAP, and certificate-transparency sources are used only through bounded server-side checks. An AI layer receives an already-created compact set of deterministic findings and produces explanatory wording only; it is not allowed to invent new observations or independently verify vulnerabilities.[1]

| Layer | Implementation | Contribution to the project |
|---|---|---|
| Presentation | React 19, TypeScript, Tailwind CSS, shadcn/ui | Responsive landing page, assessment form, dashboard, reports, accessible navigation |
| Application | Node.js, Express, tRPC | Protected procedures, authenticated progress streaming, report orchestration |
| Security checks | Native DNS, bounded HTTPS/TLS requests, RDAP, certificate-transparency context | Passive public evidence collection within fixed safety limits |
| Persistence | MySQL/TiDB and Drizzle ORM | Private user-owned scan history, saved reports, comparisons, trends |
| Guidance | Server-side built-in LLM helper | Plain-English explanation constrained to deterministic findings |

## 3. Implementation Details

The scan engine first normalizes the submitted hostname and rejects malformed, local, private, reserved, IP-address, credential-bearing, custom-port, or path-based targets. It also resolves A and AAAA records and blocks known non-public network destinations before making the public web request. The assessment is intentionally bounded: it uses a short HTTPS request without automatic redirect following, a TLS handshake for protocol, cipher, and certificate-expiry context, selected security-header and cookie-flag observations, `robots.txt` visibility, and a content-free `HEAD` posture check for the common `/.git/HEAD` path. The system does not read Git metadata response content.[1]

For email posture, CyberShield passively looks up SPF, DMARC, MX, A/AAAA, and nameserver information. DKIM is supported through an optional selector supplied by the authorized owner; the application never guesses selectors. For public domain intelligence, it uses RDAP registrar and registration-age context and a bounded certificate-transparency lookup that is limited to 25 public names when available. Lookup failures are handled as unavailable or informational outcomes rather than being misrepresented as confirmed security weaknesses.

Scoring is deterministic and transparent. Website security contributes 50% of the overall score, email posture contributes 30%, and domain intelligence contributes 20%. Findings are assigned severity-based deductions, with warning states applying 60% of the relevant deduction and failed states applying 100%. The resulting numeric score is converted consistently to an A–F grade. This means that the visible report score is based on recorded evidence rather than an opaque AI judgement. The AI-generated section explains the recorded findings and recommended remediation in simpler language and includes a non-verification disclaimer.[1]

The private workspace demonstrates practical product features beyond a single scan. Signed-in users can access only their own reports, compare a completed assessment with the immediately previous saved result for the same normalized domain, view category-level changes, and review a latest-domain score trend. Scan status is delivered through an authenticated server-sent event stream so the progress indicators reflect real scan stages rather than a simulated timer. The completed report supports browser printing and saving as PDF.

## 4. Results and Validation

The completed application implements the approved core proposal scope. HTTPS/TLS context; headers, cookies, and `robots.txt`; safe exposed-folder posture context; SPF, DMARC, MX, and optional DKIM; RDAP registration age; bounded certificate-transparency context; weighted grades; constrained AI remediation; private history; comparison; score trends; and printable reporting are all implemented. Scheduled rescans, alerts, compliance mapping, and a public REST API are documented as future extensions and were intentionally excluded from the initial release because they are outside the approved safe passive-only baseline.[2]

Validation included TypeScript checking and automated unit tests for domain normalization, prohibited local/IP/path target handling, deterministic scoring, AI explanation provenance, authenticated scan-stream behavior, legacy report context, and dashboard shortcut safeguards. The final test run completed successfully with **six test files and nineteen tests passing**. Responsive interface checks were also conducted for the desktop landing page, mobile header and drawer behavior, scan-progress and comparison preview states, printable report layout, and the final navigation refinements. No scan data was fabricated for visual testing; development-only previews were used only to render safe comparison and interface states.

> **Result:** CyberShield SME is a complete, documented, full-stack implementation of the approved passive domain-security posture assessment proposal. It is ready for repository submission, a recorded demonstration using an authorized public domain, and Google Classroom upload once the report and video deliverables are attached.

## 5. Limitations and Future Work

CyberShield provides a limited point-in-time posture snapshot. DNS, RDAP, and certificate-transparency data depend on public external services, and a public HTTPS response can differ across routes, devices, or authenticated areas. The score is a prioritization aid, not a guarantee of security, and the application is not a replacement for a professional manual review, threat model, vulnerability assessment, or penetration test.

Future work can add scheduled rescans with renewed authorization, owner-controlled notification workflows, compliance mapping, and richer reporting integrations. Any future enhancement should preserve the application’s core safeguards: explicit authorization, strict public-target validation, bounded request behavior, deterministic scoring, private user-owned reports, and no exploitation or intrusive scanning.

## References

[1] [CyberShield SME README](./README.md)  
[2] [CyberShield Proposal Coverage Audit](./proposal_coverage_audit.md)
