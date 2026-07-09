const SESSION_EXPIRES_AT_KEY = "sessionExpiresAt";
const SESSION_EXPIRED_FLAG_KEY = "sessionExpired";

export function getEndOfDayTimestamp(date = new Date()): number {
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return end.getTime();
}

export function storeDailySession(): void {
  localStorage.setItem(
    SESSION_EXPIRES_AT_KEY,
    String(getEndOfDayTimestamp())
  );
}

export function isDailySessionValid(): boolean {
  const raw = localStorage.getItem(SESSION_EXPIRES_AT_KEY);
  if (!raw) return false;

  const expiresAt = Number(raw);
  if (!Number.isFinite(expiresAt)) return false;

  return Date.now() < expiresAt;
}

export function clearDailySession(): void {
  localStorage.removeItem(SESSION_EXPIRES_AT_KEY);
}

export function markSessionExpired(): void {
  sessionStorage.setItem(SESSION_EXPIRED_FLAG_KEY, "1");
}

export function consumeSessionExpiredFlag(): boolean {
  const expired = sessionStorage.getItem(SESSION_EXPIRED_FLAG_KEY) === "1";
  if (expired) {
    sessionStorage.removeItem(SESSION_EXPIRED_FLAG_KEY);
  }
  return expired;
}
