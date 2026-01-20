"use client";

import type React from "react";
import { useEffect, useRef, useState } from "react";
import { useShipments } from "../../context/shipments-context";
import { excelService, type ExcelConfig } from "../../services/excelService";
import "./excel-sync.css";

interface ExcelSyncProps {
  config: ExcelConfig | null;
  onDataUpdate: (data: any[]) => void;
  currentShipments?: any[];
}

const ExcelSync: React.FC<ExcelSyncProps> = ({
  config,
  onDataUpdate,
  currentShipments = [],
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [syncStatus, setSyncStatus] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [autoSync, setAutoSync] = useState(false);
  const [syncInterval, setSyncInterval] = useState<NodeJS.Timeout | null>(null);
  const [excelData, setExcelData] = useState<any[]>([]);
  const [isSavingToDb, setIsSavingToDb] = useState(false);
  const [syncIntervalSeconds, setSyncIntervalSeconds] = useState<number>(30);
  const [syncProgress, setSyncProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);
  const { addShipment, deleteAllShipments } = useShipments();

  const performSyncRef = useRef<any>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (config) {
      checkConnection();
    }
    return () => {
      if (syncInterval) {
        clearInterval(syncInterval);
      }
    };
  }, [config]);

  useEffect(() => {
    performSyncRef.current = performSync;
  });

  // Não inicia auto-sync automaticamente - usuário deve ativar manualmente
  // useEffect removido para dar controle ao usuário

  const checkConnection = async () => {
    if (!config) return;

    try {
      setSyncStatus("Verificando conexão...");
      setError("");

      if (config.tableName === "default_table") {
        await excelService.getWorksheetDataDirect(
          config.workbookId,
          config.worksheetName
        );
      } else {
        await excelService.getTableRows(
          config.workbookId,
          config.worksheetName,
          config.tableName
        );
      }
      setIsConnected(true);
      setError("");
      setSyncStatus("Conexão verificada com sucesso");
    } catch (error: any) {
      console.error("Erro na verificação de conexão:", error);
      setIsConnected(false);

      const errorMessage =
        error?.userMessage ||
        error?.message ||
        "Erro na conexão com Excel - arquivo não encontrado ou sem permissão";
      setError(errorMessage);
      setSyncStatus("Erro na verificação de conexão");
    }
  };

  // Debounce para evitar múltiplas sincronizações simultâneas
  const performSyncDebounced = () => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      performSync();
    }, 500);
  };

  const performSync = async () => {
    if (!config || isSyncing) {
      console.log("Sincronização ignorada: config ausente ou já sincronizando");
      return;
    }

    setIsSyncing(true);
    setSyncStatus("Sincronizando...");
    setError("");
    setSyncProgress(null);

    try {
      const excelDataResult = await excelService.getShipmentsFromExcel(config);
      console.log("Dados obtidos do Excel:", excelDataResult);

      setExcelData(excelDataResult);

      onDataUpdate(excelDataResult);

      setLastSync(new Date());
      setSyncStatus(
        `✅ Sincronizado com sucesso - ${excelDataResult.length} registros`
      );
      setIsConnected(true);
      setSyncProgress(null);
    } catch (error: any) {
      console.error("Erro na sincronização:", error);

      const errorMessage =
        error?.userMessage ||
        error?.message ||
        "Erro na sincronização com Excel";
      setError(errorMessage);
      setSyncStatus("❌ Erro na sincronização");
      setIsConnected(false);
      setSyncProgress(null);
    } finally {
      setIsSyncing(false);
    }
  };

  const saveToDatabase = async () => {
    if (excelData.length === 0) {
      setError("Nenhum dado do Excel para salvar");
      return;
    }

    setIsSavingToDb(true);
    setError("");
    let successCount = 0;
    let errorCount = 0;

    try {
      console.log(
        "Deletando todos os shipments existentes do banco de dados..."
      );
      await deleteAllShipments();
      console.log("Shipments deletados com sucesso");

      for (const shipment of excelData) {
        try {
          const shipmentToSave = {
            cliente: shipment.cliente || "",
            operador: shipment.operador || "",
            shipper: shipment.shipper || "",
            invoice: shipment.invoice || "",
            pol: shipment.pol || "",
            pod: shipment.pod || "",
            etdOrigem: shipment.etdOrigem || "",
            etaDestino: shipment.etaDestino || "",
            currentLocation: shipment.currentLocation || "",
            quantBox: shipment.quantBox || 0,
            status: shipment.status || "pendente",
            numeroBl: shipment.numeroBl || "",
            armador: shipment.armador || "",
            booking: shipment.booking || "",
            tipo: shipment.tipo || "Marítimo",
            observacoes: shipment.observacoes || "",
          };

          await addShipment(shipmentToSave);
          successCount++;
        } catch (err) {
          console.error("Erro ao salvar shipment:", err);
          errorCount++;
        }
      }

      setSyncStatus(
        `✅ Salvos com sucesso: ${successCount} registros${
          errorCount > 0 ? ` (${errorCount} erros)` : ""
        }`
      );
      setExcelData([]);
      onDataUpdate([]);
    } catch (error) {
      console.error("Erro ao salvar dados no banco:", error);
      setError("Erro ao salvar dados no banco de dados");
      setExcelData([]);
      onDataUpdate([]);
    } finally {
      setIsSavingToDb(false);
    }
  };

  const syncToExcel = async () => {
    if (!config || isSyncing || currentShipments.length === 0) return;

    setIsSyncing(true);
    setSyncStatus("Enviando dados para Excel...");
    setError("");

    try {
      const shipmentsToSync = currentShipments.map((shipment) => ({
        cliente: shipment.cliente || "",
        operador: shipment.operador || "",
        shipper: shipment.shipper || "",
        invoice: shipment.invoice || "",
        pol: shipment.pol || "",
        pod: shipment.pod || "",
        etdOrigem: shipment.etdOrigem || "",
        etaDestino: shipment.etaDestino || "",
        currentLocation: shipment.currentLocation || "",
        quantBox: shipment.quantBox || 0,
        status: shipment.status || "pendente",
        numeroBl: shipment.numeroBl || "",
        armador: shipment.armador || "",
        booking: shipment.booking || "",
        tipo: shipment.tipo || "Marítimo",
        observacoes: shipment.observacoes || "",
      }));

      await excelService.syncShipmentsToExcel(config, shipmentsToSync);
      setLastSync(new Date());
      setSyncStatus(
        `✅ Dados enviados com sucesso para Excel - ${shipmentsToSync.length} registros`
      );
    } catch (error) {
      console.error("Erro ao enviar dados para Excel:", error);
      setError("Erro ao enviar dados para Excel");
      setSyncStatus("Erro no envio");
    } finally {
      setIsSyncing(false);
    }
  };

  const toggleAutoSync = () => {
    if (autoSync) {
      if (syncInterval) {
        clearInterval(syncInterval);
        setSyncInterval(null);
      }
      setAutoSync(false);
      setSyncStatus("Sincronização automática desabilitada");
    } else {
      if (!isConnected) {
        setError("Conecte-se ao Excel primeiro antes de ativar auto-sync");
        return;
      }

      const intervalMs = syncIntervalSeconds * 1000;
      const interval = setInterval(() => {
        if (performSyncRef.current) {
          performSyncRef.current();
        }
      }, intervalMs);

      setSyncInterval(interval);
      setAutoSync(true);
      setSyncStatus(
        `Sincronização automática ativada (${syncIntervalSeconds}s)`
      );

      if (performSyncRef.current) {
        performSyncRef.current();
      }
    }
  };

  const handleIntervalChange = (seconds: number) => {
    const validInterval = Math.max(10, Math.min(300, seconds));
    setSyncIntervalSeconds(validInterval);

    if (autoSync && syncInterval) {
      clearInterval(syncInterval);
      const newInterval = setInterval(() => {
        if (performSyncRef.current) {
          performSyncRef.current();
        }
      }, validInterval * 1000);
      setSyncInterval(newInterval);
      setSyncStatus(`Sincronização automática atualizada (${validInterval}s)`);
    }
  };

  const setupWebhook = async () => {
    if (!config) return;

    try {
      const callbackUrl = `${window.location.origin}/api/excel/webhook`;
      await excelService.setupWebhook(config.workbookId, callbackUrl);
      setSyncStatus("Webhook configurado para mudanças em tempo real");
    } catch (error) {
      console.error("Erro ao configurar webhook:", error);
      setError("Erro ao configurar webhook");
    }
  };

  // Função para buscar dados do servidor
  const fetchDataFromServer = async () => {
    if (!config) return;

    try {
      const response = await fetch(
        `/api/excel/data/${config.workbookId}/${config.worksheetName}/${config.tableName}`
      );
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          onDataUpdate(result.data);
          setLastSync(new Date());
          setSyncStatus(
            `Dados atualizados do servidor - ${result.data.length} registros`
          );
        }
      }
    } catch (error) {
      console.error("Erro ao buscar dados do servidor:", error);
    }
  };

  const removeWebhook = async () => {
    try {
      await excelService.removeWebhook();
      setSyncStatus("Webhook removido");
    } catch (error) {
      console.error("Erro ao remover webhook:", error);
    }
  };

  const clearInvalidConfig = () => {
    localStorage.removeItem("excel_config");
    setSyncStatus("Configuração inválida removida. Reconecte-se ao Excel.");
    setError("");
    setIsConnected(false);
  };

  if (!config) {
    return (
      <div className="excel-sync-container">
        <div className="excel-sync-placeholder">
          <div className="excel-icon">📊</div>
          <h3>Excel não configurado</h3>
          <p>
            Configure a integração com Excel para sincronização em tempo real
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="excel-sync-container">
      <div className="excel-sync-header">
        <div className="excel-sync-title">
          <div className="excel-icon">📊</div>
          <h3>Sincronização Excell</h3>
        </div>
        <div
          className={`connection-status ${
            isConnected ? "connected" : "disconnected"
          }`}
        >
          <div className="status-dot"></div>
          <span>{isConnected ? "Conectado" : "Desconectado"}</span>
        </div>
      </div>

      <div className="excel-sync-info">
        <div className="sync-info-item">
          <span className="info-label">📁 Arquivo:</span>
          <span className="info-value">{config.workbookId}</span>
        </div>
        <div className="sync-info-item">
          <span className="info-label">📋 Planilha:</span>
          <span className="info-value">
            {config.worksheetDisplayName || config.worksheetName}
          </span>
        </div>
        <div className="sync-info-item">
          <span className="info-label">📊 Tabela:</span>
          <span className="info-value">{config.tableName}</span>
        </div>
        {lastSync && (
          <div className="sync-info-item">
            <span className="info-label">⏱️ Última sincronização:</span>
            <span className="info-value">{lastSync.toLocaleString()}</span>
          </div>
        )}
      </div>

      {syncStatus && (
        <div className={`sync-status ${error ? "error" : "success"}`}>
          {syncStatus}
          {syncProgress && (
            <div style={{ marginTop: "8px", fontSize: "12px", opacity: 0.8 }}>
              Progresso: {syncProgress.current} / {syncProgress.total}
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="error-message">
          <strong>Erro:</strong> {error}
          <button
            onClick={() => setError("")}
            style={{
              marginLeft: "12px",
              padding: "4px 8px",
              fontSize: "12px",
              background: "transparent",
              border: "1px solid currentColor",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Fechar
          </button>
        </div>
      )}

      <div className="excel-sync-actions">
        <button
          className="sync-button primary"
          onClick={performSyncDebounced}
          disabled={isSyncing || !isConnected}
        >
          {isSyncing ? (
            <>
              <div className="loading-spinner"></div>
              Sincronizando...
            </>
          ) : (
            <>
              <span>🔄</span>
              Sincronizar do Excel
            </>
          )}
        </button>

        <button
          className="sync-button primary"
          onClick={syncToExcel}
          disabled={isSyncing || !isConnected || currentShipments.length === 0}
          title={
            currentShipments.length === 0
              ? "Nenhum dado no banco para enviar"
              : "Enviar dados do banco de dados para o Excel"
          }
        >
          {isSyncing ? (
            <>
              <div className="loading-spinner"></div>
              Enviando...
            </>
          ) : (
            <>
              <span>📤</span>
              Enviar para Excel ({currentShipments.length})
            </>
          )}
        </button>

        <button
          className="sync-button primary"
          onClick={saveToDatabase}
          disabled={isSavingToDb || excelData.length === 0}
          title={
            excelData.length === 0
              ? "Sincronize primeiro para ter dados"
              : "Salvar dados do Excel no banco de dados"
          }
        >
          {isSavingToDb ? (
            <>
              <div className="loading-spinner"></div>
              Salvando...
            </>
          ) : (
            <>
              <span>💾</span>
              Salvar no Banco de Dados ({excelData.length})
            </>
          )}
        </button>

        <div
          style={{
            display: "flex",
            gap: "8px",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <button
            className={`sync-button ${autoSync ? "active" : "secondary"}`}
            onClick={toggleAutoSync}
            disabled={isSyncing || !isConnected}
          >
            <span>{autoSync ? "⏸️" : "▶️"}</span>
            {autoSync ? "Parar Auto Sync" : "Auto Sync"}
          </button>

          {autoSync && (
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <label style={{ fontSize: "12px", color: "#6b7280" }}>
                Intervalo:
              </label>
              <input
                type="number"
                min="10"
                max="300"
                value={syncIntervalSeconds}
                onChange={(e) =>
                  handleIntervalChange(parseInt(e.target.value, 10) || 30)
                }
                style={{
                  width: "60px",
                  padding: "6px 8px",
                  border: "1px solid #d1d5db",
                  borderRadius: "4px",
                  fontSize: "12px",
                }}
                disabled={isSyncing}
              />
              <span style={{ fontSize: "12px", color: "#6b7280" }}>seg</span>
            </div>
          )}
        </div>

        <button
          className="sync-button secondary"
          onClick={checkConnection}
          disabled={isSyncing}
        >
          <span>🔍</span>
          Verificar Conexão
        </button>

        <button
          className="sync-button secondary"
          onClick={fetchDataFromServer}
          disabled={isSyncing}
        >
          <span>📡</span>
          Buscar do Servidor
        </button>

        {error && error.includes("não encontrado") && (
          <button
            className="sync-button danger"
            onClick={clearInvalidConfig}
            disabled={isSyncing}
          >
            <span>🔄</span>
            Reconectar Excel
          </button>
        )}
      </div>

      {excelData.length > 0 && (
        <div className="excel-data-display">
          <h4>📋 Dados do Excel ({excelData.length} registros)</h4>
          <div className="excel-data-table-wrapper">
            <table className="excel-data-table">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Tipo</th>
                  <th>Shipper</th>
                  <th>POL</th>
                  <th>POD</th>
                  <th>ETD</th>
                  <th>ETA</th>
                  <th>Status</th>
                  <th>N° BL</th>
                  <th>Armador</th>
                </tr>
              </thead>
              <tbody>
                {excelData.map((row, index) => (
                  <tr key={index}>
                    <td>{row.cliente || "-"}</td>
                    <td>{row.tipo || "-"}</td>
                    <td>{row.shipper || "-"}</td>
                    <td>{row.pol || "-"}</td>
                    <td>{row.pod || "-"}</td>
                    <td>{row.etdOrigem || "-"}</td>
                    <td>{row.etaDestino || "-"}</td>
                    <td>
                      <span
                        className={`status-badge status-${
                          row.status?.toLowerCase() || "pendente"
                        }`}
                      >
                        {row.status || "Pendente"}
                      </span>
                    </td>
                    <td>{row.numeroBl || "-"}</td>
                    <td>{row.armador || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="excel-sync-advanced">
        <h4>Configurações Avançadas</h4>
        <div className="advanced-actions">
          <button
            className="webhook-button"
            onClick={setupWebhook}
            disabled={isSyncing}
          >
            <span>🔗</span>
            Configurar Webhook
          </button>

          <button
            className="webhook-button remove"
            onClick={removeWebhook}
            disabled={isSyncing}
          >
            <span>❌</span>
            Remover Webhook
          </button>
        </div>

        <div className="webhook-info">
          <p>
            <strong>Webhook:</strong> Recebe notificações em tempo real quando o
            Excel é modificado
          </p>
          <p>
            <strong>Auto Sync:</strong> Sincroniza automaticamente a cada 30
            segundos
          </p>
        </div>
      </div>

      <div className="excel-sync-stats">
        <h4>Estatísticas</h4>
        <div className="stats-grid">
          <div className="stat-item">
            <div className="stat-value">{config.headers.length}</div>
            <div className="stat-label">Colunas Mapeadas</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">
              {Object.keys(config.mapping).length}
            </div>
            <div className="stat-label">Campos Ativos</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">{autoSync ? "Ativo" : "Inativo"}</div>
            <div className="stat-label">Auto Sync</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">{excelData.length}</div>
            <div className="stat-label">Registros Carregados</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExcelSync;
