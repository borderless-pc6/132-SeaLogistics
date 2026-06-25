import * as XLSX from "xlsx";
import type { Shipment } from "../context/shipments-context";

export type ShipmentImportRow = Omit<
  Shipment,
  "id" | "createdAt" | "updatedAt" | "companyId"
>;

const COLUMN_MAP: Record<string, keyof ShipmentImportRow> = {
  cliente: "cliente",
  client: "cliente",
  operador: "operador",
  operator: "operador",
  shipper: "shipper",
  invoice: "invoice",
  pol: "pol",
  "porto origem": "pol",
  "origin port": "pol",
  pod: "pod",
  "porto destino": "pod",
  "destination port": "pod",
  etdorigem: "etdOrigem",
  "etd origem": "etdOrigem",
  etd: "etdOrigem",
  etadestino: "etaDestino",
  "eta destino": "etaDestino",
  eta: "etaDestino",
  currentlocation: "currentLocation",
  "localização atual": "currentLocation",
  "localizacao atual": "currentLocation",
  quantbox: "quantBox",
  "qtd containers": "quantBox",
  quantidade: "quantBox",
  status: "status",
  numerobl: "numeroBl",
  "nº bl": "numeroBl",
  "numero bl": "numeroBl",
  bl: "numeroBl",
  armador: "armador",
  carrier: "armador",
  navio: "armador",
  booking: "booking",
  tipo: "tipo",
  type: "tipo",
  observacoes: "observacoes",
  observações: "observacoes",
  observations: "observacoes",
  imo: "imo",
  actualdeparture: "actualDeparture",
  reportedeta: "reportedEta",
};

function normalizeHeader(header: string): string {
  return header
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function normalizeStatus(status: string): string {
  const value = status.trim().toLowerCase();
  const statusMap: Record<string, string> = {
    documentação: "documentacao",
    documentacao: "documentacao",
    agendado: "agendado",
    "a embarcar": "a-embarcar",
    "a-embarcar": "a-embarcar",
    embarcando: "embarcando",
    "em trânsito": "em-transito",
    "em transito": "em-transito",
    "em-transito": "em-transito",
    desembarcando: "desembarcando",
    "em entrega": "em-entrega",
    "em-entrega": "em-entrega",
    concluído: "concluido",
    concluido: "concluido",
    entregue: "concluido",
    atrasado: "atrasado",
    cancelado: "cancelado",
    suspenso: "suspenso",
    pendente: "documentacao",
  };
  return statusMap[value] || value.replace(/\s+/g, "-");
}

function parseRow(
  rawRow: Record<string, unknown>
): ShipmentImportRow | null {
  const mapped: Partial<ShipmentImportRow> = {};

  for (const [rawKey, rawValue] of Object.entries(rawRow)) {
    const field = COLUMN_MAP[normalizeHeader(rawKey)];
    if (!field || rawValue === undefined || rawValue === null) continue;

    const stringValue = String(rawValue).trim();
    if (!stringValue) continue;

    if (field === "quantBox") {
      mapped.quantBox = Number.parseInt(stringValue, 10) || 1;
    } else if (field === "status") {
      mapped.status = normalizeStatus(stringValue);
    } else {
      (mapped as Record<string, string | number>)[field] = stringValue;
    }
  }

  if (!mapped.cliente && !mapped.numeroBl) {
    return null;
  }

  return {
    cliente: mapped.cliente || "",
    operador: mapped.operador || "",
    shipper: mapped.shipper || "",
    invoice: mapped.invoice || "",
    pol: mapped.pol || "",
    pod: mapped.pod || "",
    etdOrigem: mapped.etdOrigem || "",
    etaDestino: mapped.etaDestino || "",
    currentLocation: mapped.currentLocation || "",
    quantBox: mapped.quantBox ?? 1,
    status: mapped.status || "documentacao",
    numeroBl: mapped.numeroBl || "",
    armador: mapped.armador || "",
    booking: mapped.booking || "",
    tipo: mapped.tipo || "Marítimo",
    observacoes: mapped.observacoes || "",
    imo: mapped.imo || "",
    actualDeparture: mapped.actualDeparture || "",
    reportedEta: mapped.reportedEta || "",
  };
}

export async function parseCSVFile(file: File): Promise<ShipmentImportRow[]> {
  const text = await file.text();
  const workbook = XLSX.read(text, { type: "string" });
  const sheetName = workbook.SheetNames[0];

  if (!sheetName) {
    throw new Error("Arquivo CSV vazio ou inválido");
  }

  const sheet = workbook.Sheets[sheetName];
  const jsonRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
  });

  if (jsonRows.length === 0) {
    throw new Error("Nenhuma linha de dados encontrada no CSV");
  }

  const parsed = jsonRows
    .map(parseRow)
    .filter((row): row is ShipmentImportRow => row !== null);

  if (parsed.length === 0) {
    throw new Error(
      "Nenhum registro válido encontrado. Verifique se o CSV possui colunas como cliente, numeroBl ou bl."
    );
  }

  return parsed;
}

export const CSV_TEMPLATE_HEADERS = [
  "cliente",
  "tipo",
  "shipper",
  "operador",
  "pol",
  "pod",
  "etdOrigem",
  "etaDestino",
  "currentLocation",
  "quantBox",
  "numeroBl",
  "armador",
  "booking",
  "invoice",
  "status",
  "imo",
  "observacoes",
];

export function downloadCSVTemplate(): void {
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([
    CSV_TEMPLATE_HEADERS,
    [
      "Empresa Exemplo",
      "Marítimo",
      "Shipper SA",
      "Operador Log",
      "Santos",
      "Rotterdam",
      "2026-01-15",
      "2026-02-20",
      "Em trânsito",
      "2",
      "BL123456",
      "MSC",
      "BK789",
      "INV001",
      "em-transito",
      "9735206",
      "",
    ],
  ]);
  XLSX.utils.book_append_sheet(workbook, sheet, "Template");
  const csv = XLSX.utils.sheet_to_csv(sheet);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "template-importacao-embarques.csv";
  link.click();
  URL.revokeObjectURL(url);
}
