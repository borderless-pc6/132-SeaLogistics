"use client";

import { ArrowLeft, Edit, FileSpreadsheet, Mail, MapPin, Package, Ship } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { EmailPreviewModal } from "../../components/email-preview-modal/email-preview-modal";
import Navbar from "../../components/navbar/navbar";
import EditShipmentModal from "../../components/edit-shipment-modal/edit-shipment-modal";
import { ShipmentTimeline } from "../../components/shipment-timeline/shipment-timeline";
import { TableSkeleton } from "../../components/skeleton-loader/skeleton-loader";
import { getStatusLabel } from "../../constants/statusOptions";
import { useAuth } from "../../context/auth-context";
import { useLanguage } from "../../context/language-context";
import { type Shipment, useShipments } from "../../context/shipments-context";
import {
  formatContainerSpec,
  formatNavioDisplay,
  formatPosicaoNavioForClient,
} from "../../utils/shipmentFormatters";
import { exportJabilStatusSpreadsheet } from "../../services/excelExportService";
import "./shipment-detail-page.css";

export function ShipmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isStaff } = useAuth();
  const { translations } = useLanguage();
  const { shipments, updateShipment, loading } = useShipments();
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showEmailPreview, setShowEmailPreview] = useState(false);

  useEffect(() => {
    if (!id) return;
    const found = shipments.find((s) => s.id === id);
    if (found) {
      setShipment(found);
    }
  }, [id, shipments]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return "—";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString("pt-BR");
  };

  const handleSave = async (updated: Shipment) => {
    await updateShipment(updated);
    setShipment(updated);
    setShowEditModal(false);
  };

  if (loading && !shipment) {
    return (
      <main className="shipment-detail-page">
        <Navbar />
        <div className="shipment-detail-content">
          <TableSkeleton rows={6} columns={2} />
        </div>
      </main>
    );
  }

  if (!shipment) {
    return (
      <main className="shipment-detail-page">
        <Navbar />
        <div className="shipment-detail-content">
          <button
            type="button"
            className="back-link"
            onClick={() => navigate("/envios")}
          >
            <ArrowLeft size={18} /> Voltar para envios
          </button>
          <p className="not-found">Embarque não encontrado.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="shipment-detail-page">
      <Navbar />
      <div className="shipment-detail-content">
        <div className="shipment-detail-header">
          <button
            type="button"
            className="back-link"
            onClick={() => navigate("/envios")}
          >
            <ArrowLeft size={18} /> Voltar
          </button>

          <div className="shipment-detail-title-row">
            <div>
              <h1>
                <Ship size={28} /> BL {shipment.numeroBl || "—"}
              </h1>
              <p className="shipment-detail-subtitle">
                {shipment.cliente} · {shipment.tipo || "Marítimo"}
              </p>
            </div>
            <span className={`status-badge status-${shipment.status}`}>
              {getStatusLabel(shipment.status)}
            </span>
          </div>

          {isStaff() && (
            <div className="shipment-detail-actions">
              <button
                type="button"
                className="edit-btn"
                onClick={() => setShowEditModal(true)}
              >
                <Edit size={16} /> Editar
              </button>
              <button
                type="button"
                className="preview-email-btn"
                onClick={() => setShowEmailPreview(true)}
              >
                <Mail size={16} /> Preview comunicação
              </button>
              <button
                type="button"
                className="export-jabil-btn"
                onClick={() => void exportJabilStatusSpreadsheet(shipment)}
              >
                <FileSpreadsheet size={16} /> Planilha cliente
              </button>
            </div>
          )}
        </div>

        <div className="shipment-detail-grid">
          <section className="detail-card">
            <h2>
              <Package size={20} /> Informações gerais
            </h2>
            <dl>
              <dt>Cliente</dt>
              <dd>{shipment.cliente || "—"}</dd>
              <dt>Operador</dt>
              <dd>{shipment.operador || "—"}</dd>
              <dt>Shipper</dt>
              <dd>{shipment.shipper || "—"}</dd>
              <dt>Armador</dt>
              <dd>{shipment.armador || "—"}</dd>
              <dt>Booking</dt>
              <dd>{shipment.booking || "—"}</dd>
              <dt>CE</dt>
              <dd>{shipment.ce || "—"}</dd>
              <dt>Invoice</dt>
              <dd>{shipment.invoice || "—"}</dd>
              <dt>Containers</dt>
              <dd>
                {formatContainerSpec(shipment.quantBox, shipment.containerType)}
              </dd>
              {shipment.navio && (
                <>
                  <dt>Navio</dt>
                  <dd>{formatNavioDisplay(shipment)}</dd>
                </>
              )}
              {shipment.imo && (
                <>
                  <dt>IMO</dt>
                  <dd>{shipment.imo}</dd>
                </>
              )}
            </dl>
          </section>

          <section className="detail-card">
            <h2>
              <MapPin size={20} /> Rota e prazos
            </h2>
            <dl>
              <dt>Porto de origem (POL)</dt>
              <dd>{shipment.pol || "—"}</dd>
              <dt>Porto de destino (POD)</dt>
              <dd>{shipment.pod || "—"}</dd>
              <dt>ETD Origem</dt>
              <dd>{formatDate(shipment.etdOrigem)}</dd>
              <dt>ETA Destino</dt>
              <dd>{formatDate(shipment.etaDestino)}</dd>
              <dt>Partida real</dt>
              <dd>{formatDate(shipment.actualDeparture)}</dd>
              <dt>ETA reportado</dt>
              <dd>{formatDate(shipment.reportedEta)}</dd>
              <dt>Localização atual</dt>
              <dd style={{ whiteSpace: "pre-line" }}>
                {formatPosicaoNavioForClient(shipment)}
              </dd>
            </dl>
          </section>

          <section className="detail-card">
            <h2>
              <Ship size={20} /> Datas operacionais
            </h2>
            <dl>
              <dt>Carga pronta</dt>
              <dd>{formatDate(shipment.cargoReady)}</dd>
              <dt>Coleta</dt>
              <dd>{formatDate(shipment.coleta)}</dd>
              <dt>Empty to Shipper</dt>
              <dd>{formatDate(shipment.emptyToShipper)}</dd>
              <dt>Ready to Load</dt>
              <dd>{formatDate(shipment.readyToLoad)}</dd>
              <dt>Loaded on Board</dt>
              <dd>{formatDate(shipment.loadedOnBoard)}</dd>
              {shipment.shipMapImageUrl && (
                <>
                  <dt>Mapa do navio</dt>
                  <dd>
                    <img
                      src={shipment.shipMapImageUrl}
                      alt="Posição do navio"
                      className="shipment-ship-map-preview"
                    />
                  </dd>
                </>
              )}
            </dl>
          </section>

          {shipment.observacoes && (
            <section className="detail-card full-width">
              <h2>Observações</h2>
              <p>{shipment.observacoes}</p>
            </section>
          )}

          <section className="detail-card full-width">
            <ShipmentTimeline shipmentId={shipment.id!} />
          </section>
        </div>

        <p className="detail-footer-link">
          <Link to="/envios">{translations.shipments || "Ver todos os envios"}</Link>
        </p>
      </div>

      {showEmailPreview && (
        <EmailPreviewModal
          shipment={shipment}
          onClose={() => setShowEmailPreview(false)}
        />
      )}

      {showEditModal && (
        <EditShipmentModal
          shipment={shipment}
          onClose={() => setShowEditModal(false)}
          onSave={handleSave}
          canEdit={isStaff()}
        />
      )}
    </main>
  );
}
