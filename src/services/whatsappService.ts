import { Shipment } from "../context/shipments-context";

interface WhatsAppMessageOptions {
  to: string;
  message: string;
  template?: {
    name: string;
    language: string;
    parameters: string[];
  };
}

interface WhatsAppResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

// URL do servidor WhatsApp - usa variável de ambiente ou fallback para localhost
const API_URL = (
  import.meta.env.VITE_WHATSAPP_SERVER_URL || "http://localhost:3001"
).replace(/\/+$/, "");

/**
 * Função base para envio de mensagens WhatsApp
 */
export const sendWhatsAppMessage = async ({
  to,
  message,
  template,
}: WhatsAppMessageOptions): Promise<boolean> => {
  try {
    console.log("=== INICIANDO ENVIO DE MENSAGEM WHATSAPP ===");
    console.log("Configuração:", {
      url: API_URL,
      to,
      hasTemplate: !!template,
    });

    const response = await fetch(`${API_URL}/api/whatsapp/send-message`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to,
        message,
        template,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.error || `Erro ${response.status}: ${response.statusText}`
      );
    }

    const data: WhatsAppResponse = await response.json();

    if (!data.success) {
      throw new Error(data.error || "Erro ao enviar mensagem WhatsApp");
    }

    console.log("=== MENSAGEM WHATSAPP ENVIADA COM SUCESSO ===");
    console.log("Message ID:", data.messageId);
    return true;
  } catch (error) {
    console.error("=== ERRO AO ENVIAR MENSAGEM WHATSAPP ===");
    console.error("Detalhes do erro:", error);
    return false;
  }
};

/**
 * Formata número de telefone para o formato internacional
 * Remove caracteres especiais e garante que tenha o código do país
 */
export const formatPhoneNumber = (phone: string): string => {
  let cleaned = phone.replace(/\D/g, "");

  if (!cleaned.startsWith("55") && cleaned.length === 11) {
    cleaned = "55" + cleaned;
  }

  return cleaned;
};

/**
 * Envia notificação de novo envio criado via WhatsApp
 */
export const sendShipmentCreatedWhatsApp = async (
  shipment: Shipment,
  clientPhone: string
): Promise<boolean> => {
  const formattedPhone = formatPhoneNumber(clientPhone);

  const message = `🚢 *Novo Envio Criado - Sea Logistics*

Olá! 👋

Um novo envio foi registrado:

📋 *Detalhes:*
• BL: ${shipment.numeroBl}
• Cliente: ${shipment.cliente}
• Origem: ${shipment.pol}
• Destino: ${shipment.pod}
• ETD: ${new Date(shipment.etdOrigem).toLocaleDateString("pt-BR")}
• ETA: ${new Date(shipment.etaDestino).toLocaleDateString("pt-BR")}
• Status: ${shipment.status}
• Armador: ${shipment.armador}
• Booking: ${shipment.booking}

Acompanhe seu envio através do nosso sistema.

_Sea Logistics International_
📞 +55 11 95939-1837`;

  return sendWhatsAppMessage({
    to: formattedPhone,
    message,
  });
};

/**
 * Envia notificação de atualização de status via WhatsApp
 */
export const sendStatusUpdateWhatsApp = async (
  shipment: Shipment,
  clientPhone: string,
  oldStatus: string,
  additionalInfo?: string
): Promise<boolean> => {
  const formattedPhone = formatPhoneNumber(clientPhone);

  const message = `🔔 *Atualização de Status - Sea Logistics*

Olá! 

Seu envio *${shipment.numeroBl}* foi atualizado:

📦 Status anterior: ${oldStatus}
✅ Novo status: *${shipment.status}*

📋 Informações do envio:
• Cliente: ${shipment.cliente}
• Origem: ${shipment.pol}
• Destino: ${shipment.pod}
• Booking: ${shipment.booking}
${additionalInfo ? `\n${additionalInfo}` : ""}

_Acompanhe em tempo real pelo nosso sistema._

_Sea Logistics International_
📞 +55 11 95939-1837`;

  return sendWhatsAppMessage({
    to: formattedPhone,
    message,
  });
};

/**
 * Envia informações de rastreamento detalhadas via WhatsApp
 */
export const sendTrackingInfoWhatsApp = async (
  shipment: Shipment,
  clientPhone: string,
  currentLocation?: string
): Promise<boolean> => {
  const formattedPhone = formatPhoneNumber(clientPhone);

  const message = `📍 *Rastreamento de Carga - Sea Logistics*

*Booking:* ${shipment.booking}
*BL:* ${shipment.numeroBl}
*Navio:* ${shipment.armador}

🚢 *Rota:*
${shipment.pol} → ${shipment.pod}

${currentLocation ? `📍 *Localização Atual:*\n${currentLocation}\n` : ""}

📅 *Datas:*
• Partida (ETD): ${new Date(shipment.etdOrigem).toLocaleDateString("pt-BR")}
• Chegada prevista (ETA): ${new Date(shipment.etaDestino).toLocaleDateString(
    "pt-BR"
  )}

📦 *Status:* ${shipment.status}
📊 *Containers:* ${shipment.quantBox}

_Atualizado em: ${new Date().toLocaleString("pt-BR")}_

Para mais detalhes, acesse nosso sistema.

_Sea Logistics International_
📞 +55 11 95939-1837`;

  return sendWhatsAppMessage({
    to: formattedPhone,
    message,
  });
};

/**
 * Envia mensagem de boas-vindas/confirmação
 */
export const sendWelcomeWhatsApp = async (
  clientName: string,
  clientPhone: string
): Promise<boolean> => {
  const formattedPhone = formatPhoneNumber(clientPhone);

  const message = `👋 Olá, ${clientName}!

Bem-vindo(a) à *Sea Logistics International*! 🚢

Agora você receberá atualizações automáticas sobre seus envios diretamente no WhatsApp.

📲 *O que você receberá:*
✅ Confirmação de novos envios
✅ Atualizações de status
✅ Informações de rastreamento
✅ Alertas importantes

💡 *Dica:* Você pode nos enviar o número do seu booking a qualquer momento para obter informações atualizadas!

Estamos à disposição!

_Sea Logistics International_
📞 +55 11 95939-1837
🌐 www.sealogistics.com.br`;

  return sendWhatsAppMessage({
    to: formattedPhone,
    message,
  });
};

/**
 * Envia mensagem customizada via WhatsApp
 */
export const sendCustomWhatsAppMessage = async (
  clientPhone: string,
  message: string
): Promise<boolean> => {
  const formattedPhone = formatPhoneNumber(clientPhone);

  return sendWhatsAppMessage({
    to: formattedPhone,
    message,
  });
};

/**
 * Verifica o status de uma mensagem enviada
 */
export const checkWhatsAppMessageStatus = async (
  messageId: string
): Promise<any> => {
  try {
    const response = await fetch(
      `${API_URL}/api/whatsapp/message-status/${messageId}`
    );

    if (!response.ok) {
      throw new Error(`Erro ao verificar status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Erro ao verificar status da mensagem:", error);
    return null;
  }
};

/**
 * Verifica se a conexão com WhatsApp está funcionando
 */
export const verifyWhatsAppConnection = async (): Promise<boolean> => {
  try {
    console.log("=== VERIFICANDO CONEXÃO WHATSAPP ===");

    const response = await fetch(`${API_URL}/api/whatsapp/verify`);
    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || "Erro ao verificar conexão");
    }

    console.log("=== CONEXÃO WHATSAPP VERIFICADA COM SUCESSO ===");
    return true;
  } catch (error) {
    console.error("=== ERRO AO VERIFICAR CONEXÃO WHATSAPP ===");
    console.error("Detalhes do erro:", error);
    return false;
  }
};
