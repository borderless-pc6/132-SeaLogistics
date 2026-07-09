"use client";

import { Building2, LogOut, Settings, Shield, UserRound } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import ChatAssistant from "../../components/chat-assistant/chat-assistant";
import { ConfirmDialog } from "../../components/confirm-dialog/confirm-dialog";
import Navbar from "../../components/navbar/navbar";
import { useAuth } from "../../context/auth-context";
import { useLanguage } from "../../context/language-context";
import { UserRole } from "../../types/user";
import "./profile-page.css";

function getRoleLabel(
  role: UserRole,
  translations: {
    administrator: string;
    companyUser: string;
    operator: string;
  }
): string {
  switch (role) {
    case UserRole.ADMIN:
      return translations.administrator;
    case UserRole.OPERATOR:
      return translations.operator;
    case UserRole.COMPANY_USER:
      return translations.companyUser;
    default:
      return role;
  }
}

function getRoleBadgeClass(role: UserRole): string {
  switch (role) {
    case UserRole.ADMIN:
      return "profile-role-badge--admin";
    case UserRole.OPERATOR:
      return "profile-role-badge--operator";
    default:
      return "profile-role-badge--company";
  }
}

export function ProfilePage() {
  const { currentUser, currentCompany, logout } = useAuth();
  const { translations } = useLanguage();
  const navigate = useNavigate();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const displayName = currentUser?.displayName || translations.user || "Usuário";
  const initial = displayName.charAt(0).toUpperCase();
  const role = currentUser?.role;
  const roleLabel = role
    ? getRoleLabel(role, {
        administrator: translations.administrator,
        companyUser: translations.companyUser,
        operator: translations.operator,
      })
    : "—";

  const handleLogoutConfirm = () => {
    setShowLogoutConfirm(false);
    logout();
    navigate("/");
  };

  return (
    <main className="profile-page">
      <Navbar />
      <div className="profile-content">
        <div className="profile-card">
          <div className="profile-card__hero">
            <div className="profile-avatar" aria-hidden="true">
              {initial}
            </div>
            <h1>{displayName}</h1>
            <p>{currentUser?.email || "—"}</p>
            {role && (
              <span
                className={`profile-role-badge ${getRoleBadgeClass(role)}`}
              >
                <Shield size={14} />
                {roleLabel}
              </span>
            )}
          </div>

          <dl className="profile-details">
            <div className="profile-detail-row">
              <dt>{translations.userType}</dt>
              <dd>{roleLabel}</dd>
            </div>

            {(currentUser?.companyName || currentCompany?.name) && (
              <div className="profile-detail-row">
                <dt>{translations.company}</dt>
                <dd>
                  <Building2
                    size={14}
                    style={{ verticalAlign: "middle", marginRight: 4 }}
                  />
                  {currentUser?.companyName || currentCompany?.name}
                </dd>
              </div>
            )}

            {currentUser?.position && (
              <div className="profile-detail-row">
                <dt>{translations.position}</dt>
                <dd>{currentUser.position}</dd>
              </div>
            )}

            {currentUser?.phone && (
              <div className="profile-detail-row">
                <dt>{translations.phone}</dt>
                <dd>{currentUser.phone}</dd>
              </div>
            )}
          </dl>

          <div className="profile-actions">
            <button
              type="button"
              className="profile-action-btn profile-action-btn--secondary"
              onClick={() => navigate("/settings")}
            >
              <Settings size={18} />
              {translations.configuracoes}
            </button>
            <button
              type="button"
              className="profile-action-btn profile-action-btn--danger"
              onClick={() => setShowLogoutConfirm(true)}
            >
              <LogOut size={18} />
              {translations.sair}
            </button>
          </div>
        </div>

        <p
          style={{
            textAlign: "center",
            marginTop: "1.5rem",
            color: "var(--text-secondary)",
            fontSize: "var(--text-sm)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
          }}
        >
          <UserRound size={14} />
          {translations.profile}
        </p>
      </div>

      <ConfirmDialog
        open={showLogoutConfirm}
        title={translations.confirmLogoutTitle}
        message={translations.confirmLogoutMessage}
        confirmLabel={translations.confirmLogoutButton}
        cancelLabel={translations.cancel}
        onConfirm={handleLogoutConfirm}
        onCancel={() => setShowLogoutConfirm(false)}
        variant="danger"
      />

      <ChatAssistant />
    </main>
  );
}
