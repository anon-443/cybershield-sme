import { describe, expect, it } from "vitest";
import { isParticleMotionEnabled, nextParticleMotionPreference } from "./particleMotionPreference";

describe("particle-motion preference", () => {
  it("defaults to enabled and toggles between explicit user preferences", () => {
    expect(isParticleMotionEnabled(null)).toBe(true);
    expect(isParticleMotionEnabled("off")).toBe(false);
    expect(nextParticleMotionPreference(true)).toBe("off");
    expect(nextParticleMotionPreference(false)).toBe("on");
  });
});
