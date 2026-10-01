import { describe, it, expect } from 'vitest';
import { DistributedRateLimiter } from '../src/redis/rate-limiter.js';
import { hashApiSecret } from '../src/db/repositories/api-key.repository.js';

describe('Server Layer', () => {
  it('hashes API secrets deterministically using SHA-256', () => {
    const secret = 'af_live_test_secret_123';
    const hash1 = hashApiSecret(secret);
    const hash2 = hashApiSecret(secret);

    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64);
  });

  it('enforces rate limits in in-memory fallback mode', async () => {
    const limiter = new DistributedRateLimiter(); // No Redis passed, falls back to in-memory

    const key = 'test-client-key';
    const limit = 5;

    // First 5 requests should be allowed
    for (let i = 0; i < 5; i++) {
      const res = await limiter.checkLimit(key, limit, 60);
      expect(res.allowed).toBe(true);
      expect(res.remaining).toBe(limit - 1 - i);
    }

    // 6th request should be blocked
    const blockedRes = await limiter.checkLimit(key, limit, 60);
    expect(blockedRes.allowed).toBe(false);
    expect(blockedRes.remaining).toBe(0);
  });
});
