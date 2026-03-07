/**
 * Shared retry utility with exponential backoff and configurable rate-limit detection.
 */

export interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  isRetryable?: (err: any) => boolean;
}

const defaultIsRetryable = (err: any): boolean =>
  err?.status === 429 ||
  err?.response?.status === 429 ||
  err?.code === "ECONNRESET" ||
  err?.code === "ETIMEDOUT" ||
  (typeof err?.message === "string" &&
    (err.message.includes("RATE_EXCEEDED") ||
      err.message.includes("RESOURCE_EXHAUSTED") ||
      err.message.includes("Too Many Requests") ||
      err.message.includes("Service Unavailable")));

export async function withRetry<T>(
  fn: () => Promise<T>,
  {
    maxRetries = 5,
    baseDelayMs = 1_000,
    isRetryable = defaultIsRetryable,
  }: RetryOptions = {}
): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (err: any) {
      attempt++;
      if (attempt >= maxRetries || !isRetryable(err)) throw err;
      const delay = baseDelayMs * Math.pow(2, attempt - 1);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}
