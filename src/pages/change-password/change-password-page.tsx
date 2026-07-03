"use client";

import { z } from "zod";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock } from "lucide-react";
import { useAuth } from "../../context/auth-context";
import { useToast } from "../../context/toast-context";
import { passwordSchema } from "../../schemas/passwordSchema";
import { PasswordStrengthIndicator } from "../../components/password-strength-indicator";
import "./change-password-page.css";

const changePasswordSchema = z
  .object({
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });

export const ChangePasswordPage = () => {
  const { currentUser, completePasswordChange, logout } = useAuth();
  const { showError, showSuccess } = useToast();
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<{ newPassword?: string; confirmPassword?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const result = changePasswordSchema.safeParse({ newPassword, confirmPassword });
    if (!result.success) {
      const formatted = result.error.format();
      setErrors({
        newPassword: formatted.newPassword?._errors[0],
        confirmPassword: formatted.confirmPassword?._errors[0],
      });
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      const { firebaseSessionReady } = await completePasswordChange(newPassword);
      if (firebaseSessionReady) {
        showSuccess("Senha atualizada com sucesso!");
      } else {
        showSuccess(
          "Senha salva. Para acessar envios, execute o servidor (npm run server) e faça login novamente."
        );
      }
      navigate("/home", { replace: true });
    } catch (error) {
      showError(
        error instanceof Error ? error.message : "Não foi possível atualizar a senha."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="change-password-page">
      <div className="change-password-card">
        <div className="change-password-icon">
          <Lock size={28} />
        </div>
        <h1>Defina sua nova senha</h1>
        <p>
          Olá, <strong>{currentUser?.displayName}</strong>. Por segurança, crie uma senha
          pessoal antes de continuar.
        </p>

        <form onSubmit={handleSubmit} className="change-password-form" noValidate>
          <div className="form-group">
            <label htmlFor="newPassword">Nova senha</label>
            <input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Digite a nova senha"
              disabled={isSubmitting}
              autoComplete="new-password"
            />
            {errors.newPassword && <p className="error-text">{errors.newPassword}</p>}
            <PasswordStrengthIndicator password={newPassword} />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirmar nova senha</label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repita a nova senha"
              disabled={isSubmitting}
              autoComplete="new-password"
            />
            {errors.confirmPassword && (
              <p className="error-text">{errors.confirmPassword}</p>
            )}
          </div>

          <button type="submit" className="btn-primary btn-lg" disabled={isSubmitting}>
            {isSubmitting ? "Salvando..." : "Salvar e continuar"}
          </button>
        </form>

        <button type="button" className="change-password-logout" onClick={logout}>
          Sair da conta
        </button>
      </div>
    </main>
  );
};
