import {
  type ConfirmationResult,
  isSignInWithEmailLink,
  RecaptchaVerifier,
  sendSignInLinkToEmail,
  signInWithEmailLink,
  signInWithPhoneNumber,
  type UserCredential,
} from "firebase/auth";
import { auth } from "../lib/firebaseConfig";
import { normalizeEmail } from "../utils/normalizeEmail";

const EMAIL_FOR_SIGN_IN_KEY = "sealogistics_email_for_sign_in";

let recaptchaVerifier: RecaptchaVerifier | null = null;

function getEmailLinkRedirectUrl(): string {
  const configured = import.meta.env.VITE_FIREBASE_EMAIL_LINK_URL;
  if (configured) return configured.replace(/\/+$/, "");
  return `${window.location.origin}/auth/email-link`;
}

/** Formata telefone BR para E.164 (+55...). */
export function formatPhoneToE164(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "";

  if (digits.startsWith("55") && digits.length >= 12) {
    return `+${digits}`;
  }

  if (digits.length === 10 || digits.length === 11) {
    return `+55${digits}`;
  }

  if (phone.startsWith("+")) {
    return `+${digits}`;
  }

  return `+${digits}`;
}

export function isFirebaseOtpEnabled(): boolean {
  return import.meta.env.VITE_FIREBASE_OTP_ENABLED !== "false";
}

export function initRecaptcha(containerId: string): RecaptchaVerifier {
  if (recaptchaVerifier) {
    try {
      recaptchaVerifier.clear();
    } catch {
      // ignore
    }
    recaptchaVerifier = null;
  }

  recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
    size: "invisible",
    callback: () => {},
    "expired-callback": () => {
      console.warn("[Firebase OTP] reCAPTCHA expirado");
    },
  });

  return recaptchaVerifier;
}

export function clearRecaptcha(): void {
  if (!recaptchaVerifier) return;
  try {
    recaptchaVerifier.clear();
  } catch {
    // ignore
  }
  recaptchaVerifier = null;
}

/** Envia SMS com código de 6 dígitos (Firebase Phone Auth). */
export async function sendPhoneVerificationCode(
  phone: string,
  containerId: string
): Promise<ConfirmationResult> {
  const e164 = formatPhoneToE164(phone);
  if (!e164 || e164.length < 12) {
    throw new Error("Informe um telefone válido com DDD.");
  }

  const verifier = initRecaptcha(containerId);
  return signInWithPhoneNumber(auth, e164, verifier);
}

/** Confirma o código SMS recebido. */
export async function confirmPhoneVerificationCode(
  confirmation: ConfirmationResult,
  code: string
): Promise<UserCredential> {
  const sanitized = code.replace(/\D/g, "");
  if (sanitized.length < 6) {
    throw new Error("Informe o código de 6 dígitos.");
  }
  return confirmation.confirm(sanitized);
}

/**
 * Envia link mágico por e-mail (Firebase Email Link).
 * O usuário abre o link no e-mail para concluir o login — não é código de 6 dígitos.
 * Para OTP por e-mail nativo, é necessário Firebase Identity Platform no console.
 */
export async function sendEmailSignInLink(email: string): Promise<void> {
  const normalized = normalizeEmail(email);
  if (!normalized.includes("@")) {
    throw new Error("Informe um e-mail válido.");
  }

  await sendSignInLinkToEmail(auth, normalized, {
    url: getEmailLinkRedirectUrl(),
    handleCodeInApp: true,
  });

  window.localStorage.setItem(EMAIL_FOR_SIGN_IN_KEY, normalized);
}

export function isEmailSignInLink(url: string = window.location.href): boolean {
  return isSignInWithEmailLink(auth, url);
}

export async function completeEmailSignInLink(
  email: string,
  url: string = window.location.href
): Promise<UserCredential> {
  const normalized = normalizeEmail(email);
  return signInWithEmailLink(auth, normalized, url);
}

export function getStoredEmailForSignIn(): string | null {
  return window.localStorage.getItem(EMAIL_FOR_SIGN_IN_KEY);
}

export function clearStoredEmailForSignIn(): void {
  window.localStorage.removeItem(EMAIL_FOR_SIGN_IN_KEY);
}
