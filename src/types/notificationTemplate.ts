export type NotificationTemplateId =
  | "new_shipment_email"
  | "status_update_email"
  | "jabil_shipment_email"
  | "new_shipment_whatsapp"
  | "status_update_whatsapp"
  | "tracking_whatsapp"
  | "jabil_shipment_whatsapp";

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
  "{{navio}}",
  "{{containerSpec}}",
  "{{cargoReady}}",
  "{{coleta}}",
  "{{emptyToShipper}}",
  "{{readyToLoad}}",
  "{{loadedOnBoard}}",
  "{{destinoRumo}}",
  "{{localizacaoCompleta}}",
];
