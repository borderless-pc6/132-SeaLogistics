import { describe, expect, it } from "vitest";
import {
  mergeClientNotificationPreferences,
  normalizeClientEmail,
  normalizeClientPhone,
} from "../clientContactService";

describe("clientContactService", () => {
  it("normalizes valid email", () => {
    expect(normalizeClientEmail("  client@corp.com  ")).toBe("client@corp.com");
  });

  it("rejects invalid email", () => {
    expect(normalizeClientEmail("not-an-email")).toBeNull();
    expect(normalizeClientEmail("")).toBeNull();
  });

  it("normalizes phone with country code", () => {
    expect(normalizeClientPhone("(51) 99134-1262")).toBe("5551991341262");
    expect(normalizeClientPhone("5551991341262")).toBe("5551991341262");
  });

  it("rejects short phone numbers", () => {
    expect(normalizeClientPhone("12345")).toBeNull();
  });

  it("merges company notification preferences with defaults", () => {
    expect(
      mergeClientNotificationPreferences(undefined, true)
    ).toEqual({
      email: true,
      push: true,
      statusUpdates: true,
      newShipments: true,
    });
  });

  it("respects explicit push opt-out", () => {
    expect(
      mergeClientNotificationPreferences({ push: false }, true)
    ).toMatchObject({
      push: false,
      email: true,
    });
  });

  it("maps legacy whatsapp preference to push", () => {
    expect(
      mergeClientNotificationPreferences({ whatsapp: false }, true)
    ).toMatchObject({
      push: false,
    });
  });
});
