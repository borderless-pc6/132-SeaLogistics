import { doc, getDoc } from "firebase/firestore";
import type { Shipment } from "../context/shipments-context";
import { db } from "../lib/firebaseConfig";
import type { NotificationPreferences } from "../types/user";
import { resolveCompanyClientContact } from "./clientContactService";
import { sendEmail } from "./emailService";
import { renderEmailTemplate, renderWhatsAppTemplate } from "./templateService";
import { sendWhatsAppMessage, formatPhoneNumber } from "./whatsappService";

export type { CompanyClientContact } from "./clientContactService";
export { resolveCompanyClientContact } from "./clientContactService";

// Número de WhatsApp de teste (sandbox Twilio) quando o cliente não tem telefone cadastrado
const rawTestPhone = import.meta.env.VITE_WHATSAPP_TEST_PHONE;
const TEST_WHATSAPP_PHONE = (() => {
  if (typeof rawTestPhone !== "string" || !rawTestPhone.trim()) return undefined;
  const digits = rawTestPhone.replace(/\D/g, "");
  if (digits.length < 10) return undefined;
  return digits.startsWith("55") ? digits : `55${digits}`;
})();

const getUserNotificationPreferences = async (
  userId: string
): Promise<NotificationPreferences> => {
  try {
    const userDoc = await getDoc(doc(db, "users", userId));

    if (userDoc.exists()) {
      const userData = userDoc.data();

      if (userData.notificationPreferences) {
        return userData.notificationPreferences;
      }

      if (userData.notifications) {
        return {
          email: userData.notifications.email ?? true,
          whatsapp: userData.notifications.whatsapp ?? false,
          statusUpdates: userData.notifications.statusUpdates ?? true,
          newShipments: userData.notifications.newShipments ?? true,
        };
      }
    }

    return {
      email: true,
      whatsapp: false,
      statusUpdates: true,
      newShipments: true,
    };
  } catch (error) {
    console.error("Erro ao buscar preferências de notificação:", error);
    return {
      email: true,
      whatsapp: false,
      statusUpdates: true,
      newShipments: true,
    };
  }
};

const getUserWhatsAppNumber = async (userId: string): Promise<string | null> => {
  try {
    const userDoc = await getDoc(doc(db, "users", userId));

    if (userDoc.exists()) {
      const userData = userDoc.data();
      return userData.whatsappPhone || userData.phone || null;
    }

    return null;
  } catch (error) {
    console.error("Erro ao buscar número de WhatsApp:", error);
    return null;
  }
};

export const sendShipmentCreatedEmail = async (
  shipment: Shipment,
  clientEmail: string
): Promise<boolean> => {
  const { subject, html } = await renderEmailTemplate(
    "new_shipment_email",
    shipment
  );

  return sendEmail({
    to: clientEmail,
    subject,
    html,
  });
};

export const sendStatusUpdateEmail = async (
  shipment: Shipment,
  clientEmail: string,
  oldStatus: string
): Promise<boolean> => {
  const { subject, html } = await renderEmailTemplate(
    "status_update_email",
    shipment,
    { oldStatus }
  );

  return sendEmail({
    to: clientEmail,
    subject,
    html,
  });
};

/**
 * Notifica o cliente final (empresa do embarque) sobre novo envio.
 * Usa contactEmail/phone da collection companies no Firebase.
 */
export const sendClientShipmentNotification = async (
  shipment: Shipment
): Promise<{ email: boolean; whatsapp: boolean }> => {
  const results = { email: false, whatsapp: false };

  if (!shipment.companyId) {
    console.warn(
      "[Notificação Cliente] Embarque sem companyId — notificação ignorada"
    );
    return results;
  }

  const contact = await resolveCompanyClientContact(shipment.companyId);
  if (!contact) {
    console.warn(
      "[Notificação Cliente] Empresa não encontrada:",
      shipment.companyId
    );
    return results;
  }

  if (!contact.preferences.newShipments) {
    console.log(
      `[Notificação Cliente] ${contact.companyName} desabilitou novos envios`
    );
    return results;
  }

  if (contact.preferences.email && contact.email) {
    console.log(
      `[Notificação Cliente] Email novo envio → ${contact.email}`
    );
    results.email = await sendShipmentCreatedEmail(shipment, contact.email);
  } else if (contact.preferences.email && !contact.email) {
    console.warn(
      `[Notificação Cliente] ${contact.companyName} sem email cadastrado`
    );
  }

  const whatsappNumber = contact.phone || TEST_WHATSAPP_PHONE;
  if ((contact.preferences.whatsapp || TEST_WHATSAPP_PHONE) && whatsappNumber) {
    const message = await renderWhatsAppTemplate(
      "new_shipment_whatsapp",
      shipment
    );
    console.log(
      "[Notificação Cliente] WhatsApp novo envio →",
      whatsappNumber.replace(/(\d{4})\d+(\d{2})/, "$1****$2")
    );
    results.whatsapp = await sendWhatsAppMessage({
      to: formatPhoneNumber(whatsappNumber),
      message,
    });
  }

  return results;
};

/**
 * Notifica o cliente final sobre mudança de status do embarque.
 */
export const sendClientStatusUpdateNotification = async (
  shipment: Shipment,
  oldStatus: string
): Promise<{ email: boolean; whatsapp: boolean }> => {
  const results = { email: false, whatsapp: false };

  if (!shipment.companyId) {
    console.warn(
      "[Notificação Cliente] Embarque sem companyId — notificação ignorada"
    );
    return results;
  }

  const contact = await resolveCompanyClientContact(shipment.companyId);
  if (!contact) {
    console.warn(
      "[Notificação Cliente] Empresa não encontrada:",
      shipment.companyId
    );
    return results;
  }

  if (!contact.preferences.statusUpdates) {
    console.log(
      `[Notificação Cliente] ${contact.companyName} desabilitou atualizações de status`
    );
    return results;
  }

  if (contact.preferences.email && contact.email) {
    console.log(
      `[Notificação Cliente] Email status → ${contact.email} (${oldStatus} → ${shipment.status})`
    );
    results.email = await sendStatusUpdateEmail(
      shipment,
      contact.email,
      oldStatus
    );
  } else if (contact.preferences.email && !contact.email) {
    console.warn(
      `[Notificação Cliente] ${contact.companyName} sem email cadastrado`
    );
  }

  const whatsappNumber = contact.phone || TEST_WHATSAPP_PHONE;
  if ((contact.preferences.whatsapp || TEST_WHATSAPP_PHONE) && whatsappNumber) {
    const message = await renderWhatsAppTemplate(
      "status_update_whatsapp",
      shipment,
      { oldStatus }
    );
    console.log(
      "[Notificação Cliente] WhatsApp status →",
      whatsappNumber.replace(/(\d{4})\d+(\d{2})/, "$1****$2")
    );
    results.whatsapp = await sendWhatsAppMessage({
      to: formatPhoneNumber(whatsappNumber),
      message,
    });
  } else if (contact.preferences.whatsapp && !whatsappNumber) {
    console.warn(
      `[Notificação Cliente] ${contact.companyName} sem telefone WhatsApp cadastrado`
    );
  }

  return results;
};

/** @deprecated Prefer sendClientShipmentNotification — notifica operador logado */
export const sendShipmentNotification = async (
  shipment: Shipment,
  userId: string,
  clientEmail?: string,
  clientPhone?: string
): Promise<{ email: boolean; whatsapp: boolean }> => {
  if (shipment.companyId) {
    return sendClientShipmentNotification(shipment);
  }

  const results = { email: false, whatsapp: false };
  const preferences = await getUserNotificationPreferences(userId);

  if (!preferences.newShipments) return results;

  if (preferences.email && clientEmail) {
    results.email = await sendShipmentCreatedEmail(shipment, clientEmail);
  }

  if (preferences.whatsapp || TEST_WHATSAPP_PHONE) {
    const whatsappNumber =
      clientPhone ||
      (await getUserWhatsAppNumber(userId)) ||
      TEST_WHATSAPP_PHONE;

    if (whatsappNumber) {
      const message = await renderWhatsAppTemplate(
        "new_shipment_whatsapp",
        shipment
      );
      results.whatsapp = await sendWhatsAppMessage({
        to: formatPhoneNumber(whatsappNumber),
        message,
      });
    }
  }

  return results;
};

/** @deprecated Prefer sendClientStatusUpdateNotification — notifica operador logado */
export const sendStatusUpdateNotification = async (
  shipment: Shipment,
  userId: string,
  oldStatus: string,
  clientEmail?: string,
  clientPhone?: string
): Promise<{ email: boolean; whatsapp: boolean }> => {
  if (shipment.companyId) {
    return sendClientStatusUpdateNotification(shipment, oldStatus);
  }

  const results = { email: false, whatsapp: false };
  const preferences = await getUserNotificationPreferences(userId);

  if (!preferences.statusUpdates) return results;

  if (preferences.email && clientEmail) {
    results.email = await sendStatusUpdateEmail(
      shipment,
      clientEmail,
      oldStatus
    );
  }

  if (preferences.whatsapp || TEST_WHATSAPP_PHONE) {
    const whatsappNumber =
      clientPhone ||
      (await getUserWhatsAppNumber(userId)) ||
      TEST_WHATSAPP_PHONE;

    if (whatsappNumber) {
      const message = await renderWhatsAppTemplate(
        "status_update_whatsapp",
        shipment,
        { oldStatus }
      );
      results.whatsapp = await sendWhatsAppMessage({
        to: formatPhoneNumber(whatsappNumber),
        message,
      });
    }
  }

  return results;
};
