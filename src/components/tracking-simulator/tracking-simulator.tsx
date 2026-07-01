"use client";

import { Play, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useShipments, type Shipment } from "../../context/shipments-context";
import { getStatusLabel } from "../../constants/statusOptions";
import {
  isCarrierApiAvailable,
  runCarrierBatchSimulation,
} from "../../services/carrierApi";
import {
  getActiveShipmentsForTracking,
  simulateCarrierUpdate,
  TRACKING_INTERVAL_OPTIONS,
} from "../../services/trackingSimulationService";
import "./tracking-simulator.css";

const STORAGE_KEY = "sealogistics_auto_tracking";

interface TrackingLogEntry {
  time: string;
  bl: string;
  message: string;
}

export function TrackingSimulator() {
  const { shipments, updateShipment } = useShipments();
  const [autoTracking, setAutoTracking] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) === "true";
  });
  const [intervalSeconds, setIntervalSeconds] = useState(60);
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState<TrackingLogEntry[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const addLog = (bl: string, message: string) => {
    const time = new Date().toLocaleTimeString("pt-BR");
    setLogs((prev) => [{ time, bl, message }, ...prev].slice(0, 20));
  };

  const applySimulation = useCallback(
    async (targetShipments: Shipment[]) => {
      if (targetShipments.length === 0) {
        addLog("-", "Nenhum embarque ativo para rastreamento");
        return 0;
      }

      if (isCarrierApiAvailable()) {
        try {
          const batch = await runCarrierBatchSimulation(
            Math.min(targetShipments.length, 3)
          );
          for (const result of batch.results) {
            addLog(
              result.numeroBl,
              `${getStatusLabel(result.oldStatus)} → ${getStatusLabel(result.newStatus)} | API: ${result.carrierMessage}`
            );
          }
          if (batch.updated === 0) {
            addLog("-", "API: nenhuma atualização aplicada neste ciclo");
          }
          return batch.updated;
        } catch (error) {
          console.warn("API de transportadora indisponível, usando modo local:", error);
          addLog("-", "API indisponível — usando simulação local");
        }
      }

      let updated = 0;
      for (const shipment of targetShipments) {
        const simulation = simulateCarrierUpdate(shipment);
        if (!simulation) continue;

        try {
          await updateShipment({
            ...shipment,
            status: simulation.status,
            currentLocation: simulation.currentLocation,
            reportedEta: simulation.reportedEta || shipment.reportedEta,
          });
          addLog(
            shipment.numeroBl,
            `${getStatusLabel(shipment.status)} → ${getStatusLabel(simulation.status)} | ${simulation.carrierName}: ${simulation.carrierMessage}`
          );
          updated++;
        } catch (error) {
          console.error("Erro na simulação de tracking:", error);
        }
      }
      return updated;
    },
    [updateShipment]
  );

  const runOnce = async () => {
    setRunning(true);
    const active = getActiveShipmentsForTracking(shipments);
    const count = await applySimulation(
      active.slice(0, 3)
    );
    if (count === 0) {
      addLog("-", "Nenhuma atualização aplicada neste ciclo");
    }
    setRunning(false);
  };

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(autoTracking));
  }, [autoTracking]);

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (!autoTracking) return;

    intervalRef.current = setInterval(() => {
      const active = getActiveShipmentsForTracking(shipments);
      void applySimulation(active.slice(0, 2));
    }, intervalSeconds * 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoTracking, intervalSeconds, shipments, applySimulation]);

  const activeCount = getActiveShipmentsForTracking(shipments).length;

  return (
    <div className="tracking-simulator">
      <p className="tracking-status">
        Simulação de integração com transportadoras. Atualiza status e
        localização automaticamente para embarques em andamento.
        {isCarrierApiAvailable() && (
          <span className="tracking-badge">API ativa</span>
        )}
        <span
          className={`tracking-badge ${autoTracking ? "" : "inactive"}`}
        >
          {autoTracking ? "Auto-tracking ativo" : "Auto-tracking inativo"}
        </span>
      </p>

      <div className="tracking-simulator-controls">
        <label className="tracking-toggle">
          <input
            type="checkbox"
            checked={autoTracking}
            onChange={(e) => setAutoTracking(e.target.checked)}
          />
          Atualização automática
        </label>

        <select
          className="tracking-interval-select"
          value={intervalSeconds}
          onChange={(e) => setIntervalSeconds(Number(e.target.value))}
          disabled={!autoTracking}
        >
          {TRACKING_INTERVAL_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              Intervalo: {opt.label}
            </option>
          ))}
        </select>

        <button
          type="button"
          className="tracking-btn"
          onClick={runOnce}
          disabled={running || activeCount === 0}
        >
          {running ? (
            <RefreshCw size={16} className="spin" />
          ) : (
            <Play size={16} />
          )}
          Simular agora ({activeCount} ativos)
        </button>
      </div>

      {logs.length > 0 && (
        <div className="tracking-log">
          {logs.map((log, i) => (
            <div key={i} className="tracking-log-item">
              <strong>[{log.time}]</strong> BL {log.bl}: {log.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
