import { describe, expect, it } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PublicContextPanel } from "./PublicContextPanel";

describe("PublicContextPanel", () => {
  it("renders safe unavailable defaults for a legacy saved report that lacks newer metadata", () => {
    const markup = renderToStaticMarkup(<PublicContextPanel metadata={{ rdapRegistrar: null }} />);
    expect(markup).toContain("What the public record shows");
    expect(markup).toContain("TLS protocol");
    expect(markup).toContain("Unavailable");
    expect(markup).toContain("Certificate-listed names");
    expect(markup).toContain("Public certificate transparency lookup was unavailable; no conclusion about listed names.");
  });

  it("states that a completed certificate transparency lookup returned no names", () => {
    const markup = renderToStaticMarkup(<PublicContextPanel metadata={{ certificateTransparencyStatus: "available", certificateSubdomains: [] }} />);
    expect(markup).toContain(">0<");
    expect(markup).toContain("No certificate-listed names were returned");
  });

  it("keeps a completed certificate transparency result distinct when names were returned", () => {
    const markup = renderToStaticMarkup(<PublicContextPanel metadata={{ certificateTransparencyStatus: "available", certificateSubdomains: ["portal.example.com"] }} />);
    expect(markup).toContain("Returned 1 of up to 25 public results");
    expect(markup).toContain("View certificate-listed names");
  });
});
