import { describe, expect, it } from "vitest";
import { getPublicContext } from "./reportContext";

describe("getPublicContext", () => {
  it("returns safe unavailable defaults for legacy saved reports", () => {
    expect(getPublicContext({ rdapRegistrar: null })).toMatchObject({
      domainAgeDays: null,
      certificateSubdomains: [],
      tls: { protocol: null, daysUntilExpiry: null, status: "unavailable" },
    });
  });

  it("preserves expanded passive metadata for newly saved reports", () => {
    expect(getPublicContext({ domainAgeDays: 1000, certificateSubdomains: ["portal.example.com"], tls: { protocol: "TLSv1.3", cipher: "AES_256_GCM", validTo: "2026-12-01T00:00:00.000Z", daysUntilExpiry: 84, status: "available" } })).toMatchObject({
      domainAgeDays: 1000,
      certificateSubdomains: ["portal.example.com"],
      tls: { protocol: "TLSv1.3", daysUntilExpiry: 84, status: "available" },
    });
  });
});
