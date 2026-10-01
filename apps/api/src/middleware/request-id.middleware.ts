import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'node:crypto';

declare global {
  namespace Express {
    interface Request {
      requestId: string;
    }
  }
}

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const reqId = (req.headers['x-request-id'] as string) || `req_${randomUUID().replace(/-/g, '')}`;
  req.requestId = reqId;
  res.setHeader('x-request-id', reqId);
  next();
}
