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

/** Navio com código de rastreio, ex: CMA CGM VELA (0PPKKE2MA) */
export function formatNavioDisplay(shipment: Shipment): string {
  const name = shipment.navio?.trim() || shipment.armador?.trim();
  const code = shipment.navioCodigo?.trim();
  if (name && code) return `${name} (${code})`;
  return name || "—";
}

export function formatLocationCurrent(shipment: Shipment): string {
  return shipment.currentLocation?.trim() || "—";
}

/** Linha "rumo a: Qingdao, chegada 17/06/2025" */
export function formatRumoLine(shipment: Shipment): string | null {
  const rumo = shipment.destinoRumo?.trim() || shipment.pod?.trim();
  if (!rumo) return null;

  const chegada = formatDatePt(shipment.etaRumo);
  if (chegada !== "—") {
    return `rumo a: ${rumo}, chegada ${chegada}`;
  }
  return `rumo a: ${rumo}`;
}

export function formatLocationWithRoute(shipment: Shipment): string {
  const location = formatLocationCurrent(shipment);
  const rumoLine = formatRumoLine(shipment);

  if (location !== "—" && rumoLine) {
    return `${location},\n${rumoLine}`;
  }
  if (rumoLine) return rumoLine;
  return location;
}

/** Texto de posição do navio para planilha/e-mail (modelo JABIL) */
export function formatPosicaoNavioForClient(shipment: Shipment): string {
  const parts: string[] = [];
  const location = shipment.currentLocation?.trim();
  if (location) parts.push(location);

  const rumoLine = formatRumoLine(shipment);
  if (rumoLine) parts.push(rumoLine);

  return parts.join("\n") || "—";
}

export function formatStatusLabelUpper(status?: string): string {
  if (!status) return "—";
  const labels: Record<string, string> = {
    documentacao: "DOCUMENTAÇÃO",
    agendado: "AGENDADO",
    "a-embarcar": "A EMBARCAR",
    embarcando: "EMBARCANDO",
    "em-transito": "EM TRÂNSITO",
    desembarcando: "DESEMBARCANDO",
    "em-entrega": "EM ENTREGA",
    concluido: "CONCLUÍDO",
    atrasado: "ATRASADO",
    cancelado: "CANCELADO",
    suspenso: "SUSPENSO",
    pendente: "PENDENTE",
  };
  return labels[status] || status.toUpperCase();
}

export function formatDateShortPt(dateString?: string): string {
  if (!dateString) return "—";
  const isoDate = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateString.trim());
  if (isoDate) {
    const [, year, month, day] = isoDate;
    return `${day}/${month}/${year.slice(-2)}`;
  }
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

/** Embarque internacional marítimo no modelo JABIL */
export function isInternationalShipmentModel(shipment: Shipment): boolean {
  const tipo = shipment.tipo?.trim();
  if (tipo && tipo !== "Marítimo") return false;
  return Boolean(
    shipment.navio ||
      shipment.cargoReady ||
      shipment.booking ||
      shipment.emptyToShipper
  );
}

export function formatDatePt(dateString?: string): string {
  if (!dateString) return "—";
  const isoDate = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateString.trim());
  if (isoDate) {
    const [, year, month, day] = isoDate;
    return `${day}/${month}/${year}`;
  }
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
