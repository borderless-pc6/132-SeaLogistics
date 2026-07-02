import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "../lib/firebaseConfig";
import type { NotificationPreferences } from "../types/user";

export interface CompanyClientContact {
  companyId: string;
  companyName: string;
  email: string | null;
  preferences: NotificationPreferences;
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  email: true,
  push: true,
  statusUpdates: true,
  newShipments: true,
};

export function mergeClientNotificationPreferences(
  raw: unknown,
  hasPushTarget = true
): NotificationPreferences {
  if (!raw || typeof raw !== "object") {
    return {
      ...DEFAULT_NOTIFICATION_PREFERENCES,
      push: hasPushTarget,
    };
  }

  const prefs = raw as Partial<NotificationPreferences>;
  const push =
    prefs.push ?? prefs.whatsapp ?? (hasPushTarget ? true : false);

  return {
    email: prefs.email ?? DEFAULT_NOTIFICATION_PREFERENCES.email,
    push,
    statusUpdates:
      prefs.statusUpdates ?? DEFAULT_NOTIFICATION_PREFERENCES.statusUpdates,
    newShipments:
      prefs.newShipments ?? DEFAULT_NOTIFICATION_PREFERENCES.newShipments,
  };
}

export function normalizeClientEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.includes("@") ? trimmed : null;
}

export function normalizeClientPhone(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const digits = value.replace(/\D/g, "");
  if (digits.length < 10) return null;
  return digits.startsWith("55") ? digits : `55${digits}`;
}

/**
 * Resolve email e preferências do cliente a partir da empresa (Firebase).
 */
export async function resolveCompanyClientContact(
  companyId: string
): Promise<CompanyClientContact | null> {
  if (!companyId) return null;

  const companyDoc = await getDoc(doc(db, "companies", companyId));
  if (!companyDoc.exists()) return null;

  const companyData = companyDoc.data();
  let email = normalizeClientEmail(companyData.contactEmail);
  let hasPushUsers = false;

  const usersSnap = await getDocs(
    query(collection(db, "users"), where("companyId", "==", companyId))
  );

  for (const userDoc of usersSnap.docs) {
    const userData = userDoc.data();
    if (!email) email = normalizeClientEmail(userData.email);
    if (Array.isArray(userData.fcmTokens) && userData.fcmTokens.length > 0) {
      hasPushUsers = true;
    }
    if (email && hasPushUsers) break;
  }

  const preferences = mergeClientNotificationPreferences(
    companyData.notificationPreferences,
    hasPushUsers
  );

  return {
    companyId,
    companyName: companyData.name || "Cliente",
    email,
    preferences,
  };
}
