import { Request, Response, NextFunction } from 'express';
import { DistributedRateLimiter } from '@addressflow/server';

export function createRateLimitMiddleware(rateLimiter: DistributedRateLimiter) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (req.path === '/health' || req.path === '/ready') {
      return next();
    }

    const key = req.auth?.apiKeyId ?? req.ip ?? 'anonymous';
    const limitResult = await rateLimiter.checkLimit(key);

    res.setHeader('x-ratelimit-limit', limitResult.limit);
    res.setHeader('x-ratelimit-remaining', limitResult.remaining);
    res.setHeader('x-ratelimit-reset', limitResult.resetSeconds);

    if (!limitResult.allowed) {
      res.status(429).json({
        error: {
          code: 'RATE_LIMITED',
          message: 'Rate limit exceeded. Please wait before retrying.',
          requestId: req.requestId,
          retryAfterSeconds: limitResult.resetSeconds,
        },
      });
      return;
    }

    next();
  };
}
