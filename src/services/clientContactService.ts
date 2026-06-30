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
  phone: string | null;
  preferences: NotificationPreferences;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  email: true,
  whatsapp: true,
  statusUpdates: true,
  newShipments: true,
};

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

export function mergeClientNotificationPreferences(
  raw: unknown,
  hasPhone: boolean
): NotificationPreferences {
  if (!raw || typeof raw !== "object") {
    return {
      ...DEFAULT_PREFERENCES,
      whatsapp: hasPhone,
    };
  }

  const prefs = raw as Partial<NotificationPreferences>;
  return {
    email: prefs.email ?? DEFAULT_PREFERENCES.email,
    whatsapp: prefs.whatsapp ?? hasPhone,
    statusUpdates: prefs.statusUpdates ?? DEFAULT_PREFERENCES.statusUpdates,
    newShipments: prefs.newShipments ?? DEFAULT_PREFERENCES.newShipments,
  };
}

function normalizeEmail(value: unknown): string | null {
  return normalizeClientEmail(value);
}

function normalizePhone(value: unknown): string | null {
  return normalizeClientPhone(value);
}

function mergePreferences(
  raw: unknown,
  hasPhone: boolean
): NotificationPreferences {
  return mergeClientNotificationPreferences(raw, hasPhone);
}

/**
 * Resolve email e telefone do cliente final a partir da empresa (Firebase).
 * Prioridade: contactEmail/phone da empresa → usuários vinculados à empresa.
 */
export async function resolveCompanyClientContact(
  companyId: string
): Promise<CompanyClientContact | null> {
  if (!companyId) return null;

  const companyDoc = await getDoc(doc(db, "companies", companyId));
  if (!companyDoc.exists()) return null;

  const companyData = companyDoc.data();
  let email = normalizeEmail(companyData.contactEmail);
  let phone = normalizePhone(
    companyData.whatsappPhone || companyData.phone
  );

  if (!email || !phone) {
    const usersSnap = await getDocs(
      query(collection(db, "users"), where("companyId", "==", companyId))
    );

    for (const userDoc of usersSnap.docs) {
      const userData = userDoc.data();
      if (!email) email = normalizeEmail(userData.email);
      if (!phone) {
        phone = normalizePhone(userData.whatsappPhone || userData.phone);
      }
      if (email && phone) break;
    }
  }

  const preferences = mergePreferences(
    companyData.notificationPreferences,
    Boolean(phone)
  );

  return {
    companyId,
    companyName: companyData.name || "Cliente",
    email,
    phone,
    preferences,
  };
}
