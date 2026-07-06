function formatContainerSpec(quantBox, containerType) {
  const qty = quantBox ?? 0;
  const type = containerType?.trim() || "40HC";
  if (qty <= 0) return type;
  return `${qty} x ${type}`;
}

function formatNavioDisplay(shipment) {
  const name = shipment.navio?.trim() || shipment.armador?.trim();
  const code = shipment.navioCodigo?.trim();
  if (name && code) return `${name} (${code})`;
  return name || "—";
}

function formatLocationCurrent(shipment) {
  return shipment.currentLocation?.trim() || "—";
}

function formatRumoLine(shipment) {
  const rumo = shipment.destinoRumo?.trim() || shipment.pod?.trim();
  if (!rumo) return null;

  const chegada = formatDatePt(shipment.etaRumo);
  if (chegada !== "—") {
    return `rumo a: ${rumo}, chegada ${chegada}`;
  }
  return `rumo a: ${rumo}`;
}

function formatLocationWithRoute(shipment) {
  const location = formatLocationCurrent(shipment);
  const rumoLine = formatRumoLine(shipment);

  if (location !== "—" && rumoLine) {
    return `${location},\n${rumoLine}`;
  }
  if (rumoLine) return rumoLine;
  return location;
}

function formatDatePt(dateString) {
  if (!dateString) return "—";
  const isoDate = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(dateString).trim());
  if (isoDate) {
    const [, year, month, day] = isoDate;
    return `${day}/${month}/${year}`;
  }
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return String(dateString);
  return date.toLocaleDateString("pt-BR");
}

function formatDateTimePt(dateString) {
  if (!dateString) return "—";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return String(dateString);
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

module.exports = {
  formatContainerSpec,
  formatNavioDisplay,
  formatLocationCurrent,
  formatRumoLine,
  formatLocationWithRoute,
  formatDatePt,
  formatDateTimePt,
};
