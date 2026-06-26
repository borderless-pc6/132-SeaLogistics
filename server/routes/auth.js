const express = require("express");
const {
  getFirestore,
  getAuth,
  isFirebaseAdminReady,
} = require("../services/firebaseAdmin");
const { signToken } = require("../middleware/auth");
const { verifyPassword } = require("../utils/passwordUtils");

const router = express.Router();

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ success: false, error: "Email e senha são obrigatórios" });
    }

    if (!isFirebaseAdminReady()) {
      return res.status(503).json({
        success: false,
        error:
          "Servidor de autenticação não configurado (Firebase Admin ausente)",
      });
    }

    const db = getFirestore();
    const usersSnapshot = await db
      .collection("users")
      .where("email", "==", email)
      .limit(1)
      .get();

    if (usersSnapshot.empty) {
      return res
        .status(401)
        .json({ success: false, error: "Usuário não encontrado" });
    }

    const userDoc = usersSnapshot.docs[0];
    const userData = userDoc.data();

    if (!userData.isActive) {
      return res
        .status(401)
        .json({ success: false, error: "Usuário inativo. Contacte o administrador." });
    }

    if (!userData.passwordHash) {
      return res.status(401).json({
        success: false,
        error: "Senha não cadastrada. Por favor, redefina sua senha.",
      });
    }

    if (!verifyPassword(password, userData.passwordHash)) {
      return res.status(401).json({ success: false, error: "Senha incorreta" });
    }

    const uid = userDoc.id;
    const auth = getAuth();

    await db
      .collection("users")
      .doc(uid)
      .set({ lastLogin: new Date() }, { merge: true });

    let firebaseCustomToken = null;
    try {
      firebaseCustomToken = await auth.createCustomToken(uid, {
        role: userData.role,
        companyId: userData.companyId || null,
      });
    } catch (tokenError) {
      console.error("Erro ao gerar custom token:", tokenError.message);
    }

    const jwtToken = signToken({
      uid,
      email: userData.email,
      role: userData.role,
      companyId: userData.companyId || null,
    });

    res.json({
      success: true,
      token: jwtToken,
      firebaseCustomToken,
      user: {
        uid,
        email: userData.email,
        displayName: userData.displayName || userData.name,
        role: userData.role,
        companyId: userData.companyId || null,
        companyName: userData.companyName || null,
        isActive: userData.isActive,
      },
    });
  } catch (error) {
    console.error("Erro no login:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
