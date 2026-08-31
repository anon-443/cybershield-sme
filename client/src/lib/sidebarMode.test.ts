import { describe, expect, it } from "vitest";
import { shouldUseCompactSidebar } from "./sidebarMode";

describe("shouldUseCompactSidebar", () => {
  it("uses the compact reading rail for saved reports on desktop", () => {
    expect(shouldUseCompactSidebar("/report/scan-123", false)).toBe(true);
  });

  it("keeps workspace navigation expanded for assessment and history routes", () => {
    expect(shouldUseCompactSidebar("/", false)).toBe(false);
    expect(shouldUseCompactSidebar("/dashboard", false)).toBe(false);
  });

  it("keeps mobile navigation under the existing drawer behavior", () => {
    expect(shouldUseCompactSidebar("/report/scan-123", true)).toBe(false);
  });
});
