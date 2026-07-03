"use client";

import { Eye, EyeOff, Mail, Plus, UserPlus, UserRound, Users } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import Navbar from "../navbar/navbar";
import { useAuth } from "../../context/auth-context";
import { useToast } from "../../context/toast-context";
import {
  type CompanyEmployee,
  createCompanyEmployee,
  listCompanyEmployees,
} from "../../services/companyEmployeeService";
import "./company-employees.css";

interface NewEmployeeForm {
  name: string;
  email: string;
  password: string;
  position: string;
}

const emptyForm: NewEmployeeForm = {
  name: "",
  email: "",
  password: "",
  position: "",
};

export function CompanyEmployees() {
  const { currentUser, currentCompany, canManageEmployees } = useAuth();
  const { showError, showSuccess } = useToast();
  const [employees, setEmployees] = useState<CompanyEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState<NewEmployeeForm>(emptyForm);

  const companyId = currentUser?.companyId;
  const companyName =
    currentCompany?.name || currentUser?.companyName || "Empresa";

  const loadEmployees = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const data = await listCompanyEmployees(companyId);
      setEmployees(
        data.sort((a, b) =>
          (a.displayName || "").localeCompare(b.displayName || "", "pt-BR")
        )
      );
    } catch (error) {
      console.error(error);
      showError("Não foi possível carregar a equipe.");
    } finally {
      setLoading(false);
    }
  }, [companyId, showError]);

  useEffect(() => {
    if (canManageEmployees()) {
      loadEmployees();
    }
  }, [canManageEmployees, loadEmployees]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!companyId) {
      showError("Empresa não vinculada à sua conta.");
      return;
    }

    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
      showError("Preencha nome, e-mail e senha inicial.");
      return;
    }

    if (form.password.length < 6) {
      showError("A senha inicial deve ter pelo menos 6 caracteres.");
      return;
    }

    setIsCreating(true);
    try {
      await createCompanyEmployee({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        position: form.position.trim() || undefined,
        companyId,
        companyName,
      });
      showSuccess("Funcionário criado. Ele deve trocar a senha no primeiro login.");
      setForm(emptyForm);
      setShowPassword(false);
      setShowForm(false);
      await loadEmployees();
    } catch (error) {
      showError(
        error instanceof Error ? error.message : "Erro ao criar funcionário."
      );
    } finally {
      setIsCreating(false);
    }
  };

  if (!canManageEmployees()) {
    return (
      <div className="company-employees-empty">
        <p>Você não tem permissão para gerenciar funcionários.</p>
      </div>
    );
  }

  return (
    <div className="company-employees">
      <div className="company-employees-header">
        <div>
          <h2>
            <Users size={22} /> Equipe — {companyName}
          </h2>
          <p>Cadastre funcionários com login e senha vinculados à sua empresa.</p>
        </div>
        <button
          type="button"
          className={`company-employees-add-btn btn btn-primary${showForm ? " is-cancel" : ""}`}
          onClick={() => {
            setShowForm((v) => {
              if (v) {
                setShowPassword(false);
                setForm(emptyForm);
              }
              return !v;
            });
          }}
        >
          <span className="company-employees-add-btn__icon">
            <Plus size={18} strokeWidth={2.5} />
          </span>
          <span className="company-employees-add-btn__label">
            {showForm ? "Cancelar" : "Novo funcionário"}
          </span>
        </button>
      </div>

      {showForm && (
        <form className="company-employees-form card" onSubmit={handleCreate}>
          <h3>Dados do funcionário</h3>
          <p className="form-hint">
            No primeiro acesso, o funcionário será solicitado a definir uma nova senha.
          </p>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="emp-name">
                <UserRound size={14} /> Nome completo *
              </label>
              <input
                id="emp-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Nome do funcionário"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="emp-email">
                <Mail size={14} /> E-mail (login) *
              </label>
              <input
                id="emp-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="funcionario@empresa.com"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="emp-position">Cargo</label>
              <input
                id="emp-position"
                value={form.position}
                onChange={(e) => setForm({ ...form, position: e.target.value })}
                placeholder="Ex: Analista logístico"
              />
            </div>
            <div className="form-group">
              <label htmlFor="emp-password">Senha inicial *</label>
              <div className="password-input">
                <input
                  id="emp-password"
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Senha temporária"
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          </div>
          <div className="form-actions">
            <button
              type="submit"
              className="company-employees-submit-btn btn btn-primary"
              disabled={isCreating}
            >
              <span className="company-employees-submit-btn__icon">
                <UserPlus size={18} strokeWidth={2.5} />
              </span>
              <span>{isCreating ? "Criando..." : "Criar funcionário"}</span>
            </button>
          </div>
        </form>
      )}

      <div className="company-employees-list card">
        {loading ? (
          <p className="loading-text">Carregando equipe...</p>
        ) : employees.length === 0 ? (
          <p className="empty-text">Nenhum funcionário cadastrado ainda.</p>
        ) : (
          <table className="employees-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>E-mail</th>
                <th>Cargo</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => (
                <tr key={emp.uid}>
                  <td>{emp.displayName}</td>
                  <td>{emp.email}</td>
                  <td>{emp.position || "—"}</td>
                  <td>
                    {!emp.isActive ? (
                      <span className="badge badge--error">Inativo</span>
                    ) : emp.mustChangePassword ? (
                      <span className="badge badge--warning">Aguardando 1º login</span>
                    ) : (
                      <span className="badge badge--success">Ativo</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export function EquipePage() {
  const { canManageEmployees } = useAuth();

  if (!canManageEmployees()) {
    return <Navigate to="/home" replace />;
  }

  return (
    <main className="equipe-page page-layout">
      <Navbar />
      <div className="equipe-content page-content">
        <div className="page-header">
          <span className="page-header__eyebrow">
            <Users size={14} /> Gestão
          </span>
          <h1>Equipe</h1>
          <p>Gerencie os funcionários da sua empresa e seus acessos ao sistema.</p>
        </div>
        <CompanyEmployees />
      </div>
    </main>
  );
}
