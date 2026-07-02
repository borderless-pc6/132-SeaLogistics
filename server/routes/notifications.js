const express = require("express");
const { authMiddleware } = require("../middleware/auth");
const {
  sendClientShipmentNotification,
  sendClientStatusUpdateNotification,
} = require("../services/notificationService");
const { isFcmConfigured } = require("../services/pushNotificationService");

const router = express.Router();

router.get("/status", (req, res) => {
  res.json({
    success: true,
    push: isFcmConfigured(),
    provider: "firebase-fcm",
  });
});

router.post("/shipment-created", authMiddleware, async (req, res) => {
  try {
    const { shipment } = req.body;
    if (!shipment) {
      return res.status(400).json({ success: false, error: "shipment é obrigatório" });
    }

    const notifications = await sendClientShipmentNotification(shipment);
    res.json({ success: true, notifications });
  } catch (error) {
    console.error("Erro ao notificar novo embarque:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/status-updated", authMiddleware, async (req, res) => {
  try {
    const { shipment, oldStatus } = req.body;
    if (!shipment || !oldStatus) {
      return res.status(400).json({
        success: false,
        error: "shipment e oldStatus são obrigatórios",
      });
    }

    const notifications = await sendClientStatusUpdateNotification(
      shipment,
      oldStatus
    );
    res.json({ success: true, notifications });
  } catch (error) {
    console.error("Erro ao notificar status:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
