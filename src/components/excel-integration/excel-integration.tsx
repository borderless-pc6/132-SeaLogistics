import {
  Check,
  Link2,
  PieChart,
  RefreshCw,
  Rocket,
  Settings,
  TrendingUp,
  XCircle,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { ExcelConfig, excelService } from "../../services/excelService";
import ExcelConfigModal from "../excel-config/excel-config";
import ExcelSync from "../excel-sync/excel-sync";
import "./excel-integration.css";

interface ExcelIntegrationProps {
  shipments: any[];
  onShipmentsUpdate: () => void;
}

const ExcelIntegration: React.FC<ExcelIntegrationProps> = ({
  shipments,
  onShipmentsUpdate,
}) => {
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [excelConfig, setExcelConfig] = useState<ExcelConfig | null>(null);
  const [isExcelEnabled, setIsExcelEnabled] = useState(false);

  useEffect(() => {
    // Carrega configuração salva do localStorage
    const savedConfig = localStorage.getItem("excel_config");
    if (savedConfig) {
      try {
        const config = JSON.parse(savedConfig);
        setExcelConfig(config);
        setIsExcelEnabled(true);

        // Valida a configuração em background
        validateConfig(config);
      } catch (error) {
        console.error("Erro ao carregar configuração do Excel:", error);
        localStorage.removeItem("excel_config");
      }
    }
  }, []);

  const validateConfig = async (config: ExcelConfig) => {
    try {
      // Testa se consegue acessar o arquivo
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
      console.log("Configuração Excel válida");
    } catch (error) {
      console.warn("Configuração Excel inválida detectada:", error);
      // Remove configuração inválida
      localStorage.removeItem("excel_config");
      setExcelConfig(null);
      setIsExcelEnabled(false);
    }
  };

  const handleConfigSaved = (config: ExcelConfig) => {
    setExcelConfig(config);
    setIsExcelEnabled(true);
    localStorage.setItem("excel_config", JSON.stringify(config));
    setShowConfigModal(false);
  };

  const handleRemoveConfig = () => {
    setExcelConfig(null);
    setIsExcelEnabled(false);
    localStorage.removeItem("excel_config");
  };

  const handleDataUpdate = () => {
    onShipmentsUpdate();
  };

  return (
    <div className="excel-integration">
      <div className="excel-integration-header">
        <div className="excel-integration-title">
          <div className="excel-icon">
            <PieChart size={24} />
          </div>
          <h3>Integração Excel Online</h3>
        </div>

        <div className="excel-integration-actions">
          {!isExcelEnabled ? (
            <button
              className="excel-button primary"
              onClick={() => setShowConfigModal(true)}
            >
              <span>
                <Link2 size={16} />
              </span>
              Conectar Excell
            </button>
          ) : (
            <div className="excel-actions-group">
              <button
                className="excel-button secondary"
                onClick={() => setShowConfigModal(true)}
              >
                <span>
                  <Settings size={16} />
                </span>
                Configurar
              </button>
              <button
                className="excel-button danger"
                onClick={handleRemoveConfig}
              >
                <span>
                  <XCircle size={16} />
                </span>
                Desconectar
              </button>
            </div>
          )}
        </div>
      </div>

      {isExcelEnabled && excelConfig && (
        <div className="excel-integration-content">
          <ExcelSync config={excelConfig} onDataUpdate={handleDataUpdate} />

          <div className="excel-info">
            <h4>Como funciona:</h4>
            <ul>
              <li>
                <Check size={16} />{" "}
                <strong>Sincronização em tempo real:</strong> Dados são
                atualizados automaticamente
              </li>
              <li>
                <Check size={16} /> <strong>Mapeamento inteligente:</strong>{" "}
                Campos são mapeados automaticamente
              </li>
              <li>
                <Check size={16} /> <strong>Webhook:</strong> Recebe
                notificações quando Excel é modificado
              </li>
              <li>
                <Check size={16} /> <strong>Bidirecional:</strong> Pode enviar e
                receber dados
              </li>
            </ul>
          </div>
        </div>
      )}

      {!isExcelEnabled && (
        <div className="excel-integration-placeholder">
          <div className="placeholder-content">
            <div className="placeholder-icon">
              <TrendingUp size={48} />
            </div>
            <h4>Use Excel como banco de dados vivo</h4>
            <p>
              Conecte sua planilha Excel Online para sincronização em tempo real
              com o sistema.
            </p>
            <div className="placeholder-features">
              <div className="feature-item">
                <span className="feature-icon">
                  <RefreshCw size={16} />
                </span>
                <span>Sincronização automática</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">
                  <PieChart size={16} />
                </span>
                <span>Dados em tempo real</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">
                  <Link2 size={16} />
                </span>
                <span>Integração bidirecional</span>
              </div>
            </div>
            <button
              className="excel-button primary large"
              onClick={() => setShowConfigModal(true)}
            >
              <span>
                <Rocket size={16} />
              </span>
              Começar Integração
            </button>
          </div>
        </div>
      )}

      {showConfigModal && (
        <ExcelConfigModal
          onConfigSaved={handleConfigSaved}
          onClose={() => setShowConfigModal(false)}
        />
      )}
    </div>
  );
};

export default ExcelIntegration;
