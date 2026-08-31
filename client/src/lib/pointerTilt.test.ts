import { describe, expect, it } from "vitest";
import { calculatePointerTilt } from "./pointerTilt";

describe("calculatePointerTilt", () => {
  const rect = { left: 0, top: 0, width: 200, height: 100 } as DOMRect;

  it("keeps a centered pointer neutral", () => {
    expect(calculatePointerTilt(100, 50, rect)).toEqual({ rotateX: 0, rotateY: 0 });
  });

  it("returns bounded perspective values that point toward the cursor", () => {
    expect(calculatePointerTilt(200, 0, rect)).toEqual({ rotateX: 3, rotateY: 3 });
  });
});
