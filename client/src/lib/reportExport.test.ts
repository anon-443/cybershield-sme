import { describe, expect, it, vi } from "vitest";
import { requestReportPdfExport } from "./reportExport";

describe("requestReportPdfExport", () => {
  it("delegates to the browser print action for a private report PDF export", () => {
    const printReport = vi.fn();
    requestReportPdfExport(printReport);
    expect(printReport).toHaveBeenCalledTimes(1);
  });
});
