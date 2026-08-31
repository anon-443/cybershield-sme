import { describe, expect, it } from "vitest";
import { nextSiteTheme } from "./siteTheme";

describe("nextSiteTheme", () => {
  it("switches predictably between the two supported site themes", () => {
    expect(nextSiteTheme("light")).toBe("dark");
    expect(nextSiteTheme("dark")).toBe("light");
  });
});
