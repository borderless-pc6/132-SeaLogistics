const { getFirestore } = require("./firebaseAdmin");
const { sendEmail } = require("./emailService");
const {
  renderEmailTemplate,
  renderPushTemplate,
  getStatusLabel,
} = require("./templateService");
const { sendPushToCompanyUsers } = require("./pushNotificationService");

const DEFAULT_PREFERENCES = {
  email: true,
  push: true,
  statusUpdates: true,
  newShipments: true,
};

function normalizeEmail(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.includes("@") ? trimmed : null;
}

function mergePreferences(raw) {
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_PREFERENCES };
  }
  return {
    email: raw.email ?? DEFAULT_PREFERENCES.email,
    push: raw.push ?? raw.whatsapp ?? DEFAULT_PREFERENCES.push,
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

  if (!email) {
    const usersSnap = await db
      .collection("users")
      .where("companyId", "==", companyId)
      .limit(10)
      .get();

    for (const userDoc of usersSnap.docs) {
      const userData = userDoc.data();
      if (!email) email = normalizeEmail(userData.email);
      if (email) break;
    }
  }

  const preferences = mergePreferences(companyData.notificationPreferences);

  return {
    companyId,
    companyName: companyData.name || "Cliente",
    email,
    preferences,
  };
}

async function sendClientStatusUpdateNotification(shipment, oldStatus) {
  const results = { email: false, push: false };

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

  if (contact.preferences.push) {
    try {
      const body = await renderPushTemplate(
        "status_update_push",
        shipment,
        { oldStatus }
      );
      const pushResult = await sendPushToCompanyUsers(
        shipment.companyId,
        contact.preferences,
        "status_update",
        shipment,
        {
          oldStatus,
          oldStatusLabel: getStatusLabel(oldStatus),
          statusLabel: getStatusLabel(shipment.status),
          body,
        }
      );
      results.push = pushResult.success;
    } catch (error) {
      console.error("[Notificação] Erro ao enviar push de status:", error.message);
    }
  }

  return results;
}

async function sendClientShipmentNotification(shipment) {
  const results = { email: false, push: false };

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

  if (contact.preferences.push) {
    try {
      const body = await renderPushTemplate("new_shipment_push", shipment);
      const pushResult = await sendPushToCompanyUsers(
        shipment.companyId,
        contact.preferences,
        "new_shipment",
        shipment,
        { body }
      );
      results.push = pushResult.success;
    } catch (error) {
      console.error("[Notificação] Erro ao enviar push de novo envio:", error.message);
    }
  }

  return results;
}

module.exports = {
  resolveCompanyClientContact,
  sendClientStatusUpdateNotification,
  sendClientShipmentNotification,
};
