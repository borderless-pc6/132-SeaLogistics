/**
 * @deprecated Embarques são gerenciados via Firestore (`shipments-context`).
 * Mantido apenas como referência — não é importado em nenhum lugar do app.
 */
import type { Shipment } from "../context/shipments-context";
import { apiFetch } from "./authApi";

export async function fetchShipmentsApi(): Promise<Shipment[]> {
  const response = await apiFetch("/api/shipments");
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Erro ao listar embarques");
  return data.shipments;
}

export async function fetchShipmentApi(id: string): Promise<Shipment> {
  const response = await apiFetch(`/api/shipments/${id}`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Embarque não encontrado");
  return data.shipment;
}

export async function createShipmentApi(
  shipment: Omit<Shipment, "id" | "createdAt" | "updatedAt">
): Promise<Shipment> {
  const response = await apiFetch("/api/shipments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(shipment),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Erro ao criar embarque");
  return data.shipment;
}

export async function updateShipmentApi(
  id: string,
  shipment: Partial<Shipment>
): Promise<Shipment> {
  const response = await apiFetch(`/api/shipments/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(shipment),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Erro ao atualizar embarque");
  return data.shipment;
}

export async function updateShipmentStatusApi(
  id: string,
  status: string,
  extra?: { currentLocation?: string; reportedEta?: string }
): Promise<Shipment> {
  const response = await apiFetch(`/api/shipments/${id}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status, ...extra }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Erro ao atualizar status");
  return data.shipment;
}
