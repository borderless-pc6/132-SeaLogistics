import { describe, expect, it } from "vitest";
import { renderJabilEmailHtml } from "../../services/jabilEmailTemplate";
import type { Shipment } from "../../context/shipments-context";
import { formatContainerSpec, formatLocationWithRoute } from "../shipmentFormatters";
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
  booking: "QGD1778469",
  cargoReady: "2025-05-01",
  loadedOnBoard: "2025-05-10",
};

describe("shipmentFormatters", () => {
  it("formats container spec", () => {
    expect(formatContainerSpec(4, "40HC")).toBe("4 x 40HC");
  });

  it("formats location with route", () => {
    expect(formatLocationWithRoute(sampleShipment)).toBe(
      "No Mar Amarelo, rumo a: Qingdao"
    );
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
    expect(html).toContain("CMA CGM VELA");
    expect(html).toContain("4 x 40HC");
    expect(html).toContain("JABIL");
  });
});
