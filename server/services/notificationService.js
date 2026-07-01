const { getFirestore } = require("./firebaseAdmin");
const { sendEmail } = require("./emailService");
const { renderEmailTemplate, renderWhatsAppTemplate } = require("./templateService");
const { sendWhatsAppMessage } = require("./whatsappService");

const DEFAULT_PREFERENCES = {
  email: true,
  whatsapp: true,
  statusUpdates: true,
  newShipments: true,
};

function normalizeEmail(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.includes("@") ? trimmed : null;
}

function normalizePhone(value) {
  if (typeof value !== "string") return null;
  const digits = value.replace(/\D/g, "");
  if (digits.length < 10) return null;
  return digits.startsWith("55") ? digits : `55${digits}`;
}

function mergePreferences(raw, hasPhone) {
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_PREFERENCES, whatsapp: hasPhone };
  }
  return {
    email: raw.email ?? DEFAULT_PREFERENCES.email,
    whatsapp: raw.whatsapp ?? hasPhone,
    statusUpdates: raw.statusUpdates ?? DEFAULT_PREFERENCES.statusUpdates,
    newShipments: raw.newShipments ?? DEFAULT_PREFERENCES.newShipments,
  };
}

async function resolveCompanyClientContact(companyId) {
  if (!companyId) return null;

  const db = getFirestore();
  const companyDoc = await db.collection("companies").doc(companyId).get();
  if (!companyDoc.exists) return null;

  const companyData = companyDoc.data();
  let email = normalizeEmail(companyData.contactEmail);
  let phone = normalizePhone(
    companyData.whatsappPhone || companyData.phone
  );

  if (!email || !phone) {
    const usersSnap = await db
      .collection("users")
      .where("companyId", "==", companyId)
      .limit(10)
      .get();

    for (const userDoc of usersSnap.docs) {
      const userData = userDoc.data();
      if (!email) email = normalizeEmail(userData.email);
      if (!phone) {
        phone = normalizePhone(userData.whatsappPhone || userData.phone);
      }
      if (email && phone) break;
    }
  }

  const preferences = mergePreferences(
    companyData.notificationPreferences,
    Boolean(phone)
  );

  return {
    companyId,
    companyName: companyData.name || "Cliente",
    email,
    phone,
    preferences,
  };
}

async function sendClientStatusUpdateNotification(shipment, oldStatus) {
  const results = { email: false, whatsapp: false };

  if (!shipment.companyId) {
    return results;
  }

  const contact = await resolveCompanyClientContact(shipment.companyId);
  if (!contact) {
    return results;
  }

  if (!contact.preferences.statusUpdates) {
    return results;
  }

  if (contact.preferences.email && contact.email) {
    try {
      const { subject, html } = await renderEmailTemplate(
        "status_update_email",
        shipment,
        { oldStatus }
      );
      await sendEmail({ to: contact.email, subject, html });
      results.email = true;
    } catch (error) {
      console.error("[Notificação] Erro ao enviar email de status:", error.message);
    }
  }

  const testPhone = process.env.WHATSAPP_TEST_PHONE;
  const whatsappNumber = contact.phone || testPhone;

  if ((contact.preferences.whatsapp || testPhone) && whatsappNumber) {
    try {
      const message = await renderWhatsAppTemplate(
        "status_update_whatsapp",
        shipment,
        { oldStatus }
      );
      const result = await sendWhatsAppMessage({ to: whatsappNumber, message });
      results.whatsapp = result.success;
    } catch (error) {
      console.error("[Notificação] Erro ao enviar WhatsApp de status:", error.message);
    }
  }

  return results;
}

async function sendClientShipmentNotification(shipment) {
  const results = { email: false, whatsapp: false };

  if (!shipment.companyId) {
    return results;
  }

  const contact = await resolveCompanyClientContact(shipment.companyId);
  if (!contact) {
    return results;
  }

  if (!contact.preferences.newShipments) {
    return results;
  }

  if (contact.preferences.email && contact.email) {
    try {
      const { subject, html } = await renderEmailTemplate(
        "new_shipment_email",
        shipment
      );
      await sendEmail({ to: contact.email, subject, html });
      results.email = true;
    } catch (error) {
      console.error("[Notificação] Erro ao enviar email de novo envio:", error.message);
    }
  }

  const testPhone = process.env.WHATSAPP_TEST_PHONE;
  const whatsappNumber = contact.phone || testPhone;

  if ((contact.preferences.whatsapp || testPhone) && whatsappNumber) {
    try {
      const message = await renderWhatsAppTemplate(
        "new_shipment_whatsapp",
        shipment
      );
      const result = await sendWhatsAppMessage({ to: whatsappNumber, message });
      results.whatsapp = result.success;
    } catch (error) {
      console.error("[Notificação] Erro ao enviar WhatsApp de novo envio:", error.message);
    }
  }

  return results;
}

module.exports = {
  resolveCompanyClientContact,
  sendClientStatusUpdateNotification,
  sendClientShipmentNotification,
};
