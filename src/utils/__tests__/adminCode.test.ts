import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { validateAdminCode, isAdminRegistrationConfigured } from "../adminCode";

describe("adminCode", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_ADMIN_CODE", "9Kx4Tq8M2Zp7");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("validates correct admin code", () => {
    expect(validateAdminCode("9Kx4Tq8M2Zp7")).toBe(true);
  });

  it("rejects invalid admin code", () => {
    expect(validateAdminCode("wrong-code")).toBe(false);
  });

  it("detects when admin registration is configured", () => {
    expect(isAdminRegistrationConfigured()).toBe(true);
  });
});
