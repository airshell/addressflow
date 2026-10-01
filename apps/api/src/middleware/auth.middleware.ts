import { Request, Response, NextFunction } from 'express';
import { AuthenticatedContext } from '@addressflow/types';
import { ApiKeyRepository } from '@addressflow/server';

declare global {
  namespace Express {
    interface Request {
      auth?: AuthenticatedContext;
    }
  }
}

export function createAuthMiddleware(apiKeyRepo?: ApiKeyRepository) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Skip auth for health endpoints
    if (req.path === '/health' || req.path === '/ready') {
      return next();
    }

    const authHeader = req.headers['authorization'];
    const customHeader = req.headers['x-api-key'] as string | undefined;

    let rawKey: string | undefined;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      rawKey = authHeader.substring(7).trim();
    } else if (customHeader) {
      rawKey = customHeader.trim();
    }

    if (!rawKey) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Missing API key. Provide via Authorization: Bearer <key> or x-api-key header.',
          requestId: req.requestId,
        },
      });
      return;
    }

    // In-memory / test bypass for mock testing
    if (rawKey === 'af_test_mock_key') {
      req.auth = {
        apiKeyId: 'key_mock_1',
        projectId: 'proj_mock_default',
        organizationId: 'org_mock_default',
        settings: {
          allowedCountryCodes: ['US', 'IN'],
          defaultProvider: 'mock',
        },
      };
      return next();
    }

    if (!apiKeyRepo) {
      // Fallback dev context if database is not connected
      req.auth = {
        apiKeyId: 'key_dev_1',
        projectId: 'proj_dev_1',
        organizationId: 'org_dev_1',
        settings: {},
      };
      return next();
    }

    try {
      const authContext = await apiKeyRepo.authenticateKey(rawKey);
      if (!authContext) {
        res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Invalid or expired API key.',
            requestId: req.requestId,
          },
        });
        return;
      }

      req.auth = authContext;
      next();
    } catch (err) {
      next(err);
    }
  };
}
