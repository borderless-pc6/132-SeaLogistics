const express = require("express");
const {
  getFirestore,
  getAuth,
  isFirebaseAdminReady,
} = require("../services/firebaseAdmin");
const { signToken, authMiddleware } = require("../middleware/auth");
const { hashPassword, verifyPassword } = require("../utils/passwordUtils");

const router = express.Router();

router.post("/login", async (req, res) => {
  try {
    const email = (req.body.email || "").trim().toLowerCase();
    const { password } = req.body;

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

router.post("/refresh-firebase", authMiddleware, async (req, res) => {
  try {
    if (!isFirebaseAdminReady()) {
      return res.status(503).json({
        success: false,
        error:
          "Firebase Admin não configurado (FIREBASE_SERVICE_ACCOUNT ausente)",
      });
    }

    const { uid, role, companyId } = req.user;
    const auth = getAuth();
    const firebaseCustomToken = await auth.createCustomToken(uid, {
      role,
      companyId: companyId || null,
    });

    res.json({ success: true, firebaseCustomToken });
  } catch (error) {
    console.error("Erro ao renovar custom token:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/register-admin", async (req, res) => {
  try {
    const { name, email, password, adminCode } = req.body;

    if (!name?.trim() || !email?.trim() || !password || !adminCode) {
      return res.status(400).json({
        success: false,
        error: "Nome, email, senha e código de administrador são obrigatórios",
      });
    }

    const expectedCode = process.env.ADMIN_CODE;
    if (!expectedCode) {
      return res.status(503).json({
        success: false,
        error: "Cadastro de administrador não configurado (ADMIN_CODE ausente)",
      });
    }

    if (adminCode !== expectedCode) {
      return res.status(403).json({
        success: false,
        error: "Código de administrador inválido",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: "A senha deve ter pelo menos 6 caracteres",
      });
    }

    if (!isFirebaseAdminReady()) {
      return res.status(503).json({
        success: false,
        error:
          "Servidor de autenticação não configurado (Firebase Admin ausente)",
      });
    }

    const db = getFirestore();
    const existingSnapshot = await db
      .collection("users")
      .where("email", "==", email.trim())
      .limit(1)
      .get();

    if (!existingSnapshot.empty) {
      return res.status(409).json({
        success: false,
        error: "Este email já está cadastrado",
      });
    }

    const uid = `user_${Date.now()}`;
    const passwordHash = hashPassword(password);

    await db.collection("users").doc(uid).set({
      uid,
      displayName: name.trim(),
      email: email.trim(),
      passwordHash,
      role: "admin",
      isActive: true,
      createdAt: new Date(),
    });

    res.status(201).json({
      success: true,
      user: {
        uid,
        email: email.trim(),
        displayName: name.trim(),
        role: "admin",
        isActive: true,
      },
    });
  } catch (error) {
    console.error("Erro no cadastro de administrador:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/provision-user", async (req, res) => {
  try {
    const uid = req.body.uid;
    const email = (req.body.email || "").trim().toLowerCase();
    const password = req.body.password;
    const displayName = (req.body.displayName || "").trim();

    if (!uid || !email || !password) {
      return res.status(400).json({
        success: false,
        error: "uid, email e password são obrigatórios",
      });
    }

    if (!isFirebaseAdminReady()) {
      return res.status(503).json({
        success: false,
        error: "Firebase Admin não configurado",
      });
    }

    const auth = getAuth();

    try {
      await auth.getUser(uid);
      await auth.updateUser(uid, {
        email,
        password,
        displayName: displayName || undefined,
        disabled: false,
      });
    } catch (error) {
      if (error.code === "auth/user-not-found") {
        await auth.createUser({
          uid,
          email,
          password,
          displayName: displayName || undefined,
          disabled: false,
        });
      } else {
        throw error;
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Erro ao provisionar usuário Firebase:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
