import { doc, getDoc, setDoc } from "firebase/firestore";
import type { Shipment } from "../context/shipments-context";
import { getStatusLabel } from "../constants/statusOptions";
import { db } from "../lib/firebaseConfig";
import {
  formatContainerSpec,
  formatDatePt,
  formatDateTimePt,
  formatLocationCurrent,
  formatLocationWithRoute,
  formatNavioDisplay,
  formatRumoLine,
} from "../utils/shipmentFormatters";
import type {
  NotificationTemplate,
  NotificationTemplateId,
} from "../types/notificationTemplate";

const TEMPLATE_CACHE_TTL_MS = 10 * 60 * 1000;
const templateCache = new Map<
  string,
  { template: NotificationTemplate; fetchedAt: number }
>();

const DEFAULT_TEMPLATES: Record<NotificationTemplateId, NotificationTemplate> = {
  new_shipment_email: {
    id: "new_shipment_email",
    name: "Novo Envio (Email)",
    subject: "Novo envio criado - {{numeroBl}}",
    body: `<h2>Novo envio criado</h2>
<p>Olá,</p>
<p>Um novo envio foi criado com os seguintes detalhes:</p>
<ul>
  <li><strong>Número BL:</strong> {{numeroBl}}</li>
  <li><strong>Cliente:</strong> {{cliente}}</li>
  <li><strong>Operador:</strong> {{operador}}</li>
  <li><strong>Porto de Origem:</strong> {{pol}}</li>
  <li><strong>Porto de Destino:</strong> {{pod}}</li>
  <li><strong>ETD Origem:</strong> {{etdOrigem}}</li>
  <li><strong>ETA Destino:</strong> {{etaDestino}}</li>
  <li><strong>Quantidade de Containers:</strong> {{quantBox}}</li>
  <li><strong>Status:</strong> {{status}}</li>
  <li><strong>Armador:</strong> {{armador}}</li>
  <li><strong>Booking:</strong> {{booking}}</li>
</ul>
<p>Atenciosamente,<br>Sea Logistics</p>`,
  },
  status_update_email: {
    id: "status_update_email",
    name: "Atualização de Status (Email)",
    subject: "Status do envio atualizado - {{numeroBl}}",
    body: `<h2>Status do envio atualizado</h2>
<p>Olá,</p>
<p>O status do seu envio foi atualizado:</p>
<ul>
  <li><strong>Número BL:</strong> {{numeroBl}}</li>
  <li><strong>Status Anterior:</strong> {{oldStatus}}</li>
  <li><strong>Novo Status:</strong> {{status}}</li>
  <li><strong>Cliente:</strong> {{cliente}}</li>
  <li><strong>Porto de Origem:</strong> {{pol}}</li>
  <li><strong>Porto de Destino:</strong> {{pod}}</li>
  <li><strong>Localização Atual:</strong> {{currentLocation}}</li>
</ul>
<p>Atenciosamente,<br>Sea Logistics</p>`,
  },
  new_shipment_whatsapp: {
    id: "new_shipment_whatsapp",
    name: "Novo Envio (WhatsApp — legado)",
    body: `🚢 *Novo Envio Registrado - Sea Logistics*

Olá! 👋

Um novo envio foi registrado:

📋 *Detalhes:*
• BL: {{numeroBl}}
• Cliente: {{cliente}}
• Origem: {{pol}}
• Destino: {{pod}}
• ETD: {{etdOrigem}}
• ETA: {{etaDestino}}
• Status: {{status}}
• Armador: {{armador}}
• Booking: {{booking}}

Acompanhe seu envio através do nosso sistema.

_Sea Logistics International_`,
  },
  status_update_whatsapp: {
    id: "status_update_whatsapp",
    name: "Atualização de Status (WhatsApp — legado)",
    body: `🔔 *Atualização de Status - Sea Logistics*

Olá {{cliente}},

O novo status do seu envio agora é: *{{status}}*.

BL: {{numeroBl}}
Origem: {{pol}} → Destino: {{pod}}
Localização: {{currentLocation}}

_Sea Logistics International_`,
  },
  tracking_whatsapp: {
    id: "tracking_whatsapp",
    name: "Rastreamento (WhatsApp — legado)",
    body: `📍 *Rastreamento de Carga - Sea Logistics*

*Booking:* {{booking}}
*BL:* {{numeroBl}}
*Navio:* {{armador}}

🚢 *Rota:*
{{pol}} → {{pod}}

📍 *Localização Atual:*
{{currentLocation}}

📅 *Datas:*
• Partida (ETD): {{etdOrigem}}
• Chegada prevista (ETA): {{etaDestino}}

📦 *Status:* {{status}}
📊 *Containers:* {{quantBox}}

_Sea Logistics International_`,
  },
  jabil_shipment_email: {
    id: "jabil_shipment_email",
    name: "Embarque Internacional (JABIL)",
    subject: "Informações do embarque internacional — Booking {{booking}}",
    body: `<p>Prezado(a) Cliente <strong>{{cliente}}</strong>,</p>
<p>Segue as informações referente a seu embarque internacional.</p>
<h3>📦 Detalhes do Embarque:</h3>
<ul>
  <li><strong>Booking:</strong> {{booking}}</li>
  <li><strong>Navio:</strong> {{navioDisplay}}</li>
  <li><strong>Contêineres:</strong> {{containerSpec}}</li>
  <li><strong>Carga Pronta (Cargo Ready):</strong> {{cargoReady}}</li>
  <li><strong>Coleta:</strong> {{coleta}}</li>
  <li><strong>Contêiner Vazio Disponível para o Exportador (Empty to Shipper):</strong> {{emptyToShipper}}</li>
  <li><strong>Pronto para Carregamento (Ready to be loaded):</strong> {{readyToLoad}}</li>
  <li><strong>Carregado a Bordo (Loaded on Board):</strong> {{loadedOnBoard}}</li>
  <li><strong>Partida Estimada (ETD – Estimated Time of Departure):</strong> {{etdOrigem}}</li>
  <li><strong>Chegada Estimada (ETA – Estimated Time of Arrival):</strong> {{etaDestino}}</li>
  <li><strong>Localização Atual:</strong> {{localizacaoAtual}}</li>
  <li>{{rumoLine}}</li>
</ul>
<p>Atenciosamente,<br>Sea Logistics International</p>`,
  },
  jabil_shipment_whatsapp: {
    id: "jabil_shipment_whatsapp",
    name: "Embarque Internacional WhatsApp (JABIL)",
    body: `Prezado(a) Cliente *{{cliente}}*,

Segue as informações referente a seu embarque internacional.

📦 *Detalhes do Embarque:*
Booking: {{booking}}
Navio: {{navioDisplay}}
Contêineres: {{containerSpec}}
Carga Pronta (Cargo Ready): {{cargoReady}}
Coleta: {{coleta}}
Contêiner Vazio Disponível para o Exportador (Empty to Shipper): {{emptyToShipper}}
Pronto para Carregamento (Ready to be loaded): {{readyToLoad}}
Carregado a Bordo (Loaded on Board): {{loadedOnBoard}}
Partida Estimada (ETD – Estimated Time of Departure): {{etdOrigem}}
Chegada Estimada (ETA – Estimated Time of Arrival): {{etaDestino}}
Localização Atual: {{localizacaoAtual}}
{{rumoLine}}

_Sea Logistics International_`,
  },
  new_shipment_push: {
    id: "new_shipment_push",
    name: "Novo Envio (Push)",
    body: `🚢 Novo envio registrado — BL {{numeroBl}}

Cliente: {{cliente}}
Rota: {{pol}} → {{pod}}
ETD: {{etdOrigem}} | ETA: {{etaDestino}}
Status: {{status}}

Sea Logistics`,
  },
  status_update_push: {
    id: "status_update_push",
    name: "Atualização de Status (Push)",
    body: `🔔 Status atualizado — BL {{numeroBl}}

{{cliente}}: {{oldStatus}} → {{status}}
Rota: {{pol}} → {{pod}}
Localização: {{currentLocation}}

Sea Logistics`,
  },
  tracking_push: {
    id: "tracking_push",
    name: "Rastreamento (Push)",
    body: `📍 Rastreamento — BL {{numeroBl}}

{{pol}} → {{pod}}
Localização: {{currentLocation}}
Status: {{status}}

Sea Logistics`,
  },
  jabil_shipment_push: {
    id: "jabil_shipment_push",
    name: "Embarque Internacional Push (JABIL)",
    body: `Prezado(a) Cliente {{cliente}},

Segue as informações referente a seu embarque internacional.

📦 Detalhes do Embarque:
Booking: {{booking}}
Navio: {{navioDisplay}}
Contêineres: {{containerSpec}}
ETD: {{etdOrigem}} | ETA: {{etaDestino}}
Localização Atual: {{localizacaoAtual}}
{{rumoLine}}

Sea Logistics International`,
  },
};

function formatDate(dateString?: string): string {
  if (!dateString) return "-";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString("pt-BR");
}

export function buildTemplateVariables(
  shipment: Shipment,
  extra?: { oldStatus?: string }
): Record<string, string> {
  return {
    numeroBl: shipment.numeroBl || "-",
    cliente: shipment.cliente || "-",
    operador: shipment.operador || "-",
    pol: shipment.pol || "-",
    pod: shipment.pod || "-",
    etdOrigem: formatDate(shipment.etdOrigem),
    etaDestino: formatDate(shipment.etaDestino),
    status: getStatusLabel(shipment.status),
    oldStatus: extra?.oldStatus
      ? getStatusLabel(extra.oldStatus)
      : "-",
    armador: shipment.armador || "-",
    booking: shipment.booking || "-",
    currentLocation: shipment.currentLocation || "-",
    quantBox: String(shipment.quantBox ?? 0),
    navio: shipment.navio || shipment.armador || "-",
    navioDisplay: formatNavioDisplay(shipment),
    navioCodigo: shipment.navioCodigo || "-",
    containerSpec: formatContainerSpec(
      shipment.quantBox,
      shipment.containerType
    ),
    cargoReady: formatDatePt(shipment.cargoReady),
    coleta: formatDatePt(shipment.coleta),
    emptyToShipper: formatDatePt(shipment.emptyToShipper),
    readyToLoad: formatDateTimePt(shipment.readyToLoad),
    loadedOnBoard: formatDatePt(shipment.loadedOnBoard),
    destinoRumo: shipment.destinoRumo || shipment.pod || "-",
    etaRumo: formatDatePt(shipment.etaRumo),
    localizacaoAtual: formatLocationCurrent(shipment),
    rumoLine: formatRumoLine(shipment) || "",
    localizacaoCompleta: formatLocationWithRoute(shipment),
  };
}

export function interpolateTemplate(
  text: string,
  variables: Record<string, string>
): string {
  let result = text;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replaceAll(`{{${key}}}`, value);
  }
  return result;
}

export async function getTemplate(
  id: NotificationTemplateId
): Promise<NotificationTemplate> {
  const cached = templateCache.get(id);
  if (cached && Date.now() - cached.fetchedAt < TEMPLATE_CACHE_TTL_MS) {
    return cached.template;
  }

  try {
    const docRef = doc(db, "notificationTemplates", id);
    const snapshot = await getDoc(docRef);
    if (snapshot.exists()) {
      const data = snapshot.data();
      const template = {
        id,
        name: data.name || DEFAULT_TEMPLATES[id].name,
        subject: data.subject ?? DEFAULT_TEMPLATES[id].subject,
        body: data.body || DEFAULT_TEMPLATES[id].body,
        updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
        updatedBy: data.updatedBy,
      };
      templateCache.set(id, { template, fetchedAt: Date.now() });
      return template;
    }
  } catch (error) {
    console.warn(`Usando template padrão para ${id}:`, error);
  }
  const fallback = DEFAULT_TEMPLATES[id];
  templateCache.set(id, { template: fallback, fetchedAt: Date.now() });
  return fallback;
}

export async function saveTemplate(
  template: NotificationTemplate,
  updatedBy: string
): Promise<void> {
  await setDoc(doc(db, "notificationTemplates", template.id), {
    name: template.name,
    subject: template.subject || "",
    body: template.body,
    updatedAt: new Date(),
    updatedBy,
  });
  templateCache.delete(template.id);
}

export function getAllDefaultTemplates(): NotificationTemplate[] {
  return Object.values(DEFAULT_TEMPLATES);
}

export async function renderEmailTemplate(
  id: "new_shipment_email" | "status_update_email" | "jabil_shipment_email",
  shipment: Shipment,
  extra?: { oldStatus?: string }
): Promise<{ subject: string; html: string }> {
  const template = await getTemplate(id);
  const variables = buildTemplateVariables(shipment, extra);
  return {
    subject: interpolateTemplate(template.subject || "", variables),
    html: interpolateTemplate(template.body, variables),
  };
}

export async function renderWhatsAppTemplate(
  id:
    | "new_shipment_whatsapp"
    | "status_update_whatsapp"
    | "tracking_whatsapp"
    | "jabil_shipment_whatsapp",
  shipment: Shipment,
  extra?: { oldStatus?: string }
): Promise<string> {
  return renderPushTemplate(id, shipment, extra);
}

export async function renderPushTemplate(
  id:
    | "new_shipment_push"
    | "status_update_push"
    | "tracking_push"
    | "jabil_shipment_push"
    | "new_shipment_whatsapp"
    | "status_update_whatsapp"
    | "tracking_whatsapp"
    | "jabil_shipment_whatsapp",
  shipment: Shipment,
  extra?: { oldStatus?: string }
): Promise<string> {
  const pushId = id.replace("_whatsapp", "_push") as NotificationTemplateId;
  const resolvedId = DEFAULT_TEMPLATES[pushId]
    ? pushId
    : (id as NotificationTemplateId);
  const template = await getTemplate(resolvedId);
  const variables = buildTemplateVariables(shipment, extra);
  return interpolateTemplate(template.body, variables);
}
