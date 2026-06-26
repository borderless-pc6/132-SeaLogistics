import { apiFetch } from "./authApi";
import type { Shipment } from "../context/shipments-context";

export async function fetchShipmentsApi(): Promise<Shipment[]> {
  const response = await apiFetch("/api/shipments");
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Erro ao buscar embarques");
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
    body: JSON.stringify(shipment),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Erro ao criar embarque");
  return data.shipment;
}

export async function updateShipmentApi(
  id: string,
  updates: Partial<Shipment>
): Promise<Shipment> {
  const response = await apiFetch(`/api/shipments/${id}`, {
    method: "PUT",
    body: JSON.stringify(updates),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Erro ao atualizar embarque");
  return data.shipment;
}

export async function updateShipmentStatusApi(
  id: string,
  status: string,
  extras?: { currentLocation?: string; reportedEta?: string }
): Promise<Shipment> {
  const response = await apiFetch(`/api/shipments/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status, ...extras }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Erro ao atualizar status");
  return data.shipment;
}
