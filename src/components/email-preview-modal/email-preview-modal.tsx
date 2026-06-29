"use client";

import { X } from "lucide-react";
import { createPortal } from "react-dom";
import type { Shipment } from "../../context/shipments-context";
import {
  buildJabilEmailSubject,
  renderJabilEmailHtml,
} from "../../services/jabilEmailTemplate";
import "./email-preview-modal.css";

interface EmailPreviewModalProps {
  shipment: Shipment;
  onClose: () => void;
}

export function EmailPreviewModal({ shipment, onClose }: EmailPreviewModalProps) {
  const html = renderJabilEmailHtml(shipment);
  const subject = buildJabilEmailSubject(shipment);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return createPortal(
    <div className="email-preview-overlay" onClick={handleOverlayClick}>
      <div className="email-preview-content">
        <div className="email-preview-header">
          <div>
            <h2>Preview — E-mail JABIL</h2>
            <p className="email-preview-subject">{subject}</p>
          </div>
          <button type="button" className="email-preview-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div className="email-preview-body">
          <iframe
            title="Preview e-mail"
            srcDoc={html}
            className="email-preview-iframe"
          />
        </div>
        <p className="email-preview-note">
          Preview local — o envio real usa o servidor de e-mail quando configurado.
        </p>
      </div>
    </div>,
    document.body
  );
}
