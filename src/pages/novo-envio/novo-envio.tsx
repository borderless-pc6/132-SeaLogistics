"use client";

import type React from "react";

import { collection, getDocs, query, where } from "firebase/firestore";
import { FileText, MapPin, Package, User } from "lucide-react";
import { useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/navbar/navbar";
import { NavbarContext } from "../../components/navbar/navbar-context";
import { useAuth } from "../../context/auth-context";
import { useLanguage } from "../../context/language-context";
import { useShipments } from "../../context/shipments-context";
import { useToast } from "../../context/toast-context";
import { useFormValidation } from "../../hooks/useFormValidation";
import { db } from "../../lib/firebaseConfig";
import { getShipmentSchema } from "../../schemas/shipmentSchema";
import { UserRole } from "../../types/user";
import "./novo-envio.css";

interface Cliente {
  id: string;
  nome: string;
  empresa: string;
  email: string;
  companyId?: string;
}

interface Operador {
  id: string;
  nome: string;
  email: string;
}

interface NovoEnvio {
  clienteId: string;
  operador: string;
  pol: string;
  pod: string;
  etdOrigem: string;
  etaDestino: string;
  quantBox: number;
  status: string;
  numeroBl: string;
  armador: string;
  booking: string;
  invoice: string;
  shipper: string;
  tipo: "Aéreo" | "Marítimo" | "Terrestre" | "";
}

const NovoEnvioPage = () => {
  const navigate = useNavigate();
  const { addShipment } = useShipments();
  const { currentUser, isAdmin } = useAuth();
  const { isCollapsed } = useContext(NavbarContext);
  const { translations } = useLanguage();
  const { showError, showSuccess } = useToast();

  useEffect(() => {
    const isAdminUser = isAdmin();
    const isCompanyUser = currentUser?.role === UserRole.COMPANY_USER;

    if (!isAdminUser && !isCompanyUser) {
      alert(
        "Acesso negado. Apenas administradores e usuários de empresa podem criar novos shipments."
      );
      navigate("/home");
    }
  }, [isAdmin, currentUser?.role, navigate]);

  const [formData, setFormData] = useState<NovoEnvio>({
    clienteId: "",
    operador: "",
    pol: "",
    pod: "",
    etdOrigem: "",
    etaDestino: "",
    quantBox: 1,
    status: "agendado",
    numeroBl: "",
    armador: "",
    booking: "",
    invoice: "",
    tipo: "",
    shipper: "",
  });

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [operadores, setOperadores] = useState<Operador[]>([]);
  const [loadingClientes, setLoadingClientes] = useState(false);
  const [loadingOperadores, setLoadingOperadores] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Schema dinâmico baseado no tipo de transporte
  const shipmentSchema = useMemo(() => getShipmentSchema(formData.tipo), [formData.tipo]);

  // Hook de validação
  const { errors, validateForm, validateField, clearAllErrors } = useFormValidation(shipmentSchema);

  // Limpar campos de origem e destino quando o tipo de transporte for alterado
  useEffect(() => {
    if (formData.tipo) {
      setFormData((prev) => ({
        ...prev,
        pol: "",
        pod: "",
      }));
    }
  }, [formData.tipo]);

  useEffect(() => {
    const fetchClientes = async () => {
      setLoadingClientes(true);
      try {
        const isAdminUser = isAdmin();

        if (isAdminUser) {
          // Admins see all non-admin users (companies)
          const usersQuery = query(
            collection(db, "users"),
            where("role", "!=", "admin")
          );
          const snapshot = await getDocs(usersQuery);
          const clientesData: Cliente[] = snapshot.docs.map((doc) => {
            const data = doc.data();
            return {
              id: doc.id,
              nome: data.displayName || data.name || "Usuário",
              empresa: data.companyName || "-",
              email: data.email || "-",
              companyId: data.companyId || undefined,
            };
          });
          setClientes(clientesData);
          // Auto-select the current user's company if they're a company user
          if (clientesData.length === 1) {
            setFormData((prev) => ({ ...prev, clienteId: clientesData[0].id }));
          }
        } else {
          // Company users only see their own company (represented by their current user)
          if (currentUser) {
            const clientesData: Cliente[] = [
              {
                id: currentUser.uid,
                nome: currentUser.displayName || currentUser.email,
                empresa: currentUser.companyName || "Minha Empresa",
                email: currentUser.email,
                companyId: currentUser.companyId,
              },
            ];
            setClientes(clientesData);
            // Auto-select their own company
            setFormData((prev) => ({ ...prev, clienteId: clientesData[0].id }));
          }
        }
      } catch (error) {
        console.error("Erro ao buscar clientes:", error);
        setClientes([]);
      } finally {
        setLoadingClientes(false);
      }
    };
    fetchClientes();
  }, [isAdmin, currentUser]);

  // Buscar operadores admins do Firestore
  useEffect(() => {
    const fetchOperadores = async () => {
      setLoadingOperadores(true);
      try {
        const adminsQuery = query(
          collection(db, "users"),
          where("role", "==", "admin"),
          where("isActive", "==", true)
        );
        const snapshot = await getDocs(adminsQuery);
        const operadoresData: Operador[] = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            nome: data.displayName || data.name || "Admin",
            email: data.email || "",
          };
        });
        setOperadores(operadoresData);
      } catch (error) {
        console.error("Erro ao buscar operadores:", error);
        setOperadores([]);
      } finally {
        setLoadingOperadores(false);
      }
    };
    fetchOperadores();
  }, []);

  const armadores = [
    "MSC",
    "Maersk",
    "CMA CGM",
    "Hapag-Lloyd",
    "COSCO",
    "Evergreen",
  ];

  const portos = [
    // Portos Marítimos
    "Santos, Brasil",
    "Itajaí, Brasil",
    "Paranaguá, Brasil",
    "Rio Grande, Brasil",
    "Suape, Brasil",
    "Rotterdam, Holanda",
    "Hamburgo, Alemanha",
    "Barcelona, Espanha",
    "Xangai, China",
    "Singapura",
    "Los Angeles, EUA",
    "Nova York, EUA",
  ];

  const aeroportos = [
    // Aeroportos Internacionais
    "Guarulhos (GRU), São Paulo, Brasil",
    "Galeão (GIG), Rio de Janeiro, Brasil",
    "Brasília (BSB), Brasil",
    "Miami (MIA), EUA",
    "JFK (JFK), Nova York, EUA",
    "Heathrow (LHR), Londres, Reino Unido",
    "Charles de Gaulle (CDG), Paris, França",
    "Frankfurt (FRA), Alemanha",
    "Dubai (DXB), Emirados Árabes",
    "Hong Kong (HKG), China",
    "Narita (NRT), Tóquio, Japão",
  ];

  const locaisTerrestres = [
    // Locais Terrestres
    "São Paulo, Brasil",
    "Rio de Janeiro, Brasil",
    "Brasília, Brasil",
    "Curitiba, Brasil",
    "Porto Alegre, Brasil",
    "Belo Horizonte, Brasil",
    "Salvador, Brasil",
    "Recife, Brasil",
    "Fortaleza, Brasil",
    "Manaus, Brasil",
    "Miami, EUA",
    "Nova York, EUA",
    "Los Angeles, EUA",
    "Londres, Reino Unido",
    "Paris, França",
    "Berlim, Alemanha",
    "Madri, Espanha",
    "Roma, Itália",
    "Amsterdã, Holanda",
    "Bruxelas, Bélgica",
  ];

  const statusOptions = ["A Embarcar", "Embarcado", "Concluído"];

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "quantBox" ? Number.parseInt(value) : value,
    }));
  };

  // Handler para validar campo quando perde o foco
  const handleBlur = (field: keyof NovoEnvio) => {
    if (formData.tipo) { // Só valida se o tipo já foi selecionado
      validateField(field, formData[field]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const isAdminUser = isAdmin();
    const isCompanyUser = currentUser?.role === UserRole.COMPANY_USER;

    if (!isAdminUser && !isCompanyUser) {
      showError("Erro: Você não tem permissão para criar shipments.");
      return;
    }

    // Validar formulário completo
    if (!validateForm(formData)) {
      showError('Por favor, corrija os erros no formulário antes de continuar');
      return;
    }

    setIsSubmitting(true);

    try {
      const clienteSelecionado = clientes.find(
        (c) => c.id === formData.clienteId
      );

      if (!clienteSelecionado) {
        showError(translations.pleaseSelectValidClient);
        setIsSubmitting(false);
        return;
      }

      const shipmentData = {
        cliente: clienteSelecionado.empresa,
        operador: formData.operador,
        pol: formData.pol,
        pod: formData.pod,
        etdOrigem: formData.etdOrigem,
        etaDestino: formData.etaDestino,
        currentLocation: formData.pol,
        quantBox: formData.quantBox,
        status: formData.status,
        numeroBl: formData.numeroBl,
        armador: formData.armador,
        booking: formData.booking,
        companyId: clienteSelecionado.companyId,
        invoice: formData.invoice,
        shipper: "",
        tipo: formData.tipo,
      };

      await addShipment(shipmentData);

      showSuccess("Envio registrado com sucesso!");
      clearAllErrors();

      setFormData({
        clienteId: "",
        operador: "",
        pol: "",
        pod: "",
        etdOrigem: "",
        etaDestino: "",
        quantBox: 1,
        status: "agendado",
        numeroBl: "",
        armador: "",
        booking: "",
        invoice: "",
        tipo: "",
        shipper: "",
      });

      navigate("/home");
    } catch (error) {
      console.error("Erro ao criar shipment:", error);
      showError("Erro ao criar shipment. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const clienteSelecionado = clientes.find((c) => c.id === formData.clienteId);
  const isAdminUser = isAdmin();
  const isCompanyUser = currentUser?.role === UserRole.COMPANY_USER;

  if (!isAdminUser && !isCompanyUser) {
    return (
      <main className="novo-envio-main">
        <Navbar />
        <div
          className={`novo-envio-content ${
            isCollapsed ? "navbar-collapsed" : ""
          }`}
        >
          <div className="novo-envio-container">
            <div className="access-denied">
              <h2>Acesso Negado</h2>
              <p>
                Apenas administradores e usuários de empresa podem criar novos
                shipments.
              </p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="novo-envio-container">
      <Navbar />
      <div
        className={`novo-envio-content ${
          isCollapsed ? "navbar-collapsed" : ""
        }`}
      >
        <div className="page-header">
          <h1>{translations.newShipmentTitle}</h1>
          <p>Preencha as informações para criar um novo envio</p>
        </div>

        {/* Seção Tipo de Envio */}
        <div className="form-section">
          <div className="section-header">
            <Package size={20} />
            <h2>Tipo de Envio</h2>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="tipo">
                <Package
                  size={16}
                  style={{ marginRight: "8px", verticalAlign: "middle" }}
                />
                Tipo de Transporte *
              </label>
              <select
                id="tipo"
                name="tipo"
                value={formData.tipo}
                onChange={handleInputChange}
                onBlur={() => handleBlur('tipo')}
                className={errors.tipo ? 'input-error' : ''}
                required
              >
                <option value="">Selecione o tipo de transporte</option>
                <option value="Marítimo">Marítimo</option>
                <option value="Aéreo">Aéreo</option>
                <option value="Terrestre">Terrestre</option>
              </select>
              {errors.tipo && <span className="error-text">{errors.tipo}</span>}
            </div>
          </div>
        </div>

        <div className="form-container">
          <form onSubmit={handleSubmit} className="novo-envio-form">
            {/* Seção Cliente e Operador */}
            <div className="form-section">
              <div className="section-header">
                <User size={20} />
                <h2>Cliente e Operador</h2>
              </div>

              <div className="form-row">
                {isAdminUser && (
                  <div className="form-group">
                    <label htmlFor="clienteId">Cliente *</label>
                    <select
                      id="clienteId"
                      name="clienteId"
                      value={formData.clienteId}
                      onChange={handleInputChange}
                      required
                      disabled={loadingClientes}
                    >
                      <option value="">
                        {loadingClientes
                          ? translations.loading
                          : translations.selectClient}
                      </option>
                      {clientes.map((cliente) => (
                        <option key={cliente.id} value={cliente.id}>
                          {cliente.nome} - {cliente.empresa}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {isCompanyUser && clienteSelecionado && (
                  <div className="form-group">
                    <label>Sua Empresa</label>
                    <input
                      type="text"
                      value={clienteSelecionado.empresa}
                      disabled
                      style={{
                        backgroundColor: "#f0f0f0",
                        cursor: "not-allowed",
                      }}
                    />
                  </div>
                )}

                <div className="form-group">
                  <label htmlFor="operador">Operador *</label>
                  <select
                    id="operador"
                    name="operador"
                    value={formData.operador}
                    onChange={handleInputChange}
                    onBlur={() => handleBlur('operador')}
                    className={errors.operador ? 'input-error' : ''}
                    required
                    disabled={loadingOperadores}
                  >
                    <option value="">
                      {loadingOperadores
                        ? translations.loading
                        : translations.selectOperator}
                    </option>
                    {operadores.map((operador) => (
                      <option key={operador.id} value={operador.id}>
                        {operador.nome}
                      </option>
                    ))}
                  </select>
                  {errors.operador && <span className="error-text">{errors.operador}</span>}
                </div>
              </div>
            </div>

            {/* Seção Rota */}
            <div className="form-section">
              <div className="section-header">
                <MapPin size={20} />
                <h2>Rota</h2>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="pol">
                    {formData.tipo === "Aéreo"
                      ? "Aeroporto de Origem"
                      : formData.tipo === "Terrestre"
                      ? "Local de Origem"
                      : "Porto de Origem"}{" "}
                    (POL) *
                  </label>
                  <select
                    id="pol"
                    name="pol"
                    value={formData.pol}
                    onChange={handleInputChange}
                    onBlur={() => handleBlur('pol')}
                    className={errors.pol ? 'input-error' : ''}
                    required
                  >
                    <option value="">
                      {formData.tipo === "Aéreo"
                        ? "Selecione o aeroporto de origem"
                        : formData.tipo === "Terrestre"
                        ? "Selecione o local de origem"
                        : "Selecione o porto de origem"}
                    </option>
                    {formData.tipo === "Aéreo"
                      ? aeroportos.map((aeroporto) => (
                          <option key={aeroporto} value={aeroporto}>
                            {aeroporto}
                          </option>
                        ))
                      : formData.tipo === "Terrestre"
                      ? locaisTerrestres.map((local) => (
                          <option key={local} value={local}>
                            {local}
                          </option>
                        ))
                      : portos.map((porto) => (
                          <option key={porto} value={porto}>
                            {porto}
                          </option>
                        ))}
                  </select>
                  {errors.pol && <span className="error-text">{errors.pol}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="pod">
                    {formData.tipo === "Aéreo"
                      ? "Aeroporto de Destino"
                      : formData.tipo === "Terrestre"
                      ? "Local de Destino"
                      : "Porto de Destino"}{" "}
                    (POD) *
                  </label>
                  <select
                    id="pod"
                    name="pod"
                    value={formData.pod}
                    onChange={handleInputChange}
                    onBlur={() => handleBlur('pod')}
                    className={errors.pod ? 'input-error' : ''}
                    required
                  >
                    <option value="">
                      {formData.tipo === "Aéreo"
                        ? "Selecione o aeroporto de destino"
                        : formData.tipo === "Terrestre"
                        ? "Selecione o local de destino"
                        : "Selecione o porto de destino"}
                    </option>
                    {formData.tipo === "Aéreo"
                      ? aeroportos.map((aeroporto) => (
                          <option key={aeroporto} value={aeroporto}>
                            {aeroporto}
                          </option>
                        ))
                      : formData.tipo === "Terrestre"
                      ? locaisTerrestres.map((local) => (
                          <option key={local} value={local}>
                            {local}
                          </option>
                        ))
                      : portos.map((porto) => (
                          <option key={porto} value={porto}>
                            {porto}
                          </option>
                        ))}
                  </select>
                  {errors.pod && <span className="error-text">{errors.pod}</span>}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="etdOrigem">Data de Partida (ETD) *</label>
                  <input
                    type="date"
                    id="etdOrigem"
                    name="etdOrigem"
                    value={formData.etdOrigem}
                    onChange={handleInputChange}
                    onBlur={() => handleBlur('etdOrigem')}
                    className={errors.etdOrigem ? 'input-error' : ''}
                    required
                  />
                  {errors.etdOrigem && <span className="error-text">{errors.etdOrigem}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="etaDestino">
                    Data Prevista Chegada (ETA) *
                  </label>
                  <input
                    type="date"
                    id="etaDestino"
                    name="etaDestino"
                    value={formData.etaDestino}
                    onChange={handleInputChange}
                    onBlur={() => handleBlur('etaDestino')}
                    className={errors.etaDestino ? 'input-error' : ''}
                    required
                  />
                  {errors.etaDestino && <span className="error-text">{errors.etaDestino}</span>}
                </div>
              </div>
            </div>

            {/* Seção Documentação */}
            <div className="form-section">
              <div className="section-header">
                <FileText size={20} />
                <h2>Documentação</h2>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="numeroBl">Número do BL {formData.tipo === "Marítimo" && "*"}</label>
                  <input
                    type="text"
                    id="numeroBl"
                    name="numeroBl"
                    value={formData.numeroBl}
                    onChange={handleInputChange}
                    onBlur={() => handleBlur('numeroBl')}
                    placeholder="Ex: BL123456789"
                    className={errors.numeroBl ? 'input-error' : ''}
                    required={formData.tipo === "Marítimo"}
                  />
                  {errors.numeroBl && <span className="error-text">{errors.numeroBl}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="booking">Número do Booking {formData.tipo === "Aéreo" && "*"}</label>
                  <input
                    type="text"
                    id="booking"
                    name="booking"
                    value={formData.booking}
                    onChange={handleInputChange}
                    placeholder="Ex: BK987654321"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="invoice">Número do Invoice *</label>
                  <input
                    type="text"
                    id="invoice"
                    name="invoice"
                    value={formData.invoice}
                    onChange={handleInputChange}
                    placeholder="Ex: INV123456789"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Botões */}
            <div className="form-actions">
              <button
                type="button"
                className="btn-cancel"
                onClick={() => window.history.back()}
              >
                {translations.cancel}
              </button>
              <button
                type="submit"
                className="btn-submit"
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? "Registrando..."
                  : translations.newShipmentTitle}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
};

export default NovoEnvioPage;
