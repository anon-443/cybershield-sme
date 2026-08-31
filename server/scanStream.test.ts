import express from "express";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authenticateRequest: vi.fn(),
  executeScanForUser: vi.fn(),
}));

vi.mock("./_core/sdk", () => ({
  sdk: { authenticateRequest: mocks.authenticateRequest },
}));

vi.mock("./scanService", () => ({
  executeScanForUser: mocks.executeScanForUser,
}));

import { registerScanStream } from "./scanStream";

let server: Server | null = null;

async function startServer() {
  const app = express();
  registerScanStream(app);
  server = createServer(app);
  await new Promise<void>(resolve => server!.listen(0, "127.0.0.1", resolve));
  const address = server.address() as AddressInfo;
  return `http://127.0.0.1:${address.port}`;
}

afterEach(async () => {
  mocks.authenticateRequest.mockReset();
  mocks.executeScanForUser.mockReset();
  if (server) {
    await new Promise<void>(resolve => server!.close(() => resolve()));
    server = null;
  }
});

describe("authenticated scan progress stream", () => {
  it("rejects an unauthenticated request before a scan can be invoked", async () => {
    mocks.authenticateRequest.mockRejectedValueOnce(new Error("No session"));
    const baseUrl = await startServer();

    const response = await fetch(`${baseUrl}/api/scan-stream?domain=example.com&ai=1`);

    expect(response.status).toBe(401);
    expect(mocks.executeScanForUser).not.toHaveBeenCalled();
  });

  it("streams real progress updates followed by a completion event for the authenticated user", async () => {
    mocks.authenticateRequest.mockResolvedValueOnce({ id: 42 });
    mocks.executeScanForUser.mockImplementationOnce(async (_userId: number, _input: unknown, onProgress: (update: { stage: string; progress: number; message: string }) => void) => {
      onProgress({ stage: "validating", progress: 10, message: "Validating target" });
      onProgress({ stage: "scoring", progress: 84, message: "Calculating score" });
      return { id: "completed-scan", report: {} };
    });
    const baseUrl = await startServer();

    const response = await fetch(`${baseUrl}/api/scan-stream?domain=example.com&ai=1`);
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(mocks.executeScanForUser).toHaveBeenCalledWith(42, { domain: "example.com", includeAi: true }, expect.any(Function));
    expect(body).toContain('"stage":"validating"');
    expect(body).toContain('"stage":"scoring"');
    expect(body).toContain('"type":"complete","id":"completed-scan"');
  });

  it("streams an explicit error event when the authorized scan cannot complete", async () => {
    mocks.authenticateRequest.mockResolvedValueOnce({ id: 42 });
    mocks.executeScanForUser.mockRejectedValueOnce(new Error("Domain check timed out"));
    const baseUrl = await startServer();

    const response = await fetch(`${baseUrl}/api/scan-stream?domain=example.com&ai=1`);
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(body).toContain('"type":"error","message":"Domain check timed out"');
  });
});
