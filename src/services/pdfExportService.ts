import jsPDF from "jspdf";
// @ts-ignore - jspdf-autotable não tem tipos TypeScript oficiais
import autoTable from "jspdf-autotable";

interface DashboardStats {
  totalShipments: number;
  inTransit: number;
  delivered: number;
  pending: number;
  thisMonth: number;
  totalUsers?: number;
  totalCompanies?: number;
  activeCompanies?: number;
}

interface Shipment {
  id?: string;
  cliente?: string;
  operador?: string;
  shipper?: string;
  invoice?: string;
  numeroBl?: string;
  pol?: string;
  pod?: string;
  status?: string;
  etdOrigem?: string;
  etaDestino?: string;
  currentLocation?: string;
  quantBox?: number;
  armador?: string;
  booking?: string;
  tipo?: string;
  imo?: string;
  [key: string]: any; // Para permitir campos adicionais
}

interface PDFExportOptions {
  title: string;
  stats?: DashboardStats;
  shipments?: Shipment[];
  charts?: boolean;
  language?: "pt" | "en" | "es";
}

const translations = {
  pt: {
    reportTitle: "Relatório de Dashboard",
    generatedOn: "Gerado em",
    statistics: "Estatísticas",
    totalShipments: "Total de Envios",
    inTransit: "Em Trânsito",
    delivered: "Entregues",
    pending: "Pendentes",
    thisMonth: "Este Mês",
    totalUsers: "Total de Usuários",
    activeCompanies: "Empresas Ativas",
    shipmentsList: "Lista de Envios",
    client: "Cliente",
    blNumber: "Número BL",
    origin: "Origem",
    destination: "Destino",
    status: "Status",
    departure: "Partida",
    arrival: "Chegada",
    carrier: "Armador",
    booking: "Booking",
    noData: "Nenhum dado disponível",
  },
  en: {
    reportTitle: "Dashboard Report",
    generatedOn: "Generated on",
    statistics: "Statistics",
    totalShipments: "Total Shipments",
    inTransit: "In Transit",
    delivered: "Delivered",
    pending: "Pending",
    thisMonth: "This Month",
    totalUsers: "Total Users",
    activeCompanies: "Active Companies",
    shipmentsList: "Shipments List",
    client: "Client",
    blNumber: "BL Number",
    origin: "Origin",
    destination: "Destination",
    status: "Status",
    departure: "Departure",
    arrival: "Arrival",
    carrier: "Carrier",
    booking: "Booking",
    noData: "No data available",
  },
  es: {
    reportTitle: "Informe del Panel",
    generatedOn: "Generado el",
    statistics: "Estadísticas",
    totalShipments: "Total de Envíos",
    inTransit: "En Tránsito",
    delivered: "Entregados",
    pending: "Pendientes",
    thisMonth: "Este Mes",
    totalUsers: "Total de Usuarios",
    activeCompanies: "Empresas Activas",
    shipmentsList: "Lista de Envíos",
    client: "Cliente",
    blNumber: "Número BL",
    origin: "Origen",
    destination: "Destino",
    status: "Estado",
    departure: "Salida",
    arrival: "Llegada",
    carrier: "Armador",
    booking: "Booking",
    noData: "No hay datos disponibles",
  },
};

export const exportDashboardToPDF = async (options: PDFExportOptions) => {
  const { title, stats, shipments, language = "pt" } = options;
  const t = translations[language];

  const doc = new jsPDF();
  let yPosition = 20;

  // Cabeçalho
  doc.setFontSize(20);
  doc.setTextColor(48, 57, 80); // #2c3e50
  doc.text(t.reportTitle, 14, yPosition);
  yPosition += 10;

  doc.setFontSize(10);
  doc.setTextColor(127, 140, 141); // #7f8c8d
  const currentDate = new Date().toLocaleDateString(
    language === "pt" ? "pt-BR" : language === "es" ? "es-ES" : "en-US",
    {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  );
  doc.text(`${t.generatedOn}: ${currentDate}`, 14, yPosition);
  yPosition += 15;

  // Estatísticas
  if (stats) {
    doc.setFontSize(16);
    doc.setTextColor(48, 57, 80);
    doc.text(t.statistics, 14, yPosition);
    yPosition += 10;

    const statsData = [
      [t.totalShipments, stats.totalShipments.toString()],
      [t.inTransit, stats.inTransit.toString()],
      [t.delivered, stats.delivered.toString()],
      [t.pending, stats.pending.toString()],
      [t.thisMonth, stats.thisMonth.toString()],
    ];

    if (stats.totalUsers !== undefined) {
      statsData.push([t.totalUsers, stats.totalUsers.toString()]);
    }

    if (stats.activeCompanies !== undefined && stats.totalCompanies !== undefined) {
      statsData.push([
        t.activeCompanies,
        `${stats.activeCompanies}/${stats.totalCompanies}`,
      ]);
    }

    const pageWidth = doc.internal.pageSize.getWidth();
    const marginLeft = 14;
    const marginRight = 14;
    const availableWidth = pageWidth - marginLeft - marginRight;

    autoTable(doc, {
      startY: yPosition,
      head: [[t.statistics, "Valor"]],
      body: statsData,
      theme: "striped",
      headStyles: {
        fillColor: [120, 145, 112], // #789170
        textColor: 255,
        fontStyle: "bold",
        fontSize: 10,
      },
      styles: {
        fontSize: 10,
        cellPadding: 5,
      },
      columnStyles: {
        0: { cellWidth: availableWidth * 0.7, halign: "left" },
        1: { cellWidth: availableWidth * 0.3, halign: "right" },
      },
      margin: { left: marginLeft, right: marginRight },
      tableWidth: "auto",
    });

    yPosition = (doc as any).lastAutoTable.finalY + 15;
  }

  // Lista de Envios
  if (shipments && shipments.length > 0) {
    // Verificar se há espaço na página
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(16);
    doc.setTextColor(48, 57, 80);
    doc.text(t.shipmentsList, 14, yPosition);
    yPosition += 10;

    const formatDate = (dateString?: string) => {
      if (!dateString) return "-";
      try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString;
        return date.toLocaleDateString(
          language === "pt" ? "pt-BR" : language === "es" ? "es-ES" : "en-US"
        );
      } catch {
        return dateString;
      }
    };

    // Truncar textos longos para evitar quebra de layout
    const truncateText = (text: string, maxLength: number = 15) => {
      if (!text || text === "-") return "-";
      return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
    };

    const shipmentsData = shipments.slice(0, 50).map((shipment) => [
      truncateText(shipment.cliente || "-", 20),
      truncateText(shipment.numeroBl || "-", 15),
      truncateText(shipment.pol || "-", 12),
      truncateText(shipment.pod || "-", 12),
      truncateText(shipment.status || "-", 12),
      formatDate(shipment.etdOrigem),
      formatDate(shipment.etaDestino),
      truncateText(shipment.armador || "-", 15),
      truncateText(shipment.booking || "-", 15),
    ]);

    // Calcular largura disponível (A4 = 210mm, menos margens)
    const pageWidth = doc.internal.pageSize.getWidth();
    const marginLeft = 14;
    const marginRight = 14;
    const availableWidth = pageWidth - marginLeft - marginRight;
    
    // Larguras proporcionais para as colunas
    autoTable(doc, {
      startY: yPosition,
      head: [
        [
          t.client,
          t.blNumber,
          t.origin,
          t.destination,
          t.status,
          t.departure,
          t.arrival,
          t.carrier,
          t.booking,
        ],
      ],
      body: shipmentsData,
      theme: "striped",
      headStyles: {
        fillColor: [120, 145, 112],
        textColor: 255,
        fontStyle: "bold",
        fontSize: 8,
      },
      styles: {
        fontSize: 7,
        cellPadding: 2,
        overflow: "linebreak",
        cellWidth: "wrap",
      },
      columnStyles: {
        0: { cellWidth: availableWidth * 0.12, halign: "left" }, // Cliente
        1: { cellWidth: availableWidth * 0.12, halign: "left" }, // BL Number
        2: { cellWidth: availableWidth * 0.10, halign: "left" }, // Origin
        3: { cellWidth: availableWidth * 0.10, halign: "left" }, // Destination
        4: { cellWidth: availableWidth * 0.10, halign: "center" }, // Status
        5: { cellWidth: availableWidth * 0.10, halign: "center" }, // Departure
        6: { cellWidth: availableWidth * 0.10, halign: "center" }, // Arrival
        7: { cellWidth: availableWidth * 0.12, halign: "left" }, // Carrier
        8: { cellWidth: availableWidth * 0.12, halign: "left" }, // Booking
      },
      margin: { left: marginLeft, right: marginRight },
      tableWidth: "auto",
      showHead: "everyPage",
      showFoot: "everyPage",
    });
  } else if (shipments && shipments.length === 0) {
    doc.setFontSize(12);
    doc.setTextColor(127, 140, 141);
    doc.text(t.noData, 14, yPosition);
  }

  // Rodapé
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(127, 140, 141);
    doc.text(
      `Página ${i} de ${pageCount}`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: "center" }
    );
  }

  // Salvar PDF
  const fileName = `relatorio-dashboard-${new Date().toISOString().split("T")[0]}.pdf`;
  doc.save(fileName);
};

export default exportDashboardToPDF;

