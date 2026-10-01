import { Request, Response, NextFunction } from 'express';
import { AddressFlowError } from '@addressflow/core';
import { ZodError } from 'zod';

export function errorMiddleware(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  const requestId = req.requestId;

  const isAddressFlowError =
    err instanceof AddressFlowError ||
    (err !== null &&
      typeof err === 'object' &&
      'code' in err &&
      ((err as any).name === 'AddressFlowError' || typeof (err as any).code === 'string'));

  if (isAddressFlowError) {
    const errorObj = err as any;
    const code = errorObj.code;
    let status = 500;

    if (code === 'INVALID_REQUEST' || code === 'LOCATION_OUT_OF_BOUNDS') status = 400;
    else if (code === 'UNAUTHORIZED') status = 401;
    else if (code === 'FORBIDDEN') status = 403;
    else if (code === 'NOT_FOUND') status = 404;
    else if (code === 'RATE_LIMITED' || code === 'PROVIDER_RATE_LIMITED') status = 429;
    else if (code === 'PROVIDER_UNAVAILABLE') status = 503;

    res.status(status).json({
      error: {
        code,
        message: errorObj.message,
        requestId,
        details: errorObj.details,
        retryAfterSeconds: errorObj.retryAfterSeconds,
      },
    });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        code: 'INVALID_REQUEST',
        message: 'Request validation failed',
        requestId,
        details: { issues: err.issues },
      },
    });
    return;
  }

  // Generic unexpected error (never leak internal stack trace)
  const message =
    process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err instanceof Error
        ? err.message
        : 'Unknown error';

  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message,
      requestId,
    },
  });
}
