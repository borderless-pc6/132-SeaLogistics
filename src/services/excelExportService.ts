import { saveAs } from "file-saver";
import * as XLSX from "xlsx";
import type { Shipment } from "../context/shipments-context";
import { getStatusLabel } from "../constants/statusOptions";

function formatDate(dateString?: string): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString("pt-BR");
}

function downloadWorkbook(workbook: XLSX.WorkBook, fileName: string): void {
  const excelBuffer = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "array",
  });
  const fileData = new Blob([excelBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  saveAs(fileData, fileName);
}

export function exportShipmentToExcel(shipment: Shipment): void {
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

export function exportShipmentsReport(shipments: Shipment[]): void {
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
