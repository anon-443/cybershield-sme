# CyberShield SME: Live Website Testing Checklist

Use this checklist to test the implemented application before recording the project demonstration. Open the live site, sign in, and use **only a public domain that you own or have written permission to assess**. The application is intentionally passive; do not use it to test other people’s websites.

> **Testing rule:** A public lookup may occasionally return an “unavailable” or informational result because DNS, RDAP, or certificate-transparency services can be rate-limited. That is an expected graceful outcome, not necessarily a product failure.

## 1. Pre-test setup

| Check | What to do | Expected result | Mark |
|---|---|---|---|
| Live site opens | Open the published CyberShield URL | Landing page loads with CyberShield branding, domain form, radar visual, and header navigation | [ ] |
| Test domain ready | Choose one HTTPS-enabled public domain that you own or are authorized to assess | You can honestly confirm the authorization checkbox before scanning | [ ] |
| Browser ready | Use a desktop browser first, then a phone or narrow browser window | You can test both full navigation and mobile navigation | [ ] |

## 2. Landing page, navigation, and responsive behavior

| Check | What to do | Expected result | Mark |
|---|---|---|---|
| Corner navigation | On desktop, inspect the header | The navigation is in the upper-right corner; **Sign in** is the prominent filled action when signed out | [ ] |
| Header navigation | Select **How it works** and **Coverage** | The page scrolls smoothly to the correct section and the active section receives visible feedback | [ ] |
| Home navigation | Select the CyberShield brand | You return to the landing-page start | [ ] |
| Sign-in action | Select **Sign in** while signed out | The secure OAuth sign-in flow begins | [ ] |
| Mobile menu | Narrow the window or use a phone, then select the menu icon | The compact drawer opens with centered navigation items | [ ] |
| Drawer dismissal | Select the backdrop, menu close icon, or press **Escape** | The drawer closes smoothly and focus returns to the menu trigger | [ ] |
| Mobile layout | Review the hero, assessment form, and primary button on a narrow screen | Text remains readable, no horizontal scrolling appears, and controls remain usable | [ ] |

## 3. Authorization and target-safety safeguards

These tests do **not** require testing an external target. Invalid inputs should be rejected before any passive assessment starts.

| Check | What to do | Expected result | Mark |
|---|---|---|---|
| Blank-domain protection | Leave the domain empty | The primary assessment action remains disabled | [ ] |
| Authorization confirmation | Enter your authorized domain but leave the confirmation unchecked, then start | You receive a message requiring authorization confirmation | [ ] |
| Local-host blocking | Try `localhost` or `example.local` | The system rejects the target | [ ] |
| IP-address blocking | Try `127.0.0.1` or another IP address | The system rejects the target | [ ] |
| Path and port blocking | Try `https://example.com/path` or `example.com:8443` | The system rejects the target because hostnames only are accepted | [ ] |
| Credential URL blocking | Try a URL containing a username or password | The system rejects the target | [ ] |
| Public hostname acceptance | Enter only your authorized hostname, such as `yourdomain.com` | The form accepts the hostname after authorization is confirmed | [ ] |

## 4. Scan launch and live progress

| Check | What to do | Expected result | Mark |
|---|---|---|---|
| Start assessment | Enter your authorized public hostname, confirm permission, and select **Run secure assessment** | The assessment begins and does not require a page reload | [ ] |
| Real progress stages | Watch the progress panel | Real server-led stages appear for validation, public DNS, HTTPS/TLS, `robots.txt`, metadata context, scoring, guidance, and saving | [ ] |
| Completion handling | Allow the scan to complete | A completion state appears and the saved report opens automatically | [ ] |
| Error handling | If a public source is unavailable, observe the affected status | The interface reports a clear message rather than freezing or inventing a result | [ ] |

## 5. Report, evidence, and remediation guidance

| Check | What to do | Expected result | Mark |
|---|---|---|---|
| Overall result | Review the report header | An A–F grade and numeric score appear with a responsible-use note | [ ] |
| Category scores | Review Website, Email, and Domain scores | Scores are shown separately and contribute to the overall weighted result | [ ] |
| Finding details | Expand several finding rows | Each row shows observed evidence, status/severity, impact, and recommended remediation where relevant | [ ] |
| Deterministic score logic | Compare reported finding statuses with category scores | The report presents evidence-led deductions rather than an unexplained AI-only score | [ ] |
| AI guidance boundary | Read the AI guidance section and disclaimer | Guidance explains recorded findings and states that it is not independent verification | [ ] |
| TLS context | Review public context or relevant Website findings | Protocol, cipher, certificate-expiry context, or a documented unavailable result is shown | [ ] |
| Browser-security context | Review Website findings | HTTPS availability, selected headers, cookie flags, and `robots.txt` visibility are represented when observable | [ ] |
| Safe Git posture | Review the public metadata finding | The report states only the status of the safe content-free `/.git/HEAD` posture check; no file content is displayed | [ ] |
| Email posture | Review Email findings | SPF, DMARC, and MX context are shown, with unavailable states handled clearly if required | [ ] |
| Optional DKIM | If you know your owned domain’s DKIM selector, enter it in **Optional email detail** and re-run | The report includes a selector-specific public DNS DKIM check; unknown selectors are never guessed | [ ] |
| Domain intelligence | Review the public-context section | A/AAAA, nameserver, RDAP registrar/registration-age, and bounded certificate-transparency context are shown when available | [ ] |
| Print/PDF | Select the report’s print option, then choose browser **Save as PDF** | The print-friendly report layout opens without dashboard navigation chrome | [ ] |

## 6. Private dashboard, history, comparison, and trends

| Check | What to do | Expected result | Mark |
|---|---|---|---|
| Saved history | Open the workspace/dashboard after one completed scan | The saved assessment appears in your personal history | [ ] |
| Privacy boundary | Sign in as another account only if you have a separate approved test account | It cannot see the first account’s reports or scan history | [ ] |
| Same-domain baseline | Run or review the first scan for a domain | The dashboard/report clearly identifies that no previous same-domain baseline exists | [ ] |
| Same-domain comparison | Complete a second assessment for the same normalized domain | The dashboard and report compare it only with the immediately previous saved result for that domain | [ ] |
| Category deltas | Review comparison values | Overall, Website, Email, and Domain movements are shown clearly | [ ] |
| Trend chart | Review the latest-domain trend area after multiple saved scans | A trend is shown from the signed-in user’s saved scans only | [ ] |
| Dashboard shortcuts | Outside an input field, press **Alt+1** then **Alt+2** | The shortcuts navigate to assessment and scan-history areas; hints are visible in the dashboard navigation | [ ] |
| Input safeguard | Click in a text field, then press **Alt+1** or **Alt+2** | Shortcuts do not interrupt typing inside inputs, textareas, or editable content | [ ] |

## 7. Final demonstration readiness check

Before recording the video, repeat the following short journey in one take: open the landing page, show the responsive header, sign in, enter an authorized domain, confirm permission, start the assessment, show live progress, open the report, explain the score and an evidence row, display AI guidance and its disclaimer, print/save the report, open history, and show comparison or the no-prior-scan baseline. This sequence demonstrates the project’s security boundary, technical implementation, and user value without conducting intrusive testing.

| Final sign-off | Expected result | Mark |
|---|---|---|
| All essential flows tested | Landing, authorization, scan, report, dashboard, history, and responsive navigation work as expected | [ ] |
| Demo domain was authorized | You used only a domain you own or have written permission to assess | [ ] |
| Evidence captured | You have screenshots or screen recording clips for the report/video | [ ] |
| Submission assets ready | Private GitHub link, report, and demo video are ready for GCR | [ ] |

## References

[1] [CyberShield SME README](./README.md)  
[2] [CyberShield Proposal Coverage Audit](./proposal_coverage_audit.md)
