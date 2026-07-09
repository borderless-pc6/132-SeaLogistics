"use client";

import { ArrowLeft, Edit, FileSpreadsheet, Loader2, Mail, MapPin, Package, Ship, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ConfirmDialog } from "../../components/confirm-dialog/confirm-dialog";
import { EmailPreviewModal } from "../../components/email-preview-modal/email-preview-modal";
import Navbar from "../../components/navbar/navbar";
import EditShipmentModal from "../../components/edit-shipment-modal/edit-shipment-modal";
import { ShipmentTimeline } from "../../components/shipment-timeline/shipment-timeline";
import { TableSkeleton } from "../../components/skeleton-loader/skeleton-loader";
import { StatusBadge } from "../../components/status-badge";
import { useAuth } from "../../context/auth-context";
import { useLanguage } from "../../context/language-context";
import { type Shipment, useShipments } from "../../context/shipments-context";
import { useToast } from "../../context/toast-context";
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
  const { isStaff, isAdmin } = useAuth();
  const { translations } = useLanguage();
  const { showError, showSuccess } = useToast();
  const { shipments, updateShipment, deleteShipment, loading } = useShipments();
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showEmailPreview, setShowEmailPreview] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const handleConfirmDelete = async () => {
    if (!shipment?.id) return;
    setIsDeleting(true);
    try {
      await deleteShipment(shipment.id);
      showSuccess(translations.deleteSuccess);
      navigate("/envios");
    } catch (error) {
      showError(
        error instanceof Error ? error.message : "Não foi possível excluir o embarque."
      );
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
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
            <StatusBadge status={shipment.status} />
          </div>

          {(isStaff() || isAdmin()) && (
            <div className="shipment-detail-actions">
              {isStaff() && (
                <>
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
                </>
              )}
              {isAdmin() && (
                <button
                  type="button"
                  className="delete-shipment-btn"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <Loader2 size={16} className="spin" />
                  ) : (
                    <Trash2 size={16} />
                  )}
                  Excluir
                </button>
              )}
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

      <ConfirmDialog
        open={showDeleteConfirm}
        title="Excluir embarque"
        message={`Excluir o embarque BL ${shipment.numeroBl || "—"} do cliente ${shipment.cliente || "—"}? Esta ação não pode ser desfeita.`}
        confirmLabel={translations.delete || "Excluir"}
        cancelLabel={translations.cancel || "Cancelar"}
        onConfirm={() => void handleConfirmDelete()}
        onCancel={() => setShowDeleteConfirm(false)}
        variant="danger"
      />
    </main>
  );
}
