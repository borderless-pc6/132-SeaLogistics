"use client";

import { Download, FileUp, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { useShipments } from "../../context/shipments-context";
import { getStatusLabel } from "../../constants/statusOptions";
import {
  downloadCSVTemplate,
  parseSpreadsheetFile,
  type ShipmentImportRow,
} from "../../services/csvImportService";
import { downloadFollowUpFieldsTemplate } from "../../services/excelExportService";
import "./csv-import.css";

export function CsvImport() {
  const { addShipment } = useShipments();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<ShipmentImportRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError("");
    setSuccess("");
    setFileName(file.name);

    try {
      const rows = await parseSpreadsheetFile(file);
      setPreview(rows);
    } catch (err) {
      setPreview([]);
      setError(
        err instanceof Error ? err.message : "Erro ao processar arquivo"
      );
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleImport = async () => {
    if (preview.length === 0) return;

    setImporting(true);
    setError("");
    setSuccess("");
    setProgress({ current: 0, total: preview.length });

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < preview.length; i++) {
      try {
        await addShipment(preview[i]);
        successCount++;
      } catch (err) {
        console.error("Erro ao importar linha:", preview[i], err);
        errorCount++;
      }
      setProgress({ current: i + 1, total: preview.length });
    }

    setImporting(false);

    if (successCount > 0) {
      setSuccess(
        `${successCount} embarque(s) importado(s) com sucesso${
          errorCount > 0 ? ` (${errorCount} erro(s))` : ""
        }.`
      );
      setPreview([]);
      setFileName("");
    } else {
      setError("Nenhum registro foi importado. Verifique os dados e permissões.");
    }
  };

  return (
    <div className="csv-import">
      <p className="csv-import-hint">
        Faça upload de um arquivo CSV ou Excel (.xlsx) para importar embarques
        em lote. Use o template para garantir o formato correto das colunas.
      </p>

      <div className="csv-import-actions">
        <button
          type="button"
          className="csv-import-btn secondary"
          onClick={() => void downloadCSVTemplate()}
        >
          <Download size={16} />
          Template embarque (JABIL)
        </button>

        <button
          type="button"
          className="csv-import-btn secondary"
          onClick={() => void downloadFollowUpFieldsTemplate()}
        >
          <Download size={16} />
          Modelo follow-up cliente
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="csv-import-file-input"
          onChange={handleFileSelect}
          disabled={importing}
        />

        <button
          type="button"
          className="csv-import-btn"
          onClick={() => fileInputRef.current?.click()}
          disabled={importing}
        >
          <FileUp size={16} />
          Selecionar arquivo
        </button>

        {preview.length > 0 && (
          <button
            type="button"
            className="csv-import-btn"
            onClick={handleImport}
            disabled={importing}
          >
            <Upload size={16} />
            {importing
              ? `Importando ${progress.current}/${progress.total}...`
              : `Importar ${preview.length} registro(s)`}
          </button>
        )}
      </div>

      {fileName && preview.length > 0 && (
        <p className="csv-import-hint">
          Arquivo: <strong>{fileName}</strong> — {preview.length} registro(s)
          prontos para importação
        </p>
      )}

      {error && <div className="csv-import-error">{error}</div>}
      {success && <div className="csv-import-success">{success}</div>}

      {importing && (
        <p className="csv-import-progress">
          Importando {progress.current} de {progress.total}...
        </p>
      )}

      {preview.length > 0 && !importing && (
        <div className="csv-import-preview">
          <table>
            <thead>
              <tr>
                <th>Cliente</th>
                <th>BL</th>
                <th>Tipo</th>
                <th>POL</th>
                <th>POD</th>
                <th>Status</th>
                <th>Booking</th>
              </tr>
            </thead>
            <tbody>
              {preview.slice(0, 10).map((row, index) => (
                <tr key={index}>
                  <td>{row.cliente}</td>
                  <td>{row.numeroBl}</td>
                  <td>{row.tipo}</td>
                  <td>{row.pol}</td>
                  <td>{row.pod}</td>
                  <td>{getStatusLabel(row.status)}</td>
                  <td>{row.booking}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {preview.length > 10 && (
            <p className="csv-import-hint" style={{ padding: "8px 12px" }}>
              ... e mais {preview.length - 10} registro(s)
            </p>
          )}
        </div>
      )}
    </div>
  );
}
