export interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  isRetryable?: (error: unknown) => boolean;
}

/**
 * Exponential backoff with full jitter per AWS architecture recommendations.
 * Prevents retry storms and stampedes against third-party geocoding providers.
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const maxRetries = options.maxRetries ?? 3;
  const initialDelay = options.initialDelayMs ?? 200;
  const maxDelay = options.maxDelayMs ?? 2000;
  const isRetryable = options.isRetryable ?? (() => true);

  let attempt = 0;

  while (true) {
    try {
      return await operation();
    } catch (err) {
      attempt++;
      if (attempt > maxRetries || !isRetryable(err)) {
        throw err;
      }

      // Full jitter: random between 0 and min(maxDelay, initialDelay * 2^attempt)
      const maxBackoff = Math.min(maxDelay, initialDelay * Math.pow(2, attempt));
      const jitterDelay = Math.floor(Math.random() * maxBackoff);

      await new Promise((resolve) => setTimeout(resolve, jitterDelay));
    }
  }
}
