"use client";

import type { ConfirmationResult } from "firebase/auth";
import { Mail, MessageSquare, Smartphone } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/auth-context";
import { useLanguage } from "../../context/language-context";
import { useToast } from "../../context/toast-context";
import {
  clearRecaptcha,
  confirmPhoneVerificationCode,
  formatPhoneToE164,
  isFirebaseOtpEnabled,
  sendEmailSignInLink,
  sendPhoneVerificationCode,
} from "../../services/firebaseOtpAuthService";
import { UserRole } from "../../types/user";
import "./otp-login.css";

type OtpMode = "phone" | "email";

export function OtpLogin() {
  const recaptchaContainerId = useId().replace(/:/g, "");
  const { translations } = useLanguage();
  const { loginWithFirebaseCredential } = useAuth();
  const { showError, showSuccess } = useToast();
  const navigate = useNavigate();

  const [mode, setMode] = useState<OtpMode>("phone");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(
    null
  );
  const [step, setStep] = useState<"input" | "code" | "email-sent">("input");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    return () => clearRecaptcha();
  }, []);

  if (!isFirebaseOtpEnabled()) {
    return null;
  }

  const redirectAfterLogin = (user: {
    mustChangePassword?: boolean;
    role?: UserRole;
  }) => {
    if (user.mustChangePassword) {
      navigate("/change-password");
    } else if (user.role === UserRole.ADMIN) {
      navigate("/admin-dashboard");
    } else {
      navigate("/home");
    }
  };

  const handleSendPhoneCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await sendPhoneVerificationCode(phone, recaptchaContainerId);
      setConfirmation(result);
      setStep("code");
      showSuccess(`Código enviado para ${formatPhoneToE164(phone)}`);
    } catch (error) {
      showError(
        error instanceof Error ? error.message : "Não foi possível enviar o SMS."
      );
      clearRecaptcha();
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPhoneCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmation) return;

    setLoading(true);
    try {
      const credential = await confirmPhoneVerificationCode(confirmation, code);
      const user = await loginWithFirebaseCredential(credential);
      showSuccess("Login realizado com sucesso!");
      redirectAfterLogin(user);
    } catch (error) {
      showError(
        error instanceof Error ? error.message : "Código inválido ou expirado."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmailLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await sendEmailSignInLink(email);
      setStep("email-sent");
      showSuccess("Link de acesso enviado! Verifique sua caixa de entrada.");
    } catch (error) {
      showError(
        error instanceof Error
          ? error.message
          : "Não foi possível enviar o link por e-mail."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="otp-login">
      <div className="otp-login__tabs">
        <button
          type="button"
          className={mode === "phone" ? "active" : ""}
          onClick={() => {
            setMode("phone");
            setStep("input");
            setCode("");
            setConfirmation(null);
          }}
        >
          <Smartphone size={16} /> SMS
        </button>
        <button
          type="button"
          className={mode === "email" ? "active" : ""}
          onClick={() => {
            setMode("email");
            setStep("input");
          }}
        >
          <Mail size={16} /> E-mail
        </button>
      </div>

      {mode === "phone" && step === "input" && (
        <form onSubmit={handleSendPhoneCode} className="otp-login__form">
          <label htmlFor="otp-phone">Telefone (com DDD)</label>
          <input
            id="otp-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="(51) 99999-9999"
            disabled={loading}
            required
          />
          <p className="otp-login__hint">
            Enviaremos um código de 6 dígitos por SMS via Firebase.
          </p>
          <button type="submit" className="otp-login__submit" disabled={loading}>
            {loading ? "Enviando..." : "Receber código"}
          </button>
        </form>
      )}

      {mode === "phone" && step === "code" && (
        <form onSubmit={handleVerifyPhoneCode} className="otp-login__form">
          <label htmlFor="otp-code">Código SMS</label>
          <input
            id="otp-code"
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder="000000"
            disabled={loading}
            required
          />
          <button type="submit" className="otp-login__submit" disabled={loading}>
            {loading ? "Verificando..." : "Entrar"}
          </button>
          <button
            type="button"
            className="otp-login__back"
            onClick={() => {
              setStep("input");
              setCode("");
              setConfirmation(null);
              clearRecaptcha();
            }}
          >
            Voltar
          </button>
        </form>
      )}

      {mode === "email" && step === "input" && (
        <form onSubmit={handleSendEmailLink} className="otp-login__form">
          <label htmlFor="otp-email">{translations.email}</label>
          <input
            id="otp-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={translations.emailPlaceholder}
            disabled={loading}
            required
          />
          <p className="otp-login__hint">
            <MessageSquare size={14} /> Enviaremos um link seguro por e-mail
            (Firebase Email Link). Abra o link no mesmo dispositivo para entrar.
          </p>
          <button type="submit" className="otp-login__submit" disabled={loading}>
            {loading ? "Enviando..." : "Receber link por e-mail"}
          </button>
        </form>
      )}

      {mode === "email" && step === "email-sent" && (
        <div className="otp-login__sent">
          <p>
            Enviamos um link para <strong>{email}</strong>. Clique no link para
            concluir o login.
          </p>
          <button
            type="button"
            className="otp-login__back"
            onClick={() => setStep("input")}
          >
            Usar outro e-mail
          </button>
        </div>
      )}

      <div id={recaptchaContainerId} className="otp-login__recaptcha" />
    </div>
  );
}
