"use client";

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/auth-context";
import { useToast } from "../../context/toast-context";
import {
  clearStoredEmailForSignIn,
  completeEmailSignInLink,
  getStoredEmailForSignIn,
  isEmailSignInLink,
} from "../../services/firebaseOtpAuthService";
import { UserRole } from "../../types/user";
import "./email-link-callback.css";

export default function EmailLinkCallback() {
  const navigate = useNavigate();
  const { loginWithFirebaseCredential } = useAuth();
  const { showError, showSuccess } = useToast();
  const [status, setStatus] = useState("Validando link de acesso...");

  useEffect(() => {
    const run = async () => {
      try {
        if (!isEmailSignInLink()) {
          setStatus("Link inválido ou expirado.");
          showError("Link de login inválido ou expirado.");
          navigate("/", { replace: true });
          return;
        }

        const email =
          getStoredEmailForSignIn() ||
          window.prompt("Confirme o e-mail usado para solicitar o link:") ||
          "";

        if (!email) {
          throw new Error("E-mail não informado.");
        }

        setStatus("Concluindo login...");
        const credential = await completeEmailSignInLink(email);
        const user = await loginWithFirebaseCredential(credential);

        clearStoredEmailForSignIn();
        showSuccess("Login realizado com sucesso!");

        if (user.mustChangePassword) {
          navigate("/change-password", { replace: true });
        } else if (user.role === UserRole.ADMIN) {
          navigate("/admin-dashboard", { replace: true });
        } else {
          navigate("/home", { replace: true });
        }
      } catch (error) {
        console.error("Erro no login por link de e-mail:", error);
        showError(
          error instanceof Error
            ? error.message
            : "Não foi possível concluir o login por e-mail."
        );
        navigate("/", { replace: true });
      }
    };

    void run();
  }, [loginWithFirebaseCredential, navigate, showError, showSuccess]);

  return (
    <main className="email-link-callback">
      <div className="email-link-callback__card">
        <div className="email-link-callback__spinner" />
        <p>{status}</p>
      </div>
    </main>
  );
}
