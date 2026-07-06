import { describe, expect, it } from "vitest";
import {
  renderJabilEmailHtml,
  renderJabilWhatsAppText,
} from "../../services/jabilEmailTemplate";
import type { Shipment } from "../../context/shipments-context";
import {
  formatContainerSpec,
  formatLocationWithRoute,
  formatNavioDisplay,
  formatRumoLine,
} from "../shipmentFormatters";
import { isValidStatusTransition } from "../statusTransitions";

const sampleShipment: Shipment = {
  cliente: "JABIL",
  operador: "Op Log",
  shipper: "Shipper SA",
  invoice: "INV001",
  pol: "Santos",
  pod: "Qingdao",
  etdOrigem: "2025-05-11",
  etaDestino: "2025-06-17",
  currentLocation: "No Mar Amarelo",
  destinoRumo: "Qingdao",
  quantBox: 4,
  containerType: "40HC",
  status: "em-transito",
  numeroBl: "BL123",
  armador: "CMA CGM",
  navio: "CMA CGM VELA",
  navioCodigo: "0PPKKE2MA",
  booking: "QGD1778469",
  cargoReady: "2025-05-01",
  emptyToShipper: "2025-05-05",
  readyToLoad: "2025-05-09T05:28",
  loadedOnBoard: "2025-05-10",
};

describe("shipmentFormatters", () => {
  it("formats container spec", () => {
    expect(formatContainerSpec(4, "40HC")).toBe("4 x 40HC");
  });

  it("formats navio with tracking code", () => {
    expect(formatNavioDisplay(sampleShipment)).toBe(
      "CMA CGM VELA (0PPKKE2MA)"
    );
  });

  it("formats location with route and rumo line", () => {
    expect(formatRumoLine(sampleShipment)).toBe("rumo a: Qingdao");
    expect(formatLocationWithRoute(sampleShipment)).toBe(
      "No Mar Amarelo,\nrumo a: Qingdao"
    );
  });

  it("includes chegada in rumo line when etaRumo is set", () => {
    const withEta = { ...sampleShipment, etaRumo: "2025-06-01" };
    expect(formatRumoLine(withEta)).toBe("rumo a: Qingdao, chegada 01/06/2025");
  });
});

describe("statusTransitions", () => {
  it("allows forward transition", () => {
    expect(isValidStatusTransition("documentacao", "agendado").valid).toBe(true);
  });

  it("blocks backward transition", () => {
    const result = isValidStatusTransition("em-transito", "documentacao");
    expect(result.valid).toBe(false);
  });

  it("allows cancel from any non-terminal", () => {
    expect(isValidStatusTransition("em-transito", "cancelado").valid).toBe(true);
  });

  it("blocks change from terminal status", () => {
    expect(isValidStatusTransition("concluido", "em-transito").valid).toBe(false);
  });
});

describe("jabilEmailTemplate", () => {
  it("renders JABIL email with booking and navio", () => {
    const html = renderJabilEmailHtml(sampleShipment);
    expect(html).toContain("QGD1778469");
    expect(html).toContain("CMA CGM VELA (0PPKKE2MA)");
    expect(html).toContain("4 x 40HC");
    expect(html).toContain("JABIL");
    expect(html).toContain("Segue as informações referente a seu embarque internacional");
    expect(html).toContain("Empty to Shipper");
    expect(html).toContain("rumo a: Qingdao");
  });

  it("renders JABIL WhatsApp with full client fields", () => {
    const text = renderJabilWhatsAppText(sampleShipment);
    expect(text).toContain("Booking: QGD1778469");
    expect(text).toContain("Navio: CMA CGM VELA (0PPKKE2MA)");
    expect(text).toContain("Carga Pronta (Cargo Ready)");
    expect(text).toContain("Localização Atual: No Mar Amarelo");
    expect(text).toContain("rumo a: Qingdao");
  });
});
