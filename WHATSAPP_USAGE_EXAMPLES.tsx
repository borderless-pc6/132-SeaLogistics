/**
 * EXEMPLOS DE USO DA INTEGRAÇÃO WHATSAPP
 * 
 * Este arquivo contém exemplos práticos de como usar
 * a integração com WhatsApp no Sea Logistics.
 * 
 * NÃO é um componente funcional - apenas exemplos!
 */

// ==========================================
// EXEMPLO 1: Criar Shipment e Notificar
// ==========================================

import { useState } from 'react';
import { sendShipmentNotification } from './services/notificationService';
import { useToast } from './context/toast-context';

const CreateShipmentWithNotification = () => {
  const { showToast } = useToast();
  const [formData, setFormData] = useState({
    numeroBl: '',
    cliente: '',
    clientEmail: '',
    clientPhone: '', // Adicione este campo!
    pol: '',
    pod: '',
    // ... outros campos
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // 1. Criar o shipment
      const newShipment = await createShipment(formData);

      // 2. Enviar notificações (Email + WhatsApp)
      const results = await sendShipmentNotification(
        newShipment,
        formData.clientEmail,
        formData.clientPhone // Se vazio, só envia email
      );

      // 3. Feedback ao usuário
      if (results.email && results.whatsapp) {
        showToast(
          '✅ Envio criado! Notificações enviadas por Email e WhatsApp',
          'success'
        );
      } else if (results.email) {
        showToast(
          '✅ Envio criado! Notificação enviada por Email',
          'success'
        );
      } else if (results.whatsapp) {
        showToast(
          '✅ Envio criado! Notificação enviada por WhatsApp',
          'success'
        );
      } else {
        showToast(
          '⚠️ Envio criado, mas falha ao enviar notificações',
          'warning'
        );
      }
    } catch (error) {
      showToast('❌ Erro ao criar envio', 'error');
      console.error(error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Campos existentes */}
      
      {/* ADICIONE ESTE CAMPO */}
      <div className="form-group">
        <label htmlFor="clientPhone">
          WhatsApp do Cliente (opcional)
        </label>
        <input
          type="tel"
          id="clientPhone"
          name="clientPhone"
          placeholder="(11) 99999-9999"
          value={formData.clientPhone}
          onChange={(e) => setFormData({
            ...formData,
            clientPhone: e.target.value
          })}
        />
        <small className="form-hint">
          Formato: (DD) 9XXXX-XXXX. O cliente receberá atualizações via WhatsApp.
        </small>
      </div>

      <button type="submit">Criar Envio</button>
    </form>
  );
};

// ==========================================
// EXEMPLO 2: Atualizar Status e Notificar
// ==========================================

import { sendStatusUpdateNotification } from './services/notificationService';

const UpdateShipmentStatus = ({ shipment, onUpdate }) => {
  const { showToast } = useToast();
  const [newStatus, setNewStatus] = useState('');

  const handleUpdateStatus = async () => {
    const oldStatus = shipment.status;

    try {
      // 1. Atualizar status no banco
      await updateShipmentStatus(shipment.id, newStatus);

      // 2. Enviar notificações
      const results = await sendStatusUpdateNotification(
        { ...shipment, status: newStatus },
        shipment.clientEmail,
        oldStatus,
        shipment.clientPhone
      );

      // 3. Feedback
      let message = 'Status atualizado!';
      if (results.email && results.whatsapp) {
        message += ' Cliente notificado por Email e WhatsApp';
      } else if (results.email) {
        message += ' Cliente notificado por Email';
      }

      showToast(message, 'success');
      onUpdate();
    } catch (error) {
      showToast('Erro ao atualizar status', 'error');
    }
  };

  return (
    <div>
      <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
        <option value="">Selecione o status</option>
        <option value="Em trânsito">Em trânsito</option>
        <option value="Chegou ao porto">Chegou ao porto</option>
        <option value="Liberado">Liberado</option>
        <option value="Entregue">Entregue</option>
      </select>
      <button onClick={handleUpdateStatus}>Atualizar Status</button>
    </div>
  );
};

// ==========================================
// EXEMPLO 3: Enviar Mensagem Customizada
// ==========================================

import { sendCustomWhatsAppMessage } from './services/whatsappService';

const SendCustomMessage = ({ clientPhone }) => {
  const { showToast } = useToast();
  const [message, setMessage] = useState('');

  const handleSend = async () => {
    try {
      const success = await sendCustomWhatsAppMessage(clientPhone, message);

      if (success) {
        showToast('Mensagem enviada com sucesso!', 'success');
        setMessage('');
      } else {
        showToast('Falha ao enviar mensagem', 'error');
      }
    } catch (error) {
      showToast('Erro ao enviar mensagem', 'error');
    }
  };

  return (
    <div className="custom-message-panel">
      <h3>Enviar Mensagem WhatsApp</h3>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Digite sua mensagem..."
        rows={5}
      />
      <button onClick={handleSend} disabled={!message.trim()}>
        Enviar via WhatsApp
      </button>
    </div>
  );
};

// ==========================================
// EXEMPLO 4: Rastreamento Manual
// ==========================================

import { sendTrackingInfoWhatsApp } from './services/whatsappService';

const SendTrackingInfo = ({ shipment }) => {
  const { showToast } = useToast();

  const handleSendTracking = async () => {
    try {
      const success = await sendTrackingInfoWhatsApp(
        shipment,
        shipment.clientPhone,
        'O navio está no Oceano Atlântico, aproximando-se do Porto de Santos'
      );

      if (success) {
        showToast('Informações de rastreamento enviadas!', 'success');
      } else {
        showToast('Falha ao enviar rastreamento', 'error');
      }
    } catch (error) {
      showToast('Erro ao enviar rastreamento', 'error');
    }
  };

  return (
    <button onClick={handleSendTracking} className="btn-tracking">
      📍 Enviar Rastreamento via WhatsApp
    </button>
  );
};

// ==========================================
// EXEMPLO 5: Boas-vindas ao Novo Cliente
// ==========================================

import { sendWelcomeWhatsApp } from './services/whatsappService';

const RegisterClient = () => {
  const { showToast } = useToast();
  const [clientData, setClientData] = useState({
    name: '',
    email: '',
    phone: ''
  });

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // 1. Registrar cliente
      await registerClient(clientData);

      // 2. Enviar mensagem de boas-vindas
      if (clientData.phone) {
        await sendWelcomeWhatsApp(clientData.name, clientData.phone);
      }

      showToast('Cliente cadastrado com sucesso!', 'success');
    } catch (error) {
      showToast('Erro ao cadastrar cliente', 'error');
    }
  };

  return (
    <form onSubmit={handleRegister}>
      <input
        type="text"
        placeholder="Nome"
        value={clientData.name}
        onChange={(e) => setClientData({ ...clientData, name: e.target.value })}
        required
      />
      <input
        type="email"
        placeholder="Email"
        value={clientData.email}
        onChange={(e) => setClientData({ ...clientData, email: e.target.value })}
        required
      />
      <input
        type="tel"
        placeholder="WhatsApp (opcional)"
        value={clientData.phone}
        onChange={(e) => setClientData({ ...clientData, phone: e.target.value })}
      />
      <button type="submit">Cadastrar Cliente</button>
    </form>
  );
};

// ==========================================
// EXEMPLO 6: Verificar Status de Mensagem
// ==========================================

import { checkWhatsAppMessageStatus } from './services/whatsappService';

const MessageStatusTracker = ({ messageId }) => {
  const [status, setStatus] = useState<any>(null);

  useEffect(() => {
    const checkStatus = async () => {
      const statusData = await checkWhatsAppMessageStatus(messageId);
      setStatus(statusData);
    };

    checkStatus();
  }, [messageId]);

  return (
    <div className="message-status">
      {status && (
        <>
          <p>Status: {status.status}</p>
          <p>Enviado para: {status.recipient}</p>
          <p>Timestamp: {new Date(status.timestamp * 1000).toLocaleString()}</p>
        </>
      )}
    </div>
  );
};

// ==========================================
// EXEMPLO 7: Configurações de Notificação
// ==========================================

const NotificationSettings = ({ user }) => {
  const [preferences, setPreferences] = useState({
    emailEnabled: true,
    whatsappEnabled: true,
    notifyOnCreate: true,
    notifyOnUpdate: true,
    notifyOnDelivery: true
  });

  const handleToggle = (key: string) => {
    setPreferences({
      ...preferences,
      [key]: !preferences[key]
    });
  };

  return (
    <div className="notification-settings">
      <h3>Preferências de Notificação</h3>
      
      <div className="setting-item">
        <label>
          <input
            type="checkbox"
            checked={preferences.emailEnabled}
            onChange={() => handleToggle('emailEnabled')}
          />
          Receber notificações por Email
        </label>
      </div>

      <div className="setting-item">
        <label>
          <input
            type="checkbox"
            checked={preferences.whatsappEnabled}
            onChange={() => handleToggle('whatsappEnabled')}
          />
          Receber notificações por WhatsApp
        </label>
      </div>

      <hr />

      <h4>Eventos</h4>

      <div className="setting-item">
        <label>
          <input
            type="checkbox"
            checked={preferences.notifyOnCreate}
            onChange={() => handleToggle('notifyOnCreate')}
          />
          Notificar ao criar novo envio
        </label>
      </div>

      <div className="setting-item">
        <label>
          <input
            type="checkbox"
            checked={preferences.notifyOnUpdate}
            onChange={() => handleToggle('notifyOnUpdate')}
          />
          Notificar ao atualizar status
        </label>
      </div>

      <div className="setting-item">
        <label>
          <input
            type="checkbox"
            checked={preferences.notifyOnDelivery}
            onChange={() => handleToggle('notifyOnDelivery')}
          />
          Notificar ao entregar
        </label>
      </div>

      <button onClick={() => savePreferences(preferences)}>
        Salvar Preferências
      </button>
    </div>
  );
};

// ==========================================
// EXEMPLO 8: Utility - Formatar Telefone
// ==========================================

import { formatPhoneNumber } from './services/whatsappService';

const PhoneInput = ({ value, onChange }) => {
  const [displayValue, setDisplayValue] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    
    // Formata para exibição
    let formatted = input.replace(/\D/g, '');
    if (formatted.length > 0) {
      if (formatted.length <= 2) {
        formatted = `(${formatted}`;
      } else if (formatted.length <= 7) {
        formatted = `(${formatted.slice(0, 2)}) ${formatted.slice(2)}`;
      } else {
        formatted = `(${formatted.slice(0, 2)}) ${formatted.slice(2, 7)}-${formatted.slice(7, 11)}`;
      }
    }
    setDisplayValue(formatted);

    // Envia no formato internacional para o parent
    const international = formatPhoneNumber(input);
    onChange(international);
  };

  return (
    <div className="phone-input">
      <input
        type="tel"
        value={displayValue}
        onChange={handleChange}
        placeholder="(11) 99999-9999"
        maxLength={15}
      />
      <small>Formato: (DD) 9XXXX-XXXX</small>
    </div>
  );
};

// ==========================================
// DICAS DE IMPLEMENTAÇÃO
// ==========================================

/**
 * 1. FORMATO DE TELEFONE:
 *    - Sempre use formato internacional: 5511999999999
 *    - Use a função formatPhoneNumber() para converter
 * 
 * 2. TRATAMENTO DE ERROS:
 *    - Todas as funções retornam Promise<boolean>
 *    - Use try/catch para capturar erros
 *    - Mostre feedback ao usuário com toast
 * 
 * 3. NOTIFICAÇÕES OPCIONAIS:
 *    - Sempre verifique se o telefone existe antes de enviar
 *    - Deixe o WhatsApp opcional (alguns clientes podem não ter)
 * 
 * 4. TESTING:
 *    - Use números de teste durante desenvolvimento
 *    - Adicione números no Meta for Developers
 *    - Verifique logs do servidor para debug
 * 
 * 5. PRODUÇÃO:
 *    - Configure variáveis de ambiente no Render/Netlify
 *    - Use tokens permanentes, não temporários
 *    - Monitore custos no Meta Business Manager
 */

export {
  CreateShipmentWithNotification,
  UpdateShipmentStatus,
  SendCustomMessage,
  SendTrackingInfo,
  RegisterClient,
  MessageStatusTracker,
  NotificationSettings,
  PhoneInput
};
