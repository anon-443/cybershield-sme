import { describe, expect, it } from "vitest";
import { isConfirmedGitMetadataExposure } from "./reportFindingPresentation";

describe("isConfirmedGitMetadataExposure", () => {
  it("flags the bounded Git metadata check only when the saved evidence confirms an HTTP 200 response", () => {
    expect(isConfirmedGitMetadataExposure({ id: "public-git-metadata", status: "fail", severity: "critical", evidence: "A HEAD request to /.git/HEAD returned HTTP 200. No response content was read." })).toBe(true);
  });

  it("does not flag informational or unconfirmed Git metadata rows", () => {
    expect(isConfirmedGitMetadataExposure({ id: "public-git-metadata", status: "info", severity: "info", evidence: "The bounded passive check did not observe publicly available Git metadata at this common path." })).toBe(false);
  });
});
