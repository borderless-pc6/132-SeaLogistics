/** Ordem lógica do fluxo marítimo (status terminais ficam fora) */
export const STATUS_FLOW_ORDER = [
  "documentacao",
  "agendado",
  "a-embarcar",
  "embarcando",
  "em-transito",
  "desembarcando",
  "em-entrega",
  "concluido",
] as const;

export const TERMINAL_STATUSES = new Set([
  "concluido",
  "cancelado",
  "suspenso",
]);

export const SPECIAL_STATUSES = new Set(["atrasado"]);

export function isValidStatusTransition(
  fromStatus: string,
  toStatus: string
): { valid: boolean; reason?: string } {
  if (!fromStatus || !toStatus) {
    return { valid: true };
  }

  if (fromStatus === toStatus) {
    return { valid: true };
  }

  if (TERMINAL_STATUSES.has(fromStatus)) {
    return {
      valid: false,
      reason: `Embarque em status terminal (${fromStatus}) não pode ser alterado para ${toStatus}.`,
    };
  }

  if (toStatus === "atrasado") {
    return { valid: true };
  }

  if (fromStatus === "atrasado") {
    return { valid: true };
  }

  if (toStatus === "cancelado" || toStatus === "suspenso") {
    return { valid: true };
  }

  const fromIdx = STATUS_FLOW_ORDER.indexOf(
    fromStatus as (typeof STATUS_FLOW_ORDER)[number]
  );
  const toIdx = STATUS_FLOW_ORDER.indexOf(
    toStatus as (typeof STATUS_FLOW_ORDER)[number]
  );

  if (fromIdx === -1 || toIdx === -1) {
    return { valid: true };
  }

  if (toIdx < fromIdx) {
    return {
      valid: false,
      reason: `Não é permitido retroceder de "${fromStatus}" para "${toStatus}".`,
    };
  }

  if (toIdx - fromIdx > 2) {
    return {
      valid: false,
      reason: `Salto de status muito grande: de "${fromStatus}" para "${toStatus}". Avance no máximo 2 etapas.`,
    };
  }

  return { valid: true };
}
