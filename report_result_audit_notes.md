# Report Result Audit Notes

Source attachments reviewed for the audit request:

- `pasted_content_4.txt` shows report text for `velodrive-rentals.me`, timestamp `8/27/2026, 3:25:10 AM`, overall grade `C`, overall score `77/100`, website `72/C`, email `69/D`, domain `100/A`, and zero deltas versus the previous saved scan.
- `CyberShieldSME—SignalObservatory.pdf` visually matches the same report structure and values across the exported pages that were inspected.

Observed findings listed in the attachments:

- Domain / information: Public DNS records available; RDAP domain metadata unavailable; Certificate transparency lookup unavailable.
- Email: SPF email authorization; DMARC anti-impersonation policy marked High; DKIM selector not provided; Mail exchanger records.
- Website: TLS certificate context; HTTPS/TLS availability; HTTP Strict Transport Security marked Medium; Content Security Policy marked Medium; MIME type sniffing protection marked Low; Frame embedding protection marked Low; Referrer information policy marked Low; Cookie flag review; robots.txt visibility; Public Git metadata exposure.

Scope text shown in both attachments states the report is passive-only and does not attempt exploitation, credential testing, brute force, intrusive scanning, passwords, port scans, bypasses, or application-logic testing.

## Consistency checks

The exported overall result is arithmetically correct under the saved model: `72 × 50% + 69 × 30% + 100 × 20% = 76.7`, rounded to `77`. The grade threshold maps scores from 70 through 79 to `C`. The website deduction is `27.90`, rounded to 28; the email deduction is `31.25`, rounded to 31; the domain deduction is zero. The latest saved record and its immediately previous same-domain record both contain 77/C overall, 72/C website, 69/D email, and 100/A domain, so the zero comparison deltas are correct.

The PDF presentation matches the supplied extracted text for the score, grade, category results, public-context values, priority guidance, and final scope notes. It contains all six pages and finishes with the certificate-transparency record plus the scope and interpretation cards.

## Important interpretation limits

The certificate-transparency finding says the lookup was unavailable, while the context card still displays zero certificate-listed names. Zero is therefore a placeholder result from an unavailable service, not evidence that no certificate-listed names exist. Similarly, the label `Public Git metadata exposure` should only be interpreted as confirmed when its expanded evidence says the bounded `/.git/HEAD` request returned HTTP 200; the closed ledger row alone is not enough to establish that fact. Neither limitation changes the saved 77/C score.
