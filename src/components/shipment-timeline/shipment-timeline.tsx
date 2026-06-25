import { Clock, History } from "lucide-react";
import { useEffect, useState } from "react";
import { getStatusLabel } from "../../constants/statusOptions";
import { subscribeToStatusHistory } from "../../services/statusHistoryService";
import type { StatusHistoryEntry } from "../../types/statusHistory";
import "./shipment-timeline.css";

interface ShipmentTimelineProps {
  shipmentId: string;
  title?: string;
}

function formatDateTime(date: Date): string {
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getEventDescription(entry: StatusHistoryEntry): string {
  switch (entry.eventType) {
    case "created":
      return "Embarque criado";
    case "status_change":
      return "Status alterado";
    case "updated":
      return "Embarque atualizado";
    default:
      return "Evento registrado";
  }
}

export function ShipmentTimeline({ shipmentId, title }: ShipmentTimelineProps) {
  const [entries, setEntries] = useState<StatusHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!shipmentId) {
      setEntries([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = subscribeToStatusHistory(
      shipmentId,
      (data) => {
        setEntries(data);
        setLoading(false);
      },
      () => setLoading(false)
    );

    return () => unsubscribe();
  }, [shipmentId]);

  return (
    <div className="shipment-timeline">
      <h4 className="shipment-timeline-title">
        <History size={18} />
        {title || "Histórico de Status"}
      </h4>

      {loading && (
        <p className="shipment-timeline-loading">Carregando histórico...</p>
      )}

      {!loading && entries.length === 0 && (
        <p className="shipment-timeline-empty">
          Nenhum evento registrado para este embarque.
        </p>
      )}

      {!loading && entries.length > 0 && (
        <ul className="shipment-timeline-list">
          {entries.map((entry) => (
            <li key={entry.id} className="shipment-timeline-item">
              <span
                className={`shipment-timeline-dot ${entry.eventType}`}
              />
              <div className="shipment-timeline-content">
                <div className="shipment-timeline-event">
                  {getEventDescription(entry)}
                </div>

                {entry.eventType === "status_change" && entry.fromStatus && (
                  <div className="shipment-timeline-status-change">
                    <span className="shipment-timeline-badge">
                      {getStatusLabel(entry.fromStatus)}
                    </span>
                    <span className="shipment-timeline-arrow">→</span>
                    <span className="shipment-timeline-badge">
                      {getStatusLabel(entry.toStatus)}
                    </span>
                  </div>
                )}

                {entry.eventType === "created" && (
                  <div className="shipment-timeline-status-change">
                    <span className="shipment-timeline-badge">
                      {getStatusLabel(entry.toStatus)}
                    </span>
                  </div>
                )}

                <div className="shipment-timeline-meta">
                  <span>
                    <Clock size={12} style={{ marginRight: 4 }} />
                    {formatDateTime(entry.changedAt)}
                  </span>
                  <span>por {entry.changedByName}</span>
                </div>

                {entry.notes && (
                  <p className="shipment-timeline-notes">{entry.notes}</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
