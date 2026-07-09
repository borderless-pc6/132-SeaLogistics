import { apiFetch } from "./authApi";

export async function createShipmentApi(
  shipmentData: Record<string, unknown>
): Promise<{ id: string }> {
  const response = await apiFetch("/api/shipments", {
    method: "POST",
    body: JSON.stringify(shipmentData),
  });

  const result = (await response.json()) as {
    success?: boolean;
    id?: string;
    error?: string;
  };

  if (!response.ok) {
    throw new Error(result.error || "Erro ao criar embarque");
  }

  if (!result.id) {
    throw new Error("Resposta inválida ao criar embarque");
  }

  return { id: result.id };
}

export async function deleteShipmentApi(shipmentId: string): Promise<void> {
  const response = await apiFetch(`/api/shipments/${shipmentId}`, {
    method: "DELETE",
  });

  const result = (await response.json()) as { success?: boolean; error?: string };

  if (!response.ok) {
    throw new Error(result.error || "Erro ao excluir embarque");
  }
}
