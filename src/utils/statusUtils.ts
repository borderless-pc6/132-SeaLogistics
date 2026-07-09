import { getStatusLabel } from "../constants/statusOptions";

export function normalizeStatusKey(status?: string): string {
  if (!status) return "unknown";
  return status
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-");
}

/** Cor para indicadores (dashboard, timeline dots). */
export function getStatusColor(status?: string): string {
  const key = normalizeStatusKey(status);

  switch (key) {
    case "documentacao":
    case "pendente":
      return "#6c757d";
    case "agendado":
      return "#17a2b8";
    case "a-embarcar":
      return "#ffd166";
    case "embarcando":
      return "#fd7e14";
    case "em-transito":
      return "#118ab2";
    case "desembarcando":
      return "#6f42c1";
    case "em-entrega":
      return "#20c997";
    case "concluido":
    case "entregue":
      return "#073b4c";
    case "atrasado":
      return "#dc3545";
    case "cancelado":
      return "#6c757d";
    case "suspenso":
      return "#ffc107";
    default:
      return "#6c757d";
  }
}

export function formatStatusDisplay(status?: string): string {
  if (!status) return "N/A";
  return getStatusLabel(status);
}
