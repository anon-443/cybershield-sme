import { describe, expect, it } from "vitest";
import { coverageMetrics } from "./coverageMetrics";

describe("coverage metrics", () => {
  it("defines detailed public passive metrics for every scored coverage category", () => {
    expect(coverageMetrics.map(card => card.id)).toEqual(["website", "email", "domain"]);
    expect(coverageMetrics.every(card => card.metrics.length === 4)).toBe(true);
  });

  it("keeps the stated category weights aligned with the transparent scoring model", () => {
    expect(coverageMetrics.map(card => card.weight)).toEqual(["Website weight 50%", "Email weight 30%", "Domain weight 20%"]);
  });
});
