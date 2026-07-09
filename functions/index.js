const {setGlobalOptions} = require("firebase-functions");
const {onSchedule} = require("firebase-functions/v2/scheduler");
const {onRequest} = require("firebase-functions/v2/https");
const {initializeApp} = require("firebase-admin/app");
const {getFirestore, FieldValue} = require("firebase-admin/firestore");
const logger = require("firebase-functions/logger");

const {
  simulateCarrierUpdate,
  getActiveShipmentsForTracking,
} = require("./services/carrierMockService");
const {sendStatusUpdatePush} = require("./services/trackingNotifications");

initializeApp();
setGlobalOptions({maxInstances: 10});

const BATCH_LIMIT = 5;

async function isAutoTrackingEnabled() {
  const db = getFirestore();
  const configDoc = await db.collection("systemConfig").doc("autoTracking").get();

  if (!configDoc.exists) {
    return true;
  }

  return configDoc.data()?.enabled !== false;
}

async function runCarrierTrackingBatch(limit = BATCH_LIMIT) {
  const db = getFirestore();
  const snapshot = await db
      .collection("shipments")
      .orderBy("updatedAt", "asc")
      .limit(100)
      .get();

  const allShipments = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  const active = getActiveShipmentsForTracking(allShipments).slice(0, limit);
  const results = [];

  for (const shipment of active) {
    const simulation = simulateCarrierUpdate(shipment);
    if (!simulation) continue;

    const oldStatus = shipment.status;
    const updates = {
      status: simulation.status,
      currentLocation: simulation.currentLocation,
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (simulation.reportedEta) {
      updates.reportedEta = simulation.reportedEta;
    }

    const docRef = db.collection("shipments").doc(shipment.id);
    await docRef.update(updates);

    await db.collection("statusHistory").add({
      shipmentId: shipment.id,
      eventType: "carrier_sync",
      fromStatus: oldStatus,
      toStatus: simulation.status,
      changedBy: "system",
      changedByName: "Auto-tracking (Cloud Function)",
      companyId: shipment.companyId || null,
      carrierMessage: simulation.carrierMessage,
      carrierName: simulation.carrierName,
      changedAt: FieldValue.serverTimestamp(),
    });

    const updatedShipment = {...shipment, ...updates, id: shipment.id};
    let pushResult = {success: false, sent: 0};

    try {
      pushResult = await sendStatusUpdatePush(updatedShipment, oldStatus);
    } catch (error) {
      logger.warn("Falha ao enviar push de auto-tracking", {
        shipmentId: shipment.id,
        error: error.message,
      });
    }

    results.push({
      shipmentId: shipment.id,
      numeroBl: shipment.numeroBl,
      oldStatus,
      newStatus: simulation.status,
      carrierMessage: simulation.carrierMessage,
      pushSent: pushResult.sent || 0,
    });
  }

  await db.collection("systemConfig").doc("autoTracking").set(
      {
        enabled: true,
        lastRunAt: FieldValue.serverTimestamp(),
        lastProcessed: active.length,
        lastUpdated: results.length,
      },
      {merge: true},
  );

  return {
    processed: active.length,
    updated: results.length,
    results,
  };
}

/**
 * Executa a cada 30 minutos (requer plano Blaze).
 * Atualiza status/localização de embarques ativos e envia push FCM.
 */
exports.scheduledCarrierTracking = onSchedule(
    {
      schedule: "every 30 minutes",
      timeZone: "America/Sao_Paulo",
    },
    async () => {
      const enabled = await isAutoTrackingEnabled();
      if (!enabled) {
        logger.info("Auto-tracking desabilitado em systemConfig/autoTracking");
        return;
      }

      const summary = await runCarrierTrackingBatch();
      logger.info("Auto-tracking concluído", summary);
    },
);

/**
 * Disparo manual para testes (admin via curl ou painel interno).
 */
exports.runCarrierTrackingNow = onRequest(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({success: false, error: "Use POST"});
    return;
  }

  try {
    const limit = Math.min(Number(req.body?.limit) || BATCH_LIMIT, 10);
    const summary = await runCarrierTrackingBatch(limit);
    res.json({success: true, ...summary});
  } catch (error) {
    logger.error("Erro no auto-tracking manual", error);
    res.status(500).json({success: false, error: error.message});
  }
});
