import { RedisService } from './client.js';

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetSeconds: number;
}

export class DistributedRateLimiter {
  private inMemoryCounts = new Map<string, { count: number; resetAt: number }>();

  constructor(private redisService?: RedisService) {}

  public async checkLimit(
    key: string,
    maxRequests: number = 120,
    windowSeconds: number = 60
  ): Promise<RateLimitResult> {
    const redisKey = `addressflow:ratelimit:${key}`;

    try {
      if (this.redisService) {
        const client = this.redisService.getClient();
        const multi = client.multi();
        multi.incr(redisKey);
        multi.ttl(redisKey);
        const results = await multi.exec();

        if (results && results[0] && results[1]) {
          const currentCount = results[0][1] as number;
          let ttl = results[1][1] as number;

          if (ttl === -1) {
            // Key has no expire set
            await client.expire(redisKey, windowSeconds);
            ttl = windowSeconds;
          }

          const allowed = currentCount <= maxRequests;
          const remaining = Math.max(0, maxRequests - currentCount);

          return {
            allowed,
            limit: maxRequests,
            remaining,
            resetSeconds: ttl > 0 ? ttl : windowSeconds,
          };
        }
      }
    } catch {
      // Graceful fallback to in-memory rate limiting if Redis is down
    }

    // In-memory fallback
    const now = Date.now();
    const entry = this.inMemoryCounts.get(key);

    if (!entry || now > entry.resetAt) {
      this.inMemoryCounts.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
      return {
        allowed: true,
        limit: maxRequests,
        remaining: maxRequests - 1,
        resetSeconds: windowSeconds,
      };
    }

    entry.count++;
    const allowed = entry.count <= maxRequests;
    const remaining = Math.max(0, maxRequests - entry.count);
    const resetSeconds = Math.max(1, Math.round((entry.resetAt - now) / 1000));

    return {
      allowed,
      limit: maxRequests,
      remaining,
      resetSeconds,
    };
  }
}
