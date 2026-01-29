"use client";

import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { UserPlus } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { useAuth } from "../../context/auth-context";
import { useLanguage } from "../../context/language-context";
import type { Shipment } from "../../context/shipments-context";
import { db } from "../../lib/firebaseConfig";
import { type Company, type User, UserRole } from "../../types/user";
import { hashPassword } from "../../utils/passwordUtils";
import "./admin-panel.css";

interface AdminPanelProps {
  onClose: () => void;
  initialTab?: "users" | "companies" | "shipments";
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onClose, initialTab }) => {
  const { isAdmin } = useAuth();
  const { translations } = useLanguage();
  const [users, setUsers] = useState<User[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "users" | "companies" | "shipments"
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

  useEffect(() => {
    if (!isAdmin()) return;

    // Definir aba inicial se fornecida
    if (initialTab) {
      setActiveTab(initialTab);
    }

    loadData();
  }, [isAdmin, initialTab]);



  const loadData = async () => {
    try {
      setLoading(true);

      // Carregar usuários
      const usersSnapshot = await getDocs(collection(db, "users"));
      const usersData = usersSnapshot.docs.map(
        (doc) =>
        ({
          ...doc.data(),
          uid: doc.id,
        } as User)
      );
      setUsers(usersData);

      // Carregar empresas
      const companiesSnapshot = await getDocs(collection(db, "companies"));
      const companiesData = companiesSnapshot.docs.map(
        (doc) =>
        ({
          ...doc.data(),
          id: doc.id,
        } as Company)
      );
      setCompanies(companiesData);

      // Carregar shipments
      const shipmentsSnapshot = await getDocs(collection(db, "shipments"));
      const shipmentsData = shipmentsSnapshot.docs.map(
        (doc) =>
        ({
          ...doc.data(),
          id: doc.id,
        } as Shipment)
      );
      setShipments(shipmentsData);
    } catch (error) {
      console.error("Error loading admin data:", error);
    } finally {
      setLoading(false);
    }
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
                  backgroundColor: "#789170",
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
                          {user.role === UserRole.ADMIN ? translations.admin : translations.companyLabel}
                        </span>
                      </td>
                      <td>{user.companyName || "-"}</td>
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
                  <div style={{ display: "flex", gap: "1rem" }}>
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
                    <input
                      type="password"
                      value={newUserData.password}
                      onChange={(e) =>
                        setNewUserData({
                          ...newUserData,
                          password: e.target.value,
                        })
                      }
                      placeholder={translations.passwordPlaceholder}
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
                    <input
                      type="password"
                      value={newUserData.confirmPassword}
                      onChange={(e) =>
                        setNewUserData({
                          ...newUserData,
                          confirmPassword: e.target.value,
                        })
                      }
                      placeholder={translations.confirmPasswordPlaceholder}
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
                    style={{ backgroundColor: "#789170", color: "white" }}
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
