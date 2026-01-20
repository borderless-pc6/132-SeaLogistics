import { doc, getDoc } from 'firebase/firestore';
import { Shipment } from '../context/shipments-context';
import { db } from '../lib/firebaseConfig';
import { sendEmail } from './emailService';
import { sendShipmentCreatedWhatsApp, sendStatusUpdateWhatsApp } from './whatsappService';

interface NotificationPreferences {
    email: boolean;
    whatsapp: boolean;
    statusUpdates: boolean;
    newShipments: boolean;
}

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

    // Enviar WhatsApp (se habilitado e número fornecido)
    if (preferences.whatsapp) {
        const whatsappNumber = clientPhone || await getUserWhatsAppNumber(userId);
        
        if (whatsappNumber) {
            results.whatsapp = await sendShipmentCreatedWhatsApp(shipment, whatsappNumber);
        } else {
            console.log('WhatsApp habilitado mas número não configurado');
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

    // Enviar WhatsApp (se habilitado e número fornecido)
    if (preferences.whatsapp) {
        const whatsappNumber = clientPhone || await getUserWhatsAppNumber(userId);
        
        if (whatsappNumber) {
            results.whatsapp = await sendStatusUpdateWhatsApp(shipment, whatsappNumber, oldStatus);
        } else {
            console.log('WhatsApp habilitado mas número não configurado');
        }
    }

    return results;
};

export const sendShipmentCreatedEmail = async (shipment: Shipment, clientEmail: string): Promise<boolean> => {
    const subject = `Novo envio criado - ${shipment.numeroBl}`;
    const html = `
        <h2>Novo envio criado</h2>
        <p>Olá,</p>
        <p>Um novo envio foi criado com os seguintes detalhes:</p>
        <ul>
            <li><strong>Número BL:</strong> ${shipment.numeroBl}</li>
            <li><strong>Cliente:</strong> ${shipment.cliente}</li>
            <li><strong>Operador:</strong> ${shipment.operador}</li>
            <li><strong>Porto de Origem:</strong> ${shipment.pol}</li>
            <li><strong>Porto de Destino:</strong> ${shipment.pod}</li>
            <li><strong>ETD Origem:</strong> ${shipment.etdOrigem}</li>
            <li><strong>ETA Destino:</strong> ${shipment.etaDestino}</li>
            <li><strong>Quantidade de Containers:</strong> ${shipment.quantBox}</li>
            <li><strong>Status:</strong> ${shipment.status}</li>
            <li><strong>Armador:</strong> ${shipment.armador}</li>
            <li><strong>Booking:</strong> ${shipment.booking}</li>
        </ul>
        <p>Atenciosamente,<br>Sea Logistics</p>
    `;

    return sendEmail({
        to: clientEmail,
        subject,
        html
    });
};

export const sendStatusUpdateEmail = async (shipment: Shipment, clientEmail: string, oldStatus: string): Promise<boolean> => {
    const subject = `Status do envio atualizado - ${shipment.numeroBl}`;
    const html = `
        <h2>Status do envio atualizado</h2>
        <p>Olá,</p>
        <p>O status do seu envio foi atualizado:</p>
        <ul>
            <li><strong>Número BL:</strong> ${shipment.numeroBl}</li>
            <li><strong>Status Anterior:</strong> ${oldStatus}</li>
            <li><strong>Novo Status:</strong> ${shipment.status}</li>
            <li><strong>Cliente:</strong> ${shipment.cliente}</li>
            <li><strong>Porto de Origem:</strong> ${shipment.pol}</li>
            <li><strong>Porto de Destino:</strong> ${shipment.pod}</li>
        </ul>
        <p>Atenciosamente,<br>Sea Logistics</p>
    `;

    return sendEmail({
        to: clientEmail,
        subject,
        html
    });
}; 