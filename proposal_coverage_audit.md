# CyberShield Proposal Coverage Audit

## Implemented

CyberShield currently provides authenticated user access, public-domain validation with private-target blocking, authorized passive-assessment confirmation, bounded HTTPS availability checks, selected security-header checks, observed cookie flags, `robots.txt` visibility, SPF, DMARC, MX, A/AAAA, nameserver, and RDAP registrar context. It also provides transparent weighted scoring, AI-assisted explanations constrained to deterministic findings, user-owned scan history, same-domain comparisons, server-driven scan progress, and browser print-to-PDF reporting.

## Partial or missing from the approved proposal

The original proposal also called for certificate/TLS detail, exposed-folder context, DKIM support, WHOIS/domain-age context, basic passive subdomain discovery, and trend visualization. The current build does not yet provide certificate expiry or protocol/cipher context, selected passive exposure checks, user-supplied DKIM selector checks, registration-age extraction, certificate-transparency subdomain context, or a historical score chart.

## Scope decision

The rebuild will close the missing items that remain compatible with the project’s safe passive-only boundary: certificate detail, selected public exposure posture, optional owner-supplied DKIM selector lookup, public registration-date context, certificate-transparency subdomain context, and a private historical score trend. It will retain the existing explicit authorization requirement and avoid exploit attempts, port scanning, brute force, crawling, or intrusive testing.

## Final status matrix

| Approved proposal capability | Final status | Implementation note |
|---|---|---|
| Website HTTPS and TLS checks | Implemented | Bounded HTTPS availability plus TLS protocol, cipher, and certificate-expiry context |
| Security headers, cookie flags, and robots.txt | Implemented | Public response observations only |
| Exposed-folder posture | Implemented safely | Content-free `HEAD` check of the common `/.git/HEAD` path; no response content is read |
| SPF, DMARC, MX | Implemented | Public DNS observations |
| DKIM | Implemented as owner-controlled | Optional selector field enables a selector-specific public DNS lookup; no selector is guessed |
| WHOIS, domain age, DNS | Implemented with RDAP | Public RDAP registrar and registration-age context replaces legacy WHOIS dependency; A/AAAA/nameserver checks remain included |
| Basic subdomain discovery | Implemented passively | Certificate-transparency context, limited to 25 public names with graceful lookup failure |
| Weighted grades, AI remediation, history, comparison | Implemented | Deterministic category scores, AI wording constrained to findings, private history, same-domain deltas |
| Trend visualisation | Implemented | Latest-domain score trend derived only from the signed-in user’s saved scans |
| PDF report | Implemented | Professional report route plus print stylesheet and browser Save as PDF workflow |
| Scheduled rescans, alerts, compliance mapping, public REST API | Deferred future work | These were future improvements in the proposal and remain intentionally excluded from the initial safe passive-only release |
