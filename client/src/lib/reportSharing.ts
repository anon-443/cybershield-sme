export type PrivateReportShareResult = "shared" | "copied" | "cancelled" | "unavailable";

type PrivateReportShareInput = {
  title: string;
  text: string;
  url: string;
  nativeShare?: (data: ShareData) => Promise<void>;
  copyLink?: (url: string) => Promise<void>;
};

export async function sharePrivateReport({ title, text, url, nativeShare, copyLink }: PrivateReportShareInput): Promise<PrivateReportShareResult> {
  if (nativeShare) {
    try {
      await nativeShare({ title, text, url });
      return "shared";
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return "cancelled";
    }
  }

  if (!copyLink) return "unavailable";
  try {
    await copyLink(url);
    return "copied";
  } catch {
    return "unavailable";
  }
}
