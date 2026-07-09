"use client";

import type React from "react";

import { FileText, MapPin, Package, User } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/navbar/navbar";
import { useAuth } from "../../context/auth-context";
import { useLanguage } from "../../context/language-context";
import { useReferenceData } from "../../context/reference-data-context";
import { useShipments } from "../../context/shipments-context";
import { useToast } from "../../context/toast-context";
import { useFormValidation } from "../../hooks/useFormValidation";
import { listCompanyEmployees } from "../../services/companyEmployeeService";
import { getShipmentSchema } from "../../schemas/shipmentSchema";
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

const FIELD_LABELS: Record<keyof NovoEnvio, string> = {
  tipo: "Tipo de transporte",
  clienteId: "Cliente",
  operador: "Responsável",
  pol: "Origem (POL)",
  pod: "Destino (POD)",
  etdOrigem: "Data de partida (ETD)",
  etaDestino: "Data de chegada (ETA)",
  quantBox: "Quantidade de volumes",
  status: "Status",
  numeroBl: "Número do BL",
  armador: "Armador",
  booking: "Número do booking",
  invoice: "Número da invoice",
  shipper: "Shipper",
};

const NovoEnvioPage = () => {
  const navigate = useNavigate();
  const { addShipment } = useShipments();
  const { getCompanyUsers, getStaffUsers, loading: referenceLoading } =
    useReferenceData();
  const { canCreateShipment, isStaff, isCompanyUser, currentUser, currentCompany } = useAuth();
  const { translations } = useLanguage();
  const { showError, showSuccess } = useToast();

  useEffect(() => {
    if (!canCreateShipment()) {
      navigate("/home");
    }
  }, [canCreateShipment, navigate]);

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
  const { errors, validateFormAndGetErrors, validateField, clearAllErrors } =
    useFormValidation(shipmentSchema);

  const renderFieldError = (field: keyof NovoEnvio) =>
    errors[field] ? (
      <span className="error-text" role="alert">
        {errors[field]}
      </span>
    ) : null;

  const scrollToField = (field: keyof NovoEnvio) => {
    const element = document.getElementById(String(field));
    element?.scrollIntoView({ behavior: "smooth", block: "center" });
    element?.focus({ preventScroll: true });
  };

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
    if (!isStaff()) return;

    setLoadingClientes(referenceLoading);
    const clientesData: Cliente[] = getCompanyUsers().map((user) => ({
      id: user.uid,
      nome: user.displayName || "Usuário",
      empresa: user.companyName || "-",
      email: user.email || "-",
      companyId: user.companyId,
    }));
    setClientes(clientesData);
    if (clientesData.length === 1) {
      setFormData((prev) => ({ ...prev, clienteId: clientesData[0].id }));
    }
  }, [isStaff, getCompanyUsers, referenceLoading]);

  useEffect(() => {
    if (!isStaff()) return;

    setLoadingOperadores(referenceLoading);
    const operadoresData: Operador[] = getStaffUsers().map((user) => ({
      id: user.uid,
      nome: user.displayName || "Admin",
      email: user.email || "",
    }));
    setOperadores(operadoresData);
  }, [isStaff, getStaffUsers, referenceLoading]);

  useEffect(() => {
    if (!isCompanyUser() || !currentUser?.companyId) return;

    let cancelled = false;

    const loadTeamMembers = async () => {
      setLoadingOperadores(true);
      try {
        const employees = await listCompanyEmployees(currentUser.companyId!);
        if (cancelled) return;

        const operadoresData: Operador[] = employees
          .filter((employee) => employee.isActive)
          .map((employee) => ({
            id: employee.uid,
            nome: employee.displayName,
            email: employee.email,
          }));

        setOperadores(operadoresData);

        if (operadoresData.length === 1) {
          setFormData((prev) => ({ ...prev, operador: operadoresData[0].id }));
        } else if (
          currentUser.uid &&
          operadoresData.some((member) => member.id === currentUser.uid)
        ) {
          setFormData((prev) => ({ ...prev, operador: currentUser.uid }));
        }
      } catch (error) {
        console.error("Erro ao carregar equipe:", error);
        if (!cancelled) {
          showError("Não foi possível carregar os membros da equipe.");
          setOperadores([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingOperadores(false);
        }
      }
    };

    void loadTeamMembers();

    return () => {
      cancelled = true;
    };
  }, [isCompanyUser, currentUser?.companyId, currentUser?.uid, showError]);

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
      // Passa os dados completos para validação (necessário para discriminatedUnion)
      validateField(field, formData[field], formData);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!canCreateShipment()) {
      showError("Erro: Você não tem permissão para criar envios.");
      return;
    }

    const validationData: NovoEnvio = {
      ...formData,
      clienteId: isCompanyUser()
        ? currentUser?.uid ?? "company"
        : formData.clienteId,
      operador: isCompanyUser()
        ? formData.operador || currentUser?.uid || ""
        : formData.operador,
    };

    const validationErrors = validateFormAndGetErrors(validationData);
    if (validationErrors) {
      const firstField = Object.keys(validationErrors)[0] as keyof NovoEnvio;
      const fieldLabel = FIELD_LABELS[firstField] ?? firstField;
      showError(`${fieldLabel}: ${validationErrors[firstField]}`);
      scrollToField(firstField);
      return;
    }

    setIsSubmitting(true);

    try {
      let clienteEmpresa = "";
      let companyId: string | undefined;

      if (isCompanyUser()) {
        if (!currentUser?.companyId) {
          showError("Sua conta não está vinculada a uma empresa. Contate o suporte.");
          setIsSubmitting(false);
          return;
        }
        clienteEmpresa =
          currentCompany?.name || currentUser.companyName || "Minha empresa";
        companyId = currentUser.companyId;
      } else {
        const clienteSelecionado = clientes.find(
          (c) => c.id === formData.clienteId
        );

        if (!clienteSelecionado) {
          showError(translations.pleaseSelectValidClient);
          setIsSubmitting(false);
          return;
        }

        if (!clienteSelecionado.companyId) {
          showError(
            "Este cliente não tem empresa vinculada. O envio não aparecerá no perfil dele. Vincule uma empresa ao usuário nas configurações."
          );
          setIsSubmitting(false);
          return;
        }

        clienteEmpresa = clienteSelecionado.empresa;
        companyId = clienteSelecionado.companyId;
      }

      const operadorSelecionado = operadores.find(
        (item) => item.id === formData.operador
      );
      const operadorNome =
        operadorSelecionado?.nome || formData.operador.trim();

      const shipmentData = {
        cliente: clienteEmpresa,
        operador: operadorNome,
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
        companyId,
        invoice: formData.invoice,
        shipper: formData.shipper || clienteEmpresa,
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

      navigate("/envios");
    } catch (error) {
      console.error("Erro ao criar shipment:", error);
      const message =
        error instanceof Error
          ? error.message
          : "Erro ao criar shipment. Tente novamente.";
      showError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!canCreateShipment()) {
    return null;
  }

  const empresaNome =
    currentCompany?.name || currentUser?.companyName || "Sua empresa";

  return (
    <main className="novo-envio-container page-layout">
      <Navbar />
      <div className="novo-envio-content page-content">
        <div className="page-header">
          <span className="page-header__eyebrow">
            <Package size={14} /> {isCompanyUser() ? "Solicitar envio" : "Novo registro"}
          </span>
          <h1>{translations.newShipmentTitle}</h1>
          <p>
            {isCompanyUser()
              ? "Preencha os dados da sua carga. Nossa equipe dará sequência ao processo."
              : "Preencha as informações para criar um novo envio"}
          </p>
        </div>

        <div className="form-container">
          <form onSubmit={handleSubmit} className="novo-envio-form">
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
                  {renderFieldError("tipo")}
                </div>
              </div>
            </div>

            {/* Seção Cliente e Operador */}
            <div className="form-section">
              <div className="section-header">
                <User size={20} />
                <h2>
                  {isCompanyUser()
                    ? translations.companyAndTeamMember
                    : translations.clientAndOperator}
                </h2>
              </div>

              <div className="form-row">
                {isCompanyUser() ? (
                  <div className="form-group">
                    <label htmlFor="empresa">Empresa</label>
                    <input
                      type="text"
                      id="empresa"
                      value={empresaNome}
                      disabled
                      className="input-readonly"
                    />
                  </div>
                ) : (
                  <div className="form-group">
                    <label htmlFor="clienteId">Cliente *</label>
                    <select
                      id="clienteId"
                      name="clienteId"
                      value={formData.clienteId}
                      onChange={handleInputChange}
                      onBlur={() => handleBlur("clienteId")}
                      className={errors.clienteId ? "input-error" : ""}
                      required
                      disabled={loadingClientes}
                      aria-invalid={Boolean(errors.clienteId)}
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
                    {renderFieldError("clienteId")}
                  </div>
                )}

                <div className="form-group">
                  <label htmlFor="operador">
                    {isCompanyUser()
                      ? translations.teamMember
                      : translations.operator}{" "}
                    *
                  </label>
                  <select
                    id="operador"
                    name="operador"
                    value={formData.operador}
                    onChange={handleInputChange}
                    onBlur={() => handleBlur("operador")}
                    className={errors.operador ? "input-error" : ""}
                    required
                    disabled={loadingOperadores}
                    aria-invalid={Boolean(errors.operador)}
                  >
                    <option value="">
                      {loadingOperadores
                        ? translations.loading
                        : isCompanyUser()
                          ? translations.selectTeamMember
                          : translations.selectOperator}
                    </option>
                    {operadores.map((operador) => (
                      <option key={operador.id} value={operador.id}>
                        {operador.nome}
                      </option>
                    ))}
                  </select>
                  {renderFieldError("operador")}
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
                  {renderFieldError("pol")}
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
                  {renderFieldError("pod")}
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
                  {renderFieldError("etdOrigem")}
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
                  {renderFieldError("etaDestino")}
                </div>
              </div>
            </div>

            {/* Seção Documentação */}
            <div className="form-section">
              <div className="section-header">
                <FileText size={20} />
                <h2>Documentação</h2>
              </div>

              {formData.tipo === "Marítimo" && (
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="armador">Armador *</label>
                    <select
                      id="armador"
                      name="armador"
                      value={formData.armador}
                      onChange={handleInputChange}
                      onBlur={() => handleBlur('armador')}
                      className={errors.armador ? 'input-error' : ''}
                      required
                    >
                      <option value="">Selecione o armador</option>
                      {armadores.map((arm) => (
                        <option key={arm} value={arm}>
                          {arm}
                        </option>
                      ))}
                    </select>
                    {renderFieldError("armador")}
                  </div>
                </div>
              )}

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
                  {renderFieldError("numeroBl")}
                </div>

                <div className="form-group">
                  <label htmlFor="booking">
                    Número do Booking {formData.tipo === "Aéreo" && "*"}
                  </label>
                  <input
                    type="text"
                    id="booking"
                    name="booking"
                    value={formData.booking}
                    onChange={handleInputChange}
                    onBlur={() => handleBlur("booking")}
                    placeholder="Ex: BK987654321"
                    className={errors.booking ? "input-error" : ""}
                    required={formData.tipo === "Aéreo"}
                    aria-invalid={Boolean(errors.booking)}
                  />
                  {renderFieldError("booking")}
                </div>

                <div className="form-group">
                  <label htmlFor="invoice">
                    Número do Invoice {formData.tipo === "Terrestre" && "*"}
                  </label>
                  <input
                    type="text"
                    id="invoice"
                    name="invoice"
                    value={formData.invoice}
                    onChange={handleInputChange}
                    onBlur={() => handleBlur("invoice")}
                    placeholder="Ex: INV123456789"
                    className={errors.invoice ? "input-error" : ""}
                    required={formData.tipo === "Terrestre"}
                    aria-invalid={Boolean(errors.invoice)}
                  />
                  {renderFieldError("invoice")}
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
