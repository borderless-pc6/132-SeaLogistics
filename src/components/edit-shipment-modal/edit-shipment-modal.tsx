"use client";

import type React from "react";

import { FileText, MapPin, Package, Save, Ship, User, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useLanguage } from "../../context/language-context";
import { useReferenceData } from "../../context/reference-data-context";
import type { Shipment } from "../../context/shipments-context";
import { Cliente } from "../../types/customer";
import { ShipmentTimeline } from "../shipment-timeline/shipment-timeline";
import { CONTAINER_TYPES } from "../../utils/shipmentFormatters";
import { isValidStatusTransition } from "../../utils/statusTransitions";
import "./edit-shipment-modal.css";

interface EditShipmentModalProps {
  shipment: Shipment;
  onClose: () => void;
  onSave: (updatedShipment: Shipment) => Promise<void>;
  canEdit: boolean;
}

interface FormData {
  cliente: string;
  operador: string;
  shipper: string;
  pol: string;
  pod: string;
  etdOrigem: string;
  etaDestino: string;
  currentLocation: string;
  quantBox: number;
  status: string;
  numeroBl: string;
  armador: string;
  booking: string;
  invoice: string;
  observacoes: string;
  tipo: string;
  imo: string;
  actualDeparture: string;
  reportedEta: string;
  navio: string;
  navioCodigo: string;
  containerType: string;
  cargoReady: string;
  coleta: string;
  emptyToShipper: string;
  readyToLoad: string;
  loadedOnBoard: string;
  destinoRumo: string;
  etaRumo: string;
  shipMapImageUrl: string;
  ce: string;
}

const STATUS_OPTIONS = [
  // Mesmo mapa de cores do StatusSelector / tabela
  { value: "documentacao", label: "Documentação", color: "#ffffff", bgColor: "#6c757d" },
  { value: "agendado", label: "Agendado", color: "#ffffff", bgColor: "#17a2b8" },
  { value: "a-embarcar", label: "A Embarcar", color: "#8b5a00", bgColor: "#ffd166" },
  { value: "embarcando", label: "Embarcando", color: "#ffffff", bgColor: "#fd7e14" },
  { value: "em-transito", label: "Em Trânsito", color: "#ffffff", bgColor: "#118ab2" },
  { value: "desembarcando", label: "Desembarcando", color: "#ffffff", bgColor: "#6f42c1" },
  { value: "em-entrega", label: "Em Entrega", color: "#ffffff", bgColor: "#20c997" },
  { value: "concluido", label: "Concluído", color: "#ffffff", bgColor: "#073b4c" },
  { value: "atrasado", label: "Atrasado", color: "#ffffff", bgColor: "#dc3545" },
  { value: "cancelado", label: "Cancelado", color: "#ffffff", bgColor: "#6c757d" },
  { value: "suspenso", label: "Suspenso", color: "#ffffff", bgColor: "#ffc107" },
];

const EditShipmentModal = ({
  shipment,
  onClose,
  onSave,
  canEdit,
}: EditShipmentModalProps) => {
  const { translations } = useLanguage();
  const { getCompanyUsers, loading: referenceLoading } = useReferenceData();
  const [formData, setFormData] = useState<FormData>({
    cliente: "",
    operador: "",
    shipper: "",
    pol: "",
    pod: "",
    etdOrigem: "",
    etaDestino: "",
    currentLocation: "",
    quantBox: 1,
    status: "",
    numeroBl: "",
    armador: "",
    booking: "",
    invoice: "",
    observacoes: "",
    tipo: "",
    imo: "",
    actualDeparture: "",
    reportedEta: "",
    navio: "",
    navioCodigo: "",
    containerType: "40HC",
    cargoReady: "",
    coleta: "",
    emptyToShipper: "",
    readyToLoad: "",
    loadedOnBoard: "",
    destinoRumo: "",
    etaRumo: "",
    shipMapImageUrl: "",
    ce: "",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loadingClientes, setLoadingClientes] = useState(false);
  // ID do cliente selecionado (option value é cliente.id, não o nome)
  const [selectedClienteId, setSelectedClienteId] = useState<string>("");

  useEffect(() => {
    setLoadingClientes(referenceLoading);
    const clientesData: Cliente[] = getCompanyUsers().map((user) => ({
      id: user.uid,
      nome: user.displayName || translations.user,
      empresa: user.companyName || "-",
      email: user.email || "-",
      companyId: user.companyId,
    }));
    setClientes(clientesData);
  }, [getCompanyUsers, referenceLoading, translations.user]);

  const armadores = [
    "MSC",
    "Maersk",
    "CMA CGM",
    "Hapag-Lloyd",
    "COSCO",
    "Evergreen",
  ];

  const portos = [
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

  const handleClienteChange = (clienteId: string) => {
    const clienteSel = clientes.find((c) => c.id === clienteId);
    if (!clienteSel) return;
    setSelectedClienteId(clienteId);
    setFormData((prev) => ({
      ...prev,
      cliente: clienteSel.empresa,
    }));
  };

  // Carregar dados do shipment no formulário
  useEffect(() => {
    if (shipment) {
      console.log("Carregando dados do shipment:", shipment);
      const newFormData = {
        cliente: shipment.cliente || "",
        operador: shipment.operador || "",
        shipper: shipment.shipper || "",
        pol: shipment.pol || "",
        pod: shipment.pod || "",
        etdOrigem: shipment.etdOrigem || "",
        etaDestino: shipment.etaDestino || "",
        currentLocation: shipment.currentLocation || "",
        quantBox: shipment.quantBox || 1,
        status: shipment.status || "",
        numeroBl: shipment.numeroBl || "",
        armador: shipment.armador || "",
        booking: shipment.booking || "",
        invoice: shipment.invoice || "",
        observacoes: shipment.observacoes || "",
        tipo: shipment.tipo || "",
        imo: shipment.imo || "",
        actualDeparture: shipment.actualDeparture || "",
        reportedEta: shipment.reportedEta || "",
        navio: shipment.navio || "",
        navioCodigo: shipment.navioCodigo || "",
        containerType: shipment.containerType || "40HC",
        cargoReady: shipment.cargoReady || "",
        coleta: shipment.coleta || "",
        emptyToShipper: shipment.emptyToShipper || "",
        readyToLoad: shipment.readyToLoad || "",
        loadedOnBoard: shipment.loadedOnBoard || "",
        destinoRumo: shipment.destinoRumo || "",
        etaRumo: shipment.etaRumo || "",
        shipMapImageUrl: shipment.shipMapImageUrl || "",
        ce: shipment.ce || "",
      };
      console.log("FormData configurado:", newFormData);
      setFormData(newFormData);
    }
  }, [shipment]);

  // Quando clientes carregam, definir o cliente selecionado pelo companyId do shipment
  useEffect(() => {
    if (!shipment?.companyId || clientes.length === 0) return;
    const match = clientes.find((c) => c.companyId === shipment.companyId);
    if (match) setSelectedClienteId(match.id);
    else setSelectedClienteId("");
  }, [shipment?.companyId, clientes]);

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    console.log("Campo:", e.target.name, "Valor:", e.target.value);
    setFormData((prev) => ({
      ...prev,
      [name]: name === "quantBox" ? Number.parseInt(value) || 1 : value,
    }));

    // Limpar erro do campo quando o usuário começar a digitar
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const currentStatusOption = STATUS_OPTIONS.find(
    (status) => status.value === formData.status
  );

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.cliente.trim()) {
      newErrors.cliente = translations.clientRequired;
    }
    if (!formData.operador.trim()) {
      newErrors.operador = translations.operatorRequired;
    }
    if (!formData.tipo.trim()) {
      newErrors.tipo = translations.transportTypeRequired;
    }
    // Validação dos portos apenas se o tipo for marítimo
    if (formData.tipo === "Marítimo" || formData.tipo === "Maritime") {
      if (!formData.pol.trim()) {
        newErrors.pol = translations.originPortRequired;
      }
      if (!formData.pod.trim()) {
        newErrors.pod = translations.destinationPortRequired;
      }
    }
    if (!formData.etdOrigem) {
      newErrors.etdOrigem = translations.departureDateRequired;
    }
    if (!formData.etaDestino) {
      newErrors.etaDestino = translations.arrivalDateRequired;
    }
    if (!formData.numeroBl.trim()) {
      newErrors.numeroBl = translations.blNumberRequired;
    }
    if (!formData.booking.trim()) {
      newErrors.booking = translations.bookingRequired;
    }
    if (!formData.invoice.trim()) {
      newErrors.invoice = translations.invoiceRequired;
    }
    if (!formData.armador.trim()) {
      newErrors.armador = translations.carrierRequired;
    }
    if (formData.quantBox < 1) {
      newErrors.quantBox = translations.quantityGreaterThanZero;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!canEdit) {
      alert(translations.noPermissionEdit);
      return;
    }

    console.log("FormData antes da validação:", formData);

    if (!validateForm()) {
      console.log("Validação falhou");
      return;
    }

    const statusCheck = isValidStatusTransition(
      shipment.status || "",
      formData.status
    );
    if (!statusCheck.valid) {
      alert(statusCheck.reason || "Transição de status inválida.");
      return;
    }

    setIsLoading(true);

    try {
      const selectedCliente = clientes.find((c) => c.id === selectedClienteId);
      const updatedShipment: Shipment = {
        ...shipment,
        cliente: formData.cliente,
        operador: formData.operador,
        shipper: formData.shipper,
        pol: formData.pol,
        pod: formData.pod,
        etdOrigem: formData.etdOrigem,
        etaDestino: formData.etaDestino,
        currentLocation: formData.currentLocation,
        quantBox: formData.quantBox,
        status: formData.status,
        numeroBl: formData.numeroBl,
        armador: formData.armador,
        booking: formData.booking,
        invoice: formData.invoice,
        observacoes: formData.observacoes,
        tipo: formData.tipo,
        imo: formData.imo,
        actualDeparture: formData.actualDeparture,
        reportedEta: formData.reportedEta,
        navio: formData.navio,
        navioCodigo: formData.navioCodigo,
        containerType: formData.containerType,
        cargoReady: formData.cargoReady,
        coleta: formData.coleta,
        emptyToShipper: formData.emptyToShipper,
        readyToLoad: formData.readyToLoad,
        loadedOnBoard: formData.loadedOnBoard,
        destinoRumo: formData.destinoRumo,
        etaRumo: formData.etaRumo,
        shipMapImageUrl: formData.shipMapImageUrl,
        ce: formData.ce,
        companyId: selectedCliente?.companyId ?? shipment.companyId,
        updatedAt: new Date(),
      };

      console.log("Shipment atualizado:", updatedShipment);

      await onSave(updatedShipment);
      onClose();
    } catch (error) {
      console.error("Erro ao salvar envio:", error);
      alert(translations.errorSavingChanges);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const modalContent = (
    <div className="edit-modal-overlay" onClick={handleOverlayClick}>
      <div className="edit-modal-content">
        <div className="edit-modal-header">
          <h2>
            <Ship size={24} />
            {translations.editShipment}
          </h2>
          <button className="close-button" onClick={onClose} type="button">
            <X size={20} />
          </button>
        </div>

        <div className="edit-modal-body">
          <form onSubmit={handleSubmit} className="edit-form">
            {/* Seção Cliente */}
            <div className="form-section">
              <div className="section-title">
                <User size={18} />
                <span>{translations.clientInfo}</span>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="tipo">
                    <Package
                      size={16}
                      style={{ marginRight: "8px", verticalAlign: "middle" }}
                    />
                    {translations.transportType} *
                  </label>
                  <select
                    id="tipo"
                    name="tipo"
                    value={formData.tipo}
                    onChange={handleInputChange}
                    disabled={!canEdit}
                    required
                  >
                    <option value="">{translations.selectTransportType}</option>
                    <option value="Marítimo">{translations.maritime}</option>
                    <option value="Aéreo">{translations.air}</option>
                    <option value="Terrestre">{translations.land}</option>
                  </select>
                  {errors.tipo && (
                    <span className="error-message">{errors.tipo}</span>
                  )}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="clienteId">{translations.client} *</label>
                  <select
                    id="clienteId"
                    name="clienteId"
                    value={selectedClienteId}
                    onChange={(e) => handleClienteChange(e.target.value)}
                    disabled={loadingClientes || !canEdit}
                    required
                  >
                    <option value="">
                      {loadingClientes
                        ? translations.loadingClients
                        : translations.selectClient}
                    </option>

                    {clientes.map((cliente) => (
                      <option key={cliente.id} value={cliente.id}>
                        {cliente.nome} - {cliente.empresa}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="operador">{translations.operator} *</label>
                  <input
                    type="text"
                    id="operador"
                    name="operador"
                    value={formData.operador}
                    onChange={handleInputChange}
                    disabled={!canEdit}
                    placeholder={translations.operatorPlaceholder}
                  />
                  {errors.operador && (
                    <span className="error-message">{errors.operador}</span>
                  )}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="shipper">{translations.shipper}</label>
                  <input
                    type="text"
                    id="shipper"
                    name="shipper"
                    value={formData.shipper}
                    onChange={handleInputChange}
                    disabled={!canEdit}
                    placeholder={translations.shipperPlaceholder}
                  />
                </div>
              </div>
            </div>

            {/* Seção Rota */}
            <div className="form-section">
              <div className="section-title">
                <MapPin size={18} />
                <span>{translations.routeAndSchedule}</span>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="pol">
                    {formData.tipo === "Aéreo" || formData.tipo === "Air"
                      ? translations.originAirport
                      : formData.tipo === "Terrestre" || formData.tipo === "Land"
                      ? translations.originLocation
                      : translations.originPort}{" "}
                    (POL) *
                  </label>
                  <select
                    id="pol"
                    name="pol"
                    value={formData.pol}
                    onChange={handleInputChange}
                    disabled={!canEdit}
                  >
                    <option value="">
                      {formData.tipo === "Aéreo" || formData.tipo === "Air"
                        ? translations.selectOriginAirport
                        : formData.tipo === "Terrestre" || formData.tipo === "Land"
                        ? translations.selectOriginLocation
                        : translations.selectOriginPort}
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
                  {errors.pol && (
                    <span className="error-message">{errors.pol}</span>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="pod">
                    {formData.tipo === "Aéreo" || formData.tipo === "Air"
                      ? translations.destinationAirport
                      : formData.tipo === "Terrestre" || formData.tipo === "Land"
                      ? translations.destinationLocation
                      : translations.destinationPort}{" "}
                    (POD) *
                  </label>
                  <select
                    id="pod"
                    name="pod"
                    value={formData.pod}
                    onChange={handleInputChange}
                    disabled={!canEdit}
                  >
                    <option value="">
                      {formData.tipo === "Aéreo" || formData.tipo === "Air"
                        ? translations.selectDestinationAirport
                        : formData.tipo === "Terrestre" || formData.tipo === "Land"
                        ? translations.selectDestinationLocation
                        : translations.selectDestinationPort}
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
                  {errors.pod && (
                    <span className="error-message">{errors.pod}</span>
                  )}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="etdOrigem">{translations.departureDate} (ETD) *</label>
                  <input
                    type="date"
                    id="etdOrigem"
                    name="etdOrigem"
                    value={formData.etdOrigem}
                    onChange={handleInputChange}
                    disabled={!canEdit}
                  />
                  {errors.etdOrigem && (
                    <span className="error-message">{errors.etdOrigem}</span>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="etaDestino">{translations.arrivalDate} (ETA) *</label>
                  <input
                    type="date"
                    id="etaDestino"
                    name="etaDestino"
                    value={formData.etaDestino}
                    onChange={handleInputChange}
                    disabled={!canEdit}
                  />
                  {errors.etaDestino && (
                    <span className="error-message">{errors.etaDestino}</span>
                  )}
                </div>
                <div className="form-group">
                  <label htmlFor="currentLocation">
                    {formData.tipo === "Aéreo" || formData.tipo === "Air"
                      ? translations.currentAirport
                      : formData.tipo === "Terrestre" || formData.tipo === "Land"
                      ? translations.currentLocation
                      : translations.currentPort}
                  </label>
                  <select
                    id="currentLocation"
                    name="currentLocation"
                    value={formData.currentLocation}
                    onChange={handleInputChange}
                    disabled={!canEdit}
                  >
                    <option value="">
                      {formData.tipo === "Aéreo" || formData.tipo === "Air"
                        ? translations.selectCurrentAirport
                        : formData.tipo === "Terrestre" || formData.tipo === "Land"
                        ? translations.selectCurrentLocation
                        : translations.selectCurrentPort}
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
                  {errors.currentLocation && (
                    <span className="error-message">
                      {errors.currentLocation}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Seção Operacional */}
            <div className="form-section">
              <div className="section-title">
                <Package size={18} />
                <span>{translations.operationalInfo}</span>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="quantBox">{translations.containerQuantity} *</label>
                  <input
                    type="number"
                    id="quantBox"
                    name="quantBox"
                    value={formData.quantBox}
                    onChange={handleInputChange}
                    disabled={!canEdit}
                    min="1"
                    max="100"
                  />
                  {errors.quantBox && (
                    <span className="error-message">{errors.quantBox}</span>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="status">{translations.status}</label>
                  <select
                    id="status"
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    disabled={!canEdit}
                  >
                    <option value="">
                      {translations.selectStatus || "Selecione um status"}
                    </option>
                    {STATUS_OPTIONS.map((status) => (
                      <option
                        key={status.value}
                        value={status.value}
                        style={{
                          backgroundColor: status.bgColor,
                          color: status.color,
                        }}
                      >
                        {status.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="armador">{translations.carrier} *</label>
                  <select
                    id="armador"
                    name="armador"
                    value={formData.armador}
                    onChange={handleInputChange}
                    disabled={!canEdit}
                  >
                    <option value="">{translations.selectCarrier}</option>
                    {armadores.map((armador) => (
                      <option key={armador} value={armador}>
                        {armador}
                      </option>
                    ))}
                  </select>
                  {errors.armador && (
                    <span className="error-message">{errors.armador}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Datas operacionais — modelo JABIL */}
            <div className="form-section">
              <div className="section-title">
                <Ship size={18} />
                <span>Datas operacionais</span>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="navio">Navio</label>
                  <input
                    type="text"
                    id="navio"
                    name="navio"
                    value={formData.navio}
                    onChange={handleInputChange}
                    disabled={!canEdit}
                    placeholder="Ex: CMA CGM VELA"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="navioCodigo">Código do navio</label>
                  <input
                    type="text"
                    id="navioCodigo"
                    name="navioCodigo"
                    value={formData.navioCodigo}
                    onChange={handleInputChange}
                    disabled={!canEdit}
                    placeholder="Ex: 0PPKKE2MA"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="containerType">Tipo de contêiner</label>
                  <select
                    id="containerType"
                    name="containerType"
                    value={formData.containerType}
                    onChange={handleInputChange}
                    disabled={!canEdit}
                  >
                    {CONTAINER_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="shipMapImageUrl">URL foto/mapa do navio</label>
                  <input
                    type="url"
                    id="shipMapImageUrl"
                    name="shipMapImageUrl"
                    value={formData.shipMapImageUrl}
                    onChange={handleInputChange}
                    disabled={!canEdit}
                    placeholder="https://..."
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="cargoReady">Carga pronta (Cargo Ready)</label>
                  <input
                    type="date"
                    id="cargoReady"
                    name="cargoReady"
                    value={formData.cargoReady}
                    onChange={handleInputChange}
                    disabled={!canEdit}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="coleta">Coleta</label>
                  <input
                    type="date"
                    id="coleta"
                    name="coleta"
                    value={formData.coleta}
                    onChange={handleInputChange}
                    disabled={!canEdit}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="emptyToShipper">Empty to Shipper</label>
                  <input
                    type="date"
                    id="emptyToShipper"
                    name="emptyToShipper"
                    value={formData.emptyToShipper}
                    onChange={handleInputChange}
                    disabled={!canEdit}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="readyToLoad">Ready to Load</label>
                  <input
                    type="datetime-local"
                    id="readyToLoad"
                    name="readyToLoad"
                    value={formData.readyToLoad}
                    onChange={handleInputChange}
                    disabled={!canEdit}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="loadedOnBoard">Loaded on Board</label>
                  <input
                    type="date"
                    id="loadedOnBoard"
                    name="loadedOnBoard"
                    value={formData.loadedOnBoard}
                    onChange={handleInputChange}
                    disabled={!canEdit}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="destinoRumo">Rumo a (destino)</label>
                  <input
                    type="text"
                    id="destinoRumo"
                    name="destinoRumo"
                    value={formData.destinoRumo}
                    onChange={handleInputChange}
                    disabled={!canEdit}
                    placeholder="Ex: Qingdao"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="etaRumo">Chegada em (rumo a)</label>
                  <input
                    type="date"
                    id="etaRumo"
                    name="etaRumo"
                    value={formData.etaRumo}
                    onChange={handleInputChange}
                    disabled={!canEdit}
                  />
                </div>
              </div>
            </div>

            {/* Seção Documentação */}
            <div className="form-section">
              <div className="section-title">
                <FileText size={18} />
                <span>{translations.documentation}</span>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="numeroBl">{translations.blNumber} *</label>
                  <input
                    type="text"
                    id="numeroBl"
                    name="numeroBl"
                    value={formData.numeroBl}
                    onChange={handleInputChange}
                    disabled={!canEdit}
                    placeholder={translations.blNumberPlaceholder}
                  />
                  {errors.numeroBl && (
                    <span className="error-message">{errors.numeroBl}</span>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="booking">{translations.bookingNumber} *</label>
                  <input
                    type="text"
                    id="booking"
                    name="booking"
                    value={formData.booking}
                    onChange={handleInputChange}
                    disabled={!canEdit}
                    placeholder={translations.bookingNumberPlaceholder}
                  />
                  {errors.booking && (
                    <span className="error-message">{errors.booking}</span>
                  )}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="ce">CE (Conhecimento de Embarque)</label>
                  <input
                    type="text"
                    id="ce"
                    name="ce"
                    value={formData.ce}
                    onChange={handleInputChange}
                    disabled={!canEdit}
                    placeholder="A INFORMAR"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="invoice">{translations.invoiceNumber} *</label>
                  <input
                    type="text"
                    id="invoice"
                    name="invoice"
                    value={formData.invoice}
                    onChange={handleInputChange}
                    disabled={!canEdit}
                    placeholder={translations.invoiceNumberPlaceholder}
                  />
                  {errors.invoice && (
                    <span className="error-message">{errors.invoice}</span>
                  )}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group full-width">
                  <label htmlFor="observacoes">{translations.observations}</label>
                  <textarea
                    id="observacoes"
                    name="observacoes"
                    value={formData.observacoes}
                    onChange={handleInputChange}
                    disabled={!canEdit}
                    placeholder={translations.observationsPlaceholder}
                    rows={4}
                  />
                </div>
              </div>
            </div>

            {shipment.id && (
              <div className="form-section">
                <ShipmentTimeline shipmentId={shipment.id} />
              </div>
            )}
          </form>
        </div>

        <div className="edit-modal-actions">
          <button
            type="button"
            className="btn-cancel"
            onClick={onClose}
            disabled={isLoading}
          >
            {translations.cancel}
          </button>
          {canEdit && (
            <button
              type="submit"
              className={`btn-save ${isLoading ? "loading" : ""}`}
              onClick={handleSubmit}
              disabled={isLoading}
            >
              <Save size={16} />
              {isLoading ? translations.saving : translations.saveChanges}
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined"
    ? createPortal(modalContent, document.body)
    : null;
};

export default EditShipmentModal;
