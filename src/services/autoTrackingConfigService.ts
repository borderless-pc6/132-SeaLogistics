import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../lib/firebaseConfig";

export interface AutoTrackingConfig {
  enabled: boolean;
  lastRunAt?: Date;
  lastProcessed?: number;
  lastUpdated?: number;
}

const CONFIG_PATH = ["systemConfig", "autoTracking"] as const;

export async function getAutoTrackingConfig(): Promise<AutoTrackingConfig> {
  const snap = await getDoc(doc(db, ...CONFIG_PATH));
  if (!snap.exists()) {
    return { enabled: true };
  }
  const data = snap.data();
  return {
    enabled: data.enabled !== false,
    lastRunAt: data.lastRunAt?.toDate?.() ?? undefined,
    lastProcessed: data.lastProcessed,
    lastUpdated: data.lastUpdated,
  };
}

export async function setAutoTrackingEnabled(enabled: boolean): Promise<void> {
  await setDoc(
    doc(db, ...CONFIG_PATH),
    {
      enabled,
      updatedAt: new Date(),
      updatedBy: "ui",
    },
    { merge: true }
  );
}
