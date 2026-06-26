const { describe, it } = require("node:test");
const assert = require("node:assert");
const { hashPassword, verifyPassword } = require("../utils/passwordUtils");

describe("passwordUtils", () => {
  it("hashes and verifies password correctly", () => {
    const password = "SeaLogistics123!";
    const hash = hashPassword(password);
    assert.strictEqual(verifyPassword(password, hash), true);
    assert.strictEqual(verifyPassword("wrong", hash), false);
  });

  it("produces consistent SHA-256 hex", () => {
    const hash = hashPassword("test");
    assert.strictEqual(hash.length, 64);
    assert.match(hash, /^[a-f0-9]+$/);
  });
});
