const {
  formatContainerSpec,
  formatDatePt,
  formatDateTimePt,
  formatLocationCurrent,
  formatNavioDisplay,
  formatRumoLine,
} = require("./shipmentFormatters");

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildJabilEmailSubject(shipment) {
  return `Informações do embarque internacional — Booking ${shipment.booking || shipment.numeroBl || ""}`;
}

function renderShipMapSection(shipment) {
  const imageUrl = shipment.shipMapImageUrl?.trim();
  if (imageUrl) {
    return `<div style="margin:24px 0;text-align:center;">
      <p style="margin:0 0 12px;font-weight:bold;color:#555;">Posição do navio</p>
      <img src="${escapeHtml(imageUrl)}" alt="Posição do navio" style="max-width:100%;border-radius:8px;border:1px solid #e0e0e0;" />
      <p style="margin:8px 0 0;font-size:12px;color:#888;">${escapeHtml(shipment.pol || "Origem")} → ${escapeHtml(shipment.pod || "Destino")}</p>
    </div>`;
  }

  return `<div style="margin:24px 0;background:#e8eef2;border-radius:8px;padding:16px;text-align:center;">
    <div style="font-size:28px;margin-bottom:8px;">🗺️</div>
    <p style="margin:0 0 8px;font-weight:bold;color:#555;">Posição do navio</p>
    <p style="margin:0;font-size:13px;color:#666;">${escapeHtml(shipment.pol || "Origem")} → ${escapeHtml(shipment.pod || "Destino")}</p>
    <p style="margin:8px 0 0;font-size:12px;color:#888;">Adicione a URL da foto/mapa do navio no cadastro do embarque.</p>
  </div>`;
}

function row(label, value) {
  const display = value?.trim() ? value : "—";
  if (!label) {
    return `<tr>
      <td style="padding:4px 0 4px 16px;color:#666;font-style:italic;border-bottom:1px solid #eee;" colspan="2">${display}</td>
    </tr>`;
  }
  return `<tr>
    <td style="width:48%;padding:8px 0;color:#666;vertical-align:top;border-bottom:1px solid #eee;">${label}</td>
    <td style="padding:8px 0;font-weight:600;border-bottom:1px solid #eee;">${display}</td>
  </tr>`;
}

function renderJabilEmailHtml(shipment) {
  const cliente = shipment.cliente || "Cliente";
  const containers = formatContainerSpec(shipment.quantBox, shipment.containerType);
  const navio = formatNavioDisplay(shipment);
  const localizacao = formatLocationCurrent(shipment);
  const rumoLine = formatRumoLine(shipment);

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Embarque ${escapeHtml(shipment.booking || "")}</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:Arial,Helvetica,sans-serif;color:#1a1a2e;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8;padding:24px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <tr>
            <td style="background:#118ab2;color:#fff;padding:20px 24px;">
              <h1 style="margin:0;font-size:20px;">Sea Logistics International</h1>
              <p style="margin:8px 0 0;font-size:14px;opacity:0.95;">Embarque internacional de importação</p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px;">
              <p style="margin:0 0 16px;">Prezado(a) Cliente <strong>${escapeHtml(cliente)}</strong>,</p>
              <p style="margin:0 0 20px;">Segue as informações referente a seu embarque internacional.</p>

              <h2 style="font-size:16px;margin:0 0 12px;color:#118ab2;">📦 Detalhes do Embarque:</h2>
              <table width="100%" cellpadding="6" cellspacing="0" style="font-size:14px;border-collapse:collapse;">
                ${row("Booking", shipment.booking)}
                ${row("Navio", navio)}
                ${row("Contêineres", containers)}
                ${row("Carga Pronta (Cargo Ready)", formatDatePt(shipment.cargoReady))}
                ${row("Coleta", formatDatePt(shipment.coleta))}
                ${row("Contêiner Vazio Disponível para o Exportador (Empty to Shipper)", formatDatePt(shipment.emptyToShipper))}
                ${row("Pronto para Carregamento (Ready to be loaded)", formatDateTimePt(shipment.readyToLoad))}
                ${row("Carregado a Bordo (Loaded on Board)", formatDatePt(shipment.loadedOnBoard))}
                ${row("Partida Estimada (ETD – Estimated Time of Departure)", formatDatePt(shipment.etdOrigem))}
                ${row("Chegada Estimada (ETA – Estimated Time of Arrival)", formatDatePt(shipment.etaDestino))}
                ${row("Localização Atual", localizacao)}
                ${rumoLine ? row("", rumoLine) : ""}
              </table>

              ${renderShipMapSection(shipment)}

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

function renderJabilWhatsAppText(shipment) {
  const containers = formatContainerSpec(shipment.quantBox, shipment.containerType);
  const navio = formatNavioDisplay(shipment);
  const localizacao = formatLocationCurrent(shipment);
  const rumoLine = formatRumoLine(shipment);

  const lines = [
    `Prezado(a) Cliente *${shipment.cliente || "Cliente"}*,`,
    "",
    "Segue as informações referente a seu embarque internacional.",
    "",
    "📦 *Detalhes do Embarque:*",
    `Booking: ${shipment.booking || "—"}`,
    `Navio: ${navio}`,
    `Contêineres: ${containers}`,
    `Carga Pronta (Cargo Ready): ${formatDatePt(shipment.cargoReady)}`,
    `Coleta: ${formatDatePt(shipment.coleta)}`,
    `Contêiner Vazio Disponível para o Exportador (Empty to Shipper): ${formatDatePt(shipment.emptyToShipper)}`,
    `Pronto para Carregamento (Ready to be loaded): ${formatDateTimePt(shipment.readyToLoad)}`,
    `Carregado a Bordo (Loaded on Board): ${formatDatePt(shipment.loadedOnBoard)}`,
    `Partida Estimada (ETD – Estimated Time of Departure): ${formatDatePt(shipment.etdOrigem)}`,
    `Chegada Estimada (ETA – Estimated Time of Arrival): ${formatDatePt(shipment.etaDestino)}`,
    `Localização Atual: ${localizacao}`,
  ];

  if (rumoLine) lines.push(rumoLine);
  lines.push("", "_Sea Logistics International_");

  return lines.join("\n");
}

function isInternationalShipmentModel(shipment) {
  const tipo = shipment.tipo?.trim();
  if (tipo && tipo !== "Marítimo") return false;
  return Boolean(
    shipment.navio ||
      shipment.cargoReady ||
      shipment.booking ||
      shipment.emptyToShipper
  );
}

module.exports = {
  buildJabilEmailSubject,
  renderJabilEmailHtml,
  renderJabilWhatsAppText,
  isInternationalShipmentModel,
};
