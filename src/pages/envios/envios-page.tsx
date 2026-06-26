"use client";

import { useAuth } from "@/context/auth-context";
import { BarChart2, FileUp, Radio } from "lucide-react";
import { useContext, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import ChatAssistant from "../../components/chat-assistant/chat-assistant";
import { CsvImport } from "../../components/csv-import/csv-import";
import ExcelIntegration from "../../components/excel-integration/excel-integration";
import { TrackingSimulator } from "../../components/tracking-simulator/tracking-simulator";
import Navbar from "../../components/navbar/navbar";
import { NavbarContext } from "../../components/navbar/navbar-context";
import ShippingTable, {
  type Shipment,
} from "../../components/shipping-table/shipping-table";
import { useShipments } from "../../context/shipments-context";
import "./envios-page.css";

export const EnviosPage = () => {
  const { isAdmin, isStaff } = useAuth();
  const { isCollapsed } = useContext(NavbarContext);
  const [searchParams] = useSearchParams();
  const [activeFilters, setActiveFilters] = useState({
    status: "",
    filter: "",
  });
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [showExcelIntegration, setShowExcelIntegration] = useState(false);
  const [showCsvImport, setShowCsvImport] = useState(false);
  const [showTracking, setShowTracking] = useState(false);

  const { shipments: dbShipments } = useShipments();

  useEffect(() => {
    // Processar parâmetros da URL para aplicar filtros
    const status = searchParams.get("status") || "";
    const filter = searchParams.get("filter") || "";

    setActiveFilters({ status, filter });
  }, [searchParams]);

  const handleShipmentUpdate = (updatedShipment: Shipment) => {
    console.log("Envio atualizado na página de envios:", updatedShipment);
    // Atualizar o shipment na lista local
    setShipments((prev) =>
      prev.map((shipment) =>
        shipment.id === updatedShipment.id ? updatedShipment : shipment
      )
    );
  };

  const handleShipmentsUpdate = (updatedShipments: any[]) => {
    console.log("Lista de envios atualizada via Excel:", updatedShipments);
    setShipments(updatedShipments);
  };

  return (
    <main className="envios-container">
      <Navbar />
      <div
        className={`envios-content ${isCollapsed ? "navbar-collapsed" : ""}`}
      >
        {isStaff() && (
          <div className="excel-controls">
            <div className="excel-controls-header">
              <h3>
                <Radio size={22} /> Rastreamento Automático
              </h3>
              <button
                className={`excel-toggle-btn ${showTracking ? "active" : ""}`}
                onClick={() => setShowTracking(!showTracking)}
              >
                {showTracking ? "Ocultar" : "Mostrar"}
              </button>
            </div>

            {showTracking && <TrackingSimulator />}
          </div>
        )}

        {isAdmin() && (
          <div className="excel-controls">
            <div className="excel-controls-header">
              <h3>
                <FileUp size={22} /> Importação CSV / Excel
              </h3>
              <button
                className={`excel-toggle-btn ${
                  showCsvImport ? "active" : ""
                }`}
                onClick={() => setShowCsvImport(!showCsvImport)}
              >
                {showCsvImport ? "Ocultar CSV" : "Mostrar CSV"}
              </button>
            </div>

            {showCsvImport && <CsvImport />}
          </div>
        )}

        {isAdmin() && (
          <div className="excel-controls">
            <div className="excel-controls-header">
              <h3>
                <BarChart2 size={22} /> Integração com Excel
              </h3>
              <button
                className={`excel-toggle-btn ${
                  showExcelIntegration ? "active" : ""
                }`}
                onClick={() => setShowExcelIntegration(!showExcelIntegration)}
              >
                {showExcelIntegration ? "Ocultar Excel" : "Mostrar Excel"}
              </button>
            </div>

            {showExcelIntegration && (
              <ExcelIntegration
                shipments={dbShipments}
                onShipmentsUpdate={handleShipmentsUpdate}
              />
            )}
          </div>
        )}

        {/* Mostrar filtros ativos se houver */}
        {(activeFilters.status || activeFilters.filter) && (
          <div className="active-filters">
            <h3>Filtros Ativos:</h3>
            <div className="filter-tags">
              {activeFilters.status && (
                <span className="filter-tag">
                  Status:{" "}
                  {activeFilters.status === "em-transito"
                    ? "Em Trânsito"
                    : activeFilters.status === "concluido"
                    ? "Entregue"
                    : activeFilters.status === "documentacao"
                    ? "Pendente"
                    : activeFilters.status}
                </span>
              )}
              {activeFilters.filter === "this-month" && (
                <span className="filter-tag">Este Mês</span>
              )}
            </div>
          </div>
        )}

        <ShippingTable
          onShipmentUpdate={handleShipmentUpdate}
          initialFilters={activeFilters}
        />
      </div>
      <ChatAssistant />
    </main>
  );
};
