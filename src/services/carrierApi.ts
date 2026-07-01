import { apiFetch, getAuthToken } from "./authApi";

export interface CarrierSimulationResult {
  shipmentId: string;
  numeroBl: string;
  oldStatus: string;
  newStatus: string;
  carrierMessage: string;
  notifications?: { email: boolean; whatsapp: boolean };
}

export interface CarrierBatchResponse {
  success: boolean;
  processed: number;
  updated: number;
  results: CarrierSimulationResult[];
  error?: string;
}

export interface CarrierSingleResponse {
  success: boolean;
  updated: boolean;
  shipment?: Record<string, unknown>;
  simulation?: {
    status: string;
    currentLocation: string;
    carrierMessage: string;
    carrierName: string;
  };
  oldStatus?: string;
  notifications?: { email: boolean; whatsapp: boolean };
  reason?: string;
  error?: string;
}

export function isCarrierApiAvailable(): boolean {
  return Boolean(getAuthToken());
}

export async function runCarrierBatchSimulation(
  limit = 3
): Promise<CarrierBatchResponse> {
  const response = await apiFetch("/api/carrier/mock-batch", {
    method: "POST",
    body: JSON.stringify({ limit }),
  });

  const data = (await response.json()) as CarrierBatchResponse;

  if (!response.ok) {
    throw new Error(data.error || "Erro na simulação de transportadora");
  }

  return data;
}

export async function runCarrierSingleSimulation(
  shipmentId: string
): Promise<CarrierSingleResponse> {
  const response = await apiFetch(`/api/carrier/mock-update/${shipmentId}`, {
    method: "POST",
  });

  const data = (await response.json()) as CarrierSingleResponse;

  if (!response.ok) {
    throw new Error(data.error || "Erro na simulação de transportadora");
  }

  return data;
}
