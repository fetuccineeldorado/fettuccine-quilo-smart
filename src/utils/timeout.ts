/**
 * Utility para adicionar timeout a promises
 * Útil para evitar que requisições fiquem travadas indefinidamente
 */

export class TimeoutError extends Error {
  constructor(message: string = "Operação excedeu o tempo limite") {
    super(message);
    this.name = "TimeoutError";
  }
}

/**
 * Adiciona timeout a uma promise
 * @param promise - Promise que será executada
 * @param ms - Tempo limite em milissegundos (padrão: 30000 = 30 segundos)
 * @returns Promise que será rejeitada com TimeoutError se exceder o tempo
 */
export function withTimeout<T>(
  promise: Promise<T>,
  ms: number = 30000
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new TimeoutError(`Operação excedeu o tempo limite de ${ms}ms`));
    }, ms);

    promise
      .then((result) => {
        clearTimeout(timeout);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timeout);
        reject(error);
      });
  });
}

/**
 * Executa uma operação com retry e timeout
 * @param operation - Função que retorna uma promise
 * @param options - Opções de retry e timeout
 * @returns Promise com resultado da operação
 */
export async function withRetryAndTimeout<T>(
  operation: () => Promise<T>,
  options: {
    maxRetries?: number;
    timeoutMs?: number;
    retryDelay?: number;
    onRetry?: (attempt: number) => void;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    timeoutMs = 30000,
    retryDelay = 1000,
    onRetry,
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0 && onRetry) {
        onRetry(attempt);
      }

      const result = await withTimeout(operation(), timeoutMs);
      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Não retry em caso de timeout na última tentativa
      if (error instanceof TimeoutError && attempt === maxRetries) {
        throw error;
      }

      // Se não é a última tentativa, aguardar antes de retry
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, retryDelay * attempt));
      }
    }
  }

  throw lastError || new Error("Operação falhou após todas as tentativas");
}

