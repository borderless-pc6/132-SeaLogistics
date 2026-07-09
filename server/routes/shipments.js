const express = require("express");
const { getFirestore, isFirebaseAdminReady } = require("../services/firebaseAdmin");
const { authMiddleware, requireRole } = require("../middleware/auth");
const {
  sendClientStatusUpdateNotification,
  sendClientShipmentNotification,
} = require("../services/notificationService");

const router = express.Router();

function isStaff(role) {
  return role === "admin" || role === "operator";
}

async function deleteRelatedRecords(db, shipmentId) {
  const collections = ["statusHistory", "documents"];
  const refs = [];

  for (const collectionName of collections) {
    const snapshot = await db
      .collection(collectionName)
      .where("shipmentId", "==", shipmentId)
      .get();
    snapshot.docs.forEach((doc) => refs.push(doc.ref));
  }

  const BATCH_SIZE = 500;
  for (let i = 0; i < refs.length; i += BATCH_SIZE) {
    const batch = db.batch();
    refs.slice(i, i + BATCH_SIZE).forEach((ref) => batch.delete(ref));
    await batch.commit();
  }

  return refs.length;
}

router.use(authMiddleware);

router.get("/", async (req, res) => {
  try {
    if (!isFirebaseAdminReady()) {
      return res.status(503).json({ success: false, error: "Firebase Admin não configurado" });
    }

    const db = getFirestore();
    let query = db.collection("shipments").orderBy("createdAt", "desc");

    if (!isStaff(req.user.role) && req.user.companyId) {
      query = db
        .collection("shipments")
        .where("companyId", "==", req.user.companyId)
        .orderBy("createdAt", "desc");
    }

    const snapshot = await query.get();
    const shipments = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    res.json({ success: true, shipments });
  } catch (error) {
    console.error("Erro ao listar embarques:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    if (!isFirebaseAdminReady()) {
      return res.status(503).json({ success: false, error: "Firebase Admin não configurado" });
    }

    const db = getFirestore();
    const doc = await db.collection("shipments").doc(req.params.id).get();

    if (!doc.exists) {
      return res.status(404).json({ success: false, error: "Embarque não encontrado" });
    }

    const shipment = { id: doc.id, ...doc.data() };

    if (
      !isStaff(req.user.role) &&
      req.user.companyId &&
      shipment.companyId !== req.user.companyId
    ) {
      return res.status(403).json({ success: false, error: "Acesso negado" });
    }

    res.json({ success: true, shipment });
  } catch (error) {
    console.error("Erro ao buscar embarque:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/", requireRole("admin", "operator", "company_user"), async (req, res) => {
  try {
    if (!isFirebaseAdminReady()) {
      return res.status(503).json({ success: false, error: "Firebase Admin não configurado" });
    }

    const db = getFirestore();
    const data = { ...req.body };
    delete data.id;

    if (req.user.role === "company_user") {
      if (!req.user.companyId) {
        return res.status(403).json({
          success: false,
          error: "Sua conta não está vinculada a uma empresa",
        });
      }
      data.companyId = req.user.companyId;
    }

    data.createdAt = new Date();
    data.updatedAt = new Date();

    const docRef = await db.collection("shipments").add(data);
    const shipment = { id: docRef.id, ...data };

    try {
      await db.collection("statusHistory").add({
        shipmentId: docRef.id,
        eventType: "created",
        toStatus: data.status || "documentacao",
        changedBy: req.user.uid,
        changedByName: req.user.email || "Sistema",
        companyId: data.companyId || null,
        changedAt: new Date(),
      });
    } catch (historyError) {
      console.error("Erro ao registrar histórico de criação:", historyError.message);
    }

    let notifications = { email: false, push: false };
    try {
      notifications = await sendClientShipmentNotification(shipment);
    } catch (notifyError) {
      console.error("Erro ao notificar novo embarque:", notifyError.message);
    }

    res.status(201).json({
      success: true,
      id: docRef.id,
      shipment,
      notifications,
    });
  } catch (error) {
    console.error("Erro ao criar embarque:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put("/:id", requireRole("admin", "operator", "company_user"), async (req, res) => {
  try {
    if (!isFirebaseAdminReady()) {
      return res.status(503).json({ success: false, error: "Firebase Admin não configurado" });
    }

    const db = getFirestore();
    const docRef = db.collection("shipments").doc(req.params.id);
    const existing = await docRef.get();

    if (!existing.exists) {
      return res.status(404).json({ success: false, error: "Embarque não encontrado" });
    }

    const existingData = existing.data();

    if (
      !isStaff(req.user.role) &&
      req.user.companyId &&
      existingData.companyId !== req.user.companyId
    ) {
      return res.status(403).json({ success: false, error: "Acesso negado" });
    }

    const updates = { ...req.body };
    delete updates.id;
    updates.updatedAt = new Date();

    await docRef.update(updates);

    res.json({
      success: true,
      shipment: { id: req.params.id, ...existingData, ...updates },
    });
  } catch (error) {
    console.error("Erro ao atualizar embarque:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.patch("/:id/status", requireRole("admin", "operator", "company_user"), async (req, res) => {
  try {
    if (!isFirebaseAdminReady()) {
      return res.status(503).json({ success: false, error: "Firebase Admin não configurado" });
    }

    const { status, currentLocation, reportedEta } = req.body;
    if (!status) {
      return res.status(400).json({ success: false, error: "Status é obrigatório" });
    }

    const db = getFirestore();
    const docRef = db.collection("shipments").doc(req.params.id);
    const existing = await docRef.get();

    if (!existing.exists) {
      return res.status(404).json({ success: false, error: "Embarque não encontrado" });
    }

    const existingData = existing.data();

    if (
      !isStaff(req.user.role) &&
      req.user.companyId &&
      existingData.companyId !== req.user.companyId
    ) {
      return res.status(403).json({ success: false, error: "Acesso negado" });
    }

    const updates = {
      status,
      updatedAt: new Date(),
    };
    if (currentLocation !== undefined) updates.currentLocation = currentLocation;
    if (reportedEta !== undefined) updates.reportedEta = reportedEta;

    await docRef.update(updates);

    await db.collection("statusHistory").add({
      shipmentId: req.params.id,
      eventType: "status_change",
      fromStatus: existingData.status,
      toStatus: status,
      changedBy: req.user.uid,
      changedByName: req.user.email,
      companyId: existingData.companyId || null,
      changedAt: new Date(),
    });

    const updatedShipment = { id: req.params.id, ...existingData, ...updates };
    let notifications = { email: false, push: false };
    if (existingData.status !== status) {
      try {
        notifications = await sendClientStatusUpdateNotification(
          updatedShipment,
          existingData.status
        );
      } catch (notifyError) {
        console.error("Erro ao notificar mudança de status:", notifyError.message);
      }
    }

    res.json({
      success: true,
      shipment: updatedShipment,
      notifications,
    });
  } catch (error) {
    console.error("Erro ao atualizar status:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete("/:id", requireRole("admin"), async (req, res) => {
  try {
    if (!isFirebaseAdminReady()) {
      return res.status(503).json({ success: false, error: "Firebase Admin não configurado" });
    }

    const db = getFirestore();
    const docRef = db.collection("shipments").doc(req.params.id);
    const existing = await docRef.get();

    if (!existing.exists) {
      return res.status(404).json({ success: false, error: "Embarque não encontrado" });
    }

    const deletedRelated = await deleteRelatedRecords(db, req.params.id);
    await docRef.delete();

    res.json({
      success: true,
      id: req.params.id,
      deletedRelated,
    });
  } catch (error) {
    console.error("Erro ao excluir embarque:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
