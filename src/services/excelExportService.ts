import { saveAs } from "file-saver";
import type { Shipment } from "../context/shipments-context";
import { getStatusLabel } from "../constants/statusOptions";
import {
  formatContainerSpec,
  formatDateShortPt,
  formatPosicaoNavioForClient,
  formatStatusLabelUpper,
} from "../utils/shipmentFormatters";

function formatDate(dateString?: string): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString("pt-BR");
}

async function getXLSX() {
  return import("xlsx");
}

function downloadWorkbook(
  workbook: import("xlsx").WorkBook,
  fileName: string
): void {
  void import("xlsx").then((XLSX) => {
    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });
    const fileData = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    saveAs(fileData, fileName);
  });
}

export async function exportShipmentToExcel(shipment: Shipment): Promise<void> {
  const XLSX = await import("xlsx");
  const workbook = XLSX.utils.book_new();
  const currentDate = new Date()
    .toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    })
    .toUpperCase();

  const sheetData = [
    ["SEA LOGISTICS INTERNATIONAL"],
    [`FOLLOW UP (${shipment.cliente || "CLIENTE"}) - ${currentDate}`],
    [],
    [
      "PROCESSO IM",
      "CLIENTE",
      "SHIPPER",
      "OPERADOR",
      "POL",
      "POD",
      "ETA",
      "ETD",
      "STATUS",
      "TIPO",
      "ARMADOR",
    ],
    [
      shipment.numeroBl || "N/A",
      shipment.cliente || "N/A",
      shipment.shipper || "N/A",
      shipment.operador || "N/A",
      shipment.pol || "N/A",
      shipment.pod || "N/A",
      formatDate(shipment.etaDestino),
      formatDate(shipment.etdOrigem),
      getStatusLabel(shipment.status),
      shipment.tipo || "N/A",
      shipment.armador || "N/A",
    ],
    [],
    [
      "BOOKING",
      "QUANTIDADE",
      "LOCALIZAÇÃO ATUAL",
      "INVOICE",
      "IMO",
      "OBSERVAÇÕES",
    ],
    [
      shipment.booking || "N/A",
      shipment.quantBox || 0,
      shipment.currentLocation || "N/A",
      shipment.invoice || "N/A",
      shipment.imo || "N/A",
      shipment.observacoes || "",
    ],
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
  worksheet["!cols"] = [
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 14 },
    { wch: 14 },
    { wch: 12 },
    { wch: 12 },
    { wch: 16 },
    { wch: 12 },
    { wch: 18 },
  ];
  worksheet["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 10 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 10 } },
  ];

  XLSX.utils.book_append_sheet(workbook, worksheet, "Follow Up");

  const fileName = shipment.numeroBl
    ? `follow-up-${shipment.cliente}-${shipment.numeroBl}.xlsx`
    : `follow-up-${shipment.cliente}-${new Date().toISOString().split("T")[0]}.xlsx`;

  downloadWorkbook(workbook, fileName);
}

/**
 * Planilha "STATUS OPERAÇÃO" — modelo do PDF de referência JABIL
 * (enviada ao cliente via WhatsApp com foto do navio).
 */
export async function exportJabilStatusSpreadsheet(shipment: Shipment): Promise<void> {
  const XLSX = await getXLSX();
  const workbook = XLSX.utils.book_new();
  const reportDate = new Date()
    .toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    })
    .toUpperCase();

  const cliente = (shipment.cliente || "CLIENTE").toUpperCase();
  const posicaoResumo = shipment.currentLocation?.trim() || "—";
  const posicaoDetalhe = formatPosicaoNavioForClient(shipment);

  const headers = [
    "CLIENTE",
    "SHIPPER",
    "OPERADOR",
    "POL",
    "POD",
    "ETD ORIGEM",
    "ETA DESTINO",
    "QUANT BOX",
    "TIPO CNTR",
    "STATUS",
    "CE",
    "INVOICE",
    "N° BL",
    "ARMADOR",
    "BOOKING",
    "POSIÇÃO ATUAL DO NV",
  ];

  const dataRow = [
    shipment.cliente || "",
    shipment.shipper || "",
    shipment.operador || "",
    shipment.pol || "",
    shipment.pod || "",
    formatDateShortPt(shipment.etdOrigem),
    formatDateShortPt(shipment.etaDestino),
    shipment.quantBox ?? "",
    shipment.containerType || "40HC",
    formatStatusLabelUpper(shipment.status),
    shipment.ce || "A INFORMAR",
    shipment.invoice || "A INFORMAR",
    shipment.numeroBl || "",
    shipment.armador || "",
    shipment.booking || "",
    posicaoResumo,
  ];

  const sheetData = [
    [`STATUS OPERAÇÃO ${cliente}`],
    [`Data: ${reportDate}`],
    [],
    headers,
    dataRow,
    [],
    ["Detalhamento da posição do navio:"],
    [posicaoDetalhe],
  ];

  if (shipment.shipMapImageUrl?.trim()) {
    sheetData.push([], ["URL mapa/foto do navio:"], [shipment.shipMapImageUrl]);
  }

  const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
  worksheet["!cols"] = headers.map(() => ({ wch: 16 }));
  worksheet["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: headers.length - 1 } },
  ];

  XLSX.utils.book_append_sheet(workbook, worksheet, "Status Operação");

  const fileName = `status-operacao-${(shipment.cliente || "cliente").toLowerCase()}-${shipment.booking || shipment.numeroBl || "embarque"}.xlsx`;
  downloadWorkbook(workbook, fileName);
}

/** Modelo de campos para follow-up (referência: INFORMAÇÕES PARA FOLLOW UP DOS CLIENTES.xlsx) */
export async function downloadFollowUpFieldsTemplate(): Promise<void> {
  const XLSX = await getXLSX();
  const workbook = XLSX.utils.book_new();
  const sheetData = [
    ["INFORMAÇÕES QUE ENVIAMOS AO CLIENTE PRE - POS EMBARQUE"],
    [],
    ["IMPORTAÇÃO", "AÉREO", "RODOVIÁRIO"],
    ["EMBARQUES FCL - LCL", "ETD", "COLETA"],
    ["DATA CARGA PRONTA", "ETA", "ORIGEM"],
    ["PREVISÃO DA COLETA", "TIPO DE CARGA", "DESTINO"],
    ["COLETA REALIZADA", "AEROPORTO ORIGEM", "CTE"],
    ["FOTO DA CARGA COLETADA", "AEROPORTO DESTINO", "LOCALIZAÇÃO ATUAL"],
    ["BL", "MAWB", ""],
    ["CNTR", "HAWB", ""],
    ["NAVIO/VIAGEM", "Número do Voo", ""],
    ["Empty to shipper", "Volume Total", ""],
    ["Ready to be loaded", "Peso Bruto (G.W)", ""],
    ["ETD", "", ""],
    ["ETA", "", ""],
    ["Localização atual do navio", "", ""],
    [],
    ["Mapeamento no Sea Logistics (marítimo):"],
    ["Campo planilha", "Campo sistema"],
    ["DATA CARGA PRONTA", "cargoReady"],
    ["PREVISÃO DA COLETA / COLETA", "coleta"],
    ["BL", "numeroBl"],
    ["CNTR", "quantBox + containerType"],
    ["NAVIO/VIAGEM", "navio + navioCodigo"],
    ["Empty to shipper", "emptyToShipper"],
    ["Ready to be loaded", "readyToLoad"],
    ["ETD", "etdOrigem"],
    ["ETA", "etaDestino"],
    ["Localização atual do navio", "currentLocation + destinoRumo + etaRumo"],
    ["CE", "ce"],
    ["BOOKING", "booking"],
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
  worksheet["!cols"] = [{ wch: 34 }, { wch: 28 }, { wch: 22 }];
  XLSX.utils.book_append_sheet(workbook, worksheet, "Programação de Navios");
  downloadWorkbook(workbook, "modelo-follow-up-clientes.xlsx");
}

export async function exportShipmentsReport(shipments: Shipment[]): Promise<void> {
  const XLSX = await getXLSX();
  const workbook = XLSX.utils.book_new();
  const generatedAt = new Date().toLocaleString("pt-BR");

  const headers = [
    "Cliente",
    "Tipo",
    "Shipper",
    "Operador",
    "POL",
    "POD",
    "ETD Origem",
    "ETA Destino",
    "Localização Atual",
    "Qtd. Containers",
    "Nº BL",
    "Armador",
    "Booking",
    "Invoice",
    "Status",
    "IMO",
    "Observações",
  ];

  const rows = shipments.map((s) => [
    s.cliente || "",
    s.tipo || "",
    s.shipper || "",
    s.operador || "",
    s.pol || "",
    s.pod || "",
    formatDate(s.etdOrigem),
    formatDate(s.etaDestino),
    s.currentLocation || "",
    s.quantBox ?? 0,
    s.numeroBl || "",
    s.armador || "",
    s.booking || "",
    s.invoice || "",
    getStatusLabel(s.status),
    s.imo || "",
    s.observacoes || "",
  ]);

  const summarySheet = XLSX.utils.aoa_to_sheet([
    ["SEA LOGISTICS INTERNATIONAL - RELATÓRIO DE EMBARQUES"],
    [`Gerado em: ${generatedAt}`],
    [`Total de registros: ${shipments.length}`],
    [],
    headers,
    ...rows,
  ]);

  summarySheet["!cols"] = headers.map(() => ({ wch: 16 }));
  summarySheet["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: headers.length - 1 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: headers.length - 1 } },
  ];

  XLSX.utils.book_append_sheet(workbook, summarySheet, "Embarques");

  const fileName = `relatorio-embarques-${new Date().toISOString().split("T")[0]}.xlsx`;
  downloadWorkbook(workbook, fileName);
}
