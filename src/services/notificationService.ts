import { doc, getDoc } from 'firebase/firestore';
import type { Shipment } from '../context/shipments-context';
import { db } from '../lib/firebaseConfig';
import { sendEmail } from './emailService';
import { renderEmailTemplate, renderWhatsAppTemplate } from './templateService';
import { sendWhatsAppMessage, formatPhoneNumber } from './whatsappService';

interface NotificationPreferences {
    email: boolean;
    whatsapp: boolean;
    statusUpdates: boolean;
    newShipments: boolean;
}

// Número de WhatsApp de teste para disparos automáticos (ex.: seu próprio número no sandbox)
// Ex: VITE_WHATSAPP_TEST_PHONE=555191341262 (sem comentário na mesma linha no .env)
const rawTestPhone = import.meta.env.VITE_WHATSAPP_TEST_PHONE;
const TEST_WHATSAPP_PHONE = (() => {
  if (typeof rawTestPhone !== "string" || !rawTestPhone.trim()) return undefined;
  const digits = rawTestPhone.replace(/\D/g, "");
  if (digits.length < 10) return undefined;
  return digits.startsWith("55") ? digits : `55${digits}`;
})();

/**
 * Busca as preferências de notificação do usuário
 */
const getUserNotificationPreferences = async (userId: string): Promise<NotificationPreferences> => {
    try {
        const userDoc = await getDoc(doc(db, 'users', userId));
        
        if (userDoc.exists()) {
            const userData = userDoc.data();
            
            // Verifica se tem as novas preferências
            if (userData.notificationPreferences) {
                return userData.notificationPreferences;
            }
            
            // Fallback para o formato antigo
            if (userData.notifications) {
                return {
                    email: userData.notifications.email ?? true,
                    whatsapp: userData.notifications.whatsapp ?? false,
                    statusUpdates: userData.notifications.statusUpdates ?? true,
                    newShipments: userData.notifications.newShipments ?? true,
                };
            }
        }
        
        // Preferências padrão
        return {
            email: true,
            whatsapp: false,
            statusUpdates: true,
            newShipments: true,
        };
    } catch (error) {
        console.error('Erro ao buscar preferências de notificação:', error);
        // Em caso de erro, retorna preferências padrão (apenas email)
        return {
            email: true,
            whatsapp: false,
            statusUpdates: true,
            newShipments: true,
        };
    }
};

/**
 * Busca o número de WhatsApp do usuário
 */
const getUserWhatsAppNumber = async (userId: string): Promise<string | null> => {
    try {
        const userDoc = await getDoc(doc(db, 'users', userId));
        
        if (userDoc.exists()) {
            const userData = userDoc.data();
            return userData.whatsappPhone || userData.phone || null;
        }
        
        return null;
    } catch (error) {
        console.error('Erro ao buscar número de WhatsApp:', error);
        return null;
    }
};

/**
 * Envia notificação de novo envio por Email e/ou WhatsApp
 * Respeita as preferências de notificação do usuário
 */
export const sendShipmentNotification = async (
    shipment: Shipment,
    userId: string,
    clientEmail?: string,
    clientPhone?: string
): Promise<{ email: boolean; whatsapp: boolean }> => {
    const results = {
        email: false,
        whatsapp: false
    };

    // Buscar preferências do usuário
    const preferences = await getUserNotificationPreferences(userId);

    // Verificar se deve notificar sobre novos envios
    if (!preferences.newShipments) {
        console.log('Usuário desabilitou notificações de novos envios');
        return results;
    }

    // Enviar email (se habilitado e email fornecido)
    if (preferences.email && clientEmail) {
        results.email = await sendShipmentCreatedEmail(shipment, clientEmail);
    }

    // Enviar WhatsApp (se habilitado e número fornecido ou se houver número de teste configurado)
    if (preferences.whatsapp || TEST_WHATSAPP_PHONE) {
        const whatsappNumber =
            clientPhone ||
            (await getUserWhatsAppNumber(userId)) ||
            TEST_WHATSAPP_PHONE;
        
        if (whatsappNumber) {
            const message = await renderWhatsAppTemplate(
                'new_shipment_whatsapp',
                shipment
            );
            results.whatsapp = await sendWhatsAppMessage({
                to: formatPhoneNumber(whatsappNumber),
                message,
            });
        } else {
            console.log(
                'WhatsApp habilitado ou número de teste definido, mas nenhum número foi encontrado'
            );
        }
    }

    return results;
};

/**
 * Envia notificação de atualização de status por Email e/ou WhatsApp
 * Respeita as preferências de notificação do usuário
 */
export const sendStatusUpdateNotification = async (
    shipment: Shipment,
    userId: string,
    oldStatus: string,
    clientEmail?: string,
    clientPhone?: string
): Promise<{ email: boolean; whatsapp: boolean }> => {
    const results = {
        email: false,
        whatsapp: false
    };

    // Buscar preferências do usuário
    const preferences = await getUserNotificationPreferences(userId);

    // Verificar se deve notificar sobre atualizações de status
    if (!preferences.statusUpdates) {
        console.log('Usuário desabilitou notificações de atualização de status');
        return results;
    }

    // Enviar email (se habilitado e email fornecido)
    if (preferences.email && clientEmail) {
        results.email = await sendStatusUpdateEmail(shipment, clientEmail, oldStatus);
    }

    // Enviar WhatsApp (se habilitado e número fornecido ou se houver número de teste configurado)
    if (preferences.whatsapp || TEST_WHATSAPP_PHONE) {
        const userPhone = await getUserWhatsAppNumber(userId);
        const whatsappNumber =
            clientPhone || userPhone || TEST_WHATSAPP_PHONE;

        if (!whatsappNumber) {
            console.warn(
                "[WhatsApp] Nenhum número para envio: defina VITE_WHATSAPP_TEST_PHONE no .env e reinicie o frontend (npm run dev)."
            );
        } else {
            console.log("[WhatsApp] Enviando atualização de status para:", whatsappNumber.replace(/(\d{4})\d+(\d{2})/, "$1****$2"));
            const message = await renderWhatsAppTemplate(
                'status_update_whatsapp',
                shipment,
                { oldStatus }
            );
            results.whatsapp = await sendWhatsAppMessage({
                to: formatPhoneNumber(whatsappNumber),
                message,
            });
        }
    }

    return results;
};

export const sendShipmentCreatedEmail = async (shipment: Shipment, clientEmail: string): Promise<boolean> => {
    const { subject, html } = await renderEmailTemplate(
        'new_shipment_email',
        shipment
    );

    return sendEmail({
        to: clientEmail,
        subject,
        html
    });
};

export const sendStatusUpdateEmail = async (shipment: Shipment, clientEmail: string, oldStatus: string): Promise<boolean> => {
    const { subject, html } = await renderEmailTemplate(
        'status_update_email',
        shipment,
        { oldStatus }
    );

    return sendEmail({
        to: clientEmail,
        subject,
        html
    });
}; 