/**
 * Utilitário para retry com backoff exponencial
 */

export interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  retryable?: (error: any) => boolean;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelay: 1000, // 1 segundo
  maxDelay: 30000, // 30 segundos
  backoffMultiplier: 2,
  retryable: () => true,
};

/**
 * Executa uma função com retry e backoff exponencial
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: any;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Verifica se o erro é retryable
      if (!opts.retryable(error)) {
        throw error;
      }

      // Se é a última tentativa, lança o erro
      if (attempt === opts.maxRetries) {
        throw error;
      }

      // Calcula delay com backoff exponencial
      const delay = Math.min(
        opts.initialDelay * Math.pow(opts.backoffMultiplier, attempt),
        opts.maxDelay
      );

      console.log(
        `Tentativa ${attempt + 1}/${opts.maxRetries + 1} falhou. Tentando novamente em ${delay}ms...`
      );

      // Aguarda antes de tentar novamente
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Cria uma função wrapper que aplica retry automaticamente
 */
export function withRetry<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options: RetryOptions = {}
): T {
  return (async (...args: Parameters<T>) => {
    return retryWithBackoff(() => fn(...args), options);
  }) as T;
}
