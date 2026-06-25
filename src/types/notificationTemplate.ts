export type NotificationTemplateId =
  | "new_shipment_email"
  | "status_update_email"
  | "new_shipment_whatsapp"
  | "status_update_whatsapp"
  | "tracking_whatsapp";

export interface NotificationTemplate {
  id: NotificationTemplateId;
  name: string;
  subject?: string;
  body: string;
  updatedAt?: Date;
  updatedBy?: string;
}

export const TEMPLATE_VARIABLES = [
  "{{numeroBl}}",
  "{{cliente}}",
  "{{operador}}",
  "{{pol}}",
  "{{pod}}",
  "{{etdOrigem}}",
  "{{etaDestino}}",
  "{{status}}",
  "{{oldStatus}}",
  "{{armador}}",
  "{{booking}}",
  "{{currentLocation}}",
  "{{quantBox}}",
];
