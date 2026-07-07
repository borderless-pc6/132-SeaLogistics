"use client";

import {
  deleteDoc,
  doc,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { UserPlus, Bell } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { useAuth } from "../../context/auth-context";
import { useLanguage } from "../../context/language-context";
import { useReferenceData } from "../../context/reference-data-context";
import type { Shipment } from "../../context/shipments-context";
import { useShipments } from "../../context/shipments-context";
import { db } from "../../lib/firebaseConfig";
import { type Company, type User, UserRole, type NotificationPreferences } from "../../types/user";
import { hashPassword } from "../../utils/passwordUtils";
import { mergeClientNotificationPreferences } from "../../services/clientContactService";
import { TemplateEditor } from "../template-editor/template-editor";
import { PasswordInput } from "../password-input/password-input";
import "./admin-panel.css";

interface AdminPanelProps {
  onClose: () => void;
  initialTab?: "users" | "companies" | "shipments" | "templates";
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onClose, initialTab }) => {
  const { isAdmin } = useAuth();
  const { translations } = useLanguage();
  const {
    users: referenceUsers,
    companies: referenceCompanies,
    loading: referenceLoading,
    refresh: refreshReferenceData,
  } = useReferenceData();
  const { shipments: contextShipments } = useShipments();
  const [users, setUsers] = useState<User[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "users" | "companies" | "shipments" | "templates"
  >(initialTab || "users");



  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [newUserData, setNewUserData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    companyName: "",
    companyCode: "",
    role: UserRole.COMPANY_USER,
  });
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [createUserErrors, setCreateUserErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    companyName?: string;
    companyCode?: string;
  }>({});
  const [editingCompanyNotifications, setEditingCompanyNotifications] =
    useState<Company | null>(null);
  const [companyNotificationPrefs, setCompanyNotificationPrefs] =
    useState<NotificationPreferences>({
      email: true,
      push: true,
      statusUpdates: true,
      newShipments: true,
    });
  const [savingNotifications, setSavingNotifications] = useState(false);

  useEffect(() => {
    if (!isAdmin()) return;

    if (initialTab) {
      setActiveTab(initialTab);
    }

    setUsers(referenceUsers);
    setCompanies(referenceCompanies);
    setShipments(contextShipments);
    setLoading(referenceLoading);
  }, [
    isAdmin,
    initialTab,
    referenceUsers,
    referenceCompanies,
    contextShipments,
    referenceLoading,
  ]);



  const loadData = async () => {
    await refreshReferenceData();
  };

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, "users", userId), {
        isActive: !currentStatus,
        updatedAt: new Date(),
      });

      setUsers(
        users.map((user) =>
          user.uid === userId ? { ...user, isActive: !currentStatus } : user
        )
      );
    } catch (error) {
      console.error("Error updating user status:", error);
      alert(translations.errorUpdatingUserStatus);
    }
  };

  const assignUserToCompany = async (userId: string, companyId: string) => {
    if (!companyId) return;
    const company = companies.find((c) => c.id === companyId);
    if (!company) return;
    try {
      await updateDoc(doc(db, "users", userId), {
        companyId,
        companyName: company.name,
        updatedAt: new Date(),
      });
      setUsers(
        users.map((user) =>
          user.uid === userId
            ? { ...user, companyId, companyName: company.name }
            : user
        )
      );
    } catch (error) {
      console.error("Error assigning user to company:", error);
      alert("Erro ao vincular usuário à empresa.");
    }
  };

  const toggleCompanyStatus = async (
    companyId: string,
    currentStatus: boolean
  ) => {
    try {
      await updateDoc(doc(db, "companies", companyId), {
        isActive: !currentStatus,
        updatedAt: new Date(),
      });

      setCompanies(
        companies.map((company) =>
          company.id === companyId
            ? { ...company, isActive: !currentStatus }
            : company
        )
      );
    } catch (error) {
      console.error("Error updating company status:", error);
      alert(translations.errorUpdatingCompanyStatus);
    }
  };

  const assignShipmentToCompany = async (
    shipmentId: string,
    companyId: string
  ) => {
    try {
      await updateDoc(doc(db, "shipments", shipmentId), {
        companyId: companyId === "unassigned" ? null : companyId,
        updatedAt: new Date(),
      });

      setShipments(
        shipments.map((shipment) =>
          shipment.id === shipmentId
            ? {
              ...shipment,
              companyId: companyId === "unassigned" ? undefined : companyId,
            }
            : shipment
        )
      );
    } catch (error) {
      console.error("Error assigning shipment:", error);
      alert(translations.errorAssigningShipment);
    }
  };

  const deleteUser = async (userId: string) => {
    if (!confirm(translations.confirmDeleteUser)) return;

    try {
      await deleteDoc(doc(db, "users", userId));
      setUsers(users.filter((user) => user.uid !== userId));
    } catch (error) {
      console.error("Error deleting user:", error);
      alert(translations.errorDeletingUser);
    }
  };

  const getCompanyName = (companyId?: string) => {
    if (!companyId) return translations.notAssigned;
    const company = companies.find((c) => c.id === companyId);
    return company ? company.name : translations.companyLabel + " não encontrada";
  };

  const openCompanyNotifications = (company: Company) => {
    setEditingCompanyNotifications(company);
    setCompanyNotificationPrefs(
      mergeClientNotificationPreferences(company.notificationPreferences, true)
    );
  };

  const saveCompanyNotifications = async () => {
    if (!editingCompanyNotifications) return;
    setSavingNotifications(true);
    try {
      await updateDoc(doc(db, "companies", editingCompanyNotifications.id), {
        notificationPreferences: companyNotificationPrefs,
        updatedAt: new Date(),
      });
      setCompanies(
        companies.map((c) =>
          c.id === editingCompanyNotifications.id
            ? { ...c, notificationPreferences: companyNotificationPrefs }
            : c
        )
      );
      setEditingCompanyNotifications(null);
    } catch (error) {
      console.error("Erro ao salvar notificações da empresa:", error);
      alert("Erro ao salvar preferências de notificação.");
    } finally {
      setSavingNotifications(false);
    }
  };

  const handleCreateUser = async () => {
    // Validações básicas
    const errors: any = {};

    if (!newUserData.name.trim()) {
      errors.name = translations.nameRequired;
    }

    if (!newUserData.email.trim()) {
      errors.email = translations.emailRequired;
    } else if (!/\S+@\S+\.\S+/.test(newUserData.email)) {
      errors.email = translations.invalidEmail;
    }

    if (!newUserData.password) {
      errors.password = translations.passwordRequired;
    } else if (newUserData.password.length < 6) {
      errors.password = translations.passwordMinLength;
    }

    if (newUserData.password !== newUserData.confirmPassword) {
      errors.confirmPassword = translations.passwordsDontMatch;
    }

    // Validações específicas para usuários de empresa
    if (newUserData.role === UserRole.COMPANY_USER) {
      if (!newUserData.companyName.trim()) {
        errors.companyName = translations.companyNameRequired;
      }
      if (!newUserData.companyCode.trim()) {
        errors.companyCode = translations.companyCodeRequired;
      }
    }

    if (Object.keys(errors).length > 0) {
      setCreateUserErrors(errors);
      return;
    }

    setCreateUserErrors({});
    setIsCreatingUser(true);

    try {
      // Verificar se email já existe
      const existingUser = users.find((u) => u.email === newUserData.email);
      if (existingUser) {
        alert(translations.emailAlreadyInUse);
        return;
      }

      // Gerar ID único
      const userId = `user_${Date.now()}`;
      let companyId: string | undefined;

      // Se for usuário de empresa, criar/encontrar empresa
      if (
        newUserData.role === UserRole.COMPANY_USER &&
        newUserData.companyName &&
        newUserData.companyCode
      ) {
        // Verificar se a empresa já existe pelo código
        const existingCompany = companies.find(
          (c) => c.code === newUserData.companyCode.toUpperCase()
        );

        if (existingCompany) {
          companyId = existingCompany.id;
        } else {
          // Criar nova empresa
          companyId = `company_${Date.now()}`;
          await setDoc(doc(db, "companies", companyId), {
            id: companyId,
            name: newUserData.companyName,
            code: newUserData.companyCode.toUpperCase(),
            contactEmail: newUserData.email,
            isActive: true,
            createdAt: new Date(),
          });

          // Atualizar lista de empresas
          const newCompany: Company = {
            id: companyId,
            name: newUserData.companyName,
            code: newUserData.companyCode.toUpperCase(),
            contactEmail: newUserData.email,
            isActive: true,
            createdAt: new Date(),
          };
          setCompanies([...companies, newCompany]);
        }
      }

      // Gerar hash da senha
      const passwordHash = await hashPassword(newUserData.password);

      // Preparar dados do usuário
      const baseUserData = {
        uid: userId,
        displayName: newUserData.name,
        email: newUserData.email,
        passwordHash, // Armazenar hash da senha
        role: newUserData.role,
        isActive: true,
        createdAt: new Date(),
      };

      // Adicionar campos específicos para usuários de empresa
      const userData =
        newUserData.role === UserRole.COMPANY_USER
          ? {
            ...baseUserData,
            companyId,
            companyName: newUserData.companyName,
          }
          : baseUserData;

      // Salvar usuário no Firestore
      await setDoc(doc(db, "users", userId), userData);

      // Atualizar lista de usuários
      const newUser: User = userData as User;
      setUsers([...users, newUser]);

      // Limpar formulário e fechar modal
      setNewUserData({
        name: "",
        email: "",
        password: "",
        confirmPassword: "",
        companyName: "",
        companyCode: "",
        role: UserRole.COMPANY_USER,
      });
      setShowCreateUserModal(false);

      alert(translations.userCreatedSuccess);
    } catch (error) {
      console.error("Erro ao criar usuário:", error);
      alert(translations.errorCreatingUser);
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleCancelCreateUser = () => {
    setNewUserData({
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      companyName: "",
      companyCode: "",
      role: UserRole.COMPANY_USER,
    });
    setCreateUserErrors({});
    setShowCreateUserModal(false);
  };

  if (!isAdmin()) {
    return (
      <div className="admin-panel">
        <div className="admin-panel-content">
          <h2>{translations.accessDenied}</h2>
          <p>{translations.noPermissionAdminPanel}</p>
          <button onClick={onClose}>{translations.close}</button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="admin-panel">
        <div className="admin-panel-content">
          <h2>{translations.loading}</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-panel">
      <div className="admin-panel-content">
        <div className="admin-panel-header">
          <h2>{translations.adminPanel}</h2>
          <button onClick={onClose} className="close-button">
            ×
          </button>
        </div>

        <div className="admin-tabs">
          <button
            className={`tab-button ${activeTab === "users" ? "active" : ""}`}
            onClick={() => setActiveTab("users")}
            data-tab="users"
          >
            {translations.users} ({users.length})
          </button>
          <button
            className={`tab-button ${activeTab === "companies" ? "active" : ""
              }`}
            onClick={() => setActiveTab("companies")}
            data-tab="companies"
          >
            {translations.companies} ({companies.length})
          </button>
          <button
            className={`tab-button ${activeTab === "shipments" ? "active" : ""
              }`}
            onClick={() => setActiveTab("shipments")}
            data-tab="shipments"
          >
            {translations.shipments} ({shipments.length})
          </button>
          <button
            className={`tab-button ${activeTab === "templates" ? "active" : ""}`}
            onClick={() => setActiveTab("templates")}
            data-tab="templates"
          >
            Templates
          </button>
        </div>

        {activeTab === "users" && (
          <div className="admin-section">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1rem",
              }}
            >
              <h3 style={{ margin: 0 }}>{translations.manageUsers}</h3>
              <button
                onClick={() => setShowCreateUserModal(true)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  backgroundColor: "#16786a",
                  marginRight: 0,
                  marginBottom: 0,
                  color: "white",
                }}
              >
                <UserPlus size={16} />
                {translations.createUser}
              </button>
            </div>
            <div className="admin-table">
              <table>
                <thead>
                  <tr>
                    <th>{translations.name}</th>
                    <th>{translations.email}</th>
                    <th>{translations.role}</th>
                    <th>{translations.company}</th>
                    <th>{translations.status}</th>
                    <th>{translations.actions}</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.uid}>
                      <td>{user.displayName}</td>
                      <td>{user.email}</td>
                      <td>
                        <span className={`role-badge ${user.role}`}>
                          {user.role === UserRole.ADMIN
                            ? translations.admin
                            : user.role === UserRole.OPERATOR
                            ? "Operador"
                            : translations.companyLabel}
                        </span>
                      </td>
                      <td>
                        {user.role === UserRole.ADMIN ||
                        user.role === UserRole.OPERATOR ? (
                          "-"
                        ) : (
                          <select
                            value={user.companyId || ""}
                            onChange={(e) =>
                              assignUserToCompany(user.uid, e.target.value)
                            }
                            title="Vincular este usuário a uma empresa para que os envios apareçam no perfil dele"
                          >
                            <option value="">Selecione a empresa</option>
                            {companies.map((company) => (
                              <option key={company.id} value={company.id}>
                                {company.name}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td>
                        <span
                          className={`status-badge ${user.isActive ? "active" : "inactive"
                            }`}
                        >
                          {user.isActive ? translations.active : translations.inactive}
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button
                            onClick={() =>
                              toggleUserStatus(user.uid, user.isActive)
                            }
                          >
                            {user.isActive ? translations.deactivate : translations.activate}
                          </button>
                          <button
                            onClick={() => deleteUser(user.uid)}
                            className="delete"
                          >
                            {translations.delete}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "companies" && (
          <div className="admin-section">
            <h3>{translations.manageCompanies}</h3>
            <div className="admin-table">
              <table>
                <thead>
                  <tr>
                    <th>{translations.name}</th>
                    <th>{translations.code}</th>
                    <th>{translations.contactEmail}</th>
                    <th>{translations.status}</th>
                    <th>{translations.actions}</th>
                  </tr>
                </thead>
                <tbody>
                  {companies.map((company) => (
                    <tr key={company.id}>
                      <td>{company.name}</td>
                      <td>{company.code}</td>
                      <td>{company.contactEmail}</td>
                      <td>
                        <span
                          className={`status-badge ${company.isActive ? "active" : "inactive"
                            }`}
                        >
                          {company.isActive ? translations.active : translations.inactive}
                        </span>
                      </td>
                      <td>
                        <button
                          onClick={() =>
                            toggleCompanyStatus(company.id, company.isActive)
                          }
                        >
                          {company.isActive ? translations.deactivate : translations.activate}
                        </button>
                        <button
                          type="button"
                          onClick={() => openCompanyNotifications(company)}
                          style={{ marginLeft: "0.5rem" }}
                          title="Configurar notificações"
                        >
                          <Bell size={14} style={{ verticalAlign: "middle" }} /> Notif.
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "shipments" && (
          <div className="admin-section">
            <h3>{translations.manageShipments}</h3>
            <div className="admin-note">
              <p>
                <strong>{translations.info}:</strong> {translations.adminNote}
              </p>
            </div>
            <div className="admin-table">
              <table>
                <thead>
                  <tr>
                    <th>{translations.bl}</th>
                    <th>{translations.client}</th>
                    <th>{translations.polToPod}</th>
                    <th>{translations.status}</th>
                    <th>{translations.currentCompany}</th>
                    <th>{translations.assignToCompany}</th>
                  </tr>
                </thead>
                <tbody>
                  {shipments.map((shipment) => (
                    <tr key={shipment.id}>
                      <td>{shipment.numeroBl}</td>
                      <td>{shipment.cliente}</td>
                      <td>
                        {shipment.pol} → {shipment.pod}
                      </td>
                      <td>{shipment.status}</td>
                      <td>{getCompanyName(shipment.companyId)}</td>
                      <td>
                        <select
                          value={shipment.companyId || "unassigned"}
                          onChange={(e) =>
                            assignShipmentToCompany(
                              shipment.id!,
                              e.target.value
                            )
                          }
                          className="company-selector"
                        >
                          <option value="unassigned">{translations.notAssigned}</option>
                          {companies
                            .filter((c) => c.isActive)
                            .map((company) => (
                              <option key={company.id} value={company.id}>
                                {company.name} ({company.code})
                              </option>
                            ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "templates" && (
          <div className="admin-section">
            <h3>Templates de Notificação</h3>
            <TemplateEditor />
          </div>
        )}

        {editingCompanyNotifications && (
          <div className="admin-panel" style={{ zIndex: 1100 }}>
            <div className="admin-panel-content" style={{ maxWidth: "480px" }}>
              <div className="admin-panel-header">
                <h2>Notificações — {editingCompanyNotifications.name}</h2>
                <button
                  type="button"
                  onClick={() => setEditingCompanyNotifications(null)}
                  className="close-button"
                >
                  ×
                </button>
              </div>
              <div className="admin-section">
                <p style={{ marginBottom: "1rem", color: "#64748b" }}>
                  Configure quais notificações o cliente recebe para esta empresa.
                </p>
                {(
                  [
                    ["email", "E-mail"],
                    ["push", "Push (Firebase)"],
                    ["statusUpdates", "Atualizações de status"],
                    ["newShipments", "Novos embarques"],
                  ] as const
                ).map(([key, label]) => (
                  <label
                    key={key}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      marginBottom: "0.75rem",
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={companyNotificationPrefs[key]}
                      onChange={(e) =>
                        setCompanyNotificationPrefs((prev) => ({
                          ...prev,
                          [key]: e.target.checked,
                        }))
                      }
                    />
                    {label}
                  </label>
                ))}
                <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.5rem" }}>
                  <button
                    type="button"
                    onClick={saveCompanyNotifications}
                    disabled={savingNotifications}
                  >
                    {savingNotifications ? "Salvando..." : "Salvar"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingCompanyNotifications(null)}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Criação de Usuário */}
        {showCreateUserModal && (
          <div className="admin-panel" style={{ zIndex: 1100 }}>
            <div className="admin-panel-content" style={{ maxWidth: "600px" }}>
              <div className="admin-panel-header">
                <h2>{translations.createNewUser}</h2>
                <button
                  onClick={handleCancelCreateUser}
                  className="close-button"
                >
                  ×
                </button>
              </div>

              <div className="admin-section">
                {/* Seletor de tipo de usuário */}
                <div style={{ marginBottom: "1.5rem" }}>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "0.5rem",
                      fontWeight: "bold",
                    }}
                  >
                    {translations.userType}
                  </label>
                  <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        cursor: "pointer",
                        padding: "0.5rem 1rem",
                        border: "2px solid #e1e5e9",
                        borderRadius: "8px",
                        backgroundColor:
                          newUserData.role === UserRole.COMPANY_USER
                            ? "#e6f3ff"
                            : "white",
                        borderColor:
                          newUserData.role === UserRole.COMPANY_USER
                            ? "#0066cc"
                            : "#e1e5e9",
                      }}
                    >
                      <input
                        type="radio"
                        name="userType"
                        checked={newUserData.role === UserRole.COMPANY_USER}
                        onChange={() =>
                          setNewUserData({
                            ...newUserData,
                            role: UserRole.COMPANY_USER,
                          })
                        }
                        style={{ margin: 0 }}
                      />
                      {translations.companyUser}
                    </label>
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        cursor: "pointer",
                        padding: "0.5rem 1rem",
                        border: "2px solid #e1e5e9",
                        borderRadius: "8px",
                        backgroundColor:
                          newUserData.role === UserRole.ADMIN
                            ? "#e6f3ff"
                            : "white",
                        borderColor:
                          newUserData.role === UserRole.ADMIN
                            ? "#0066cc"
                            : "#e1e5e9",
                      }}
                    >
                      <input
                        type="radio"
                        name="userType"
                        checked={newUserData.role === UserRole.ADMIN}
                        onChange={() =>
                          setNewUserData({
                            ...newUserData,
                            role: UserRole.ADMIN,
                          })
                        }
                        style={{ margin: 0 }}
                      />
                      {translations.administrator}
                    </label>
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        cursor: "pointer",
                        padding: "0.5rem 1rem",
                        border: "2px solid #e1e5e9",
                        borderRadius: "8px",
                        backgroundColor:
                          newUserData.role === UserRole.OPERATOR
                            ? "#e6f3ff"
                            : "white",
                        borderColor:
                          newUserData.role === UserRole.OPERATOR
                            ? "#0066cc"
                            : "#e1e5e9",
                      }}
                    >
                      <input
                        type="radio"
                        name="userType"
                        checked={newUserData.role === UserRole.OPERATOR}
                        onChange={() =>
                          setNewUserData({
                            ...newUserData,
                            role: UserRole.OPERATOR,
                          })
                        }
                        style={{ margin: 0 }}
                      />
                      Operador
                    </label>
                  </div>
                </div>

                {/* Campos do formulário */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "1rem",
                    marginBottom: "1rem",
                  }}
                >
                  <div>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "0.5rem",
                        fontWeight: "bold",
                      }}
                    >
                      {translations.fullName} *
                    </label>
                    <input
                      type="text"
                      value={newUserData.name}
                      onChange={(e) =>
                        setNewUserData({ ...newUserData, name: e.target.value })
                      }
                      placeholder={translations.fullNamePlaceholder}
                      style={{
                        width: "100%",
                        padding: "0.75rem",
                        border: `1px solid ${createUserErrors.name ? "#e74c3c" : "#e5e7eb"
                          }`,
                        borderRadius: "6px",
                        fontSize: "0.95rem",
                      }}
                    />
                    {createUserErrors.name && (
                      <p
                        style={{
                          color: "#e74c3c",
                          fontSize: "0.8rem",
                          margin: "0.25rem 0 0 0",
                        }}
                      >
                        {createUserErrors.name}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "0.5rem",
                        fontWeight: "bold",
                      }}
                    >
                      {translations.email} *
                    </label>
                    <input
                      type="email"
                      value={newUserData.email}
                      onChange={(e) =>
                        setNewUserData({
                          ...newUserData,
                          email: e.target.value,
                        })
                      }
                      placeholder={translations.emailPlaceholder}
                      style={{
                        width: "100%",
                        padding: "0.75rem",
                        border: `1px solid ${createUserErrors.email ? "#e74c3c" : "#e5e7eb"
                          }`,
                        borderRadius: "6px",
                        fontSize: "0.95rem",
                      }}
                    />
                    {createUserErrors.email && (
                      <p
                        style={{
                          color: "#e74c3c",
                          fontSize: "0.8rem",
                          margin: "0.25rem 0 0 0",
                        }}
                      >
                        {createUserErrors.email}
                      </p>
                    )}
                  </div>
                </div>

                {/* Campos de empresa (apenas para usuários de empresa) */}
                {newUserData.role === UserRole.COMPANY_USER && (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "1rem",
                      marginBottom: "1rem",
                    }}
                  >
                    <div>
                      <label
                        style={{
                          display: "block",
                          marginBottom: "0.5rem",
                          fontWeight: "bold",
                        }}
                      >
                        {translations.companyName} *
                      </label>
                      <input
                        type="text"
                        value={newUserData.companyName}
                        onChange={(e) =>
                          setNewUserData({
                            ...newUserData,
                            companyName: e.target.value,
                          })
                        }
                        placeholder={translations.companyNamePlaceholder}
                        style={{
                          width: "100%",
                          padding: "0.75rem",
                          border: `1px solid ${createUserErrors.companyName ? "#e74c3c" : "#e5e7eb"
                            }`,
                          borderRadius: "6px",
                          fontSize: "0.95rem",
                        }}
                      />
                      {createUserErrors.companyName && (
                        <p
                          style={{
                            color: "#e74c3c",
                            fontSize: "0.8rem",
                            margin: "0.25rem 0 0 0",
                          }}
                        >
                          {createUserErrors.companyName}
                        </p>
                      )}
                    </div>

                    <div>
                      <label
                        style={{
                          display: "block",
                          marginBottom: "0.5rem",
                          fontWeight: "bold",
                        }}
                      >
                        {translations.companyCode} *
                      </label>
                      <input
                        type="text"
                        value={newUserData.companyCode}
                        onChange={(e) =>
                          setNewUserData({
                            ...newUserData,
                            companyCode: e.target.value.toUpperCase(),
                          })
                        }
                        placeholder={translations.companyCodePlaceholder}
                        style={{
                          width: "100%",
                          padding: "0.75rem",
                          border: `1px solid ${createUserErrors.companyCode ? "#e74c3c" : "#e5e7eb"
                            }`,
                          borderRadius: "6px",
                          fontSize: "0.95rem",
                        }}
                      />
                      {createUserErrors.companyCode && (
                        <p
                          style={{
                            color: "#e74c3c",
                            fontSize: "0.8rem",
                            margin: "0.25rem 0 0 0",
                          }}
                        >
                          {createUserErrors.companyCode}
                        </p>
                      )}
                      <small style={{ color: "#6c757d", fontSize: "0.8rem" }}>
                        {translations.companyCodeHint}
                      </small>
                    </div>
                  </div>
                )}

                {/* Campos de senha */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "1rem",
                    marginBottom: "1.5rem",
                  }}
                >
                  <div>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "0.5rem",
                        fontWeight: "bold",
                      }}
                    >
                      {translations.password} *
                    </label>
                    <PasswordInput
                      value={newUserData.password}
                      onChange={(e) =>
                        setNewUserData({
                          ...newUserData,
                          password: e.target.value,
                        })
                      }
                      placeholder={translations.passwordPlaceholder}
                      hasError={Boolean(createUserErrors.password)}
                      autoComplete="new-password"
                      style={{
                        width: "100%",
                        padding: "0.75rem",
                        border: `1px solid ${createUserErrors.password ? "#e74c3c" : "#e5e7eb"
                          }`,
                        borderRadius: "6px",
                        fontSize: "0.95rem",
                      }}
                    />
                    {createUserErrors.password && (
                      <p
                        style={{
                          color: "#e74c3c",
                          fontSize: "0.8rem",
                          margin: "0.25rem 0 0 0",
                        }}
                      >
                        {createUserErrors.password}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "0.5rem",
                        fontWeight: "bold",
                      }}
                    >
                      {translations.confirmPassword} *
                    </label>
                    <PasswordInput
                      value={newUserData.confirmPassword}
                      onChange={(e) =>
                        setNewUserData({
                          ...newUserData,
                          confirmPassword: e.target.value,
                        })
                      }
                      placeholder={translations.confirmPasswordPlaceholder}
                      hasError={Boolean(createUserErrors.confirmPassword)}
                      autoComplete="new-password"
                      style={{
                        width: "100%",
                        padding: "0.75rem",
                        border: `1px solid ${createUserErrors.confirmPassword
                          ? "#e74c3c"
                          : "#e5e7eb"
                          }`,
                        borderRadius: "6px",
                        fontSize: "0.95rem",
                      }}
                    />
                    {createUserErrors.confirmPassword && (
                      <p
                        style={{
                          color: "#e74c3c",
                          fontSize: "0.8rem",
                          margin: "0.25rem 0 0 0",
                        }}
                      >
                        {createUserErrors.confirmPassword}
                      </p>
                    )}
                  </div>
                </div>

                {/* Botões de ação */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: "1rem",
                  }}
                >
                  <button
                    onClick={handleCancelCreateUser}
                    style={{ backgroundColor: "#6c757d", color: "white" }}
                    disabled={isCreatingUser}
                  >
                    {translations.cancel}
                  </button>
                  <button
                    onClick={handleCreateUser}
                    style={{ backgroundColor: "#16786a", color: "white" }}
                    disabled={isCreatingUser}
                  >
                    {isCreatingUser ? translations.creating : translations.createUser}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
