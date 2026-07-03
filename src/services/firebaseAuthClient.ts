import { deleteApp, initializeApp } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  getAuth,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { auth, firebaseConfig } from "../lib/firebaseConfig";
import { normalizeEmail } from "../utils/normalizeEmail";
import { provisionFirebaseUser } from "./authApi";

/** Cria usuário no Firebase Auth sem deslogar a sessão atual (app secundário). */
export async function createAuthUserViaSecondaryApp(
  email: string,
  password: string
): Promise<string> {
  const normalizedEmail = normalizeEmail(email);
  const appName = `SeaLogisticsSecondary_${Date.now()}`;
  const secondaryApp = initializeApp(firebaseConfig, appName);
  const secondaryAuth = getAuth(secondaryApp);

  try {
    const credential = await createUserWithEmailAndPassword(
      secondaryAuth,
      normalizedEmail,
      password
    );
    const uid = credential.user.uid;
    await signOut(secondaryAuth);
    return uid;
  } finally {
    await deleteApp(secondaryApp);
  }
}

export async function ensureFirebaseSignIn(params: {
  uid: string;
  email: string;
  password: string;
  displayName: string;
}): Promise<boolean> {
  const normalizedEmail = normalizeEmail(params.email);

  try {
    await signInWithEmailAndPassword(auth, normalizedEmail, params.password);
    return true;
  } catch {
    // Credencial inválida ou usuário inexistente — tenta provisionar via backend.
  }

  try {
    await provisionFirebaseUser({
      uid: params.uid,
      email: normalizedEmail,
      password: params.password,
      displayName: params.displayName,
    });
    await signInWithEmailAndPassword(auth, normalizedEmail, params.password);
    return true;
  } catch (error) {
    console.warn("[Auth] Não foi possível estabelecer sessão Firebase:", error);
    return false;
  }
}
