import { describe, expect, it } from "vitest";
import { getDashboardShortcutPath } from "./dashboardShortcuts";

const base = { altKey: true, ctrlKey: false, metaKey: false, shiftKey: false, isTyping: false };

describe("getDashboardShortcutPath", () => {
  it("routes Alt+1 to the assessment page and Alt+2 to scan history", () => {
    expect(getDashboardShortcutPath({ ...base, key: "1" })).toBe("/");
    expect(getDashboardShortcutPath({ ...base, key: "2" })).toBe("/dashboard");
  });

  it("ignores unrelated keys, modifier combinations, and text-entry contexts", () => {
    expect(getDashboardShortcutPath({ ...base, key: "x" })).toBeNull();
    expect(getDashboardShortcutPath({ ...base, key: "1", altKey: false })).toBeNull();
    expect(getDashboardShortcutPath({ ...base, key: "1", ctrlKey: true })).toBeNull();
    expect(getDashboardShortcutPath({ ...base, key: "2", isTyping: true })).toBeNull();
  });
});
