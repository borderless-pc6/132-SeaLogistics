"use client";

import { doc, getDoc, updateDoc } from "firebase/firestore";
import { Bell, Globe, MessageCircle, Save, User } from "lucide-react";
import { useContext, useEffect, useState } from "react";
import ChatAssistant from "../../components/chat-assistant/chat-assistant";
import Navbar from "../../components/navbar/navbar";
import { NavbarContext } from "../../components/navbar/navbar-context";
import { useAuth } from "../../context/auth-context";
import { LanguageProvider } from "../../context/language-context";
import { useToast } from "../../context/toast-context";
import { db } from "../../lib/firebaseConfig";
import type { UserSettings } from "../../types/user";
import { UserRole } from "../../types/user";
import "./Settings.css";

export const Settings = () => {
  const { isCollapsed } = useContext(NavbarContext);
  const { currentUser: authUser, isCompanyUser } = useAuth();
  const { showToast } = useToast();

  // Obter dados do usuário logado
  const getCurrentUser = () => {
    if (authUser) {
      return {
        id: authUser.uid,
        email: authUser.email,
        name: authUser.displayName || "Usuário",
        role: authUser.role,
      };
    }
    
    const userData = localStorage.getItem("currentUser");
    return userData
      ? JSON.parse(userData)
      : {
          id: "demo-user-123",
          email: "demo@sealogistics.com",
          name: "Usuário Demo",
        };
  };

  const currentUser = getCurrentUser();
  const currentUserId = currentUser.id;

  const [userSettings, setUserSettings] = useState<UserSettings>({
    name: "",
    email: "",
    phone: "",
    whatsappPhone: "",
    company: "",
    position: "",
    notifications: {
      email: true,
      whatsapp: false,
      push: true,
      statusUpdates: true,
      newShipments: true,
    },
    preferences: {
      language: "pt",
      timezone: "America/Sao_Paulo",
      dateFormat: "DD/MM/YYYY",
      theme: "light",
    },
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadUserSettings();
  }, []);

  const loadUserSettings = async () => {
    setIsLoading(true);
    try {
      const userDoc = await getDoc(doc(db, "users", currentUserId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setUserSettings({
          name: userData.name || currentUser.name || "",
          email: userData.email || currentUser.email || "",
          phone: userData.phone || "",
          whatsappPhone: userData.whatsappPhone || userData.phone || "",
          company: userData.company || "",
          position: userData.position || "",
          notifications: userData.notifications || userSettings.notifications,
          preferences: userData.preferences || userSettings.preferences,
        });
      } else {
        // Se não existe documento do usuário, criar um inicial
        const initialUserData = {
          name: currentUser.name || "Usuário Demo",
          email: currentUser.email || "demo@sealogistics.com",
          phone: "",
          company: "",
          position: "",
          notifications: userSettings.notifications,
          preferences: userSettings.preferences,
          createdAt: new Date(),
        };

        await updateDoc(doc(db, "users", currentUserId), initialUserData);
        setUserSettings((prev) => ({
          ...prev,
          ...initialUserData,
        }));
      }
    } catch (error) {
      console.error("Erro ao carregar configurações:", error);
      // Se o documento não existe, vamos criá-lo
      try {
        const initialUserData = {
          name: currentUser.name || "Usuário Demo",
          email: currentUser.email || "demo@sealogistics.com",
          phone: "",
          company: "",
          position: "",
          notifications: userSettings.notifications,
          preferences: userSettings.preferences,
          createdAt: new Date(),
        };

        await updateDoc(doc(db, "users", currentUserId), initialUserData);
        setUserSettings((prev) => ({
          ...prev,
          ...initialUserData,
        }));
      } catch (createError) {
        console.error("Erro ao criar documento do usuário:", createError);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Função para formatar telefone brasileiro
  const formatPhone = (value: string): string => {
    // Remove tudo que não é número
    const numbers = value.replace(/\D/g, '');
    
    // Limita a 11 dígitos
    const limited = numbers.slice(0, 11);
    
    // Aplica a máscara
    if (limited.length <= 2) {
      return limited;
    } else if (limited.length <= 6) {
      return `(${limited.slice(0, 2)}) ${limited.slice(2)}`;
    } else if (limited.length <= 10) {
      return `(${limited.slice(0, 2)}) ${limited.slice(2, 6)}-${limited.slice(6)}`;
    } else {
      return `(${limited.slice(0, 2)}) ${limited.slice(2, 7)}-${limited.slice(7)}`;
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setUserSettings((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handlePhoneChange = (field: string, value: string) => {
    const formatted = formatPhone(value);
    setUserSettings((prev) => ({
      ...prev,
      [field]: formatted,
    }));
  };

  const handleNestedChange = (
    section: keyof UserSettings,
    field: string,
    value: boolean | string
  ) => {
    setUserSettings((prev) => ({
      ...prev,
      [section]: {
        ...(prev[section] as object),
        [field]: value,
      },
    }));
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      // Atualizar documento do usuário no Firestore
      await updateDoc(doc(db, "users", currentUserId), {
        name: userSettings.name,
        email: userSettings.email,
        phone: userSettings.phone,
        whatsappPhone: userSettings.whatsappPhone,
        company: userSettings.company,
        position: userSettings.position,
        notifications: userSettings.notifications,
        preferences: userSettings.preferences,
        notificationPreferences: {
          email: userSettings.notifications.email,
          whatsapp: userSettings.notifications.whatsapp,
          statusUpdates: userSettings.notifications.statusUpdates,
          newShipments: userSettings.notifications.newShipments,
        },
        updatedAt: new Date(),
      });

      showToast("Configurações salvas com sucesso!", "success");
    } catch (error) {
      console.error("Erro ao salvar configurações:", error);
      showToast("Erro ao salvar configurações. Tente novamente.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <LanguageProvider>
        <main className="settings-container">
          <Navbar />
          <div
            className={`settings-content ${
              isCollapsed ? "navbar-collapsed" : ""
            }`}
          >
            <div className="loading-message">Carregando configurações...</div>
          </div>
          <ChatAssistant />
        </main>
      </LanguageProvider>
    );
  }

  return (
    <LanguageProvider>
      <main className="settings-container">
        <Navbar />
        <div
          className={`settings-content ${
            isCollapsed ? "navbar-collapsed" : ""
          }`}
        >
          <div className="settings-wrapper">
            <div className="settings-header">
              <h1>Configurações da conta</h1>
              <p>Gerencie suas informações pessoais e preferências</p>
            </div>

            <div className="settings-sections">
              {/* Informações Pessoais */}
              <div className="settings-section">
                <div className="section-header">
                  <User size={20} />
                  <h2>Informações Pessoais</h2>
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="name">Nome Completo</label>
                    <input
                      type="text"
                      id="name"
                      value={userSettings.name}
                      onChange={(e) =>
                        handleInputChange("name", e.target.value)
                      }
                      placeholder="Digite seu nome completo"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="email">E-mail</label>
                    <input
                      type="email"
                      id="email"
                      value={userSettings.email}
                      onChange={(e) =>
                        handleInputChange("email", e.target.value)
                      }
                      placeholder="seu@email.com"
                      disabled
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="phone">Telefone</label>
                    <input
                      type="tel"
                      id="phone"
                      value={userSettings.phone}
                      onChange={(e) =>
                        handlePhoneChange("phone", e.target.value)
                      }
                      placeholder="(11) 99999-9999"
                      maxLength={15}
                    />
                  </div>

                  {/* Campo WhatsApp apenas para COMPANY_USER */}
                  {currentUser.role === UserRole.COMPANY_USER && (
                    <div className="form-group">
                      <label htmlFor="whatsappPhone">
                        WhatsApp{" "}
                        <span style={{ fontSize: "0.85rem", color: "#888" }}>
                          (para notificações)
                        </span>
                      </label>
                      <input
                        type="tel"
                        id="whatsappPhone"
                        value={userSettings.whatsappPhone}
                        onChange={(e) =>
                          handlePhoneChange("whatsappPhone", e.target.value)
                        }
                        placeholder="(11) 99999-9999"
                        maxLength={15}
                      />
                      <small style={{ color: "#666", fontSize: "0.85rem" }}>
                        Formato: (DD) 9XXXX-XXXX ou (DD) XXXXX-XXXX
                      </small>
                    </div>
                  )}

                  <div className="form-group">
                    <label htmlFor="company">Empresa</label>
                    <input
                      type="text"
                      id="company"
                      value={userSettings.company}
                      onChange={(e) =>
                        handleInputChange("company", e.target.value)
                      }
                      placeholder="Nome da empresa"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="position">Cargo</label>
                    <input
                      type="text"
                      id="position"
                      value={userSettings.position}
                      onChange={(e) =>
                        handleInputChange("position", e.target.value)
                      }
                      placeholder="Seu cargo na empresa"
                    />
                  </div>
                </div>
              </div>

              {/* Notificações */}
              <div className="settings-section">
                <div className="section-header">
                  <Bell size={20} />
                  <h2>Notificações</h2>
                </div>

                {/* Canais de Notificação - apenas para COMPANY_USER */}
                {currentUser.role === UserRole.COMPANY_USER && (
                  <>
                    <div style={{ marginBottom: "1.5rem" }}>
                      <h3
                        style={{
                          fontSize: "1rem",
                          color: "#2c3e50",
                          marginBottom: "0.75rem",
                          fontWeight: 600,
                        }}
                      >
                        Canais de Notificação
                      </h3>
                      <p
                        style={{
                          fontSize: "0.9rem",
                          color: "#7f8c8d",
                          marginBottom: "1rem",
                        }}
                      >
                        Escolha como deseja receber notificações sobre seus
                        envios
                      </p>
                    </div>

                    <div className="notification-settings">
                      <div className="notification-item">
                        <div className="notification-info">
                          <h3>📧 Notificações por E-mail</h3>
                          <p>Receba atualizações importantes por e-mail</p>
                        </div>
                        <label className="switch">
                          <input
                            type="checkbox"
                            checked={userSettings.notifications.email}
                            onChange={(e) =>
                              handleNestedChange(
                                "notifications",
                                "email",
                                e.target.checked
                              )
                            }
                          />
                          <span className="slider"></span>
                        </label>
                      </div>

                      <div className="notification-item">
                        <div className="notification-info">
                          <h3 style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <MessageCircle size={18} />
                            Notificações por WhatsApp
                          </h3>
                          <p>
                            Receba atualizações em tempo real no WhatsApp
                            {!userSettings.whatsappPhone && (
                              <span style={{ color: "#e74c3c", marginLeft: "0.5rem" }}>
                                (configure seu número acima)
                              </span>
                            )}
                          </p>
                        </div>
                        <label className="switch">
                          <input
                            type="checkbox"
                            checked={userSettings.notifications.whatsapp}
                            onChange={(e) =>
                              handleNestedChange(
                                "notifications",
                                "whatsapp",
                                e.target.checked
                              )
                            }
                            disabled={!userSettings.whatsappPhone}
                          />
                          <span className="slider"></span>
                        </label>
                      </div>
                    </div>

                    <div style={{ marginTop: "2rem", marginBottom: "1rem" }}>
                      <h3
                        style={{
                          fontSize: "1rem",
                          color: "#2c3e50",
                          marginBottom: "0.75rem",
                          fontWeight: 600,
                        }}
                      >
                        Tipos de Notificação
                      </h3>
                    </div>
                  </>
                )}

                <div className="notification-settings">
                  {/* Push apenas para admin */}
                  {currentUser.role !== UserRole.COMPANY_USER && (
                    <>
                      <div className="notification-item">
                        <div className="notification-info">
                          <h3>Notificações por E-mail</h3>
                          <p>Receba atualizações importantes por e-mail</p>
                        </div>
                        <label className="switch">
                          <input
                            type="checkbox"
                            checked={userSettings.notifications.email}
                            onChange={(e) =>
                              handleNestedChange(
                                "notifications",
                                "email",
                                e.target.checked
                              )
                            }
                          />
                          <span className="slider"></span>
                        </label>
                      </div>

                      <div className="notification-item">
                        <div className="notification-info">
                          <h3>Notificações Push</h3>
                          <p>Receba notificações em tempo real no navegador</p>
                        </div>
                        <label className="switch">
                          <input
                            type="checkbox"
                            checked={userSettings.notifications.push}
                            onChange={(e) =>
                              handleNestedChange(
                                "notifications",
                                "push",
                                e.target.checked
                              )
                            }
                          />
                          <span className="slider"></span>
                        </label>
                      </div>
                    </>
                  )}

                  <div className="notification-item">
                    <div className="notification-info">
                      <h3>Atualizações de Status</h3>
                      <p>Seja notificado quando o status dos envios mudar</p>
                    </div>
                    <label className="switch">
                      <input
                        type="checkbox"
                        checked={userSettings.notifications.statusUpdates}
                        onChange={(e) =>
                          handleNestedChange(
                            "notifications",
                            "statusUpdates",
                            e.target.checked
                          )
                        }
                      />
                      <span className="slider"></span>
                    </label>
                  </div>

                  <div className="notification-item">
                    <div className="notification-info">
                      <h3>Novos Envios</h3>
                      <p>Receba notificações sobre novos envios criados</p>
                    </div>
                    <label className="switch">
                      <input
                        type="checkbox"
                        checked={userSettings.notifications.newShipments}
                        onChange={(e) =>
                          handleNestedChange(
                            "notifications",
                            "newShipments",
                            e.target.checked
                          )
                        }
                      />
                      <span className="slider"></span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Preferências */}
              <div className="settings-section">
                <div className="section-header">
                  <Globe size={20} />
                  <h2>Preferências</h2>
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="language">Idioma</label>
                    <select
                      id="language"
                      value={userSettings.preferences.language}
                      onChange={(e) =>
                        handleNestedChange(
                          "preferences",
                          "language",
                          e.target.value
                        )
                      }
                    >
                      <option value="pt">Português</option>
                      <option value="en">English</option>
                      <option value="es">Español</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="timezone">Fuso Horário</label>
                    <select
                      id="timezone"
                      value={userSettings.preferences.timezone}
                      onChange={(e) =>
                        handleNestedChange(
                          "preferences",
                          "timezone",
                          e.target.value
                        )
                      }
                    >
                      <option value="America/Sao_Paulo">
                        São Paulo (UTC-3)
                      </option>
                      <option value="America/New_York">
                        Nova York (UTC-5)
                      </option>
                      <option value="Europe/London">Londres (UTC+0)</option>
                      <option value="Asia/Shanghai">Xangai (UTC+8)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="dateFormat">Formato de Data</label>
                    <select
                      id="dateFormat"
                      value={userSettings.preferences.dateFormat}
                      onChange={(e) =>
                        handleNestedChange(
                          "preferences",
                          "dateFormat",
                          e.target.value
                        )
                      }
                    >
                      <option value="DD/MM/YYYY">DD/MM/AAAA</option>
                      <option value="MM/DD/YYYY">MM/DD/AAAA</option>
                      <option value="YYYY-MM-DD">AAAA-MM-DD</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="theme">Tema</label>
                    <select
                      id="theme"
                      value={userSettings.preferences.theme}
                      onChange={(e) =>
                        handleNestedChange(
                          "preferences",
                          "theme",
                          e.target.value
                        )
                      }
                    >
                      <option value="light">Claro</option>
                      <option value="dark">Escuro</option>
                      <option value="auto">Automático</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Botão Salvar */}
            <div className="settings-actions">
              <button
                className="btn-save"
                onClick={handleSaveSettings}
                disabled={isSaving}
              >
                <Save size={16} />
                {isSaving ? "Salvando..." : "Salvar Configurações"}
              </button>
            </div>
          </div>
        </div>
        <ChatAssistant />
      </main>
    </LanguageProvider>
  );
};
