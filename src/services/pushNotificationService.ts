import { arrayRemove, arrayUnion, doc, updateDoc } from "firebase/firestore";
import { getToken, isSupported, onMessage, type Messaging } from "firebase/messaging";
import { db } from "../lib/firebaseConfig";
import { getFirebaseMessaging } from "../lib/firebaseMessaging";

let cachedFcmToken: string | null = null;

function isPushEnabledInPrefs(prefs?: {
  push?: boolean;
  whatsapp?: boolean;
}): boolean {
  if (!prefs) return true;
  if (prefs.push !== undefined) return Boolean(prefs.push);
  if (prefs.whatsapp !== undefined) return Boolean(prefs.whatsapp);
  return true;
}

export function shouldRegisterPush(
  userData?: {
    notifications?: { push?: boolean };
    notificationPreferences?: { push?: boolean; whatsapp?: boolean };
  } | null
): boolean {
  if (!userData) return true;
  const notifications = userData.notifications;
  const prefs = userData.notificationPreferences;
  if (notifications?.push !== undefined) return notifications.push;
  return isPushEnabledInPrefs(prefs);
}

export async function isPushSupported(): Promise<boolean> {
  try {
    return await isSupported();
  } catch {
    return false;
  }
}

export async function requestPushPermission(): Promise<NotificationPermission> {
  if (!("Notification" in window)) {
    return "denied";
  }
  return Notification.requestPermission();
}

export async function registerFcmToken(userId: string): Promise<string | null> {
  if (!(await isPushSupported())) {
    console.warn("[FCM] Push não suportado neste navegador");
    return null;
  }

  const permission = await requestPushPermission();
  if (permission !== "granted") {
    console.warn("[FCM] Permissão de notificação negada");
    return null;
  }

  const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
  if (!vapidKey) {
    console.warn("[FCM] VITE_FIREBASE_VAPID_KEY não configurada");
    return null;
  }

  const messaging = await getFirebaseMessaging();
  if (!messaging) return null;

  const registration = await navigator.serviceWorker.register(
    "/firebase-messaging-sw.js"
  );
  await navigator.serviceWorker.ready;

  const token = await getToken(messaging, {
    vapidKey,
    serviceWorkerRegistration: registration,
  });

  if (!token) return null;

  cachedFcmToken = token;

  await updateDoc(doc(db, "users", userId), {
    fcmTokens: arrayUnion(token),
  });

  return token;
}

async function resolveCurrentFcmToken(): Promise<string | null> {
  if (cachedFcmToken) return cachedFcmToken;

  if (!(await isPushSupported())) return null;

  const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
  if (!vapidKey) return null;

  const messaging = await getFirebaseMessaging();
  if (!messaging) return null;

  const registration = await navigator.serviceWorker.getRegistration(
    "/firebase-messaging-sw.js"
  );
  if (!registration) return null;

  try {
    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: registration,
    });
    if (token) cachedFcmToken = token;
    return token;
  } catch {
    return null;
  }
}

export async function unregisterFcmToken(userId: string): Promise<void> {
  const token = await resolveCurrentFcmToken();
  if (!token) return;

  try {
    await updateDoc(doc(db, "users", userId), {
      fcmTokens: arrayRemove(token),
    });
  } catch (error) {
    console.warn("[FCM] Falha ao remover token:", error);
  } finally {
    cachedFcmToken = null;
  }
}

export function listenForForegroundMessages(
  messaging: Messaging,
  onNotify: (payload: { title: string; body: string; data?: Record<string, string> }) => void
) {
  return onMessage(messaging, (payload) => {
    const title = payload.notification?.title || "Sea Logistics";
    const body = payload.notification?.body || "";
    onNotify({ title, body, data: payload.data as Record<string, string> });
  });
}

export async function verifyPushConnection(): Promise<boolean> {
  try {
    const API_URL = (
      import.meta.env.VITE_BACKEND_URL ||
      import.meta.env.VITE_EMAIL_SERVER_URL ||
      "http://localhost:3001"
    ).replace(/\/+$/, "");

    const response = await fetch(`${API_URL}/api/push/verify`);
    const data = await response.json();
    return Boolean(data.configured);
  } catch {
    return false;
  }
}
