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
  navio: "navio",
  vessel: "navio",
  naviocodigo: "navioCodigo",
  "codigo navio": "navioCodigo",
  "vessel code": "navioCodigo",
  containertype: "containerType",
  "tipo container": "containerType",
  "tipo de container": "containerType",
  cargoready: "cargoReady",
  "carga pronta": "cargoReady",
  coleta: "coleta",
  emptytoshipper: "emptyToShipper",
  "empty to shipper": "emptyToShipper",
  readytoload: "readyToLoad",
  "ready to load": "readyToLoad",
  loadedonboard: "loadedOnBoard",
  "loaded on board": "loadedOnBoard",
  destinorumo: "destinoRumo",
  "rumo a": "destinoRumo",
  etarumo: "etaRumo",
  "chegada rumo": "etaRumo",
  "eta rumo": "etaRumo",
  shipmapimageurl: "shipMapImageUrl",
  "url mapa navio": "shipMapImageUrl",
  "foto navio": "shipMapImageUrl",
  ce: "ce",
  "conhecimento de embarque": "ce",
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
    navio: mapped.navio || "",
    navioCodigo: mapped.navioCodigo || "",
    containerType: mapped.containerType || "40HC",
    cargoReady: mapped.cargoReady || "",
    coleta: mapped.coleta || "",
    emptyToShipper: mapped.emptyToShipper || "",
    readyToLoad: mapped.readyToLoad || "",
    loadedOnBoard: mapped.loadedOnBoard || "",
    destinoRumo: mapped.destinoRumo || "",
    etaRumo: mapped.etaRumo || "",
    shipMapImageUrl: mapped.shipMapImageUrl || "",
    ce: mapped.ce || "",
  };
}

export async function parseSpreadsheetFile(
  file: File
): Promise<ShipmentImportRow[]> {
  const isExcel =
    file.name.toLowerCase().endsWith(".xlsx") ||
    file.name.toLowerCase().endsWith(".xls");

  const workbook = isExcel
    ? XLSX.read(await file.arrayBuffer(), { type: "array" })
    : XLSX.read(await file.text(), { type: "string" });

  const sheetName = workbook.SheetNames[0];

  if (!sheetName) {
    throw new Error("Arquivo vazio ou inválido");
  }

  const sheet = workbook.Sheets[sheetName];
  const jsonRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
  });

  if (jsonRows.length === 0) {
    throw new Error("Nenhuma linha de dados encontrada no arquivo");
  }

  const parsed = jsonRows
    .map(parseRow)
    .filter((row): row is ShipmentImportRow => row !== null);

  if (parsed.length === 0) {
    throw new Error(
      "Nenhum registro válido encontrado. Verifique se o arquivo possui colunas como cliente, numeroBl ou bl."
    );
  }

  return parsed;
}

/** @deprecated Use parseSpreadsheetFile */
export async function parseCSVFile(file: File): Promise<ShipmentImportRow[]> {
  return parseSpreadsheetFile(file);
}

export const CSV_TEMPLATE_HEADERS = [
  "cliente",
  "tipo",
  "shipper",
  "operador",
  "pol",
  "pod",
  "booking",
  "navio",
  "navioCodigo",
  "quantBox",
  "containerType",
  "cargoReady",
  "coleta",
  "emptyToShipper",
  "readyToLoad",
  "loadedOnBoard",
  "etdOrigem",
  "etaDestino",
  "currentLocation",
  "destinoRumo",
  "etaRumo",
  "numeroBl",
  "ce",
  "armador",
  "invoice",
  "status",
  "imo",
  "shipMapImageUrl",
  "observacoes",
];

export function downloadCSVTemplate(): void {
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([
    CSV_TEMPLATE_HEADERS,
    [
      "JABIL",
      "Marítimo",
      "HISENSE",
      "SEA LOGISTICS",
      "QINGDAO",
      "MANAUS",
      "QGD1778469",
      "CMA CGM VELA",
      "0PPKKE2MA",
      "4",
      "40HC",
      "2025-05-01",
      "",
      "2025-05-05",
      "2025-05-09T05:28",
      "2025-05-10",
      "2025-05-10",
      "2025-06-17",
      "No Mar da China Oriental",
      "Ningbo",
      "",
      "SZ25040887",
      "A INFORMAR",
      "CMA",
      "A INFORMAR",
      "a-embarcar",
      "",
      "",
      "",
    ],
  ]);
  XLSX.utils.book_append_sheet(workbook, sheet, "Embarques");
  XLSX.writeFile(workbook, "template-embarque-internacional-jabil.xlsx");
}

export function downloadCSVTemplateLegacy(): void {
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
