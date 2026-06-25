import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  where,
} from "firebase/firestore";
import { db } from "../lib/firebaseConfig";
import type { StatusHistoryEntry } from "../types/statusHistory";

export async function recordStatusHistory(
  entry: Omit<StatusHistoryEntry, "id" | "changedAt">
): Promise<void> {
  await addDoc(collection(db, "statusHistory"), {
    ...entry,
    changedAt: new Date(),
  });
}

export function subscribeToStatusHistory(
  shipmentId: string,
  callback: (entries: StatusHistoryEntry[]) => void,
  onError?: (error: Error) => void
): () => void {
  const q = query(
    collection(db, "statusHistory"),
    where("shipmentId", "==", shipmentId),
    orderBy("changedAt", "desc")
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const entries: StatusHistoryEntry[] = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          shipmentId: data.shipmentId,
          eventType: data.eventType,
          fromStatus: data.fromStatus,
          toStatus: data.toStatus,
          changedBy: data.changedBy,
          changedByName: data.changedByName,
          changedAt:
            data.changedAt instanceof Timestamp
              ? data.changedAt.toDate()
              : new Date(data.changedAt),
          notes: data.notes,
          companyId: data.companyId,
        };
      });
      callback(entries);
    },
    (error) => {
      console.error("Erro ao carregar histórico de status:", error);
      onError?.(error);
    }
  );
}
