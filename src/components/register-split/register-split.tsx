"use client";

import type React from "react";

import {
  collection,
  doc,
  getDocs,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useFormValidation } from "../../hooks/useFormValidation";
import { useLanguage } from "../../context/language-context";
import { useToast } from "../../context/toast-context";
import { db } from "../../lib/firebaseConfig";
import { createRegisterSchema } from "../../schemas/registerSchema";
import { type userCredentials, UserRole } from "../../types/user";
import { PasswordStrengthIndicator } from "../password-strength-indicator";
import LanguageSwitcher from "../language-switcher/language-switcher";
import logo2 from "./../../assets/logo2.png";
import "./register-split.css";

export default function RegisterSplit() {
  const [userCredentials, setUserCredentials] = useState<userCredentials>({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    companyName: "",
    companyCode: "",
    role: UserRole.COMPANY_USER,
  });
  const [isCreatingAdmin, setIsCreatingAdmin] = useState(false);

  const { translations } = useLanguage();
  const { showError, showSuccess } = useToast();
  const navigate = useNavigate();
  
  const registerSchema = useMemo(
    () => createRegisterSchema(translations),
    [translations]
  );

  const { errors, validateForm, validateField, clearAllErrors } = useFormValidation(registerSchema);

  const findOrCreateCompany = async (
    companyName: string,
    companyCode: string
  ) => {
    try {
      // Verificar se a empresa já existe pelo código
      const companiesQuery = query(
        collection(db, "companies"),
        where("code", "==", companyCode)
      );

      const querySnapshot = await getDocs(companiesQuery);

      if (!querySnapshot.empty) {
        // Empresa já existe
        const companyDoc = querySnapshot.docs[0];
        return companyDoc.id;
      } else {
        // Criar nova empresa
        const companyId = `company_${Date.now()}`;
        await setDoc(doc(db, "companies", companyId), {
          id: companyId,
          name: companyName,
          code: companyCode,
          contactEmail: userCredentials.email,
          isActive: true,
          createdAt: new Date(),
        });
        return companyId;
      }
    } catch (error) {
      console.error("Error finding/creating company:", error);
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const {
      name,
      email,
      password,
      confirmPassword,
      companyName,
      companyCode,
      role,
    } = userCredentials;

    // Validar formulário completo
    if (!validateForm(userCredentials)) {
      showError('Por favor, corrija os erros no formulário');
      return;
    }

    try {
      // Gerar ID único simples para demonstração
      const userId = `user_${Date.now()}`;
      let companyId: string | undefined;

      // Se for usuário de empresa, criar/encontrar empresa
      if (role === UserRole.COMPANY_USER && companyName && companyCode) {
        companyId = await findOrCreateCompany(companyName, companyCode);
      }

      // Preparar dados do usuário baseado no role
      const baseUserData = {
        uid: userId,
        displayName: name ?? "",
        email,
        role,
        isActive: true,
        createdAt: new Date(),
      };

      // Adicionar campos específicos para usuários de empresa
      const userData =
        role === UserRole.COMPANY_USER
          ? {
            ...baseUserData,
            companyId,
            companyName,
          }
          : baseUserData;

      // Salvar dados do usuário no Firestore
      await setDoc(doc(db, "users", userId), userData);

      // Salvar dados do usuário logado no localStorage
      localStorage.setItem(
        "currentUser",
        JSON.stringify({
          email,
          name: name ?? "Usuário",
          id: userId,
          role,
        })
      );

      console.log("Usuário cadastrado com sucesso");
      showSuccess('Conta criada com sucesso!');
      clearAllErrors();
      navigate("/home");
    } catch (err) {
      console.error("Erro ao cadastrar:", err);
      showError("Erro ao cadastrar. Verifique os dados e tente novamente.");
    }
  };

  // Handler para validar campo quando perde o foco
  const handleBlur = (field: keyof userCredentials) => {
    validateField(field, userCredentials[field]);
  };

  return (
    <div className="split-card">
      <div className="split-branding">
        <div className="split-branding-content">
          <h1 className="split-welcome-title">{translations.welcomeTo}</h1>
          <div className="split-logo">
            <img
              src={logo2 || "/placeholder.svg"}
              alt="Sea Logistics Logo"
              className="split-logo-image"
            />
          </div>
          <p className="split-description">{translations.registerText}</p>
        </div>
      </div>

      <div className="split-form-container">
        <h2 className="split-title">{translations.createAccount}</h2>

        {/* Seletor de tipo de usuário */}
        <div className="split-form-group">
          <label>Tipo de Usuário</label>
          <div className="user-type-selector">
            <label className="radio-option">
              <input
                type="radio"
                name="userType"
                checked={!isCreatingAdmin}
                onChange={() => {
                  setIsCreatingAdmin(false);
                  setUserCredentials({
                    ...userCredentials,
                    role: UserRole.COMPANY_USER,
                  });
                }}
              />
              Usuário de Empresa
            </label>
            <label className="radio-option">
              <input
                type="radio"
                name="userType"
                checked={isCreatingAdmin}
                onChange={() => {
                  setIsCreatingAdmin(true);
                  setUserCredentials({
                    ...userCredentials,
                    role: UserRole.ADMIN,
                  });
                }}
              />
              Administrador
            </label>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="split-form" noValidate>
          <div className="split-form-group">
            <label htmlFor="name">{translations.name}</label>
            <input
              id="name"
              value={userCredentials.name}
              onChange={(e) =>
                setUserCredentials({ ...userCredentials, name: e.target.value })
              }
              onBlur={() => handleBlur('name')}
              placeholder={translations.namePlaceholder}
              className={errors.name ? 'input-error' : ''}
              required
            />
            {errors.name && <p className="error-text">{errors.name}</p>}
          </div>

          <div className="split-form-group">
            <label htmlFor="email">{translations.email}</label>
            <input
              id="email"
              type="email"
              value={userCredentials.email}
              onChange={(e) =>
                setUserCredentials({
                  ...userCredentials,
                  email: e.target.value,
                })
              }
              onBlur={() => handleBlur('email')}
              placeholder={translations.emailPlaceholder}
              className={errors.email ? 'input-error' : ''}
              required
            />
            {errors.email && (
              <p className="error-text">{errors.email}</p>
            )}
          </div>

          {/* Campos de empresa (apenas para usuários de empresa) */}
          {!isCreatingAdmin && (
            <>
              <div className="split-form-group">
                <label htmlFor="companyName">Nome da Empresa</label>
                <input
                  id="companyName"
                  value={userCredentials.companyName}
                  onChange={(e) =>
                    setUserCredentials({
                      ...userCredentials,
                      companyName: e.target.value,
                    })
                  }
                  onBlur={() => handleBlur('companyName')}
                  placeholder="Digite o nome da sua empresa"
                  className={errors.companyName ? 'input-error' : ''}
                  required={!isCreatingAdmin}
                />
                {errors.companyName && (
                  <p className="error-text">{errors.companyName}</p>
                )}
              </div>

              <div className="split-form-group">
                <label htmlFor="companyCode">Código da Empresa</label>
                <input
                  id="companyCode"
                  value={userCredentials.companyCode}
                  onChange={(e) =>
                    setUserCredentials({
                      ...userCredentials,
                      companyCode: e.target.value.toUpperCase(),
                    })
                  }
                  onBlur={() => handleBlur('companyCode')}
                  placeholder="Ex: LOG001"
                  className={errors.companyCode ? 'input-error' : ''}
                  required={!isCreatingAdmin}
                />
                <small>Código único para identificar sua empresa</small>
                {errors.companyCode && (
                  <p className="error-text">{errors.companyCode}</p>
                )}
              </div>
            </>
          )}

          <div className="split-password-grid">
            <div className="split-form-group">
              <label htmlFor="password">{translations.password}</label>
              <input
                id="password"
                type="password"
                value={userCredentials.password}
                onChange={(e) =>
                  setUserCredentials({
                    ...userCredentials,
                    password: e.target.value,
                  })
                }
                onBlur={() => handleBlur('password')}
                placeholder={translations.passwordPlaceholder}
                className={errors.password ? 'input-error' : ''}
                required
              />
              <PasswordStrengthIndicator 
                password={userCredentials.password}
                showTips={!!userCredentials.password && !!errors.password}
              />
              {errors.password && (
                <p className="error-text">{errors.password}</p>
              )}
            </div>

            <div className="split-form-group">
              <label htmlFor="confirm-password">
                {translations.confirmPassword}
              </label>
              <input
                id="confirm-password"
                type="password"
                value={userCredentials.confirmPassword}
                onChange={(e) =>
                  setUserCredentials({
                    ...userCredentials,
                    confirmPassword: e.target.value,
                  })
                }
                onBlur={() => handleBlur('confirmPassword')}
                placeholder={translations.confirmPasswordPlaceholder}
                className={errors.confirmPassword ? 'input-error' : ''}
                required
              />
              {errors.confirmPassword && (
                <p className="error-text">{errors.confirmPassword}</p>
              )}
            </div>
          </div>

          <button type="submit" className="split-button">
            {translations.registerButton}
          </button>
        </form>

        <div className="split-login-link">
          {translations.alreadyHaveAccount}{" "}
          <a onClick={() => navigate("/")} className="split-link">
            {translations.loginLink}
          </a>
        </div>
        <LanguageSwitcher />
      </div>
    </div>
  );
}
