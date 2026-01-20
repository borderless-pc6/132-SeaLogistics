"use client";
import type React from "react";
import { useMemo, useState } from "react";

import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/auth-context";
import { useToast } from "../../context/toast-context";
import { createLoginSchema } from "../../schemas/loginSchema";
import type { userForm } from "../../types/user";
import { mapAuthError, logAuthError } from "../../utils/authErrorHandler";
import logo from "./../../assets/logo.png";
import { useLanguage } from "./../../context/language-context";
import "./login-form.css";

export default function LoginForm() {
  const [user, setUser] = useState<userForm>({
    email: "",
    password: "",
  });
  const [formErrors, setFormErrors] = useState<{
    email?: string;
    password?: string;
  }>({});
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginStep, setLoginStep] = useState<string>("");
  const { translations } = useLanguage();
  const { login } = useAuth();
  const { showError, showSuccess } = useToast();
  const navigate = useNavigate();

  const loginSchema = useMemo(() => {
    return createLoginSchema(translations);
  }, [translations]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isLoggingIn) return; // Previne duplo clique

    const result = loginSchema.safeParse(user);

    if (!result.success) {
      const errors = result.error.format();
      setFormErrors({
        email: errors.email?._errors[0],
        password: errors.password?._errors[0],
      });
      return;
    }

    setFormErrors({});
    setIsLoggingIn(true);
    setLoginStep("Verificando credenciais...");

    try {
      setLoginStep("Autenticando...");
      await login(user.email, user.password);
      
      setLoginStep("Carregando dados do usuário...");
      
      showSuccess("Login realizado com sucesso!");
      console.log("Usuario logado com sucesso");
      
      // Pequeno delay para mostrar mensagem de sucesso
      setTimeout(() => {
        navigate("/home");
      }, 500);
    } catch (err: unknown) {
      console.error("Erro ao logar:", err);
      logAuthError(err, "login");
      
      const authError = mapAuthError(err);
      showError(authError.userMessage);
      
      setFormErrors({
        email: authError.type === 'credentials' ? authError.userMessage : undefined,
        password: authError.type === 'credentials' ? authError.userMessage : undefined,
      });
    } finally {
      setIsLoggingIn(false);
      setLoginStep("");
    }
  };

  return (
    <div className="login-form-container">
      <h1 className="welcome-title">{translations.welcomeTo}</h1>
      <div className="logo-container">
        <img src={logo} alt="Sea Logistics Logo" className="logo-image" />
      </div>

      <form onSubmit={handleSubmit} className="login-form" noValidate>
        <div className="form-group">
          <label htmlFor="email">{translations.email}</label>
          <input
            id="email"
            value={user.email}
            onChange={(e) => setUser({ ...user, email: e.target.value })}
            placeholder={translations.emailPlaceholder}
            required
            disabled={isLoggingIn}
          />
          {formErrors.email && <p className="error-text">{formErrors.email}</p>}
        </div>

        <div className="form-group">
          <label htmlFor="password">{translations.password}</label>
          <input
            type="password"
            id="password"
            value={user.password}
            onChange={(e) => setUser({ ...user, password: e.target.value })}
            placeholder={translations.passwordPlaceholder}
            required
            disabled={isLoggingIn}
          />
          {formErrors.password && (
            <p className="error-text">{formErrors.password}</p>
          )}
        </div>

        <button type="submit" className="login-button" disabled={isLoggingIn}>
          {isLoggingIn ? (
            <div className="login-button-content">
              <div className="login-spinner"></div>
              <span>{loginStep || "Entrando..."}</span>
            </div>
          ) : (
            translations.loginButton
          )}
        </button>
        
        {isLoggingIn && loginStep && (
          <div className="login-progress">
            <p className="login-progress-text">{loginStep}</p>
          </div>
        )}
      </form>
      <div className="register-link">
        {translations.dontHaveAccount}
        <a
          className="register-link-button"
          onClick={() => !isLoggingIn && navigate("/register")}
        >
          {" "}
          {translations.registerLink}
        </a>
      </div>
    </div>
  );
}
