const { admin, isFirebaseAdminReady, getFirestore } = require("./firebaseAdmin");

function isPushEnabled(prefs) {
  if (!prefs || typeof prefs !== "object") return true;
  if (prefs.push !== undefined) return Boolean(prefs.push);
  if (prefs.whatsapp !== undefined) return Boolean(prefs.whatsapp);
  return true;
}

function wantsStatusUpdates(prefs) {
  if (!prefs || typeof prefs !== "object") return true;
  return prefs.statusUpdates !== false;
}

function wantsNewShipments(prefs) {
  if (!prefs || typeof prefs !== "object") return true;
  return prefs.newShipments !== false;
}

async function getCompanyPushTargets(companyId, eventType = null) {
  if (!companyId) return { tokens: [], userIds: [] };

  const db = getFirestore();
  const usersSnap = await db
    .collection("users")
    .where("companyId", "==", companyId)
    .get();

  const tokens = new Set();
  const userIds = [];

  for (const userDoc of usersSnap.docs) {
    const data = userDoc.data();
    const prefs = data.notificationPreferences || data.notifications;

    if (!isPushEnabled(prefs)) continue;
    if (eventType === "status_update" && !wantsStatusUpdates(prefs)) continue;
    if (eventType === "new_shipment" && !wantsNewShipments(prefs)) continue;

    userIds.push(userDoc.id);

    if (Array.isArray(data.fcmTokens)) {
      for (const token of data.fcmTokens) {
        if (token) tokens.add(token);
      }
    }
  }

  return { tokens: [...tokens], userIds };
}

async function removeInvalidTokens(invalidTokens) {
  if (!invalidTokens.length || !isFirebaseAdminReady()) return;

  const db = getFirestore();
  const usersSnap = await db.collection("users").get();

  for (const userDoc of usersSnap.docs) {
    const data = userDoc.data();
    if (!Array.isArray(data.fcmTokens)) continue;

    const cleaned = data.fcmTokens.filter((t) => !invalidTokens.includes(t));
    if (cleaned.length !== data.fcmTokens.length) {
      await userDoc.ref.update({ fcmTokens: cleaned });
    }
  }
}

async function sendPushToTokens(tokens, { title, body, data = {} }) {
  if (!tokens.length) {
    return { success: false, sent: 0, reason: "no_tokens" };
  }

  if (!isFirebaseAdminReady()) {
    console.warn("[FCM] Firebase Admin não configurado");
    return { success: false, sent: 0, reason: "firebase_not_ready" };
  }

  const messaging = admin.messaging();
  const stringData = Object.fromEntries(
    Object.entries(data).map(([key, value]) => [key, String(value ?? "")])
  );

  const response = await messaging.sendEachForMulticast({
    tokens,
    notification: { title, body },
    data: stringData,
    webpush: {
      fcmOptions: { link: data.link || "/" },
    },
  });

  const invalidTokens = [];
  response.responses.forEach((item, index) => {
    if (
      !item.success &&
      item.error?.code === "messaging/registration-token-not-registered"
    ) {
      invalidTokens.push(tokens[index]);
    }
  });

  if (invalidTokens.length) {
    await removeInvalidTokens(invalidTokens);
  }

  return {
    success: response.successCount > 0,
    sent: response.successCount,
    failed: response.failureCount,
    provider: "firebase-fcm",
  };
}

async function createInAppNotifications(userIds, payload) {
  if (!userIds.length || !isFirebaseAdminReady()) return;

  const db = getFirestore();
  const now = new Date();

  await Promise.all(
    userIds.map((userId) =>
      db.collection("notifications").add({
        userId,
        ...payload,
        read: false,
        createdAt: now,
      })
    )
  );
}

async function sendCompanyPushNotification({
  companyId,
  title,
  body,
  data = {},
  eventType,
}) {
  const { tokens, userIds } = await getCompanyPushTargets(companyId, eventType);

  const pushResult = await sendPushToTokens(tokens, { title, body, data });

  await createInAppNotifications(userIds, {
    companyId,
    title,
    body,
    type: eventType,
    shipmentId: data.shipmentId || null,
    numeroBl: data.numeroBl || null,
  });

  return pushResult;
}

async function sendPushToCompanyUsers(companyId, prefs, eventType, shipment, extra = {}) {
  if (eventType === "status_update" && !wantsStatusUpdates(prefs)) {
    return { success: false, sent: 0, reason: "disabled" };
  }
  if (eventType === "new_shipment" && !wantsNewShipments(prefs)) {
    return { success: false, sent: 0, reason: "disabled" };
  }

  const isStatus = eventType === "status_update";
  const title = isStatus
    ? `Status atualizado — BL ${shipment.numeroBl || ""}`
    : `Novo envio — BL ${shipment.numeroBl || ""}`;

  const body =
    extra.body ||
    (isStatus
      ? `${shipment.cliente || "Seu envio"}: ${extra.oldStatusLabel || extra.oldStatus || "?"} → ${extra.statusLabel || shipment.status}`
      : `Envio registrado: ${shipment.pol || "-"} → ${shipment.pod || "-"}`);

  return sendCompanyPushNotification({
    companyId,
    title,
    body,
    eventType,
    data: {
      shipmentId: shipment.id || "",
      numeroBl: shipment.numeroBl || "",
      status: shipment.status || "",
      link: shipment.id ? `/envios/${shipment.id}` : "/envios",
    },
  });
}

function isFcmConfigured() {
  return isFirebaseAdminReady();
}

module.exports = {
  sendPushToTokens,
  sendCompanyPushNotification,
  sendPushToCompanyUsers,
  getCompanyPushTargets,
  createInAppNotifications,
  isFcmConfigured,
};
