const admin = require("firebase-admin");

let initialized = false;

function initFirebaseAdmin() {
  if (initialized) return admin;

  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      initialized = true;
      console.log("Firebase Admin inicializado via FIREBASE_SERVICE_ACCOUNT");
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      admin.initializeApp();
      initialized = true;
      console.log("Firebase Admin inicializado via GOOGLE_APPLICATION_CREDENTIALS");
    } else {
      console.warn(
        "Firebase Admin não configurado. Auth com custom token e API de embarques desabilitados."
      );
    }
  } catch (error) {
    console.error("Erro ao inicializar Firebase Admin:", error.message);
  }

  return admin;
}

function isFirebaseAdminReady() {
  initFirebaseAdmin();
  return initialized;
}

function getFirestore() {
  if (!isFirebaseAdminReady()) return null;
  return admin.firestore();
}

function getAuth() {
  if (!isFirebaseAdminReady()) return null;
  return admin.auth();
}

function getMessaging() {
  if (!isFirebaseAdminReady()) return null;
  return admin.messaging();
}

module.exports = {
  admin,
  initFirebaseAdmin,
  isFirebaseAdminReady,
  getFirestore,
  getAuth,
  getMessaging,
};
