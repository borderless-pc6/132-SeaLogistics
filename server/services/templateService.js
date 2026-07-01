const { getFirestore } = require("./firebaseAdmin");

const STATUS_LABELS = {
  documentacao: "Documentação",
  agendado: "Agendado",
  "a-embarcar": "A Embarcar",
  embarcando: "Embarcando",
  "em-transito": "Em Trânsito",
  desembarcando: "Desembarcando",
  "em-entrega": "Em Entrega",
  concluido: "Concluído",
  atrasado: "Atrasado",
  cancelado: "Cancelado",
  suspenso: "Suspenso",
  pendente: "Pendente",
};

const DEFAULT_TEMPLATES = {
  new_shipment_email: {
    id: "new_shipment_email",
    subject: "Novo envio criado - {{numeroBl}}",
    body: `<h2>Novo envio criado</h2>
<p>Olá,</p>
<p>Um novo envio foi criado com os seguintes detalhes:</p>
<ul>
  <li><strong>Número BL:</strong> {{numeroBl}}</li>
  <li><strong>Cliente:</strong> {{cliente}}</li>
  <li><strong>Porto de Origem:</strong> {{pol}}</li>
  <li><strong>Porto de Destino:</strong> {{pod}}</li>
  <li><strong>ETD Origem:</strong> {{etdOrigem}}</li>
  <li><strong>ETA Destino:</strong> {{etaDestino}}</li>
  <li><strong>Status:</strong> {{status}}</li>
  <li><strong>Armador:</strong> {{armador}}</li>
  <li><strong>Booking:</strong> {{booking}}</li>
</ul>
<p>Atenciosamente,<br>Sea Logistics</p>`,
  },
  status_update_email: {
    id: "status_update_email",
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

_Sea Logistics International_`,
  },
  status_update_whatsapp: {
    id: "status_update_whatsapp",
    body: `🔔 *Atualização de Status - Sea Logistics*

Olá {{cliente}},

O novo status do seu envio agora é: *{{status}}*.

BL: {{numeroBl}}
Origem: {{pol}} → Destino: {{pod}}
Localização: {{currentLocation}}

_Sea Logistics International_`,
  },
};

function getStatusLabel(status) {
  if (!status) return "N/A";
  return STATUS_LABELS[status] || status;
}

function formatDate(dateString) {
  if (!dateString) return "-";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return String(dateString);
  return date.toLocaleDateString("pt-BR");
}

function buildTemplateVariables(shipment, extra = {}) {
  return {
    numeroBl: shipment.numeroBl || "-",
    cliente: shipment.cliente || "-",
    operador: shipment.operador || "-",
    pol: shipment.pol || "-",
    pod: shipment.pod || "-",
    etdOrigem: formatDate(shipment.etdOrigem),
    etaDestino: formatDate(shipment.etaDestino),
    status: getStatusLabel(shipment.status),
    oldStatus: extra.oldStatus ? getStatusLabel(extra.oldStatus) : "-",
    armador: shipment.armador || "-",
    booking: shipment.booking || "-",
    currentLocation: shipment.currentLocation || "-",
    quantBox: String(shipment.quantBox ?? 0),
  };
}

function interpolateTemplate(text, variables) {
  let result = text;
  for (const [key, value] of Object.entries(variables)) {
    result = result.split(`{{${key}}}`).join(value);
  }
  return result;
}

async function getTemplate(id) {
  try {
    const db = getFirestore();
    const doc = await db.collection("notificationTemplates").doc(id).get();
    if (doc.exists) {
      return { id, ...doc.data() };
    }
  } catch (error) {
    console.warn(`Template ${id} não encontrado no Firestore, usando padrão:`, error.message);
  }
  return DEFAULT_TEMPLATES[id] || null;
}

async function renderEmailTemplate(templateId, shipment, extra = {}) {
  const template = await getTemplate(templateId);
  if (!template) {
    throw new Error(`Template ${templateId} não encontrado`);
  }
  const variables = buildTemplateVariables(shipment, extra);
  return {
    subject: interpolateTemplate(template.subject || "Sea Logistics", variables),
    html: interpolateTemplate(template.body, variables),
  };
}

async function renderWhatsAppTemplate(templateId, shipment, extra = {}) {
  const template = await getTemplate(templateId);
  if (!template) {
    throw new Error(`Template ${templateId} não encontrado`);
  }
  const variables = buildTemplateVariables(shipment, extra);
  return interpolateTemplate(template.body, variables);
}

module.exports = {
  renderEmailTemplate,
  renderWhatsAppTemplate,
  getStatusLabel,
};
