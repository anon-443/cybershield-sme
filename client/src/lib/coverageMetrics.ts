export type CoverageMetric = {
  id: "website" | "email" | "domain";
  label: string;
  title: string;
  description: string;
  weight: string;
  metrics: string[];
};

export const coverageMetrics: CoverageMetric[] = [
  {
    id: "website",
    label: "Website surface",
    title: "See how the public response behaves",
    description: "HTTPS availability, browser security headers, cookie flags, and index directives",
    weight: "Website weight 50%",
    metrics: ["HTTPS and TLS protocol context", "Security-header presence", "Cookie security flags", "Public robots directives"],
  },
  {
    id: "email",
    label: "Email posture",
    title: "Know whether email identity is protected",
    description: "SPF, DMARC, MX routing context, and available domain email signals",
    weight: "Email weight 30%",
    metrics: ["SPF authorization policy", "DMARC enforcement policy", "MX routing records", "Optional DKIM selector context"],
  },
  {
    id: "domain",
    label: "Domain context",
    title: "Understand public ownership signals",
    description: "DNS records, nameservers, public registration context, and resilience cues",
    weight: "Domain weight 20%",
    metrics: ["DNS record availability", "Authoritative nameservers", "RDAP registration context", "Certificate transparency availability"],
  },
];
