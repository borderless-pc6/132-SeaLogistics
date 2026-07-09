const express = require("express");
const {
  getFirestore,
  getAuth,
  isFirebaseAdminReady,
} = require("../services/firebaseAdmin");
const { signToken, authMiddleware } = require("../middleware/auth");
const { hashPassword, verifyPassword } = require("../utils/passwordUtils");

const router = express.Router();

function normalizePhoneDigits(value) {
  if (!value || typeof value !== "string") return "";
  return value.replace(/\D/g, "");
}

function phoneMatches(storedValue, firebasePhone) {
  const stored = normalizePhoneDigits(storedValue);
  const incoming = normalizePhoneDigits(firebasePhone);
  if (!stored || !incoming) return false;
  if (stored === incoming) return true;
  // BR: comparar últimos 10–11 dígitos (DDD + número)
  const storedTail = stored.slice(-11);
  const incomingTail = incoming.slice(-11);
  return storedTail === incomingTail;
}

async function findUserForOtpLogin(db, { email, phoneNumber }) {
  if (email) {
    const normalizedEmail = email.trim().toLowerCase();
    const byEmail = await db
      .collection("users")
      .where("email", "==", normalizedEmail)
      .limit(1)
      .get();
    if (!byEmail.empty) {
      return { doc: byEmail.docs[0], data: byEmail.docs[0].data() };
    }
  }

  if (phoneNumber) {
    const usersSnapshot = await db.collection("users").get();
    for (const userDoc of usersSnapshot.docs) {
      const data = userDoc.data();
      if (
        phoneMatches(data.phone, phoneNumber) ||
        phoneMatches(data.whatsappPhone, phoneNumber)
      ) {
        return { doc: userDoc, data };
      }
    }
  }

  return null;
}

async function buildOtpLoginResponse(db, auth, userDoc, userData) {
  const uid = userDoc.id;

  if (!userData.isActive) {
    const error = new Error("Usuário inativo. Contacte o administrador.");
    error.statusCode = 401;
    throw error;
  }

  await db.collection("users").doc(uid).set(
    {
      lastLogin: new Date(),
      firebaseAuthUid: userData.firebaseAuthUid || null,
    },
    { merge: true }
  );

  let firebaseCustomToken = null;
  try {
    firebaseCustomToken = await auth.createCustomToken(uid, {
      role: userData.role,
      companyId: userData.companyId || null,
    });
  } catch (tokenError) {
    console.error("Erro ao gerar custom token OTP:", tokenError.message);
  }

  const jwtToken = signToken({
    uid,
    email: userData.email,
    role: userData.role,
    companyId: userData.companyId || null,
  });

  return {
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
      mustChangePassword: userData.mustChangePassword ?? false,
    },
  };
}

router.post("/otp-login", async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({
        success: false,
        error: "Token Firebase (idToken) é obrigatório",
      });
    }

    if (!isFirebaseAdminReady()) {
      return res.status(503).json({
        success: false,
        error: "Firebase Admin não configurado",
      });
    }

    const auth = getAuth();
    const db = getFirestore();
    const decoded = await auth.verifyIdToken(idToken);

    const matched = await findUserForOtpLogin(db, {
      email: decoded.email || null,
      phoneNumber: decoded.phone_number || null,
    });

    if (!matched) {
      return res.status(404).json({
        success: false,
        error:
          "Usuário não encontrado. Cadastre seu telefone ou e-mail nas configurações ou peça ao administrador.",
      });
    }

    await db.collection("users").doc(matched.doc.id).set(
      {
        firebaseAuthUid: decoded.uid,
        updatedAt: new Date(),
      },
      { merge: true }
    );

    const payload = await buildOtpLoginResponse(
      db,
      auth,
      matched.doc,
      matched.data
    );

    res.json(payload);
  } catch (error) {
    const status = error.statusCode || 500;
    console.error("Erro no login OTP:", error);
    res.status(status).json({
      success: false,
      error: error.message || "Erro ao autenticar com código",
    });
  }
});

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
        mustChangePassword: userData.mustChangePassword ?? false,
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
