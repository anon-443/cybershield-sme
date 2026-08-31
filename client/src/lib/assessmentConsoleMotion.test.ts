import { describe, expect, it } from "vitest";
import { getAssessmentConsoleVisualState } from "./assessmentConsoleMotion";

describe("getAssessmentConsoleVisualState", () => {
  it("reflects idle, engaged, and scanning console states without affecting assessment logic", () => {
    expect(getAssessmentConsoleVisualState({ domain: "", scanning: false })).toBe("idle");
    expect(getAssessmentConsoleVisualState({ domain: "example.com", scanning: false })).toBe("engaged");
    expect(getAssessmentConsoleVisualState({ domain: "example.com", scanning: true })).toBe("scanning");
  });
});
