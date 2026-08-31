import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getPublicContext } from "@/lib/reportContext";
import type { DomainMetadata } from "@shared/cybershield";
import React from "react";

export function PublicContextPanel({ metadata }: { metadata: Partial<DomainMetadata> }) {
  const context = getPublicContext(metadata);
  const certificateLookupAvailable = context.certificateTransparencyStatus === "available";
  const certificateCount = context.certificateSubdomains.length;

  return (
    <Card className="context-card panel-card">
      <CardHeader>
        <div><p className="eyebrow">PUBLIC CONTEXT</p><CardTitle>What the public record shows</CardTitle></div>
        <Badge variant="outline">Passive data only</Badge>
      </CardHeader>
      <CardContent>
        <div className="context-grid">
          <div><span>TLS protocol</span><b>{context.tls.protocol ?? "Unavailable"}</b><small>{context.tls.cipher ?? "No cipher detail returned"}</small></div>
          <div><span>Certificate expiry</span><b>{context.tls.daysUntilExpiry !== null ? `${context.tls.daysUntilExpiry} days` : "Unavailable"}</b><small>{context.tls.validTo ? new Date(context.tls.validTo).toLocaleDateString() : "No expiry date returned"}</small></div>
          <div><span>Registration age</span><b>{context.domainAgeDays !== null ? `${Math.floor(context.domainAgeDays / 365)} years` : "Unavailable"}</b><small>{context.rdapRegistrar ?? "No public registrar returned"}</small></div>
          <div>
            <span>Certificate-listed names</span>
            <b>{certificateLookupAvailable ? certificateCount : "Unavailable"}</b>
            <small>{certificateLookupAvailable ? certificateCount === 0 ? "No certificate-listed names were returned" : `Returned ${certificateCount} of up to 25 public results` : "Public certificate transparency lookup was unavailable; no conclusion about listed names."}</small>
          </div>
        </div>
        {certificateLookupAvailable && certificateCount > 0 && <details className="subdomain-disclosure"><summary>View certificate-listed names</summary><div>{context.certificateSubdomains.map(name => <code key={name}>{name}</code>)}</div></details>}
      </CardContent>
    </Card>
  );
}
