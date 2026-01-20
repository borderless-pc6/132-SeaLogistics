import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";
import React, { useEffect, useState } from "react";
import "./toast.css";

export type ToastType = "success" | "error" | "warning" | "info";

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastProps {
  toast: Toast;
  onClose: (id: string) => void;
}

export const ToastComponent: React.FC<ToastProps> = ({ toast, onClose }) => {
  const [progress, setProgress] = useState(100);
  const duration = toast.duration || 5000;

  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(toast.id);
    }, duration);

    // Animação da barra de progresso
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        const decrement = 100 / (duration / 50);
        const newProgress = prev - decrement;
        return newProgress <= 0 ? 0 : newProgress;
      });
    }, 50);

    return () => {
      clearTimeout(timer);
      clearInterval(progressInterval);
    };
  }, [toast.id, duration, onClose]);

  const getIcon = () => {
    const iconProps = { size: 20, className: "toast-icon-svg" };
    switch (toast.type) {
      case "success":
        return <CheckCircle2 {...iconProps} />;
      case "error":
        return <XCircle {...iconProps} />;
      case "warning":
        return <AlertTriangle {...iconProps} />;
      case "info":
        return <Info {...iconProps} />;
      default:
        return null;
    }
  };

  return (
    <div
      className={`toast toast-${toast.type}`}
      role="alert"
      aria-live="assertive"
    >
      <div className="toast-content">
        <div className="toast-icon-wrapper">{getIcon()}</div>
        <span className="toast-message">{toast.message}</span>
      </div>
      <button
        className="toast-close"
        onClick={(e) => {
          e.stopPropagation();
          onClose(toast.id);
        }}
        aria-label="Fechar notificação"
      >
        <X size={18} />
      </button>
      <div className="toast-progress-bar">
        <div
          className="toast-progress-fill"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};
