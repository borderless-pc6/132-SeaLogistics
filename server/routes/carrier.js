const express = require("express");
const { getFirestore, isFirebaseAdminReady } = require("../services/firebaseAdmin");
const { authMiddleware, requireRole } = require("../middleware/auth");
const {
  simulateCarrierUpdate,
  getActiveShipmentsForTracking,
} = require("../services/carrierMockService");
const { sendClientStatusUpdateNotification } = require("../services/notificationService");

const router = express.Router();

router.use(authMiddleware);
router.use(requireRole("admin", "operator"));

async function applyCarrierUpdate(db, shipmentId, shipmentData, user) {
  const simulation = simulateCarrierUpdate({ id: shipmentId, ...shipmentData });
  if (!simulation) {
    return { updated: false, reason: "no_next_step" };
  }

  const oldStatus = shipmentData.status;
  const updates = {
    status: simulation.status,
    currentLocation: simulation.currentLocation,
    updatedAt: new Date(),
  };
  if (simulation.reportedEta) {
    updates.reportedEta = simulation.reportedEta;
  }

  const docRef = db.collection("shipments").doc(shipmentId);
  await docRef.update(updates);

  await db.collection("statusHistory").add({
    shipmentId,
    eventType: "carrier_sync",
    fromStatus: oldStatus,
    toStatus: simulation.status,
    changedBy: user.uid,
    changedByName: user.email,
    companyId: shipmentData.companyId || null,
    carrierMessage: simulation.carrierMessage,
    carrierName: simulation.carrierName,
    changedAt: new Date(),
  });

  const updatedShipment = { id: shipmentId, ...shipmentData, ...updates };

  let notifications = { email: false, whatsapp: false };
  try {
    notifications = await sendClientStatusUpdateNotification(
      updatedShipment,
      oldStatus
    );
  } catch (error) {
    console.error("Erro ao enviar notificações:", error.message);
  }

  return {
    updated: true,
    shipment: updatedShipment,
    simulation,
    oldStatus,
    notifications,
  };
}

router.post("/mock-update/:id", async (req, res) => {
  try {
    if (!isFirebaseAdminReady()) {
      return res.status(503).json({ success: false, error: "Firebase Admin não configurado" });
    }

    const db = getFirestore();
    const doc = await db.collection("shipments").doc(req.params.id).get();

    if (!doc.exists) {
      return res.status(404).json({ success: false, error: "Embarque não encontrado" });
    }

    const result = await applyCarrierUpdate(db, req.params.id, doc.data(), req.user);

    if (!result.updated) {
      return res.json({
        success: true,
        updated: false,
        reason: result.reason,
      });
    }

    res.json({
      success: true,
      updated: true,
      shipment: result.shipment,
      simulation: result.simulation,
      oldStatus: result.oldStatus,
      notifications: result.notifications,
    });
  } catch (error) {
    console.error("Erro no mock de transportadora:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/mock-batch", async (req, res) => {
  try {
    if (!isFirebaseAdminReady()) {
      return res.status(503).json({ success: false, error: "Firebase Admin não configurado" });
    }

    const limit = Math.min(Number(req.body?.limit) || 3, 10);
    const db = getFirestore();

    const snapshot = await db
      .collection("shipments")
      .orderBy("createdAt", "desc")
      .limit(50)
      .get();

    const allShipments = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    const active = getActiveShipmentsForTracking(allShipments).slice(0, limit);
    const results = [];

    for (const shipment of active) {
      const result = await applyCarrierUpdate(
        db,
        shipment.id,
        shipment,
        req.user
      );
      if (result.updated) {
        results.push({
          shipmentId: shipment.id,
          numeroBl: shipment.numeroBl,
          oldStatus: result.oldStatus,
          newStatus: result.shipment.status,
          carrierMessage: result.simulation.carrierMessage,
          notifications: result.notifications,
        });
      }
    }

    res.json({
      success: true,
      processed: active.length,
      updated: results.length,
      results,
    });
  } catch (error) {
    console.error("Erro no mock batch de transportadora:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/status", (req, res) => {
  res.json({
    success: true,
    provider: "mock",
    description: "Simulador de integração com transportadoras",
    available: isFirebaseAdminReady(),
  });
});

module.exports = router;
