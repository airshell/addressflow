import { AddressFlowErrorCode, AddressFlowErrorPayload } from '@addressflow/types';

export class AddressFlowError extends Error {
  public readonly code: AddressFlowErrorCode;
  public readonly requestId?: string;
  public readonly details?: Record<string, unknown>;
  public readonly retryAfterSeconds?: number;

  constructor(
    code: AddressFlowErrorCode,
    message: string,
    options?: {
      requestId?: string;
      details?: Record<string, unknown>;
      retryAfterSeconds?: number;
      cause?: unknown;
    }
  ) {
    super(message);
    this.name = 'AddressFlowError';
    this.code = code;
    this.requestId = options?.requestId;
    this.details = options?.details;
    this.retryAfterSeconds = options?.retryAfterSeconds;

    if (options?.cause) {
      this.cause = options.cause;
    }
  }

  public toPayload(): AddressFlowErrorPayload {
    return {
      code: this.code,
      message: this.message,
      requestId: this.requestId,
      details: this.details,
      retryAfterSeconds: this.retryAfterSeconds,
    };
  }
}
