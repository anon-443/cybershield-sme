import type { Express, Request, Response } from "express";
import { sdk } from "./_core/sdk";
import { executeScanForUser } from "./scanService";

type StreamEvent =
  | { type: "stage"; stage: string; progress: number; message: string }
  | { type: "complete"; id: string }
  | { type: "error"; message: string };

function sendEvent(res: Response, event: StreamEvent) {
  res.write(`data: ${JSON.stringify(event)}\n\n`);
}

export function registerScanStream(app: Express) {
  app.get("/api/scan-stream", async (req: Request, res: Response) => {
    let user = null;
    try {
      user = await sdk.authenticateRequest(req);
    } catch {
      user = null;
    }
    if (!user) {
      res.status(401).json({ error: "Sign in before starting an assessment." });
      return;
    }
    const domain = typeof req.query.domain === "string" ? req.query.domain : "";
    const includeAi = req.query.ai !== "0";
    const dkimSelector = typeof req.query.dkim === "string" ? req.query.dkim : undefined;
    if (!domain.trim()) {
      res.status(400).json({ error: "Enter a domain to begin the assessment." });
      return;
    }

    res.status(200);
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    let disconnected = false;
    req.on("close", () => {
      disconnected = true;
    });

    try {
      sendEvent(res, { type: "stage", stage: "starting", progress: 3, message: "Starting your authorized passive assessment." });
      const result = await executeScanForUser(user.id, { domain, includeAi, dkimSelector }, update => {
        if (!disconnected) sendEvent(res, { type: "stage", ...update });
      });
      if (!disconnected) sendEvent(res, { type: "complete", id: result.id });
    } catch (error) {
      const message = error instanceof Error ? error.message : "The assessment could not be completed.";
      if (!disconnected) sendEvent(res, { type: "error", message });
    } finally {
      if (!disconnected) res.end();
    }
  });
}
