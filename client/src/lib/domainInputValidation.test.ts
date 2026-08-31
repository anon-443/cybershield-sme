import { describe, expect, it } from "vitest";
import { validatePublicDomainInput } from "./domainInputValidation";

describe("validatePublicDomainInput", () => {
  it("accepts a plain public domain and an HTTPS domain", () => {
    expect(validatePublicDomainInput("example.com")).toBeNull();
    expect(validatePublicDomainInput("https://portal.example.com")).toBeNull();
  });

  it("rejects local targets, IP addresses, paths, and ports without making requests", () => {
    expect(validatePublicDomainInput("localhost")).toMatch(/public domain|local/i);
    expect(validatePublicDomainInput("127.0.0.1")).toMatch(/IP address/i);
    expect(validatePublicDomainInput("example.com/admin")).toMatch(/only a domain/i);
    expect(validatePublicDomainInput("example.com:8080")).toMatch(/without a port/i);
  });
});
