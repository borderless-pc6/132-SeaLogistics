/**
 * EXEMPLOS PRÁTICOS DE USO DAS PREFERÊNCIAS DE NOTIFICAÇÃO
 * 
 * Este arquivo mostra como usar o novo sistema de notificações
 * que respeita as preferências configuradas pelo usuário COMPANY_USER
 */

import { useState } from 'react';
import { useAuth } from './context/auth-context';
import { useToast } from './context/toast-context';
import { sendShipmentNotification, sendStatusUpdateNotification } from './services/notificationService';
import { Shipment } from './context/shipments-context';

// ==========================================
// EXEMPLO 1: Criar Shipment e Notificar
// ==========================================

const CreateShipmentExample = () => {
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateShipment = async (formData: any) => {
    setIsCreating(true);

    try {
      // 1. Criar o shipment
      const newShipment: Shipment = await createShipment({
        ...formData,
        companyId: currentUser?.companyId,
      });

      // 2. Enviar notificações (sistema verifica preferências automaticamente)
      const results = await sendShipmentNotification(
        newShipment,
        currentUser!.uid,     // ID do usuário para buscar preferências
        currentUser!.email,   // Email do usuário
        undefined             // Número será buscado das preferências
      );

      // 3. Feedback baseado no que foi enviado
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
          'ℹ️ Envio criado! Notificações desabilitadas nas configurações',
          'info'
        );
      }

      // Redirecionar ou atualizar lista
      navigate('/envios');
    } catch (error) {
      showToast('❌ Erro ao criar envio', 'error');
      console.error(error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      handleCreateShipment(formData);
    }}>
      {/* Campos do formulário */}
      <button type="submit" disabled={isCreating}>
        {isCreating ? 'Criando...' : 'Criar Envio'}
      </button>
    </form>
  );
};

// ==========================================
// EXEMPLO 2: Atualizar Status e Notificar
// ==========================================

const UpdateShipmentStatusExample = ({ shipment }: { shipment: Shipment }) => {
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const [newStatus, setNewStatus] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdateStatus = async () => {
    if (!newStatus) return;

    setIsUpdating(true);
    const oldStatus = shipment.status;

    try {
      // 1. Atualizar status no banco
      await updateShipmentStatus(shipment.id, newStatus);

      // 2. Enviar notificações (sistema verifica preferências automaticamente)
      const results = await sendStatusUpdateNotification(
        { ...shipment, status: newStatus },
        currentUser!.uid,     // ID do usuário para buscar preferências
        oldStatus,            // Status anterior
        currentUser!.email,   // Email do usuário
        undefined             // Número será buscado das preferências
      );

      // 3. Feedback
      let message = `Status atualizado: ${oldStatus} → ${newStatus}`;
      
      if (results.email && results.whatsapp) {
        message += '\nNotificações enviadas por Email e WhatsApp';
      } else if (results.email) {
        message += '\nNotificação enviada por Email';
      } else if (results.whatsapp) {
        message += '\nNotificação enviada por WhatsApp';
      }

      showToast(message, 'success');
    } catch (error) {
      showToast('Erro ao atualizar status', 'error');
      console.error(error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="status-update">
      <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
        <option value="">Selecione o novo status</option>
        <option value="Aguardando embarque">Aguardando embarque</option>
        <option value="Em trânsito">Em trânsito</option>
        <option value="Chegou ao porto">Chegou ao porto</option>
        <option value="Liberado pela alfândega">Liberado pela alfândega</option>
        <option value="Entregue">Entregue</option>
      </select>
      <button onClick={handleUpdateStatus} disabled={isUpdating || !newStatus}>
        {isUpdating ? 'Atualizando...' : 'Atualizar Status'}
      </button>
    </div>
  );
};

// ==========================================
// EXEMPLO 3: Notificação Manual (Admin)
// ==========================================

const AdminNotificationExample = () => {
  const { showToast } = useToast();
  const [selectedUserId, setSelectedUserId] = useState('');
  const [shipment, setShipment] = useState<Shipment | null>(null);

  const sendManualNotification = async () => {
    if (!selectedUserId || !shipment) return;

    try {
      // Admin pode enviar notificação para qualquer usuário
      const results = await sendShipmentNotification(
        shipment,
        selectedUserId,  // ID do usuário que vai receber
        undefined,       // Email será buscado do perfil
        undefined        // WhatsApp será buscado do perfil
      );

      if (results.email || results.whatsapp) {
        showToast('Notificação enviada com sucesso!', 'success');
      } else {
        showToast(
          'Usuário não tem notificações habilitadas',
          'warning'
        );
      }
    } catch (error) {
      showToast('Erro ao enviar notificação', 'error');
    }
  };

  return (
    <div className="admin-notification-panel">
      <h3>Enviar Notificação Manual</h3>
      
      <select 
        value={selectedUserId} 
        onChange={(e) => setSelectedUserId(e.target.value)}
      >
        <option value="">Selecione o usuário</option>
        {/* Listar usuários company_user */}
      </select>

      <select onChange={(e) => {
        // Buscar shipment selecionado
        const ship = findShipmentById(e.target.value);
        setShipment(ship);
      }}>
        <option value="">Selecione o envio</option>
        {/* Listar shipments */}
      </select>

      <button onClick={sendManualNotification}>
        Enviar Notificação
      </button>
    </div>
  );
};

// ==========================================
// EXEMPLO 4: Verificar Preferências Antes de Ação
// ==========================================

const CheckPreferencesExample = () => {
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const checkAndNotify = async () => {
    // Buscar preferências manualmente (se necessário)
    const userDoc = await getDoc(doc(db, 'users', currentUser!.uid));
    const preferences = userDoc.data()?.notificationPreferences;

    if (!preferences?.newShipments) {
      // Usuário desabilitou notificações de novos envios
      const confirm = window.confirm(
        'Você desabilitou notificações de novos envios. ' +
        'Deseja criar o envio mesmo assim?'
      );
      
      if (!confirm) return;
    }

    // Continuar com criação...
    await createShipment(shipmentData);

    // Notificar (sistema já verifica preferências)
    await sendShipmentNotification(
      newShipment,
      currentUser!.uid,
      currentUser!.email
    );
  };

  return (
    <button onClick={checkAndNotify}>
      Criar Envio
    </button>
  );
};

// ==========================================
// EXEMPLO 5: Feedback Detalhado
// ==========================================

const DetailedFeedbackExample = () => {
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const createWithDetailedFeedback = async (shipmentData: any) => {
    try {
      const newShipment = await createShipment(shipmentData);
      
      // Enviar notificações
      const results = await sendShipmentNotification(
        newShipment,
        currentUser!.uid,
        currentUser!.email
      );

      // Feedback detalhado
      const notifications = [];
      
      if (results.email) {
        notifications.push('📧 Email');
      }
      
      if (results.whatsapp) {
        notifications.push('💬 WhatsApp');
      }

      if (notifications.length > 0) {
        showToast(
          `✅ Envio criado!\n` +
          `Notificações enviadas via: ${notifications.join(' e ')}`,
          'success'
        );
      } else {
        // Explicar por que não foram enviadas
        const userDoc = await getDoc(doc(db, 'users', currentUser!.uid));
        const prefs = userDoc.data()?.notificationPreferences;
        
        if (!prefs?.newShipments) {
          showToast(
            '✅ Envio criado!\n' +
            'ℹ️ Notificações de novos envios estão desabilitadas.\n' +
            'Configure em ⚙️ Configurações',
            'info'
          );
        } else if (!prefs?.email && !prefs?.whatsapp) {
          showToast(
            '✅ Envio criado!\n' +
            'ℹ️ Nenhum canal de notificação está habilitado.\n' +
            'Configure em ⚙️ Configurações',
            'info'
          );
        } else {
          showToast(
            '✅ Envio criado!\n' +
            '⚠️ Não foi possível enviar notificações',
            'warning'
          );
        }
      }
    } catch (error) {
      showToast('❌ Erro ao criar envio', 'error');
    }
  };

  return (
    <button onClick={() => createWithDetailedFeedback(shipmentData)}>
      Criar com Feedback Detalhado
    </button>
  );
};

// ==========================================
// EXEMPLO 6: Link para Configurações
// ==========================================

const SettingsPromptExample = () => {
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleFirstTimeNotification = async () => {
    // Verificar se é primeira vez que o usuário cria um envio
    const userDoc = await getDoc(doc(db, 'users', currentUser!.uid));
    const userData = userDoc.data();
    
    if (!userData?.notificationPreferences) {
      // Usuário ainda não configurou preferências
      const shouldConfigure = window.confirm(
        'Você ainda não configurou suas preferências de notificação.\n\n' +
        '📧 Receba atualizações por Email\n' +
        '💬 Receba atualizações por WhatsApp\n\n' +
        'Deseja configurar agora?'
      );
      
      if (shouldConfigure) {
        navigate('/settings');
        return;
      }
    }

    // Continuar normalmente
    await createShipment(shipmentData);
  };

  return (
    <button onClick={handleFirstTimeNotification}>
      Criar Primeiro Envio
    </button>
  );
};

// ==========================================
// EXEMPLO 7: Badge de Notificações Ativas
// ==========================================

const NotificationBadgeExample = () => {
  const { currentUser } = useAuth();
  const [preferences, setPreferences] = useState<any>(null);

  useEffect(() => {
    loadPreferences();
  }, [currentUser]);

  const loadPreferences = async () => {
    if (!currentUser) return;
    
    const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
    setPreferences(userDoc.data()?.notificationPreferences);
  };

  const getActiveChannels = () => {
    if (!preferences) return [];
    
    const channels = [];
    if (preferences.email) channels.push('Email');
    if (preferences.whatsapp) channels.push('WhatsApp');
    return channels;
  };

  const activeChannels = getActiveChannels();

  return (
    <div className="notification-status">
      <h4>Status de Notificações</h4>
      
      {activeChannels.length > 0 ? (
        <div className="badge-success">
          ✅ Ativos: {activeChannels.join(' + ')}
        </div>
      ) : (
        <div className="badge-warning">
          ⚠️ Nenhum canal ativo
          <button onClick={() => navigate('/settings')}>
            Configurar
          </button>
        </div>
      )}
    </div>
  );
};

// ==========================================
// EXPORTAR COMPONENTES DE EXEMPLO
// ==========================================

export {
  CreateShipmentExample,
  UpdateShipmentStatusExample,
  AdminNotificationExample,
  CheckPreferencesExample,
  DetailedFeedbackExample,
  SettingsPromptExample,
  NotificationBadgeExample
};

// ==========================================
// DICAS DE IMPLEMENTAÇÃO
// ==========================================

/**
 * 1. SEMPRE use sendShipmentNotification/sendStatusUpdateNotification
 *    ao invés de enviar email/whatsapp diretamente
 * 
 * 2. Passe o userId para que o sistema busque as preferências
 * 
 * 3. Email e telefone são opcionais - serão buscados do perfil
 * 
 * 4. Dê feedback claro ao usuário sobre quais notificações foram enviadas
 * 
 * 5. Oriente usuários que não configuraram preferências a fazê-lo
 * 
 * 6. Respeite sempre a escolha do usuário - não force notificações
 * 
 * 7. Para ADMIN: pode enviar notificações para qualquer usuário
 *    passando o userId do destinatário
 */
