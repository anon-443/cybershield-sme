import type { DomainMetadata } from "@shared/cybershield";

export function getPublicContext(metadata: Partial<DomainMetadata>) {
  return {
    tls: metadata.tls ?? { protocol: null, cipher: null, validTo: null, daysUntilExpiry: null, status: "unavailable" as const },
    domainAgeDays: metadata.domainAgeDays ?? null,
    rdapRegistrar: metadata.rdapRegistrar ?? null,
    certificateSubdomains: metadata.certificateSubdomains ?? [],
    certificateTransparencyStatus: metadata.certificateTransparencyStatus ?? "unavailable" as const,
  };
}
