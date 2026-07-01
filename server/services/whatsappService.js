const twilio = require("twilio");

const hasTwilioConfig = !!(
  process.env.TWILIO_ACCOUNT_SID &&
  process.env.TWILIO_AUTH_TOKEN &&
  process.env.TWILIO_WHATSAPP_FROM
);

let twilioClient = null;
if (hasTwilioConfig) {
  twilioClient = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );
}

function formatWhatsAppNumber(phone) {
  if (!phone) return phone;
  let cleaned = String(phone).trim();
  if (cleaned.startsWith("whatsapp:")) return cleaned;
  if (!cleaned.startsWith("+")) cleaned = `+${cleaned}`;
  return `whatsapp:${cleaned}`;
}

async function sendWhatsAppMessage({ to, message }) {
  if (!to || !message) {
    throw new Error('Parâmetros "to" e "message" são obrigatórios');
  }

  if (hasTwilioConfig && twilioClient) {
    const twilioMessage = await twilioClient.messages.create({
      from: formatWhatsAppNumber(process.env.TWILIO_WHATSAPP_FROM),
      to: formatWhatsAppNumber(to),
      body: message,
    });
    return { success: true, messageId: twilioMessage.sid, provider: "twilio" };
  }

  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

  if (!phoneNumberId || !accessToken) {
    console.warn("WhatsApp não configurado — mensagem não enviada");
    return { success: false, error: "WhatsApp não configurado" };
  }

  const apiVersion = process.env.WHATSAPP_API_VERSION || "v21.0";
  const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: to.replace(/\D/g, ""),
      type: "text",
      text: { preview_url: true, body: message },
    }),
  });

  const responseData = await response.json();
  if (!response.ok) {
    throw new Error(responseData.error?.message || "Erro ao enviar WhatsApp");
  }

  return {
    success: true,
    messageId: responseData.messages?.[0]?.id,
    provider: "meta",
  };
}

module.exports = {
  sendWhatsAppMessage,
  hasTwilioConfig,
};
