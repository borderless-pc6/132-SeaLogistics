export function validateAdminCode(code: string): boolean {
  const expected = import.meta.env.VITE_ADMIN_CODE;
  if (typeof expected !== "string" || !expected.trim()) {
    return false;
  }
  return code.trim() === expected.trim();
}

export function isAdminRegistrationConfigured(): boolean {
  const expected = import.meta.env.VITE_ADMIN_CODE;
  return typeof expected === "string" && expected.trim().length > 0;
}
