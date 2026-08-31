import { describe, expect, it, vi } from "vitest";
import { sharePrivateReport } from "./reportSharing";

const base = { title: "CyberShield report: example.org", text: "Private report", url: "https://example.test/report/id" };

describe("sharePrivateReport", () => {
  it("uses the user-controlled native share sheet when available", async () => {
    const nativeShare = vi.fn().mockResolvedValue(undefined);
    const copyLink = vi.fn();
    await expect(sharePrivateReport({ ...base, nativeShare, copyLink })).resolves.toBe("shared");
    expect(nativeShare).toHaveBeenCalledWith(base);
    expect(copyLink).not.toHaveBeenCalled();
  });

  it("copies the private route only when native sharing is unavailable", async () => {
    const copyLink = vi.fn().mockResolvedValue(undefined);
    await expect(sharePrivateReport({ ...base, copyLink })).resolves.toBe("copied");
    expect(copyLink).toHaveBeenCalledWith(base.url);
  });

  it("does not fall back after a user cancels native sharing", async () => {
    const nativeShare = vi.fn().mockRejectedValue(new DOMException("cancelled", "AbortError"));
    const copyLink = vi.fn();
    await expect(sharePrivateReport({ ...base, nativeShare, copyLink })).resolves.toBe("cancelled");
    expect(copyLink).not.toHaveBeenCalled();
  });

  it("reports an unavailable outcome when copying the private route fails", async () => {
    await expect(sharePrivateReport({ ...base, copyLink: vi.fn().mockRejectedValue(new Error("blocked")) })).resolves.toBe("unavailable");
  });
});
