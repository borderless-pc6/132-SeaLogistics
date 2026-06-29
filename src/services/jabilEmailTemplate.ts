import type { Shipment } from "../context/shipments-context";
import { getStatusLabel } from "../constants/statusOptions";
import {
  formatContainerSpec,
  formatDatePt,
  formatDateTimePt,
  formatLocationWithRoute,
} from "../utils/shipmentFormatters";

export function buildJabilEmailSubject(shipment: Shipment): string {
  return `Informações do embarque internacional — Booking ${shipment.booking || shipment.numeroBl || ""}`;
}

/** Template HTML estilo comunicação JABIL (sem mapa externo — placeholder visual) */
export function renderJabilEmailHtml(shipment: Shipment): string {
  const cliente = shipment.cliente || "Cliente";
  const containers = formatContainerSpec(
    shipment.quantBox,
    shipment.containerType
  );
  const localizacao = formatLocationWithRoute(shipment);

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Embarque ${shipment.booking || ""}</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:Arial,Helvetica,sans-serif;color:#1a1a2e;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8;padding:24px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <tr>
            <td style="background:#118ab2;color:#fff;padding:20px 24px;">
              <h1 style="margin:0;font-size:20px;">Sea Logistics International</h1>
              <p style="margin:8px 0 0;font-size:14px;opacity:0.95;">Atualização de embarque internacional</p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px;">
              <p style="margin:0 0 16px;">Prezado(a) Cliente <strong>${cliente}</strong>,</p>
              <p style="margin:0 0 20px;">Segue as informações referentes ao seu embarque internacional.</p>

              <h2 style="font-size:16px;margin:0 0 12px;color:#118ab2;">📦 Detalhes do Embarque</h2>
              <table width="100%" cellpadding="6" cellspacing="0" style="font-size:14px;border-collapse:collapse;">
                ${row("Booking", shipment.booking)}
                ${row("Navio", shipment.navio || shipment.armador)}
                ${row("Contêineres", containers)}
                ${row("Carga Pronta (Cargo Ready)", formatDatePt(shipment.cargoReady))}
                ${row("Coleta", formatDatePt(shipment.coleta))}
                ${row("Contêiner Vazio p/ Exportador (Empty to Shipper)", formatDatePt(shipment.emptyToShipper))}
                ${row("Pronto p/ Carregamento (Ready to be loaded)", formatDateTimePt(shipment.readyToLoad))}
                ${row("Carregado a Bordo (Loaded on Board)", formatDatePt(shipment.loadedOnBoard))}
                ${row("Partida Estimada (ETD)", formatDatePt(shipment.etdOrigem))}
                ${row("Chegada Estimada (ETA)", formatDatePt(shipment.etaDestino))}
                ${row("Localização Atual", localizacao)}
                ${row("Status", getStatusLabel(shipment.status))}
                ${row("Nº BL", shipment.numeroBl)}
                ${row("POL / POD", `${shipment.pol || "—"} → ${shipment.pod || "—"}`)}
              </table>

              <div style="margin:24px 0;background:#e8eef2;border-radius:8px;padding:16px;text-align:center;">
                <div style="font-size:28px;margin-bottom:8px;">🗺️</div>
                <p style="margin:0 0 8px;font-weight:bold;color:#555;">Mapa de rastreamento</p>
                <p style="margin:0;font-size:13px;color:#666;">${shipment.pol || "Origem"} → ${shipment.pod || "Destino"}</p>
                <p style="margin:8px 0 0;font-size:12px;color:#888;">Integração com mapa real disponível em versão com API externa.</p>
              </div>

              <p style="margin:24px 0 0;font-size:13px;color:#666;">Qualquer dúvida, entre em contato com nossa equipe.</p>
              <p style="margin:8px 0 0;">Atenciosamente,<br><strong>Sea Logistics International</strong></p>
            </td>
          </tr>
          <tr>
            <td style="background:#f8f9fa;padding:16px 24px;font-size:12px;color:#888;text-align:center;">
              © ${new Date().getFullYear()} Sea Logistics — Este e-mail foi gerado automaticamente.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function row(label: string, value?: string | null): string {
  return `<tr>
    <td style="width:45%;padding:8px 0;color:#666;vertical-align:top;border-bottom:1px solid #eee;">${label}</td>
    <td style="padding:8px 0;font-weight:600;border-bottom:1px solid #eee;">${value || "—"}</td>
  </tr>`;
}

export function renderJabilWhatsAppText(shipment: Shipment): string {
  const containers = formatContainerSpec(
    shipment.quantBox,
    shipment.containerType
  );
  return `🚢 *Embarque Internacional — Sea Logistics*

Prezado(a) *${shipment.cliente || "Cliente"}*,

📦 *Detalhes:*
• Booking: ${shipment.booking || "—"}
• Navio: ${shipment.navio || shipment.armador || "—"}
• Contêineres: ${containers}
• ETD: ${formatDatePt(shipment.etdOrigem)}
• ETA: ${formatDatePt(shipment.etaDestino)}
• Localização: ${formatLocationWithRoute(shipment)}
• Status: ${getStatusLabel(shipment.status)}

_Sea Logistics International_`;
}
