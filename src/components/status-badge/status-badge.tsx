import { formatStatusDisplay, normalizeStatusKey } from "../../utils/statusUtils";
import "./status-badge.css";

interface StatusBadgeProps {
  status?: string;
  className?: string;
}

export function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  const key = normalizeStatusKey(status);

  return (
    <span className={`status-badge status-${key} ${className}`.trim()}>
      {formatStatusDisplay(status)}
    </span>
  );
}
