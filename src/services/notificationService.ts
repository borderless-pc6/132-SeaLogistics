import { sendEmail } from "./emailService";
import { apiFetch } from "./authApi";
import type { Shipment } from "../context/shipments-context";
import type { NotificationPreferences } from "../types/user";
import { resolveCompanyClientContact } from "./clientContactService";
import { renderEmailTemplate } from "./templateService";
import {
  buildJabilEmailSubject,
  renderJabilEmailHtml,
} from "./jabilEmailTemplate";
import { isInternationalShipmentModel } from "../utils/shipmentFormatters";

export type { CompanyClientContact } from "./clientContactService";
export { resolveCompanyClientContact } from "./clientContactService";

function normalizePushPreference(prefs: NotificationPreferences): boolean {
  if (prefs.push !== undefined) return prefs.push;
  if (prefs.whatsapp !== undefined) return prefs.whatsapp;
  return true;
}

export const sendShipmentCreatedEmail = async (
  shipment: Shipment,
  clientEmail: string
): Promise<boolean> => {
  if (isInternationalShipmentModel(shipment)) {
    return sendEmail({
      to: clientEmail,
      subject: buildJabilEmailSubject(shipment),
      html: renderJabilEmailHtml(shipment),
    });
  }

  const { subject, html } = await renderEmailTemplate(
    "new_shipment_email",
    shipment
  );

  return sendEmail({
    to: clientEmail,
    subject,
    html,
  });
};

export const sendStatusUpdateEmail = async (
  shipment: Shipment,
  clientEmail: string,
  oldStatus: string
): Promise<boolean> => {
  if (isInternationalShipmentModel(shipment)) {
    return sendEmail({
      to: clientEmail,
      subject: buildJabilEmailSubject(shipment),
      html: renderJabilEmailHtml(shipment),
    });
  }

  const { subject, html } = await renderEmailTemplate(
    "status_update_email",
    shipment,
    { oldStatus }
  );

  return sendEmail({
    to: clientEmail,
    subject,
    html,
  });
};

async function notifyViaBackend(
  path: string,
  body: Record<string, unknown>
): Promise<{ email: boolean; push: boolean } | null> {
  try {
    const response = await apiFetch(path, {
      method: "POST",
      body: JSON.stringify(body),
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data.notifications || { email: false, push: false };
  } catch {
    return null;
  }
}

/**
 * Notifica o cliente final (empresa do embarque) sobre novo envio.
 */
export const sendClientShipmentNotification = async (
  shipment: Shipment
): Promise<{ email: boolean; push: boolean }> => {
  const backendResult = await notifyViaBackend("/api/notifications/shipment-created", {
    shipment,
  });
  if (backendResult) return backendResult;

  const results = { email: false, push: false };

  if (!shipment.companyId) {
    console.warn("[Notificação Cliente] Embarque sem companyId");
    return results;
  }

  const contact = await resolveCompanyClientContact(shipment.companyId);
  if (!contact || !contact.preferences.newShipments) {
    return results;
  }

  if (contact.preferences.email && contact.email) {
    results.email = await sendShipmentCreatedEmail(shipment, contact.email);
  }

  if (normalizePushPreference(contact.preferences)) {
    console.log(
      `[Notificação Cliente] Push novo envio → ${contact.companyName} (requer backend FCM)`
    );
  }

  return results;
};

/**
 * Notifica o cliente final sobre mudança de status do embarque.
 */
export const sendClientStatusUpdateNotification = async (
  shipment: Shipment,
  oldStatus: string
): Promise<{ email: boolean; push: boolean }> => {
  const backendResult = await notifyViaBackend("/api/notifications/status-updated", {
    shipment,
    oldStatus,
  });
  if (backendResult) return backendResult;

  const results = { email: false, push: false };

  if (!shipment.companyId) {
    return results;
  }

  const contact = await resolveCompanyClientContact(shipment.companyId);
  if (!contact || !contact.preferences.statusUpdates) {
    return results;
  }

  if (contact.preferences.email && contact.email) {
    results.email = await sendStatusUpdateEmail(
      shipment,
      contact.email,
      oldStatus
    );
  }

  if (normalizePushPreference(contact.preferences)) {
    console.log(
      `[Notificação Cliente] Push status → ${contact.companyName} (requer backend FCM)`
    );
  }

  return results;
};

/** @deprecated Prefer sendClientShipmentNotification */
export const sendShipmentNotification = async (
  shipment: Shipment,
  _userId: string,
  _clientEmail?: string,
  _clientPhone?: string
): Promise<{ email: boolean; push: boolean }> => {
  return sendClientShipmentNotification(shipment);
};

/** @deprecated Prefer sendClientStatusUpdateNotification */
export const sendStatusUpdateNotification = async (
  shipment: Shipment,
  _userId: string,
  oldStatus: string,
  _clientEmail?: string,
  _clientPhone?: string
): Promise<{ email: boolean; push: boolean }> => {
  return sendClientStatusUpdateNotification(shipment, oldStatus);
};
