import { AlertCircle, Check, ChevronDown, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { isValidStatusTransition } from "../../utils/statusTransitions";
import { useDropdown } from "./dropdown-context";
import "./status-selector.css";

export interface StatusOption {
  value: string;
  label: string;
  color: string;
  bgColor: string;
}

interface StatusSelectorProps {
  currentStatus: string;
  onStatusChange: (newStatus: string) => Promise<void> | void;
  disabled?: boolean;
  instanceId: string;
}

const statusOptions: StatusOption[] = [
  // Status Inicial - Documentação
  {
    value: "documentacao",
    label: "Documentação",
    color: "#ffffff",
    bgColor: "#6c757d",
  },

  // Status de Planejamento
  {
    value: "agendado",
    label: "Agendado",
    color: "#ffffff",
    bgColor: "#17a2b8",
  },

  // Status de Preparação
  {
    value: "a-embarcar",
    label: "A Embarcar",
    color: "#8b5a00",
    bgColor: "#ffd166",
  },

  // Status de Embarque
  {
    value: "embarcando",
    label: "Embarcando",
    color: "#ffffff",
    bgColor: "#fd7e14",
  },

  // Status de Trânsito
  {
    value: "em-transito",
    label: "Em Trânsito",
    color: "#ffffff",
    bgColor: "#118ab2",
  },

  // Status de Desembarque
  {
    value: "desembarcando",
    label: "Desembarcando",
    color: "#ffffff",
    bgColor: "#6f42c1",
  },

  // Status de Entrega
  {
    value: "em-entrega",
    label: "Em Entrega",
    color: "#ffffff",
    bgColor: "#20c997",
  },

  // Status Final
  {
    value: "concluido",
    label: "Concluído",
    color: "#ffffff",
    bgColor: "#073b4c",
  },

  // Status de Problemas
  {
    value: "atrasado",
    label: "Atrasado",
    color: "#ffffff",
    bgColor: "#dc3545",
  },

  {
    value: "cancelado",
    label: "Cancelado",
    color: "#ffffff",
    bgColor: "#6c757d",
  },

  {
    value: "suspenso",
    label: "Suspenso",
    color: "#ffffff",
    bgColor: "#ffc107",
  },
];

const StatusSelector = ({
  currentStatus,
  onStatusChange,
  disabled = false,
  instanceId,
}: StatusSelectorProps) => {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const { isDropdownOpen, openDropdown, closeDropdown, closeAllDropdowns } =
    useDropdown();
  const [dropdownPosition, setDropdownPosition] = useState<"bottom" | "top">(
    "bottom"
  );
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string>("");
  const [isUpdating, setIsUpdating] = useState(false);

  const isOpen = isDropdownOpen(instanceId);
  const currentOption =
    statusOptions.find((option) => option.value === currentStatus) ||
    statusOptions[0];
  const pendingOption = statusOptions.find(
    (option) => option.value === pendingStatus
  );

  // Função para calcular a melhor posição do dropdown
  const calculateDropdownPosition = () => {
    if (triggerRef.current && dropdownRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const dropdownHeight = Math.min(300, statusOptions.length * 42 + 20); // Altura dinâmica baseada no conteúdo
      const padding = 20; // Margem de segurança

      const spaceBelow = viewportHeight - triggerRect.bottom - padding;
      const spaceAbove = triggerRect.top - padding;

      // Calcular posição para position: fixed
      const dropdownElement =
        dropdownRef.current.querySelector(".status-dropdown");
      if (dropdownElement) {
        // Posicionar o dropdown exatamente abaixo ou acima do trigger
        const left = triggerRect.left;
        const width = triggerRect.width;

        (dropdownElement as HTMLElement).style.left = `${left}px`;
        (dropdownElement as HTMLElement).style.width = `${width}px`;

        if (spaceBelow >= dropdownHeight) {
          setDropdownPosition("bottom");
          (dropdownElement as HTMLElement).style.top = `${triggerRect.bottom + 8
            }px`;
          (dropdownElement as HTMLElement).style.bottom = "auto";
        } else if (spaceAbove >= dropdownHeight) {
          setDropdownPosition("top");
          (dropdownElement as HTMLElement).style.bottom = `${viewportHeight - triggerRect.top + 8
            }px`;
          (dropdownElement as HTMLElement).style.top = "auto";
        } else {
          // Se não há espaço suficiente, preferir para cima
          setDropdownPosition("top");
          (dropdownElement as HTMLElement).style.bottom = `${viewportHeight - triggerRect.top + 8
            }px`;
          (dropdownElement as HTMLElement).style.top = "auto";
        }
      }
    }
  };

  const handleConfirmChange = async () => {
    if (pendingStatus) {
      const check = isValidStatusTransition(currentStatus, pendingStatus);
      if (!check.valid) {
        alert(check.reason || "Transição de status inválida.");
        setShowConfirmation(false);
        setPendingStatus("");
        return;
      }

      setIsUpdating(true);
      try {
        await onStatusChange(pendingStatus);
        setShowConfirmation(false);
        setPendingStatus("");
      } catch (error) {
        console.error("Erro ao confirmar mudança de status:", error);
        // Não fechar modal em caso de erro para permitir nova tentativa
      } finally {
        setIsUpdating(false);
      }
    }
  };

  const handleCancelChange = () => {
    setShowConfirmation(false);
    setPendingStatus("");
  };

  // Fechar dropdown com ESC e reposicionar com scroll
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (showConfirmation) {
          handleCancelChange();
        } else if (isOpen) {
          closeAllDropdowns();
        }
      }
    };

    const handleScroll = () => {
      if (isOpen) {
        calculateDropdownPosition();
      }
    };

    const handleResize = () => {
      if (isOpen) {
        calculateDropdownPosition();
      }
    };

    if (isOpen || showConfirmation) {
      document.addEventListener("keydown", handleEscape);

      if (isOpen) {
        window.addEventListener("scroll", handleScroll, true);
        window.addEventListener("resize", handleResize);

        // Calcular posição quando o dropdown abrir
        setTimeout(() => {
          calculateDropdownPosition();
        }, 10);
      }

      return () => {
        document.removeEventListener("keydown", handleEscape);
        window.removeEventListener("scroll", handleScroll, true);
        window.removeEventListener("resize", handleResize);
      };
    }
  }, [isOpen, showConfirmation, closeAllDropdowns]);

  const handleStatusSelect = (newStatus: string, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    if (newStatus !== currentStatus) {
      setPendingStatus(newStatus);
      setShowConfirmation(true);
      closeDropdown(instanceId);
    } else {
      closeDropdown(instanceId);
    }
  };

  const handleToggle = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    if (disabled) return;

    if (isOpen) {
      closeDropdown(instanceId);
    } else {
      openDropdown(instanceId);
      // Usar setTimeout para garantir que o dropdown foi renderizado
      setTimeout(() => {
        calculateDropdownPosition();
      }, 0);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      event.stopPropagation();

      if (isOpen) {
        closeDropdown(instanceId);
      } else {
        openDropdown(instanceId);
      }
    }
  };

  const handleOverlayClick = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    closeAllDropdowns();
  };

  return (
    <>
      {isOpen && (
        <div className="dropdown-overlay" onClick={handleOverlayClick} />
      )}
      {showConfirmation && (
        <div className="confirmation-overlay" onClick={handleCancelChange} />
      )}

      <div className="status-selector" ref={dropdownRef}>
        <button
          ref={triggerRef}
          className={`status-selector-trigger ${disabled ? "disabled" : ""} ${isOpen ? "open" : ""
            }`}
          onClick={handleToggle}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          style={{
            backgroundColor: currentOption.bgColor,
            color: currentOption.color,
          }}
          type="button"
        >
          <span className="status-label">{currentOption.label}</span>
          {!disabled && (
            <ChevronDown
              size={14}
              className={`chevron ${isOpen ? "rotated" : ""}`}
            />
          )}
        </button>

        {isOpen && !disabled && (
          <div
            className={`status-dropdown ${dropdownPosition === "top" ? "dropdown-up" : "dropdown-down"
              }`}
            role="listbox"
          >
            {statusOptions
              .filter((option) => option.value !== currentStatus)
              .map((option) => (
                <button
                  key={option.value}
                  className="status-option"
                  onClick={(e) => handleStatusSelect(option.value, e)}
                  style={{
                    backgroundColor: option.bgColor,
                    color: option.color,
                  }}
                  role="option"
                  aria-selected={false}
                  type="button"
                >
                  <span className="status-option-label">{option.label}</span>
                </button>
              ))}
          </div>
        )}
      </div>

      {/* Modal de Confirmação */}
      {showConfirmation && pendingOption && (
        <div className="status-confirmation-modal">
          <div className="confirmation-content">
            <div className="confirmation-header">
              <AlertCircle size={24} className="confirmation-icon" />
              <h3>Confirmar alteração de status</h3>
            </div>

            <div className="confirmation-body">
              <p>Deseja realmente alterar o status de:</p>
              <div className="status-change-preview">
                <div className="status-from">
                  <span
                    className="status-badge"
                    style={{
                      backgroundColor: currentOption.bgColor,
                      color: currentOption.color,
                    }}
                  >
                    {currentOption.label}
                  </span>
                </div>
                <span className="arrow">→</span>
                <div className="status-to">
                  <span
                    className="status-badge"
                    style={{
                      backgroundColor: pendingOption.bgColor,
                      color: pendingOption.color,
                    }}
                  >
                    {pendingOption.label}
                  </span>
                </div>
              </div>
            </div>

            <div className="confirmation-actions">
              <button
                className="btn-cancel"
                onClick={handleCancelChange}
                type="button"
              >
                <X size={16} />
                Cancelar
              </button>
              <button
                className="btn-confirm"
                onClick={handleConfirmChange}
                disabled={isUpdating}
                type="button"
              >
                <Check size={16} />
                {isUpdating ? "Salvando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default StatusSelector;
