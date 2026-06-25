export const STATUS_LABELS: Record<string, string> = {
  documentacao: "Documentação",
  agendado: "Agendado",
  "a-embarcar": "A Embarcar",
  embarcando: "Embarcando",
  "em-transito": "Em Trânsito",
  desembarcando: "Desembarcando",
  "em-entrega": "Em Entrega",
  concluido: "Concluído",
  atrasado: "Atrasado",
  cancelado: "Cancelado",
  suspenso: "Suspenso",
  pendente: "Pendente",
};

export function getStatusLabel(status: string): string {
  if (!status) return "N/A";
  return STATUS_LABELS[status] || status;
}
