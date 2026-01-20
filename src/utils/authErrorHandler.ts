/**
 * Utilitário para mapear e tratar erros de autenticação
 */

export interface AuthError {
  code: string;
  message: string;
  userMessage: string;
  retryable: boolean;
  type: 'network' | 'credentials' | 'permission' | 'token' | 'unknown';
}

/**
 * Mapeia erros de autenticação para mensagens amigáveis em português
 */
export function mapAuthError(error: any): AuthError {
  const errorMessage = error?.message || error?.toString() || 'Erro desconhecido';
  const errorCode = error?.code || error?.error?.code || '';

  // Erros de usuário não encontrado
  if (
    errorMessage.includes('Usuário não encontrado') ||
    errorMessage.includes('User not found') ||
    errorCode === 'auth/user-not-found'
  ) {
    return {
      code: 'USER_NOT_FOUND',
      message: errorMessage,
      userMessage: 'Usuário não encontrado. Verifique se o email está correto.',
      retryable: false,
      type: 'credentials',
    };
  }

  // Erros de senha incorreta
  if (
    errorMessage.includes('Senha incorreta') ||
    errorMessage.includes('Wrong password') ||
    errorMessage.includes('Invalid password') ||
    errorCode === 'auth/wrong-password' ||
    errorCode === 'auth/invalid-credential'
  ) {
    return {
      code: 'WRONG_PASSWORD',
      message: errorMessage,
      userMessage: 'Senha incorreta. Verifique sua senha e tente novamente.',
      retryable: false,
      type: 'credentials',
    };
  }

  // Erros de usuário inativo
  if (
    errorMessage.includes('Usuário inativo') ||
    errorMessage.includes('User inactive') ||
    errorMessage.includes('Contacte o administrador')
  ) {
    return {
      code: 'USER_INACTIVE',
      message: errorMessage,
      userMessage: 'Sua conta está inativa. Entre em contato com o administrador.',
      retryable: false,
      type: 'permission',
    };
  }

  // Erros de token expirado
  if (
    errorMessage.includes('Token expirado') ||
    errorMessage.includes('Token expired') ||
    errorMessage.includes('expired') ||
    errorCode === 'auth/id-token-expired'
  ) {
    return {
      code: 'TOKEN_EXPIRED',
      message: errorMessage,
      userMessage: 'Sua sessão expirou. Por favor, faça login novamente.',
      retryable: false,
      type: 'token',
    };
  }

  // Erros de rede
  if (
    errorMessage.includes('NetworkError') ||
    errorMessage.includes('Failed to fetch') ||
    errorMessage.includes('Network request failed') ||
    errorMessage.includes('fetch') ||
    errorCode === 'unavailable' ||
    errorCode === 'network-request-failed'
  ) {
    return {
      code: 'NETWORK_ERROR',
      message: errorMessage,
      userMessage: 'Erro de conexão. Verifique sua internet e tente novamente.',
      retryable: true,
      type: 'network',
    };
  }

  // Erros de permissão
  if (
    errorMessage.includes('Permission denied') ||
    errorMessage.includes('permission') ||
    errorCode === 'permission-denied'
  ) {
    return {
      code: 'PERMISSION_DENIED',
      message: errorMessage,
      userMessage: 'Você não tem permissão para realizar esta ação.',
      retryable: false,
      type: 'permission',
    };
  }

  // Erros de muitas tentativas
  if (
    errorMessage.includes('too many') ||
    errorMessage.includes('Too many requests') ||
    errorCode === 'auth/too-many-requests'
  ) {
    return {
      code: 'TOO_MANY_REQUESTS',
      message: errorMessage,
      userMessage: 'Muitas tentativas de login. Aguarde alguns minutos e tente novamente.',
      retryable: true,
      type: 'permission',
    };
  }

  // Erro genérico
  return {
    code: 'UNKNOWN_ERROR',
    message: errorMessage,
    userMessage: 'Erro ao fazer login. Verifique suas credenciais e tente novamente.',
    retryable: false,
    type: 'unknown',
  };
}

/**
 * Loga erros de autenticação detalhadamente para debug
 */
export function logAuthError(error: any, context: string): void {
  const authError = mapAuthError(error);

  console.group(`🔴 Erro de Autenticação - ${context}`);
  console.error('Código:', authError.code);
  console.error('Mensagem:', authError.message);
  console.error('Tipo:', authError.type);
  console.error('Retryable:', authError.retryable);
  console.error('Erro original:', error);
  console.error('Stack:', error?.stack);
  console.groupEnd();
}

/**
 * Verifica se um erro é recuperável (pode tentar novamente)
 */
export function isRetryableAuthError(error: any): boolean {
  const authError = mapAuthError(error);
  return authError.retryable;
}
