import { describe, expect, it } from "vitest";
import { buildReportRerunUrl, readReportRerunDomain } from "./reportRerun";

describe("saved report rerun links", () => {
  it("builds a URL that pre-fills the existing assessment console", () => {
    expect(buildReportRerunUrl("velodrive-rentals.me")).toBe("/?rerun=velodrive-rentals.me#assess");
  });

  it("reads and trims a pre-filled rerun domain without granting authorization", () => {
    expect(readReportRerunDomain("?rerun=%20velodrive-rentals.me%20")).toBe("velodrive-rentals.me");
    expect(readReportRerunDomain("?preview=progress")).toBe("");
  });
});
