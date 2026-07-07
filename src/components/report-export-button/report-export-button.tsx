"use client";

import {
  ChevronDown,
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Shipment } from "../../context/shipments-context";
import { useLanguage } from "../../context/language-context";
import { useToast } from "../../context/toast-context";
import { exportShipmentsReport } from "../../services/excelExportService";
import { exportShipmentsReportToPDF } from "../../services/pdfExportService";
import "./report-export-button.css";

interface ReportExportButtonProps {
  shipments: Shipment[];
  disabled?: boolean;
}

export function ReportExportButton({
  shipments,
  disabled = false,
}: ReportExportButtonProps) {
  const { translations, language } = useLanguage();
  const { showSuccess, showError } = useToast();
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState<"excel" | "pdf" | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const isDisabled = disabled || exporting !== null || shipments.length === 0;

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const handleExportExcel = async () => {
    setExporting("excel");
    try {
      await exportShipmentsReport(shipments);
      showSuccess(translations.exportSuccess);
      setOpen(false);
    } catch (error) {
      console.error("Erro ao exportar Excel:", error);
      showError(translations.exportError);
    } finally {
      setExporting(null);
    }
  };

  const handleExportPDF = async () => {
    setExporting("pdf");
    try {
      await exportShipmentsReportToPDF(
        shipments,
        language as "pt" | "en" | "es"
      );
      showSuccess(translations.exportSuccess);
      setOpen(false);
    } catch (error) {
      console.error("Erro ao exportar PDF:", error);
      showError(translations.exportError);
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="report-export" ref={containerRef}>
      <button
        type="button"
        className="report-export-trigger"
        disabled={isDisabled}
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        {exporting ? (
          <Loader2 size={18} className="report-export-spinner" />
        ) : (
          <Download size={18} />
        )}
        <span>{translations.exportReports}</span>
        <ChevronDown
          size={16}
          className={`report-export-chevron ${open ? "open" : ""}`}
        />
      </button>

      {open && (
        <div className="report-export-menu" role="menu">
          <button
            type="button"
            role="menuitem"
            className="report-export-option"
            disabled={exporting !== null}
            onClick={handleExportExcel}
          >
            <FileSpreadsheet size={18} />
            <div>
              <strong>{translations.exportAsExcel}</strong>
              <span>{translations.exportAll}</span>
            </div>
          </button>
          <button
            type="button"
            role="menuitem"
            className="report-export-option"
            disabled={exporting !== null}
            onClick={handleExportPDF}
          >
            <FileText size={18} />
            <div>
              <strong>{translations.exportAsPDF}</strong>
              <span>{translations.exportAll}</span>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
