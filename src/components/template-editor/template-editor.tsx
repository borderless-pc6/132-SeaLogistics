"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../../context/auth-context";
import {
  getAllDefaultTemplates,
  getTemplate,
  saveTemplate,
} from "../../services/templateService";
import type {
  NotificationTemplate,
  NotificationTemplateId,
} from "../../types/notificationTemplate";
import { TEMPLATE_VARIABLES } from "../../types/notificationTemplate";
import "./template-editor.css";

export function TemplateEditor() {
  const { currentUser } = useAuth();
  const templateIds = getAllDefaultTemplates().map((t) => t.id);
  const [selectedId, setSelectedId] =
    useState<NotificationTemplateId>("new_shipment_email");
  const [template, setTemplate] = useState<NotificationTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await getTemplate(selectedId);
        setTemplate(data);
      } catch {
        setMessage({ type: "error", text: "Erro ao carregar template" });
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [selectedId]);

  const handleSave = async () => {
    if (!template || !currentUser) return;
    setSaving(true);
    setMessage(null);
    try {
      await saveTemplate(
        template,
        currentUser.displayName || currentUser.email
      );
      setMessage({ type: "success", text: "Template salvo com sucesso!" });
    } catch {
      setMessage({ type: "error", text: "Erro ao salvar template" });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    const defaults = getAllDefaultTemplates();
    const defaultTemplate = defaults.find((t) => t.id === selectedId);
    if (defaultTemplate) {
      setTemplate({ ...defaultTemplate });
      setMessage({ type: "success", text: "Template restaurado para o padrão (salve para aplicar)" });
    }
  };

  const insertVariable = (variable: string) => {
    if (!template) return;
    setTemplate({ ...template, body: template.body + variable });
  };

  if (loading || !template) {
    return <p className="template-hint">Carregando templates...</p>;
  }

  return (
    <div className="template-editor">
      <p className="template-hint">
        Personalize os textos das notificações por email e WhatsApp. Use as
        variáveis abaixo para inserir dados dinâmicos do embarque.
      </p>

      <div className="template-list">
        {templateIds.map((id) => (
          <button
            key={id}
            type="button"
            className={`template-tab ${selectedId === id ? "active" : ""}`}
            onClick={() => setSelectedId(id)}
          >
            {id.replace(/_/g, " ")}
          </button>
        ))}
      </div>

      <div className="template-variables">
        {TEMPLATE_VARIABLES.map((v) => (
          <button
            key={v}
            type="button"
            className="template-variable"
            onClick={() => insertVariable(v)}
            title="Clique para inserir no corpo"
          >
            {v}
          </button>
        ))}
      </div>

      <div className="template-form">
        <div>
          <label htmlFor="template-name">Nome</label>
          <input
            id="template-name"
            value={template.name}
            onChange={(e) =>
              setTemplate({ ...template, name: e.target.value })
            }
          />
        </div>

        {template.subject !== undefined && (
          <div>
            <label htmlFor="template-subject">Assunto (email)</label>
            <input
              id="template-subject"
              value={template.subject || ""}
              onChange={(e) =>
                setTemplate({ ...template, subject: e.target.value })
              }
            />
          </div>
        )}

        <div>
          <label htmlFor="template-body">Corpo da mensagem</label>
          <textarea
            id="template-body"
            value={template.body}
            onChange={(e) =>
              setTemplate({ ...template, body: e.target.value })
            }
          />
        </div>
      </div>

      <div className="template-actions">
        <button
          type="button"
          className="template-save-btn"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? "Salvando..." : "Salvar Template"}
        </button>
        <button
          type="button"
          className="template-reset-btn"
          onClick={handleReset}
        >
          Restaurar Padrão
        </button>
      </div>

      {message && (
        <div className={`template-message ${message.type}`}>{message.text}</div>
      )}
    </div>
  );
}
