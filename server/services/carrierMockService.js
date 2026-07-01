const STATUS_PIPELINE = [
  {
    status: "documentacao",
    location: "Aguardando documentação no escritório",
    carrierMessage: "Documentação em análise pela transportadora",
  },
  {
    status: "agendado",
    location: "Terminal portuário - aguardando embarque",
    carrierMessage: "Embarque agendado com o armador",
  },
  {
    status: "a-embarcar",
    location: "Pátio do terminal de origem",
    carrierMessage: "Carga no pátio aguardando carregamento",
  },
  {
    status: "embarcando",
    location: "Operação de embarque em andamento",
    carrierMessage: "Navio em operação de carga no porto de origem",
  },
  {
    status: "em-transito",
    location: "Em trânsito marítimo",
    carrierMessage: "Navio em rota para o porto de destino",
  },
  {
    status: "desembarcando",
    location: "Terminal portuário de destino",
    carrierMessage: "Operação de descarga em andamento",
  },
  {
    status: "em-entrega",
    location: "Transporte rodoviário para entrega final",
    carrierMessage: "Carga em transporte para o cliente",
  },
  {
    status: "concluido",
    location: "Entrega concluída",
    carrierMessage: "Carga entregue ao destinatário",
  },
];

const MARITIME_LOCATIONS = {
  "em-transito": [
    "Atlântico Sul - a 320 NM de Santos",
    "Oceano Atlântico - próximo à Costa Africana",
    "Mar Mediterrâneo - em rota para Rotterdam",
    "Canal do Panamá - aguardando travessia",
    "Oceano Índico - em rota para destino",
  ],
  embarcando: [
    "Terminal de Containers - Santos, Brasil",
    "Terminal BTP - Santos, Brasil",
    "Porto de Itajaí - Operação de carga",
  ],
  desembarcando: [
    "Terminal ECT - Rotterdam, Holanda",
    "Porto de Hamburgo - Alemanha",
    "Terminal de destino - operação de descarga",
  ],
};

const TERMINAL_STATUSES = new Set([
  "concluido",
  "cancelado",
  "suspenso",
  "atrasado",
]);

function getNextTrackingStep(currentStatus) {
  const index = STATUS_PIPELINE.findIndex((s) => s.status === currentStatus);
  if (index === -1 || index >= STATUS_PIPELINE.length - 1) {
    return null;
  }
  return STATUS_PIPELINE[index + 1];
}

function pickRandomLocation(status, pol, pod) {
  const pool = MARITIME_LOCATIONS[status];
  if (pool?.length) {
    return pool[Math.floor(Math.random() * pool.length)];
  }
  if (status === "em-transito") {
    return `Em trânsito entre ${pol || "origem"} e ${pod || "destino"}`;
  }
  return (
    STATUS_PIPELINE.find((s) => s.status === status)?.location || pol || "-"
  );
}

function simulateCarrierUpdate(shipment) {
  if (TERMINAL_STATUSES.has(shipment.status)) {
    return null;
  }

  const nextStep = getNextTrackingStep(shipment.status);
  if (!nextStep) {
    return null;
  }

  const location = pickRandomLocation(
    nextStep.status,
    shipment.pol,
    shipment.pod
  );

  return {
    status: nextStep.status,
    currentLocation: location,
    reportedEta: shipment.etaDestino || shipment.reportedEta,
    carrierMessage: nextStep.carrierMessage,
    carrierName: shipment.armador || "Transportadora Simulada",
  };
}

function getActiveShipmentsForTracking(shipments) {
  return shipments.filter(
    (s) =>
      s.id &&
      !TERMINAL_STATUSES.has(s.status) &&
      s.status !== "documentacao"
  );
}

module.exports = {
  simulateCarrierUpdate,
  getActiveShipmentsForTracking,
  TERMINAL_STATUSES,
};
