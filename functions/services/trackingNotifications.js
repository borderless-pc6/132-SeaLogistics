const {getFirestore} = require("firebase-admin/firestore");
const {getMessaging} = require("firebase-admin/messaging");

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

async function getCompanyPushTargets(companyId) {
  if (!companyId) return {tokens: [], userIds: []};

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

    if (!isPushEnabled(prefs) || !wantsStatusUpdates(prefs)) continue;

    userIds.push(userDoc.id);

    if (Array.isArray(data.fcmTokens)) {
      for (const token of data.fcmTokens) {
        if (token) tokens.add(token);
      }
    }
  }

  return {tokens: [...tokens], userIds};
}

async function createInAppNotifications(userIds, payload) {
  if (!userIds.length) return;

  const db = getFirestore();
  const now = new Date();

  await Promise.all(
      userIds.map((userId) =>
        db.collection("notifications").add({
          userId,
          ...payload,
          read: false,
          createdAt: now,
        }),
      ),
  );
}

async function sendStatusUpdatePush(shipment, oldStatus) {
  if (!shipment.companyId) {
    return {success: false, sent: 0, reason: "no_company"};
  }

  const {tokens, userIds} = await getCompanyPushTargets(shipment.companyId);
  if (!tokens.length) {
    return {success: false, sent: 0, reason: "no_tokens"};
  }

  const title = `Status atualizado — BL ${shipment.numeroBl || ""}`;
  const body =
    `${shipment.cliente || "Seu envio"}: ${oldStatus || "?"} → ${shipment.status}`;

  const messaging = getMessaging();
  const response = await messaging.sendEachForMulticast({
    tokens,
    notification: {title, body},
    data: {
      shipmentId: shipment.id || "",
      numeroBl: shipment.numeroBl || "",
      status: shipment.status || "",
      link: shipment.id ? `/envios/${shipment.id}` : "/envios",
    },
    webpush: {
      fcmOptions: {
        link: shipment.id ? `/envios/${shipment.id}` : "/envios",
      },
    },
  });

  await createInAppNotifications(userIds, {
    companyId: shipment.companyId,
    title,
    body,
    type: "status_update",
    shipmentId: shipment.id || null,
    numeroBl: shipment.numeroBl || null,
  });

  return {
    success: response.successCount > 0,
    sent: response.successCount,
    failed: response.failureCount,
  };
}

module.exports = {
  sendStatusUpdatePush,
};
