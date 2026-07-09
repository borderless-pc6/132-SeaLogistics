  "use client";

import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { Bell, Save, User } from "lucide-react";
import { useContext, useEffect, useState } from "react";
import ChatAssistant from "../../components/chat-assistant/chat-assistant";
import Navbar from "../../components/navbar/navbar";
import { NavbarContext } from "../../components/navbar/navbar-context";
import { useAuth } from "../../context/auth-context";
import { LanguageProvider, useLanguage } from "../../context/language-context";
import { useToast } from "../../context/toast-context";
import { db } from "../../lib/firebaseConfig";
import { registerFcmToken, unregisterFcmToken } from "../../services/pushNotificationService";
import type { UserSettings } from "../../types/user";
import "./Settings.css";

const SettingsContent = () => {
  const { isCollapsed } = useContext(NavbarContext);
  const { currentUser: authUser } = useAuth();
  const { showToast } = useToast();
  const { translations } = useLanguage();

  // Obter dados do usuário logado
  const getCurrentUser = () => {
    if (authUser) {
      return {
        id: authUser.uid,
        email: authUser.email,
        name: authUser.displayName || translations.user,
        role: authUser.role,
      };
    }
    
    const userData = localStorage.getItem("currentUser");
    return userData
      ? JSON.parse(userData)
      : {
          id: "demo-user-123",
          email: "demo@sealogistics.com",
          name: translations.demoUser,
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
        const notifications = userData.notifications || {};
        const prefs = userData.notificationPreferences || {};
        setUserSettings({
          name: userData.name || currentUser.name || "",
          email: userData.email || currentUser.email || "",
          phone: userData.phone || "",
          whatsappPhone: userData.whatsappPhone || userData.phone || "",
          company: userData.company || "",
          position: userData.position || "",
          notifications: {
            email: notifications.email ?? prefs.email ?? true,
            push:
              notifications.push ??
              prefs.push ??
              prefs.whatsapp ??
              true,
            statusUpdates:
              notifications.statusUpdates ?? prefs.statusUpdates ?? true,
            newShipments:
              notifications.newShipments ?? prefs.newShipments ?? true,
          },
          preferences: userData.preferences || userSettings.preferences,
        });
      } else {
        // Se não existe documento do usuário, criar um inicial
        const initialUserData = {
          name: currentUser.name || translations.demoUser,
          email: currentUser.email || "demo@sealogistics.com",
          phone: "",
          company: "",
          position: "",
          notifications: userSettings.notifications,
          preferences: userSettings.preferences,
          createdAt: new Date(),
        };

        await setDoc(doc(db, "users", currentUserId), initialUserData, {
          merge: true,
        });
        setUserSettings((prev) => ({
          ...prev,
          ...initialUserData,
        }));
      }
    } catch (error) {
      console.error(translations.errorLoadingSettings, error);
        // Se o documento não existe, vamos criá-lo
        try {
          const initialUserData = {
            name: currentUser.name || translations.demoUser,
            email: currentUser.email || "demo@sealogistics.com",
          phone: "",
          company: "",
          position: "",
          notifications: userSettings.notifications,
          preferences: userSettings.preferences,
          createdAt: new Date(),
        };

        await setDoc(doc(db, "users", currentUserId), initialUserData, {
          merge: true,
        });
        setUserSettings((prev) => ({
          ...prev,
          ...initialUserData,
        }));
      } catch (createError) {
        console.error(translations.errorCreatingUserDoc, createError);
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
      if (userSettings.notifications.push) {
        await registerFcmToken(currentUserId);
      } else {
        await unregisterFcmToken(currentUserId);
      }

      await updateDoc(doc(db, "users", currentUserId), {
        name: userSettings.name,
        email: userSettings.email,
        phone: userSettings.phone,
        whatsappPhone: userSettings.whatsappPhone || userSettings.phone,
        company: userSettings.company,
        position: userSettings.position,
        notifications: userSettings.notifications,
        preferences: userSettings.preferences,
        notificationPreferences: {
          email: userSettings.notifications.email,
          push: userSettings.notifications.push,
          statusUpdates: userSettings.notifications.statusUpdates,
          newShipments: userSettings.notifications.newShipments,
        },
        updatedAt: new Date(),
      });

      showToast(translations.settingsSavedSuccess, "success");
    } catch (error) {
      console.error(translations.errorSavingSettings, error);
      showToast(translations.errorSavingSettings, "error");
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
            <div className="loading-message">{translations.loadingSettings}</div>
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
              <h1>{translations.accountSettings}</h1>
              <p>{translations.managePersonalInfo}</p>
            </div>

            <div className="settings-sections">
              {/* Informações Pessoais */}
              <div className="settings-section">
                <div className="section-header">
                  <User size={20} />
                  <h2>{translations.personalInformation}</h2>
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="name">{translations.fullName}</label>
                    <input
                      type="text"
                      id="name"
                      value={userSettings.name}
                      onChange={(e) =>
                        handleInputChange("name", e.target.value)
                      }
                      placeholder={translations.fullNamePlaceholder}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="email">{translations.emailLabel}</label>
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
                    <label htmlFor="phone">{translations.phone}</label>
                    <input
                      type="tel"
                      id="phone"
                      value={userSettings.phone}
                      onChange={(e) =>
                        handlePhoneChange("phone", e.target.value)
                      }
                      placeholder={translations.phonePlaceholder}
                      maxLength={15}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="whatsappPhone">
                      {translations.whatsapp}{" "}
                      <span className="field-hint">
                        {translations.whatsappForNotifications}
                      </span>
                    </label>
                    <input
                      type="tel"
                      id="whatsappPhone"
                      value={userSettings.whatsappPhone || ""}
                      onChange={(e) =>
                        handlePhoneChange("whatsappPhone", e.target.value)
                      }
                      placeholder={translations.phonePlaceholder}
                      maxLength={15}
                    />
                    <small className="field-help">{translations.whatsappFormat}</small>
                  </div>

                  <div className="form-group">
                    <label htmlFor="company">{translations.company}</label>
                    <input
                      type="text"
                      id="company"
                      value={userSettings.company}
                      onChange={(e) =>
                        handleInputChange("company", e.target.value)
                      }
                      placeholder={translations.companyPlaceholder}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="position">{translations.position}</label>
                    <input
                      type="text"
                      id="position"
                      value={userSettings.position}
                      onChange={(e) =>
                        handleInputChange("position", e.target.value)
                      }
                      placeholder={translations.positionPlaceholder}
                    />
                  </div>
                </div>
              </div>

              {/* Notificações */}
              <div className="settings-section">
                <div className="section-header">
                  <Bell size={20} />
                  <h2>{translations.notifications}</h2>
                </div>

                <div className="notification-settings">
                  <div className="notification-item">
                    <div className="notification-info">
                      <h3>{translations.emailNotifications}</h3>
                      <p>{translations.receiveImportantUpdates}</p>
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
                      <h3>{translations.pushNotifications}</h3>
                      <p>{translations.receiveRealTimeBrowser}</p>
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

                  <div className="notification-item">
                    <div className="notification-info">
                      <h3>{translations.statusUpdates}</h3>
                      <p>{translations.notifiedWhenStatusChanges}</p>
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
                      <h3>{translations.newShipments}</h3>
                      <p>{translations.receiveNewShipmentNotifications}</p>
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
            </div>

            {/* Botão Salvar */}
            <div className="settings-actions">
              <button
                className="btn-save"
                onClick={handleSaveSettings}
                disabled={isSaving}
              >
                <Save size={16} />
                {isSaving ? translations.saving : translations.saveSettings}
              </button>
            </div>
          </div>
        </div>
        <ChatAssistant />
      </main>
    </LanguageProvider>
  );
};

export const Settings = () => {
  return (
    <LanguageProvider>
      <SettingsContent />
    </LanguageProvider>
  );
};
