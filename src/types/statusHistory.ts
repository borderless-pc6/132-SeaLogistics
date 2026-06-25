export type StatusEventType = "created" | "status_change" | "updated";

export interface StatusHistoryEntry {
  id?: string;
  shipmentId: string;
  eventType: StatusEventType;
  fromStatus?: string;
  toStatus: string;
  changedBy: string;
  changedByName: string;
  changedAt: Date;
  notes?: string;
  companyId?: string;
}
