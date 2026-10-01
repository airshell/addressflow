import { describe, it, expect, vi } from 'vitest';
import { withRetry } from '../src/retry.js';

describe('withRetry resilience utility', () => {
  it('retries failing transient calls with backoff and succeeds', async () => {
    let attempts = 0;
    const op = vi.fn().mockImplementation(async () => {
      attempts++;
      if (attempts < 3) throw new Error('Transient 503 error');
      return 'recovered';
    });

    const result = await withRetry(op, {
      maxRetries: 3,
      initialDelayMs: 10,
      maxDelayMs: 50,
    });

    expect(result).toBe('recovered');
    expect(attempts).toBe(3);
  });

  it('immediately throws when error is not retryable', async () => {
    let attempts = 0;
    const op = vi.fn().mockImplementation(async () => {
      attempts++;
      throw new Error('401 Unauthorized');
    });

    await expect(
      withRetry(op, {
        maxRetries: 3,
        isRetryable: (err: any) => !err.message.includes('401'),
      })
    ).rejects.toThrow('401 Unauthorized');

    expect(attempts).toBe(1);
  });
});
