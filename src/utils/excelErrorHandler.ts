/**
 * Utilitário para mapear e tratar erros do Microsoft Graph API
 */

export interface ExcelError {
  code: string;
  message: string;
  statusCode?: number;
  retryable: boolean;
  userMessage: string;
}

/**
 * Mapeia códigos de erro do Microsoft Graph API para mensagens amigáveis
 */
export function mapGraphApiError(error: any): ExcelError {
  // Se já é um ExcelError, retorna direto
  if (error && typeof error === 'object' && 'code' in error && 'userMessage' in error) {
    return error as ExcelError;
  }

  const errorMessage = error?.message || error?.toString() || 'Erro desconhecido';
  const statusCode = error?.status || error?.statusCode || error?.response?.status;

  // Erros de autenticação/autorização
  if (statusCode === 401 || errorMessage.includes('Unauthorized') || errorMessage.includes('InvalidAuthenticationToken')) {
    return {
      code: 'UNAUTHORIZED',
      message: errorMessage,
      statusCode: 401,
      retryable: false,
      userMessage: 'Sua sessão expirou. Por favor, faça login novamente.',
    };
  }

  if (statusCode === 403 || errorMessage.includes('Forbidden') || errorMessage.includes('AccessDenied')) {
    return {
      code: 'FORBIDDEN',
      message: errorMessage,
      statusCode: 403,
      retryable: false,
      userMessage: 'Você não tem permissão para acessar este arquivo. Verifique as permissões do arquivo Excel.',
    };
  }

  // Erros de arquivo não encontrado
  if (statusCode === 404 || errorMessage.includes('NotFound') || errorMessage.includes('ItemNotFound')) {
    return {
      code: 'NOT_FOUND',
      message: errorMessage,
      statusCode: 404,
      retryable: false,
      userMessage: 'Arquivo Excel não encontrado. Verifique se o arquivo existe e se você tem acesso a ele.',
    };
  }

  // Erros de rate limiting
  if (statusCode === 429 || errorMessage.includes('TooManyRequests') || errorMessage.includes('Throttled')) {
    return {
      code: 'RATE_LIMIT',
      message: errorMessage,
      statusCode: 429,
      retryable: true,
      userMessage: 'Muitas requisições. Aguarde alguns instantes e tente novamente.',
    };
  }

  // Erros de servidor (5xx)
  if (statusCode >= 500 && statusCode < 600) {
    return {
      code: 'SERVER_ERROR',
      message: errorMessage,
      statusCode,
      retryable: true,
      userMessage: 'Erro no servidor da Microsoft. Tente novamente em alguns instantes.',
    };
  }

  // Erros de timeout
  if (errorMessage.includes('timeout') || errorMessage.includes('Timeout')) {
    return {
      code: 'TIMEOUT',
      message: errorMessage,
      retryable: true,
      userMessage: 'A requisição demorou muito para responder. Verifique sua conexão e tente novamente.',
    };
  }

  // Erros de rede
  if (errorMessage.includes('NetworkError') || errorMessage.includes('Failed to fetch') || errorMessage.includes('Network request failed')) {
    return {
      code: 'NETWORK_ERROR',
      message: errorMessage,
      retryable: true,
      userMessage: 'Erro de conexão. Verifique sua internet e tente novamente.',
    };
  }

  // Erros de token
  if (errorMessage.includes('Token') || errorMessage.includes('token') || errorMessage.includes('expired')) {
    return {
      code: 'TOKEN_ERROR',
      message: errorMessage,
      retryable: false,
      userMessage: 'Token de autenticação inválido ou expirado. Faça login novamente.',
    };
  }

  // Erro genérico
  return {
    code: 'UNKNOWN_ERROR',
    message: errorMessage,
    statusCode,
    retryable: false,
    userMessage: `Erro ao sincronizar com Excel: ${errorMessage}`,
  };
}

/**
 * Loga erros detalhadamente para debug
 */
export function logExcelError(error: any, context: string): void {
  const excelError = mapGraphApiError(error);
  
  console.group(`🔴 Erro Excel - ${context}`);
  console.error('Código:', excelError.code);
  console.error('Mensagem:', excelError.message);
  console.error('Status Code:', excelError.statusCode);
  console.error('Retryable:', excelError.retryable);
  console.error('Erro original:', error);
  console.error('Stack:', error?.stack);
  console.groupEnd();

  // Em produção, você pode enviar para um serviço de logging
  if (process.env.NODE_ENV === 'production') {
    // Exemplo: enviar para Sentry, LogRocket, etc.
    // logToService(excelError, context);
  }
}

/**
 * Verifica se um erro é recuperável (pode tentar novamente)
 */
export function isRetryableError(error: any): boolean {
  const excelError = mapGraphApiError(error);
  return excelError.retryable;
}
