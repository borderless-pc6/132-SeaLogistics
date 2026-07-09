"use client";

import { useAuth } from "@/context/auth-context";
import { BarChart2, FileUp, Radio, X } from "lucide-react";
import { useContext, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import ChatAssistant from "../../components/chat-assistant/chat-assistant";
import { CsvImport } from "../../components/csv-import/csv-import";
import ExcelIntegration from "../../components/excel-integration/excel-integration";
import { TrackingSimulator } from "../../components/tracking-simulator/tracking-simulator";
import Navbar from "../../components/navbar/navbar";
import { NavbarContext } from "../../components/navbar/navbar-context";
import ShippingTable from "../../components/shipping-table/shipping-table";
import { getStatusLabel } from "../../constants/statusOptions";
import { useShipments } from "../../context/shipments-context";
import "./envios-page.css";

export const EnviosPage = () => {
  const { canImportShipments, isStaff } = useAuth();
  const { isCollapsed } = useContext(NavbarContext);
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeFilters, setActiveFilters] = useState({
    status: "",
    filter: "",
  });
  const [showExcelIntegration, setShowExcelIntegration] = useState(false);
  const [showCsvImport, setShowCsvImport] = useState(false);
  const [showTracking, setShowTracking] = useState(false);

  const { shipments: dbShipments, refresh } = useShipments();

  useEffect(() => {
    const status = searchParams.get("status") || "";
    const filter =
      searchParams.get("filter") || searchParams.get("period") || "";

    setActiveFilters({ status, filter });
  }, [searchParams]);

  const clearUrlParam = (key: "status" | "filter") => {
    const params = new URLSearchParams(searchParams);
    if (key === "status") {
      params.delete("status");
    } else {
      params.delete("filter");
      params.delete("period");
    }
    setSearchParams(params, { replace: true });
  };

  const handleShipmentsUpdate = () => {
    refresh();
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

        {canImportShipments() && (
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

        {canImportShipments() && (
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

        {(activeFilters.status || activeFilters.filter) && (
          <div className="active-filters">
            <h3>Filtros ativos</h3>
            <div className="filter-tags">
              {activeFilters.status && (
                <button
                  type="button"
                  className="filter-tag filter-tag--dismissible"
                  onClick={() => clearUrlParam("status")}
                  aria-label="Remover filtro de status"
                >
                  Status: {getStatusLabel(activeFilters.status)}
                  <X size={14} />
                </button>
              )}
              {activeFilters.filter === "this-month" && (
                <button
                  type="button"
                  className="filter-tag filter-tag--dismissible"
                  onClick={() => clearUrlParam("filter")}
                  aria-label="Remover filtro deste mês"
                >
                  Este mês
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        )}

        <ShippingTable initialFilters={activeFilters} />
      </div>
      <ChatAssistant />
    </main>
  );
};
