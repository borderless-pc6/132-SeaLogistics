import type { Shipment } from "../context/shipments-context";

export const CONTAINER_TYPES = ["20GP", "40GP", "40HC", "45HC", "LCL"] as const;

export type ContainerType = (typeof CONTAINER_TYPES)[number];

export function formatContainerSpec(
  quantBox?: number,
  containerType?: string
): string {
  const qty = quantBox ?? 0;
  const type = containerType?.trim() || "40HC";
  if (qty <= 0) return type;
  return `${qty} x ${type}`;
}

export function formatLocationWithRoute(shipment: Shipment): string {
  const location = shipment.currentLocation?.trim();
  const rumo = shipment.destinoRumo?.trim() || shipment.pod?.trim();

  if (location && rumo) {
    return `${location}, rumo a: ${rumo}`;
  }
  return location || rumo || "—";
}

export function formatDatePt(dateString?: string): string {
  if (!dateString) return "—";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString("pt-BR");
}

export function formatDateTimePt(dateString?: string): string {
  if (!dateString) return "—";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
