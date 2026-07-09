"use client";

import { Copy, Mail, MessageCircle, X } from "lucide-react";
import { useState } from "react";
import { createPortal } from "react-dom";
import { useToast } from "../../context/toast-context";
import type { Shipment } from "../../context/shipments-context";
import {
  buildJabilEmailSubject,
  renderJabilEmailHtml,
  renderJabilWhatsAppText,
} from "../../services/jabilEmailTemplate";
import "./email-preview-modal.css";

interface EmailPreviewModalProps {
  shipment: Shipment;
  onClose: () => void;
}

type PreviewTab = "email" | "whatsapp";

export function EmailPreviewModal({ shipment, onClose }: EmailPreviewModalProps) {
  const [tab, setTab] = useState<PreviewTab>("email");
  const [copied, setCopied] = useState(false);
  const { showSuccess } = useToast();

  const html = renderJabilEmailHtml(shipment);
  const subject = buildJabilEmailSubject(shipment);
  const whatsappText = renderJabilWhatsAppText(shipment);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  const handleCopyWhatsApp = async () => {
    try {
      await navigator.clipboard.writeText(whatsappText);
      setCopied(true);
      showSuccess("Texto copiado — cole no WhatsApp do cliente.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return createPortal(
    <div className="email-preview-overlay" onClick={handleOverlayClick}>
      <div className="email-preview-content">
        <div className="email-preview-header">
          <div>
            <h2>Preview — Comunicação internacional</h2>
            {tab === "email" && (
              <p className="email-preview-subject">{subject}</p>
            )}
          </div>
          <button type="button" className="email-preview-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="email-preview-tabs">
          <button
            type="button"
            className={tab === "email" ? "active" : ""}
            onClick={() => setTab("email")}
          >
            <Mail size={16} /> E-mail
          </button>
          <button
            type="button"
            className={tab === "whatsapp" ? "active" : ""}
            onClick={() => setTab("whatsapp")}
          >
            <MessageCircle size={16} /> WhatsApp
          </button>
        </div>

        <div className="email-preview-body">
          {tab === "email" ? (
            <iframe
              title="Preview e-mail"
              srcDoc={html}
              className="email-preview-iframe"
            />
          ) : (
            <div className="whatsapp-preview-panel">
              <pre className="whatsapp-preview-text">{whatsappText}</pre>
              <button
                type="button"
                className="whatsapp-copy-btn"
                onClick={handleCopyWhatsApp}
              >
                <Copy size={16} />
                {copied ? "Copiado!" : "Copiar texto"}
              </button>
            </div>
          )}
        </div>

        <p className="email-preview-note">
          Modelo alinhado ao padrão JABIL — e-mail e mensagem de embarque internacional.
        </p>
      </div>
    </div>,
    document.body
  );
}
