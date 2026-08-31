import { describe, expect, it } from "vitest";
import { shouldApplyReportDarkTheme } from "./reportPreferences";

describe("shouldApplyReportDarkTheme", () => {
  it("applies low-light styling only to an active saved report", () => {
    expect(shouldApplyReportDarkTheme(true, true)).toBe(true);
  });

  it("does not carry the report preference into non-report workspace routes", () => {
    expect(shouldApplyReportDarkTheme(true, false)).toBe(false);
  });

  it("leaves reports in light mode until the user enables low-light view", () => {
    expect(shouldApplyReportDarkTheme(false, true)).toBe(false);
  });
});
