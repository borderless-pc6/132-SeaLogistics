import { doc, getDoc, setDoc } from "firebase/firestore";
import type { Shipment } from "../context/shipments-context";
import { getStatusLabel } from "../constants/statusOptions";
import { db } from "../lib/firebaseConfig";
import type {
  NotificationTemplate,
  NotificationTemplateId,
} from "../types/notificationTemplate";

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
    name: "Novo Envio (WhatsApp)",
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
    name: "Atualização de Status (WhatsApp)",
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
    name: "Rastreamento (WhatsApp)",
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
  try {
    const docRef = doc(db, "notificationTemplates", id);
    const snapshot = await getDoc(docRef);
    if (snapshot.exists()) {
      const data = snapshot.data();
      return {
        id,
        name: data.name || DEFAULT_TEMPLATES[id].name,
        subject: data.subject ?? DEFAULT_TEMPLATES[id].subject,
        body: data.body || DEFAULT_TEMPLATES[id].body,
        updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
        updatedBy: data.updatedBy,
      };
    }
  } catch (error) {
    console.warn(`Usando template padrão para ${id}:`, error);
  }
  return DEFAULT_TEMPLATES[id];
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
}

export function getAllDefaultTemplates(): NotificationTemplate[] {
  return Object.values(DEFAULT_TEMPLATES);
}

export async function renderEmailTemplate(
  id: "new_shipment_email" | "status_update_email",
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
  id: "new_shipment_whatsapp" | "status_update_whatsapp" | "tracking_whatsapp",
  shipment: Shipment,
  extra?: { oldStatus?: string }
): Promise<string> {
  const template = await getTemplate(id);
  const variables = buildTemplateVariables(shipment, extra);
  return interpolateTemplate(template.body, variables);
}
