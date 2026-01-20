// Configuração do WhatsApp Business API
export const whatsappConfig = {
  // URL do servidor WhatsApp (backend)
  serverUrl: import.meta.env.VITE_WHATSAPP_SERVER_URL || 'http://localhost:3001',

  // Configurações da API
  apiVersion: 'v21.0',

  // Recursos habilitados
  features: {
    sendMessages: true,
    receiveMessages: true,
    templates: true,
    mediaMessages: false, // Para futuro: envio de imagens, PDFs, etc.
    interactiveButtons: false // Para futuro: botões interativos
  },

  // Configurações de retry
  retry: {
    maxAttempts: 3,
    delayMs: 1000,
    backoffMultiplier: 2
  },

  // Timeout para requisições (ms)
  timeout: 30000,

  // Formato de telefone esperado
  phoneFormat: {
    countryCode: '55', // Brasil
    example: '5511999999999',
    regex: /^55\d{10,11}$/
  }
};

// Validar se as configurações necessárias estão presentes
export const validateWhatsAppConfig = (): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!whatsappConfig.serverUrl) {
    errors.push('VITE_WHATSAPP_SERVER_URL não configurado');
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

// Templates de mensagem disponíveis
export const whatsappTemplates = {
  // Template para novo envio
  novoEnvio: {
    name: 'novo_envio_criado',
    language: 'pt_BR',
    category: 'SHIPPING_UPDATE'
  },

  // Template para atualização de status
  atualizacaoStatus: {
    name: 'atualizacao_status',
    language: 'pt_BR',
    category: 'SHIPPING_UPDATE'
  },

  // Template para rastreamento
  rastreamento: {
    name: 'rastreamento_carga',
    language: 'pt_BR',
    category: 'SHIPPING_UPDATE'
  }
};

// Mensagens de erro traduzidas
export const whatsappErrors = {
  100: 'Parâmetros inválidos',
  130: 'Limite de mensagens excedido',
  131: 'Número de telefone não registrado',
  132: 'Template não encontrado',
  133: 'Formato de telefone inválido',
  135: 'Janela de 24 horas expirada - use um template',
  136: 'Conta WhatsApp Business não encontrada',
  190: 'Token de acesso expirado ou inválido',
  368: 'Janela de conversa temporariamente bloqueada',
  403: 'Acesso negado - verifique permissões',
  500: 'Erro interno do WhatsApp',
  503: 'Serviço temporariamente indisponível'
};

export const getWhatsAppErrorMessage = (errorCode: number): string => {
  return whatsappErrors[errorCode as keyof typeof whatsappErrors] || 'Erro desconhecido ao enviar mensagem';
};
